import { getTauriGlobal } from './core'
import { invoke } from './tauri'

export const open = (target) => {
  if (!target) return Promise.resolve()
  const tauri = getTauriGlobal()
  if (tauri?.shell?.open) {
    try {
      const result = tauri.shell.open(target)
      return result instanceof Promise ? result : Promise.resolve(result)
    } catch (error) {
      console.warn('[Tauri API Stub] shell.open failed', error)
    }
  }
  return invoke('tauri://shell-open', { uri: target }).catch((error) => {
    console.warn('[Tauri API Stub] shell.open fallback failed', error)
    return null
  })
}

export default {
  open,
}
