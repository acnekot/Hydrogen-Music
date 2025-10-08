import { getTauriGlobal } from './core'
import { invoke } from './tauri'

const callWindowCommand = (label) => {
  const tauri = getTauriGlobal()
  const appWindow = tauri?.window?.appWindow
  if (appWindow && typeof appWindow[label] === 'function') {
    try {
      const result = appWindow[label]()
      return result instanceof Promise ? result : Promise.resolve(result)
    } catch (error) {
      console.warn('[Tauri API Stub] window command failed', label, error)
    }
  }
  const commandMap = {
    minimize: 'tauri://minimize',
    maximize: 'tauri://maximize',
    unmaximize: 'tauri://unmaximize',
    close: 'tauri://close',
    isMaximized: 'tauri://isMaximized',
  }
  const command = commandMap[label]
  if (command) {
    return invoke(command)
  }
  return Promise.resolve(label === 'isMaximized' ? false : null)
}

export const appWindow = {
  minimize: () => callWindowCommand('minimize'),
  maximize: () => callWindowCommand('maximize'),
  unmaximize: () => callWindowCommand('unmaximize'),
  isMaximized: () => callWindowCommand('isMaximized').then((result) => !!result),
  close: () => callWindowCommand('close'),
}

export default {
  appWindow,
}
