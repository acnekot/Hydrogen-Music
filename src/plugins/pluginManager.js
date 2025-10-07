import { nextTick } from 'vue';
import { usePluginStore } from '@/store/pluginStore';
import { createPluginContext } from './pluginContext';

const pluginCleanups = new Map();
let initializedPromise = null;

const collectPersistableState = store => ({
    rootDir: store.pluginDirectory,
    systemEnabled: store.pluginSystemEnabled,
    categories: { ...store.categoryEnabled },
    enabledPlugins: Object.fromEntries(Array.from(store.enabledPlugins.entries()).map(([key, value]) => [key, !!value])),
    pluginData: { ...store.pluginSettings },
    firstConfirmationDismissed: store.firstConfirmationDismissed,
});

const persistState = async store => {
    if (!store.initialized) return;
    const snapshot = collectPersistableState(store);
    await windowApi.plugins.setSettings(snapshot);
};

const runPluginModule = async (pluginMeta, store) => {
    const code = await windowApi.plugins.readEntry(pluginMeta.id);
    if (!code) throw new Error('插件入口文件为空');
    const cleanups = [];
    const context = createPluginContext(pluginMeta, cleanups);
    pluginCleanups.set(pluginMeta.id, cleanups);

    const module = { exports: {} };
    const exports = module.exports;
    const pluginRequire = () => {
        throw new Error('插件运行环境不支持 require，请使用 context.importModule');
    };
    const wrapped = `(function (module, exports, require, context, __filename, __dirname) {\n${code}\n})`;
    const executor = eval(wrapped);
    executor(module, exports, pluginRequire, context, pluginMeta.entryPath, pluginMeta.pluginDir);
    const exported = module.exports && module.exports.default ? module.exports.default : module.exports;
    if (typeof exported === 'function') {
        await exported(context);
    }
};

const cleanupPlugin = (pluginId, store) => {
    const cleanups = pluginCleanups.get(pluginId) || [];
    pluginCleanups.delete(pluginId);
    cleanups.reverse();
    for (const cleanup of cleanups) {
        try {
            cleanup?.();
        } catch (err) {
            console.error('[Plugin] cleanup failed', err);
        }
    }
    store.resetRuntimeForPlugin(pluginId);
    store.clearError(pluginId);
};

const activatePlugin = async (pluginMeta, store) => {
    cleanupPlugin(pluginMeta.id, store);
    try {
        await runPluginModule(pluginMeta, store);
        store.enabledPlugins.set(pluginMeta.id, true);
        store.clearError(pluginMeta.id);
    } catch (err) {
        console.error('[Plugin] Failed to activate plugin', pluginMeta.id, err);
        store.enabledPlugins.set(pluginMeta.id, false);
        store.markError(pluginMeta.id, err);
        windowApi.plugins.reportError(pluginMeta.id, err?.message || String(err));
        throw err;
    } finally {
        await persistState(store);
    }
};

const deactivatePlugin = async (pluginId, store, { persist = true } = {}) => {
    cleanupPlugin(pluginId, store);
    store.enabledPlugins.set(pluginId, false);
    if (persist) await persistState(store);
};

const refreshPluginList = async store => {
    const list = await windowApi.plugins.list();
    store.plugins = list;
    for (const plugin of list) {
        if (!store.enabledPlugins.has(plugin.id)) {
            store.enabledPlugins.set(plugin.id, !!plugin.enabled);
        }
    }
};

const activateEnabledPlugins = async store => {
    if (!store.pluginSystemEnabled) return;
    const tasks = [];
    for (const plugin of store.plugins) {
        if (!store.enabledPlugins.get(plugin.id)) continue;
        tasks.push(activatePlugin(plugin, store).catch(() => {}));
    }
    await Promise.all(tasks);
};

export const pluginManager = {
    async initialize() {
        if (initializedPromise) return initializedPromise;
        const store = usePluginStore();
        initializedPromise = (async () => {
            const settings = await windowApi.plugins.getSettings();
            store.pluginDirectory = settings.rootDir;
            store.pluginSystemEnabled = !!settings.systemEnabled;
            store.firstConfirmationDismissed = !!settings.firstConfirmationDismissed;
            Object.entries(settings.categories || {}).forEach(([key, value]) => {
                store.ensureCategory(key);
                store.categoryEnabled[key] = !!value;
            });
            Object.entries(settings.pluginData || {}).forEach(([pluginId, pluginSettings]) => {
                store.setPluginSettings(pluginId, pluginSettings);
            });
            Object.entries(settings.enabledPlugins || {}).forEach(([pluginId, value]) => {
                store.enabledPlugins.set(pluginId, !!value);
            });
            await windowApi.plugins.ensureRoot(settings.rootDir);
            await refreshPluginList(store);
            store.initialized = true;
            if (store.pluginSystemEnabled) {
                await activateEnabledPlugins(store);
            }
        })();
        await initializedPromise;
        return initializedPromise;
    },
    async refresh() {
        const store = usePluginStore();
        await refreshPluginList(store);
        if (store.pluginSystemEnabled) {
            await activateEnabledPlugins(store);
        }
    },
    async enable(pluginId) {
        const store = usePluginStore();
        const plugin = store.plugins.find(item => item.id === pluginId);
        if (!plugin) throw new Error('插件不存在');
        await activatePlugin(plugin, store);
    },
    async disable(pluginId) {
        const store = usePluginStore();
        await deactivatePlugin(pluginId, store);
    },
    async setPluginSystemEnabled(enabled) {
        const store = usePluginStore();
        if (store.pluginSystemEnabled === enabled) return;
        store.pluginSystemEnabled = enabled;
        if (!enabled) {
            for (const plugin of store.plugins) {
                await deactivatePlugin(plugin.id, store, { persist: false });
            }
        } else {
            await activateEnabledPlugins(store);
        }
        await persistState(store);
    },
    async setPluginDirectory(dir) {
        const store = usePluginStore();
        if (!dir) return;
        store.pluginDirectory = dir;
        await windowApi.plugins.ensureRoot(dir);
        await persistState(store);
        await this.refresh();
    },
    async setCategoryEnabled(category, enabled) {
        const store = usePluginStore();
        store.ensureCategory(category);
        store.categoryEnabled[category] = enabled;
        await persistState(store);
    },
    async setPluginEnabled(pluginId, enabled) {
        if (enabled) return this.enable(pluginId);
        return this.disable(pluginId);
    },
    async remove(pluginId) {
        await windowApi.plugins.delete(pluginId);
        const store = usePluginStore();
        store.enabledPlugins.delete(pluginId);
        store.plugins = store.plugins.filter(item => item.id !== pluginId);
        cleanupPlugin(pluginId, store);
        await persistState(store);
    },
    async importFrom(sourcePath) {
        const manifest = await windowApi.plugins.import(sourcePath);
        await this.refresh();
        return manifest;
    },
    async persist() {
        const store = usePluginStore();
        await persistState(store);
    },
    async reload() {
        const store = usePluginStore();
        store.requestSoftReload();
    },
};

export const initializePluginSystem = () => pluginManager.initialize();
