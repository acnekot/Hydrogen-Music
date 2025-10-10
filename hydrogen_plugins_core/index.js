export class SimpleEmitter {
  constructor() {
    this._listeners = new Map();
  }

  on(event, handler) {
    if (typeof handler !== 'function') return () => {};
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    const set = this._listeners.get(event);
    set.add(handler);
    return () => {
      set.delete(handler);
      if (set.size === 0) {
        this._listeners.delete(event);
      }
    };
  }

  off(event, handler) {
    if (!this._listeners.has(event)) return;
    if (!handler) {
      this._listeners.delete(event);
      return;
    }
    const set = this._listeners.get(event);
    set.delete(handler);
    if (set.size === 0) {
      this._listeners.delete(event);
    }
  }

  emit(event, payload) {
    if (!this._listeners.has(event)) return;
    const handlers = Array.from(this._listeners.get(event));
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (error) {
        setTimeout(() => {
          throw error;
        }, 0);
      }
    }
  }
}

export class MemoryStorage {
  constructor(namespace) {
    this.namespace = namespace;
    this._store = new Map();
  }

  _key(key) {
    return `${this.namespace}:${key}`;
  }

  get(key, defaultValue = null) {
    const storageKey = this._key(key);
    if (this._store.has(storageKey)) {
      return this._store.get(storageKey);
    }
    return defaultValue;
  }

  set(key, value) {
    this._store.set(this._key(key), value);
  }

  remove(key) {
    this._store.delete(this._key(key));
  }

  clear() {
    this._store.clear();
  }
}

function createNamespacedLogger(baseLogger, namespace) {
  const logger = baseLogger || console;
  const prefix = namespace ? `[${namespace}]` : '';
  return {
    info: (...args) => (logger.info || console.info).call(logger, prefix, ...args),
    warn: (...args) => (logger.warn || console.warn).call(logger, prefix, ...args),
    error: (...args) => (logger.error || console.error).call(logger, prefix, ...args),
    debug: (...args) => (logger.debug || console.debug).call(logger, prefix, ...args),
  };
}

export class HydrogenPluginManager {
  constructor(options = {}) {
    this._plugins = new Map();
    this._areas = new Map();
    this._emitter = new SimpleEmitter();
    this._contextProvider = null;
    this._logger = options.logger || console;
    this._storageFactory = options.storageFactory || ((pluginId) => new MemoryStorage(`plugin:${pluginId}`));
  }

  setContextProvider(provider) {
    this._contextProvider = provider;
  }

  registerArea(name, options = {}) {
    if (!name) throw new Error('Area name is required');
    if (this._areas.has(name)) return;
    this._areas.set(name, {
      name,
      options: { multiple: options.multiple !== false, uniqueBy: options.uniqueBy || null },
      items: [],
    });
    this._emitter.emit('area-registered', { area: name });
  }

  getContributions(name) {
    const area = this._areas.get(name);
    if (!area) return [];
    return area.items.slice();
  }

  _notifyContributionChange(areaName) {
    const area = this._areas.get(areaName);
    if (!area) return;
    this._emitter.emit('contribution-changed', {
      area: areaName,
      items: area.items.slice(),
    });
  }

  _addContribution(areaName, payload, pluginMeta) {
    const area = this._areas.get(areaName);
    if (!area) {
      throw new Error(`Unknown contribution area: ${areaName}`);
    }

    const contribution = { ...payload, __plugin: { id: pluginMeta.id, name: pluginMeta.name, version: pluginMeta.version } };

    if (!area.options.multiple && area.items.length > 0) {
      area.items = [contribution];
    } else if (area.options.uniqueBy) {
      const key = area.options.uniqueBy;
      const existsIndex = area.items.findIndex((item) => item[key] === contribution[key]);
      if (existsIndex !== -1) {
        area.items.splice(existsIndex, 1, contribution);
      } else {
        area.items.push(contribution);
      }
    } else {
      area.items.push(contribution);
    }

    this._notifyContributionChange(areaName);
  }

  _removeContributions(areaName, predicate) {
    const area = this._areas.get(areaName);
    if (!area) return;
    const beforeLength = area.items.length;
    area.items = area.items.filter((item) => !predicate(item));
    if (beforeLength !== area.items.length) {
      this._notifyContributionChange(areaName);
    }
  }

  _clearContributionsByPlugin(pluginId) {
    for (const [areaName, area] of this._areas.entries()) {
      const beforeLength = area.items.length;
      area.items = area.items.filter((item) => item.__plugin.id !== pluginId);
      if (area.items.length !== beforeLength) {
        this._notifyContributionChange(areaName);
      }
    }
  }

  use(pluginInput) {
    const plugin = typeof pluginInput === 'function' ? pluginInput(this) : pluginInput;
    if (!plugin || typeof plugin !== 'object') {
      throw new Error('Invalid plugin definition');
    }
    const { id, name, version, setup } = plugin;
    if (!id || typeof id !== 'string') {
      throw new Error('Plugin id is required');
    }
    if (this._plugins.has(id)) {
      this._logger.warn(`Plugin with id "${id}" is already registered. Skipping.`);
      return this._plugins.get(id).plugin;
    }
    if (typeof setup !== 'function') {
      throw new Error(`Plugin "${id}" must provide a setup function`);
    }

    const pluginLogger = createNamespacedLogger(this._logger, `plugin:${id}`);
    const storage = this._storageFactory ? this._storageFactory(id) : new MemoryStorage(`plugin:${id}`);
    const pluginMeta = { id, name: name || id, version: version || '0.0.0' };

    const baseContext = this._contextProvider ? this._contextProvider(pluginMeta, this) : {};
    const cleanups = [];

    const context = {
      ...baseContext,
      plugin: pluginMeta,
      manager: this,
      logger: pluginLogger,
      storage,
      events: {
        on: (event, handler) => this._emitter.on(event, handler),
        off: (event, handler) => this._emitter.off(event, handler),
        emit: (event, payload) => this._emitter.emit(event, payload),
      },
      contributions: {
        register: (areaName, payload) => this._addContribution(areaName, payload, pluginMeta),
        unregister: (areaName, predicate) => this._removeContributions(areaName, (item) => {
          if (item.__plugin.id !== pluginMeta.id) return false;
          return typeof predicate === 'function' ? predicate(item) : item.id === predicate;
        }),
        list: (areaName) => this.getContributions(areaName),
      },
      addCleanup: (fn) => {
        if (typeof fn === 'function') cleanups.push(fn);
      },
    };

    try {
      setup(context);
      this._plugins.set(id, { plugin, context, cleanups, logger: pluginLogger });
      this._emitter.emit('plugin-registered', { plugin: pluginMeta });
    } catch (error) {
      pluginLogger.error('Failed to initialize plugin', error);
      this._clearContributionsByPlugin(id);
      throw error;
    }

    return plugin;
  }

  unload(pluginId) {
    const entry = this._plugins.get(pluginId);
    if (!entry) return;
    const { cleanups } = entry;
    for (const dispose of cleanups) {
      try {
        dispose();
      } catch (error) {
        this._logger.error(`Error when disposing plugin "${pluginId}":`, error);
      }
    }
    this._clearContributionsByPlugin(pluginId);
    this._plugins.delete(pluginId);
    this._emitter.emit('plugin-unloaded', { pluginId });
  }

  on(event, handler) {
    return this._emitter.on(event, handler);
  }

  off(event, handler) {
    return this._emitter.off(event, handler);
  }

  emit(event, payload) {
    return this._emitter.emit(event, payload);
  }
}

export default HydrogenPluginManager;
