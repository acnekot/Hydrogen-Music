import { getTauriGlobal } from './core'

export const writeText = (text) => {
  const tauri = getTauriGlobal()
  if (tauri?.clipboard?.writeText) {
    try {
      const result = tauri.clipboard.writeText(text)
      return result instanceof Promise ? result : Promise.resolve(result)
    } catch (error) {
      console.warn('[Tauri API Stub] clipboard.writeText failed', error)
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }
  return Promise.resolve()
}

export default {
  writeText,
}
