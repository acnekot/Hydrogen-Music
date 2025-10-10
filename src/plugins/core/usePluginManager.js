import { inject } from 'vue'
import { PLUGIN_MANAGER_KEY } from './injectionKeys'

export function usePluginManager() {
  const manager = inject(PLUGIN_MANAGER_KEY, null)
  if (!manager) {
    throw new Error('Hydrogen plugin manager has not been provided. Make sure it is created during app bootstrap.')
  }
  return manager
}
