import { computed, inject, shallowReactive } from 'vue';

const PluginManagerSymbol = Symbol('HydrogenPluginManager');

class PluginManager {
  constructor() {
    this._plugins = [];
    this._slots = shallowReactive({});
    this._commands = new Map();
    this._cleanup = new Map();
    this._contextFactory = null;
  }

  register(plugin) {
    if (!plugin || !plugin.id) {
      console.warn('[PluginManager] Attempted to register an invalid plugin.', plugin);
      return;
    }
    if (this._plugins.find(existing => existing.id === plugin.id)) {
      console.warn(`[PluginManager] Plugin with id "${plugin.id}" is already registered.`);
      return;
    }
    this._plugins.push(plugin);
    if (this._contextFactory) {
      this._installPlugin(plugin);
    }
  }

  install(app, contextFactory) {
    this._contextFactory = contextFactory;
    for (const plugin of this._plugins) {
      this._installPlugin(plugin);
    }
    app.provide(PluginManagerSymbol, this);
  }

  _installPlugin(plugin) {
    if (this._cleanup.has(plugin.id)) {
      return;
    }
    const context = this._contextFactory?.(plugin) ?? {};
    const api = this._createPluginAPI(plugin.id);
    try {
      const dispose = plugin.setup?.(context, api);
      if (typeof dispose === 'function') {
        this._cleanup.set(plugin.id, dispose);
      }
    } catch (error) {
      console.error(`[PluginManager] Failed to initialize plugin "${plugin.id}":`, error);
    }
  }

  _createPluginAPI(pluginId) {
    return {
      registerUI: contribution => this._registerUI(pluginId, contribution),
      registerCommand: (commandId, handler) => this._registerCommand(pluginId, commandId, handler),
      hasCommand: commandId => this._commands.has(commandId),
      onDispose: callback => {
        if (!this._cleanup.has(pluginId)) {
          this._cleanup.set(pluginId, callback);
        } else {
          const previous = this._cleanup.get(pluginId);
          this._cleanup.set(pluginId, () => {
            try { previous?.(); } catch (error) { console.error(error); }
            try { callback?.(); } catch (error) { console.error(error); }
          });
        }
      },
    };
  }

  _registerUI(pluginId, contribution) {
    if (!contribution || !contribution.slot) {
      console.warn(`[PluginManager] Plugin "${pluginId}" attempted to register an invalid UI contribution`, contribution);
      return;
    }
    const slot = contribution.slot;
    const entry = {
      ...contribution,
      pluginId,
      key: contribution.key || `${pluginId}:${(this._slots[slot]?.length ?? 0) + 1}`,
      order: Number.isFinite(contribution.order) ? contribution.order : 0,
    };
    const list = this._slots[slot] ?? [];
    this._slots[slot] = [...list, entry];
  }

  _registerCommand(pluginId, commandId, handler) {
    if (!commandId || typeof handler !== 'function') {
      console.warn(`[PluginManager] Plugin "${pluginId}" attempted to register an invalid command`, commandId);
      return;
    }
    if (this._commands.has(commandId)) {
      console.warn(`[PluginManager] Command "${commandId}" is already registered.`);
      return;
    }
    this._commands.set(commandId, { handler, pluginId });
  }

  executeCommand(commandId, ...args) {
    const entry = this._commands.get(commandId);
    if (!entry) {
      console.warn(`[PluginManager] Command "${commandId}" is not registered.`);
      return undefined;
    }
    try {
      return entry.handler(...args);
    } catch (error) {
      console.error(`[PluginManager] Command "${commandId}" threw an error:`, error);
      return undefined;
    }
  }

  hasCommand(commandId) {
    return this._commands.has(commandId);
  }

  getSlot(slot) {
    return this._slots[slot] ?? [];
  }
}

export function createPluginManager() {
  return new PluginManager();
}

export function providePluginManager(app, manager, contextFactory) {
  manager.install(app, contextFactory);
}

export function usePluginManager() {
  const manager = inject(PluginManagerSymbol, null);
  if (!manager) {
    console.warn('[PluginManager] No plugin manager available in current context.');
  }
  return manager;
}

export function usePluginSlot(slot, contextGetter) {
  const manager = usePluginManager();
  return computed(() => {
    if (!manager) return [];
    const contributions = manager.getSlot(slot) || [];
    const context = contextGetter?.();
    return contributions
      .map(contribution => {
        const resolvedProps = typeof contribution.props === 'function'
          ? contribution.props(context)
          : (contribution.props || {});
        return {
          ...contribution,
          props: resolvedProps,
        };
      })
      .sort((a, b) => a.order - b.order);
  });
}

let activePluginManager = null;

export function setActivePluginManager(manager) {
  activePluginManager = manager;
}

export function getActivePluginManager() {
  return activePluginManager;
}
