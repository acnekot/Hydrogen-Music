import { getTauriGlobal, toPromise } from './core'

export const invoke = (command, args = {}) => {
  const tauri = getTauriGlobal()
  if (tauri && typeof tauri.invoke === 'function') {
    try {
      return tauri.invoke(command, args)
    } catch (error) {
      return Promise.reject(error)
    }
  }
  console.warn('[Tauri API Stub] invoke fallback', command, args)
  return Promise.resolve(null)
}

export const convertFileSrc = (path, options = {}) => {
  const tauri = getTauriGlobal()
  if (tauri && typeof tauri.convertFileSrc === 'function') {
    return tauri.convertFileSrc(path, options)
  }
  return path
}
