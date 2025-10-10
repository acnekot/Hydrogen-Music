class PluginEventBus {
    constructor() {
        this.listeners = new Map();
    }

    on(event, handler) {
        if (typeof handler !== 'function') {
            console.warn(`[PluginEventBus] Attempted to register non-function handler for event "${event}".`);
            return () => {};
        }

        const handlers = this.listeners.get(event) || new Set();
        handlers.add(handler);
        this.listeners.set(event, handlers);

        return () => this.off(event, handler);
    }

    once(event, handler) {
        if (typeof handler !== 'function') {
            console.warn(`[PluginEventBus] Attempted to register non-function handler for event "${event}".`);
            return () => {};
        }

        const wrapper = (...args) => {
            try {
                handler(...args);
            } finally {
                this.off(event, wrapper);
            }
        };

        return this.on(event, wrapper);
    }

    off(event, handler) {
        const handlers = this.listeners.get(event);
        if (!handlers) return;

        handlers.delete(handler);
        if (handlers.size === 0) {
            this.listeners.delete(event);
        }
    }

    emit(event, payload) {
        const handlers = this.listeners.get(event);
        if (!handlers || handlers.size === 0) return;

        for (const handler of Array.from(handlers)) {
            try {
                handler(payload);
            } catch (error) {
                console.error(`[PluginEventBus] Error while handling event "${event}":`, error);
            }
        }
    }

    clear() {
        this.listeners.clear();
    }
}

const defaultLogger = typeof console !== 'undefined' ? console : {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
};

class PluginManager {
    constructor({ app, router, pinia, logger = defaultLogger } = {}) {
        this.app = app;
        this.router = router;
        this.pinia = pinia;
        this.logger = logger;
        this.plugins = new Map();
        this.registry = new Map();
        this.eventBus = new PluginEventBus();
    }

    register(descriptor) {
        if (!descriptor || typeof descriptor !== 'object') {
            throw new Error('[PluginManager] Plugin descriptor must be an object.');
        }

        const name = descriptor.name;
        if (!name || typeof name !== 'string') {
            throw new Error('[PluginManager] Plugin descriptor requires a unique "name" field.');
        }

        if (this.registry.has(name)) {
            this.logger.warn(`[PluginManager] Plugin descriptor "${name}" is already registered. Overwriting.`);
        }
        const normalized = { ...descriptor, enabled: descriptor.enabled !== false };

        this.registry.set(name, normalized);
        this.eventBus.emit('plugin:registered', { descriptor: normalized });
        return normalized;
    }

    async loadFromRegistry(registry = []) {
        const descriptors = Array.isArray(registry) ? registry : [];
        const results = { loaded: [], skipped: [] };

        for (const descriptor of descriptors) {
            try {
                const registered = this.register(descriptor);
                if (registered.enabled === false) {
                    results.skipped.push(registered.name);
                    continue;
                }

                await this.load(registered.name);
                results.loaded.push(registered.name);
            } catch (error) {
                this.logger.error(`[PluginManager] Failed to load plugin "${descriptor?.name ?? 'unknown'}":`, error);
            }
        }

        this.eventBus.emit('plugin-manager:ready', { manager: this, results });
        return results;
    }

    async load(nameOrDescriptor) {
        const descriptor = typeof nameOrDescriptor === 'string'
            ? this.registry.get(nameOrDescriptor)
            : nameOrDescriptor;

        if (!descriptor) {
            throw new Error(`[PluginManager] Plugin descriptor for "${nameOrDescriptor}" was not found.`);
        }

        if (!this.registry.has(descriptor.name)) {
            this.register(descriptor);
        }

        if (this.plugins.has(descriptor.name)) {
            this.logger.warn(`[PluginManager] Plugin "${descriptor.name}" is already loaded.`);
            return this.plugins.get(descriptor.name).instance;
        }

        const loader = this.#resolveLoader(descriptor);
        let pluginModule;

        if (!loader) {
            throw new Error(`[PluginManager] Plugin "${descriptor.name}" does not provide a valid loader.`);
        }

        pluginModule = await loader();

        const plugin = pluginModule?.default ?? pluginModule;
        this.#validatePlugin(plugin, descriptor);

        const record = {
            name: plugin.name,
            descriptor,
            instance: plugin,
            cleanups: [],
        };

        const context = this.#createContext(record);

        try {
            await plugin.activate(context);
            this.logger.info(`[PluginManager] Plugin "${plugin.name}" activated.`);
        } catch (error) {
            this.logger.error(`[PluginManager] Error while activating plugin "${plugin.name}":`, error);
            throw error;
        }

        this.plugins.set(plugin.name, record);
        this.eventBus.emit('plugin:activated', { plugin: record.instance, descriptor });
        return record.instance;
    }

