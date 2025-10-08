import { getTauriGlobal } from './core'

export const open = (options = {}) => {
  const tauri = getTauriGlobal()
  if (tauri?.dialog?.open) {
    try {
      const result = tauri.dialog.open(options)
      return result instanceof Promise ? result : Promise.resolve(result)
    } catch (error) {
      console.warn('[Tauri API Stub] dialog.open failed', error)
    }
  }
  console.warn('[Tauri API Stub] dialog.open fallback returning null')
  return Promise.resolve(null)
}

export default {
  open,
}
