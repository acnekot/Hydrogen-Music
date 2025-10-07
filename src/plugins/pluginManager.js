const DEFAULT_SCOPE = 'global'
const DEFAULT_STORAGE_KEY = 'hydrogen.plugins.settings'

export class PluginSettingsStore {
  constructor(options = {}) {
    const { storageKey = DEFAULT_STORAGE_KEY, storage = null } = options
    this.storageKey = storageKey
    this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null)
    this.state = { plugins: {} }
    this._load()
  }

  _load() {
    if (!this.storage) return
    try {
      const raw = this.storage.getItem(this.storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        const plugins = parsed.plugins
        if (plugins && typeof plugins === 'object') {
          this.state.plugins = { ...plugins }
        }
      }
    } catch (error) {
      console.warn('[PluginManager] Failed to parse stored plugin settings.', error)
    }
  }

  _persist() {
    if (!this.storage) return
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(this.state))
    } catch (error) {
      console.warn('[PluginManager] Failed to persist plugin settings.', error)
    }
  }

  getState(name) {
    return this.state.plugins?.[name] ?? null
  }

  setState(name, patch) {
    if (!name) return null
    const next = {
      ...(this.state.plugins?.[name] ?? {}),
      ...(patch ?? {})
    }
    if (next.removed) {
      next.enabled = false
    }
    if (!this.state.plugins || typeof this.state.plugins !== 'object') {
      this.state.plugins = {}
    }
    this.state.plugins[name] = next
    this._persist()
    return next
  }

  deleteState(name) {
    if (!name || !this.state.plugins) return
    if (this.state.plugins[name]) {
      delete this.state.plugins[name]
      this._persist()
    }
  }

  list() {
    return { ...(this.state.plugins ?? {}) }
  }

  export() {
    return JSON.parse(JSON.stringify(this.state))
  }

  import(payload, { merge = true } = {}) {
    if (!payload || typeof payload !== 'object') return
    const incoming = payload.plugins
    if (!incoming || typeof incoming !== 'object') return
    if (!merge) {
      this.state.plugins = {}
    }
    this.state.plugins = {
      ...(this.state.plugins ?? {}),
      ...incoming
    }
    this._persist()
  }
}

class HookRegistry {
  constructor() {
    this._hooks = new Map()
  }

  on(name, handler) {
    if (typeof handler !== 'function') {
      console.warn(`[PluginManager] Attempted to register non-function handler for hook "${name}".`)
      return () => {}
    }
    if (!this._hooks.has(name)) {
      this._hooks.set(name, new Set())
    }
    const handlers = this._hooks.get(name)
    handlers.add(handler)
    return () => this.off(name, handler)
  }

  off(name, handler) {
    const handlers = this._hooks.get(name)
    if (!handlers) return
    handlers.delete(handler)
    if (handlers.size === 0) {
      this._hooks.delete(name)
    }
  }

  async emit(name, payload, context) {
    const handlers = this._hooks.get(name)
    if (!handlers || handlers.size === 0) return []
    const executions = []
    handlers.forEach((handler) => {
      try {
        executions.push(Promise.resolve(handler(payload, context)))
      } catch (error) {
        console.error(`[PluginManager] Hook "${name}" handler failed:`, error)
      }
    })
    return Promise.all(executions)
  }
}

export class PluginManager {
  constructor(app, options = {}) {
    this.app = app
    this.router = options.router ?? null
    this.pinia = options.pinia ?? null
    this.scope = options.scope ?? DEFAULT_SCOPE
    this.plugins = new Map()
    this.hooks = new HookRegistry()
    this.settingsStore = options.settingsStore ?? new PluginSettingsStore({
      storageKey: options.settingsKey,
      storage: options.storage
    })
    this.moduleSources = new Map()
  }

