import { reactive, computed, readonly } from 'vue'

const registry = reactive({})

export function providePluginService(id, service) {
    if (!id) return
    registry[id] = service
}

export function removePluginService(id) {
    if (!id) return
    if (Object.prototype.hasOwnProperty.call(registry, id)) {
        delete registry[id]
    }
}

export function getPluginService(id) {
    if (!id) return null
    return registry[id] || null
}

export function usePluginService(id) {
    return computed(() => (id ? registry[id] || null : null))
}

export function listPluginServices() {
    return readonly(registry)
}
