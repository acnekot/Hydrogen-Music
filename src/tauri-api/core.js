export const getTauriGlobal = () => {
  if (typeof window === 'undefined') return undefined
  return window.__TAURI__ || window.__TAURI_INTERNALS__ || undefined
}

export const toPromise = (value, fallback) => {
  try {
    if (value instanceof Promise) return value
    if (typeof value === 'undefined') return Promise.resolve(fallback)
    return Promise.resolve(value)
  } catch (error) {
    return Promise.resolve(fallback)
  }
}