  _normalizeSettingsEntry(plugin) {
    const entry = {
      label: '插件设置',
      open: null,
      route: null,
      path: null,
      href: null,
      hasEntry: false
    }
    if (!plugin || typeof plugin !== 'object') {
      return entry
    }

    const { settingsLabel } = plugin
    if (typeof settingsLabel === 'string' && settingsLabel.trim()) {
      entry.label = settingsLabel.trim()
    }

    const candidate = plugin.settings
    if (typeof candidate === 'function') {
      entry.open = candidate
    } else if (candidate && typeof candidate === 'object') {
      const { label, open, route, path, href } = candidate
      if (typeof label === 'string' && label.trim()) {
        entry.label = label.trim()
      }
      if (typeof open === 'function') {
        entry.open = open
      }
      if (route) {
        entry.route = route
      }
      if (path) {
        entry.path = path
      }
      if (href) {
        entry.href = href
      }
    }

    if (typeof plugin.openSettings === 'function') {
      entry.open = plugin.openSettings
    }

    entry.hasEntry = Boolean(entry.open || entry.route || entry.path || entry.href)
    return entry
  }

  loadFromModules(modules) {
    Object.entries(modules).forEach(([source, mod]) => {
      const plugin = mod?.default ?? mod?.plugin ?? mod
      if (!plugin) {
        console.warn(`[PluginManager] Module "${source}" did not export a plugin.`)
        return
      }
      this.registerPlugin(plugin, source)
    })
  }

  registerPlugin(plugin, source = 'inline') {
    if (!plugin || typeof plugin !== 'object') {
      console.warn('[PluginManager] Attempted to register invalid plugin:', plugin)
      return
    }
    const name = plugin.name ?? source
    if (!name) {
      console.warn('[PluginManager] Plugin is missing a name and cannot be registered.', plugin)
      return
    }
    if (this.plugins.has(name)) {
      console.warn(`[PluginManager] Plugin "${name}" is already registered.`)
      return
    }
    const storedState = this.settingsStore?.getState(name)
    this.moduleSources.set(name, { plugin, source })
    if (storedState?.removed) {
      return
    }
    const enabled = storedState?.enabled ?? (plugin.enabled !== false)
    this.plugins.set(name, {
      ...plugin,
      name,
      enabled,
      source,
      isActive: false,
      teardown: null,
      removable: plugin.removable !== false
    })
    if (this.settingsStore) {
      this.settingsStore.setState(name, {
        enabled,
        removed: false
      })
    }
  }

  getPlugin(name) {
    return this.plugins.get(name) ?? null
  }

  listPlugins() {
    return Array.from(this.plugins.values()).map((plugin) => {
      const { teardown, ...meta } = plugin
      return {
        ...meta,
        settingsEntry: this._normalizeSettingsEntry(plugin)
      }
    })
  }

  getContext() {
    return {
      app: this.app,
      router: this.router,
      pinia: this.pinia,
      manager: this,
      hooks: {
        on: this.hooks.on.bind(this.hooks),
        off: this.hooks.off.bind(this.hooks),
        emit: (name, payload) => this.emitHook(name, payload)
      }
    }
  }

  async emitHook(name, payload) {
    return this.hooks.emit(name, payload, this.getContext())
  }

  async activatePlugin(name) {
    const plugin = this.plugins.get(name)
    if (!plugin) {
      console.warn(`[PluginManager] Plugin "${name}" was not found.`)
      return
    }
    if (plugin.isActive) return
    if (plugin.enabled === false) return
    if (typeof plugin.setup !== 'function') {
      console.warn(`[PluginManager] Plugin "${name}" does not provide a setup function.`)
      plugin.isActive = true
      return
    }
    try {
      const teardown = await plugin.setup(this.getContext())
      if (typeof teardown === 'function') {
        plugin.teardown = teardown
      }
      plugin.isActive = true
    } catch (error) {
      console.error(`[PluginManager] Failed to activate plugin "${name}":`, error)
    }
  }

  async deactivatePlugin(name) {
    const plugin = this.plugins.get(name)
    if (!plugin || !plugin.isActive) return
    if (typeof plugin.teardown === 'function') {
      try {
        await plugin.teardown()
      } catch (error) {
        console.error(`[PluginManager] Failed to teardown plugin "${name}":`, error)
      }
    }
    plugin.isActive = false
  }

  async installAll() {
    const plugins = Array.from(this.plugins.values())
    for (const plugin of plugins) {
      if (plugin.enabled === false) continue
      await this.activatePlugin(plugin.name)
    }
  }

