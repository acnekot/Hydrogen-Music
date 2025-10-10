import { computed, reactive } from 'vue'

function createEventBus() {
  const handlers = new Map()
  return {
    on(event, handler) {
      if (!handlers.has(event)) handlers.set(event, new Set())
      handlers.get(event).add(handler)
      return () => {
        this.off(event, handler)
      }
    },
    off(event, handler) {
      const set = handlers.get(event)
      if (!set) return
      set.delete(handler)
      if (set.size === 0) handlers.delete(event)
    },
    emit(event, payload) {
      const set = handlers.get(event)
      if (!set) return
      for (const handler of Array.from(set)) {
        try {
          handler(payload)
        } catch (error) {
          console.error('[HydrogenPluginManager] event handler error', event, error)
        }
      }
    },
    clear() {
      handlers.clear()
    }
  }
}

function normalizePlugin(plugin, index) {
  if (!plugin) {
    throw new Error('Invalid plugin definition at index ' + index)
  }
  const resolved = typeof plugin === 'function' ? plugin() : plugin
  if (!resolved || typeof resolved !== 'object') {
    throw new Error('Plugin must resolve to an object at index ' + index)
  }
  if (!resolved.id || typeof resolved.id !== 'string') {
    throw new Error('Plugin id is required: index ' + index)
  }
  return resolved
}

export function createPluginManager(baseContext = {}) {
  const eventBus = createEventBus()
  const plugins = new Map()
  const uiSlots = reactive({})
  const commands = new Map()
  const pluginCleanups = new Map()
  const sharedApis = new Map()

  function registerCleanup(pluginId, cleanup) {
    if (typeof cleanup !== 'function') return
    if (!pluginCleanups.has(pluginId)) pluginCleanups.set(pluginId, new Set())
    pluginCleanups.get(pluginId).add(cleanup)
  }

  function runPluginCleanup(pluginId) {
    const set = pluginCleanups.get(pluginId)
    if (!set) return
    for (const cleanup of Array.from(set)) {
      try { cleanup() } catch (error) {
        console.error('[HydrogenPluginManager] cleanup error', pluginId, error)
      }
    }
    pluginCleanups.delete(pluginId)
  }

  function createContext(pluginDescriptor) {
    const context = {
      ...baseContext,
      pluginId: pluginDescriptor.id,
      meta: pluginDescriptor.meta || {},
      emit: eventBus.emit,
      on: eventBus.on,
      off: eventBus.off,
      registerUI(slot, contribution) {
        if (!slot || typeof slot !== 'string') {
          throw new Error('UI slot name must be a non-empty string')
        }
        const normalized = {
          id: contribution?.id || `${pluginDescriptor.id}:${slot}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
          pluginId: pluginDescriptor.id,
          slot,
          component: contribution?.component,
          props: contribution?.props || {},
          order: Number.isFinite(contribution?.order) ? contribution.order : 0,
          meta: contribution?.meta || {}
        }
        if (!uiSlots[slot]) uiSlots[slot] = []
        const existingIndex = uiSlots[slot].findIndex(item => item.id === normalized.id)
        if (existingIndex >= 0) uiSlots[slot].splice(existingIndex, 1)
        uiSlots[slot].push(normalized)
      },
      unregisterUI(slot, id) {
        if (!slot || !uiSlots[slot]) return
        if (!id) {
          uiSlots[slot] = uiSlots[slot].filter(item => item.pluginId !== pluginDescriptor.id)
          return
        }
        uiSlots[slot] = uiSlots[slot].filter(item => item.id !== id)
      },
      registerCommand(name, handler) {
        if (!name || typeof name !== 'string') throw new Error('Command id must be a string')
        if (typeof handler !== 'function') throw new Error('Command handler must be a function')
        commands.set(name, { pluginId: pluginDescriptor.id, handler })
        registerCleanup(pluginDescriptor.id, () => {
          if (commands.get(name)?.pluginId === pluginDescriptor.id) commands.delete(name)
        })
      },
      expose(name, value) {
        if (!name || typeof name !== 'string') throw new Error('API name must be a string')
        sharedApis.set(name, { pluginId: pluginDescriptor.id, value })
        registerCleanup(pluginDescriptor.id, () => {
          if (sharedApis.get(name)?.pluginId === pluginDescriptor.id) sharedApis.delete(name)
        })
      },
      getExposed(name) {
        return sharedApis.get(name)?.value
      },
      onCleanup(cleanup) {
        registerCleanup(pluginDescriptor.id, cleanup)
      }
    }
    return context
  }

  function registerPlugin(plugin) {
    const descriptor = normalizePlugin(plugin, plugins.size)
    if (plugins.has(descriptor.id)) {
      console.warn(`[HydrogenPluginManager] plugin ${descriptor.id} already registered, skipping`)
      return plugins.get(descriptor.id).api
    }
    const context = createContext(descriptor)
    let api
    try {
      api = descriptor.setup?.(context) || {}
    } catch (error) {
      console.error('[HydrogenPluginManager] failed to setup plugin', descriptor.id, error)
      runPluginCleanup(descriptor.id)
      return {}
    }
    plugins.set(descriptor.id, { descriptor, api, context })
    eventBus.emit('plugin:registered', { id: descriptor.id, api })
    return api
  }

  function unregisterPlugin(pluginId) {
    const entry = plugins.get(pluginId)
    if (!entry) return
    try {
      entry.descriptor.teardown?.(entry.api)
    } catch (error) {
      console.error('[HydrogenPluginManager] plugin teardown error', pluginId, error)
    }
    runPluginCleanup(pluginId)
    Object.keys(uiSlots).forEach(slot => {
      uiSlots[slot] = uiSlots[slot].filter(item => item.pluginId !== pluginId)
    })
    for (const [name, value] of Array.from(commands.entries())) {
      if (value.pluginId === pluginId) commands.delete(name)
    }
    for (const [name, value] of Array.from(sharedApis.entries())) {
      if (value.pluginId === pluginId) sharedApis.delete(name)
    }
    plugins.delete(pluginId)
    eventBus.emit('plugin:unregistered', { id: pluginId })
  }

  return {
    registerPlugin,
    unregisterPlugin,
    registerPlugins(pluginList) {
      if (!Array.isArray(pluginList)) return
      pluginList.forEach(registerPlugin)
    },
    hasPlugin(id) {
      return plugins.has(id)
    },
    listPlugins() {
      return Array.from(plugins.keys())
    },
    useSlot(slot) {
      return computed(() => {
        const list = uiSlots[slot] || []
        return [...list].sort((a, b) => a.order - b.order)
      })
    },
    getSlot(slot) {
      const list = uiSlots[slot] || []
      return [...list].sort((a, b) => a.order - b.order)
    },
    invokeCommand(name, payload) {
      const command = commands.get(name)
      if (!command) {
        console.warn('[HydrogenPluginManager] command not found:', name)
        return undefined
      }
      try {
        return command.handler(payload)
      } catch (error) {
        console.error('[HydrogenPluginManager] command execution failed', name, error)
        return undefined
      }
    },
    expose(name, value) {
      sharedApis.set(name, { pluginId: 'core', value })
    },
    getExposed(name) {
      return sharedApis.get(name)?.value
    },
    emit: eventBus.emit,
    on: eventBus.on,
    off: eventBus.off,
    destroy() {
      for (const pluginId of Array.from(plugins.keys())) {
        unregisterPlugin(pluginId)
      }
      eventBus.clear()
      commands.clear()
      sharedApis.clear()
      Object.keys(uiSlots).forEach(slot => delete uiSlots[slot])
    }
  }
}