    async unload(name) {
        const record = this.plugins.get(name);
        if (!record) {
            this.logger.warn(`[PluginManager] Plugin "${name}" is not loaded.`);
            return;
        }

        const { instance, descriptor } = record;
        const context = this.#createContext(record);

        try {
            if (typeof instance.deactivate === 'function') {
                await instance.deactivate(context);
            }
        } catch (error) {
            this.logger.error(`[PluginManager] Error while deactivating plugin "${name}":`, error);
        }

        for (const cleanup of record.cleanups.splice(0)) {
            try {
                cleanup();
            } catch (error) {
                this.logger.error(`[PluginManager] Cleanup for plugin "${name}" failed:`, error);
            }
        }

        this.plugins.delete(name);
        this.eventBus.emit('plugin:deactivated', { plugin: instance, descriptor });
        this.logger.info(`[PluginManager] Plugin "${name}" deactivated.`);
    }

    async setEnabled(name, enabled) {
        const descriptor = this.registry.get(name);
        if (!descriptor) {
            throw new Error(`[PluginManager] Plugin "${name}" is not registered.`);
        }

        const target = enabled !== false;
        descriptor.enabled = target;

        if (target) {
            await this.load(name);
        } else {
            await this.unload(name);
        }
    }

    async remove(name) {
        const descriptor = this.registry.get(name);
        if (!descriptor) return false;

        await this.unload(name);
        this.registry.delete(name);
        this.eventBus.emit('plugin:removed', { name, descriptor });
        return true;
    }

    list() {
        return Array.from(this.registry.values()).map((descriptor) => ({
            name: descriptor.name,
            description: descriptor.description ?? '',
            version: descriptor.version ?? '',
            enabled: descriptor.enabled !== false,
            loaded: this.plugins.has(descriptor.name),
            builtin: descriptor.builtin === true,
        }));
    }

    get(name) {
        return this.plugins.get(name)?.instance;
    }

    on(event, handler) {
        return this.eventBus.on(event, handler);
    }

    once(event, handler) {
        return this.eventBus.once(event, handler);
    }

    emit(event, payload) {
        this.eventBus.emit(event, payload);
    }

    #createContext(record) {
        if (record.context) return record.context;

        const { descriptor, instance } = record;
        const registerCleanup = (cleanup) => {
            if (typeof cleanup === 'function') {
                record.cleanups.push(cleanup);
            } else {
                this.logger.warn(`[PluginManager] Plugin "${instance.name}" attempted to register an invalid cleanup handler.`);
            }
        };

        const context = Object.freeze({
            app: this.app,
            router: this.router,
            pinia: this.pinia,
            descriptor,
            options: Object.freeze(descriptor.options ?? {}),
            eventBus: {
                on: this.eventBus.on.bind(this.eventBus),
                once: this.eventBus.once.bind(this.eventBus),
                off: this.eventBus.off.bind(this.eventBus),
                emit: this.eventBus.emit.bind(this.eventBus),
            },
            registerCleanup,
            logger: this.#createPluginLogger(instance.name),
        });

        record.context = context;
        return context;
    }

    #createPluginLogger(name) {
        return {
            info: (...args) => this.logger.info(`[Plugin:${name}]`, ...args),
            warn: (...args) => this.logger.warn(`[Plugin:${name}]`, ...args),
            error: (...args) => this.logger.error(`[Plugin:${name}]`, ...args),
            debug: (...args) => (this.logger.debug ?? this.logger.info).call(this.logger, `[Plugin:${name}]`, ...args),
        };
    }

    #resolveLoader(descriptor) {
        const candidates = [descriptor.loader, descriptor.import, descriptor.load, descriptor.module];

        for (const candidate of candidates) {
            if (typeof candidate === 'function') {
                return candidate;
            }
        }

        if (descriptor.entry && typeof descriptor.entry === 'string') {
            const entryPath = descriptor.entry;
            return () => import(/* @vite-ignore */ entryPath);
        }

        if (descriptor.path && typeof descriptor.path === 'string') {
            const modulePath = descriptor.path;
            return () => import(/* @vite-ignore */ modulePath);
        }

        return null;
    }

    #validatePlugin(plugin, descriptor) {
        if (!plugin || typeof plugin !== 'object') {
            throw new Error(`[PluginManager] Plugin "${descriptor.name}" did not export an object.`);
        }

        if (!plugin.name || typeof plugin.name !== 'string') {
            throw new Error(`[PluginManager] Plugin "${descriptor.name}" is missing a valid "name" property.`);
        }

        if (typeof plugin.activate !== 'function') {
            throw new Error(`[PluginManager] Plugin "${descriptor.name}" must provide an "activate" function.`);
        }

        if (plugin.deactivate && typeof plugin.deactivate !== 'function') {
            throw new Error(`[PluginManager] Plugin "${descriptor.name}" has an invalid "deactivate" function.`);
        }

        if (descriptor.name && descriptor.name !== plugin.name) {
            this.logger.warn(`[PluginManager] Descriptor name "${descriptor.name}" differs from plugin name "${plugin.name}".`);
        }
    }
}

export { PluginEventBus };
export default PluginManager;