  async enablePlugin(name) {
    let plugin = this.plugins.get(name)
    if (!plugin) {
      plugin = this.restorePlugin(name)
    }
    if (plugin) {
      plugin.enabled = true
      this.settingsStore?.setState(name, { enabled: true, removed: false })
      await this.activatePlugin(name)
      return
    }
    this.settingsStore?.setState(name, { enabled: true, removed: false })
  }

  async disablePlugin(name) {
    let plugin = this.plugins.get(name)
    if (!plugin) {
      plugin = this.restorePlugin(name)
    }
    if (plugin) {
      plugin.enabled = false
      this.settingsStore?.setState(name, { enabled: false, removed: false })
      await this.deactivatePlugin(name)
      return
    }
    this.settingsStore?.setState(name, { enabled: false, removed: false })
  }

  async removePlugin(name, { forgetState = false } = {}) {
    const plugin = this.plugins.get(name)
    if (plugin) {
      if (plugin.removable === false) {
        console.warn(`[PluginManager] Plugin "${name}" is not removable.`)
        return
      }
      await this.deactivatePlugin(name)
      this.plugins.delete(name)
    }
    if (this.settingsStore) {
      if (forgetState) {
        this.settingsStore.deleteState(name)
        this.moduleSources.delete(name)
      } else {
        this.settingsStore.setState(name, { removed: true, enabled: false })
      }
    }
  }

  hasPluginSettings(name) {
    const plugin = this.plugins.get(name)
    if (!plugin) return false
    const entry = this._normalizeSettingsEntry(plugin)
    return entry.hasEntry
  }

  async openPluginSettings(name, options = {}) {
    const plugin = this.plugins.get(name)
    if (!plugin) {
      console.warn(`[PluginManager] Plugin "${name}" was not found.`)
      return
    }
    const entry = this._normalizeSettingsEntry(plugin)
    if (!entry.hasEntry) {
      console.warn(`[PluginManager] Plugin "${name}" does not expose settings.`)
      return
    }
    const context = {
      ...this.getContext(),
      plugin,
      options
    }
    try {
      if (typeof entry.open === 'function') {
        return await entry.open(context)
      }
      if (entry.route && this.router) {
        const target = typeof entry.route === 'function' ? entry.route(context) : entry.route
        if (target) {
          return await this.router.push(target)
        }
      }
      if (entry.path && this.router) {
        const target = typeof entry.path === 'function' ? entry.path(context) : entry.path
        if (target) {
          return await this.router.push(target)
        }
      }
      if (entry.href && typeof window !== 'undefined') {
        const target = typeof entry.href === 'function' ? entry.href(context) : entry.href
        if (target) {
          window.open(target, '_blank', 'noopener')
        }
      }
    } catch (error) {
      console.error(`[PluginManager] Failed to open settings for plugin "${name}":`, error)
      throw error
    }
  }

  restorePlugin(name) {
    const stored = this.settingsStore?.getState(name)
    if (stored?.removed) {
      this.settingsStore.setState(name, { removed: false })
    }
    if (this.plugins.has(name)) return this.plugins.get(name)
    const definition = this.moduleSources.get(name)
    if (definition) {
      this.registerPlugin(definition.plugin, definition.source)
      return this.plugins.get(name) ?? null
    }
    return null
  }

  exportSettings() {
    return this.settingsStore?.export() ?? { plugins: {} }
  }

  async importSettings(payload, options = {}) {
    const { merge = true, syncActivation = true } = options
    this.settingsStore?.import(payload, { merge })
    if (!syncActivation) return
    const state = this.settingsStore?.list() ?? {}
    await Promise.all(
      Object.entries(state).map(async ([name, meta]) => {
        if (meta.removed) {
          await this.removePlugin(name)
          return
        }
        if (meta.enabled) {
          await this.enablePlugin(name)
        } else {
          await this.disablePlugin(name)
        }
      })
    )
  }
}

const pluginModules = import.meta.glob('./modules/**/*.js', { eager: true })

export function createPluginManager(app, options = {}) {
  const manager = new PluginManager(app, options)
  manager.loadFromModules(pluginModules)
  return manager
}
