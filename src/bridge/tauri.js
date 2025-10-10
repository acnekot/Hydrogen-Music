import { appWindow } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/tauri'
import { open as openExternal } from '@tauri-apps/api/shell'
import { open as openDialog } from '@tauri-apps/api/dialog'
import { writeText } from '@tauri-apps/api/clipboard'

const STORAGE_KEYS = {
  settings: 'hydrogen-settings',
  lastPlaylist: 'hydrogen-last-playlist',
}

const DEFAULT_SETTINGS = Object.freeze({
  music: {
    level: 'standard',
    lyricSize: 28,
    tlyricSize: 24,
    rlyricSize: 24,
    lyricInterlude: 0,
  },
  local: {
    videoFolder: '',
    downloadFolder: '',
    localFolder: [],
  },
  shortcuts: [],
  other: {
    globalShortcuts: true,
    quitApp: false,
  },
})
const resolved = (value) => Promise.resolve(value)
const warnStub = (name) => (...args) => {
  console.warn(`[windowApi] ${name} 尚未在 Tauri 版本中实现`, args)
  return Promise.resolve(null)
}

async function toggleWindowMaximize() {
  const maximized = await appWindow.isMaximized()
  if (maximized) {
    await appWindow.unmaximize()
  } else {
    await appWindow.maximize()
  }
}

const mapPluginDescriptor = (item) => ({
  id: item.id,
  name: item.name,
  version: item.version,
  description: item.description ?? '',
  author: item.author ?? '',
  entry: item.entry ?? null,
  entryUrl: item.entry_url ?? null,
  path: item.path,
  enabled: !!item.enabled,
  broken: !!item.broken,
  error: item.error ?? null,
})

const pluginApi = {
  async list() {
    const response = await invoke('plugins_list')
    return Array.isArray(response) ? response.map(mapPluginDescriptor) : []
  },
  async selectPackage() {
    const result = await invoke('plugins_select_package')
    return result ?? null
  },
  async install(sourcePath) {
    if (!sourcePath) return null
    const descriptor = await invoke('plugins_install', { sourcePath })
    return mapPluginDescriptor(descriptor)
  },
  async uninstall(pluginId) {
    if (!pluginId) return
    await invoke('plugins_remove', { pluginId })
  },
  async setEnabled(pluginId, enabled) {
    await invoke('plugins_set_enabled', { pluginId, enabled })
  },
  async getEntry(pluginId) {
    const payload = await invoke('plugins_get_entry', { pluginId })
    return {
      entryUrl: payload.entry_url,
      entryPath: payload.entry_path,
      mimeType: payload.mime_type,
    }
  },
  async getDirectory() {
    const info = await invoke('plugins_get_directory')
    return {
      directory: info.directory,
      defaultDirectory: info.default_directory,
    }
  },
  async setDirectory(directoryPath) {
    const info = await invoke('plugins_set_directory', {
      directory: directoryPath ?? null,
    })
    return {
      directory: info.directory,
      defaultDirectory: info.default_directory,
    }
  },
  async selectDirectory() {
    const info = await invoke('plugins_select_directory')
    if (!info) return null
    return {
      directory: info.directory,
      defaultDirectory: info.default_directory,
    }
  },
}

const readSettings = () => {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw)
    return {
      music: { ...DEFAULT_SETTINGS.music, ...(parsed.music || {}) },
      local: { ...DEFAULT_SETTINGS.local, ...(parsed.local || {}) },
      shortcuts: Array.isArray(parsed.shortcuts) ? parsed.shortcuts : [],
      other: { ...DEFAULT_SETTINGS.other, ...(parsed.other || {}) },
    }
  } catch (error) {
    console.warn('[windowApi] 读取设置失败，将使用默认设置', error)
    return { ...DEFAULT_SETTINGS }
  }
}

const writeSettings = (settings) => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings))
  } catch (error) {
    console.warn('[windowApi] 保存设置失败', error)
  }
}

const electronBridge = {
  getPluginPath: async () => {
    const info = await invoke('get_plugin_path')
    return {
      directory: info.directory,
      defaultDirectory: info.default_directory,
    }
  },
  setPluginPath: async (directoryPath) => {
    const info = await invoke('set_plugin_path', {
      directory: directoryPath ?? null,
    })
    return {
      directory: info.directory,
      defaultDirectory: info.default_directory,
    }
  },
  createLyricWindow: warnStub('createLyricWindow'),
  closeLyricWindow: warnStub('closeLyricWindow'),
  setLyricWindowMovable: warnStub('setLyricWindowMovable'),
  lyricWindowReady: warnStub('lyricWindowReady'),
  onLyricUpdate: warnStub('onLyricUpdate'),
  requestLyricData: warnStub('requestLyricData'),
  updateLyricData: warnStub('updateLyricData'),
  getCurrentLyricData: warnStub('getCurrentLyricData'),
}

const windowApi = {
  windowMin: () => appWindow.minimize(),
  windowMax: () => toggleWindowMaximize(),
  windowClose: () => appWindow.close(),
  toRegister: (url) => (url ? openExternal(url) : resolved()),
  beforeQuit: warnStub('beforeQuit'),
  exitApp: warnStub('exitApp'),
  startDownload: warnStub('startDownload'),
  download: warnStub('download'),
  downloadNext: warnStub('downloadNext'),
  downloadProgress: warnStub('downloadProgress'),
  downloadPause: warnStub('downloadPause'),
  downloadResume: warnStub('downloadResume'),
  downloadCancel: warnStub('downloadCancel'),
  lyricControl: warnStub('lyricControl'),
  scanLocalMusic: warnStub('scanLocalMusic'),
  localMusicFiles: warnStub('localMusicFiles'),
  localMusicCount: warnStub('localMusicCount'),
  getLocalMusicImage: warnStub('getLocalMusicImage'),
  playOrPauseMusic: warnStub('playOrPauseMusic'),
  playOrPauseMusicCheck: warnStub('playOrPauseMusicCheck'),
  lastOrNextMusic: warnStub('lastOrNextMusic'),
  changeMusicPlaymode: warnStub('changeMusicPlaymode'),
  changeTrayMusicPlaymode: warnStub('changeTrayMusicPlaymode'),
  volumeUp: warnStub('volumeUp'),
  volumeDown: warnStub('volumeDown'),
  musicProcessControl: warnStub('musicProcessControl'),
  hidePlayer: warnStub('hidePlayer'),
  setSettings: (payload) => {
    try {
      const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload
      writeSettings({
        music: { ...DEFAULT_SETTINGS.music, ...(parsed.music || {}) },
        local: { ...DEFAULT_SETTINGS.local, ...(parsed.local || {}) },
        shortcuts: Array.isArray(parsed.shortcuts) ? parsed.shortcuts : [],
        other: { ...DEFAULT_SETTINGS.other, ...(parsed.other || {}) },
      })
    } catch (error) {
      console.error('[windowApi] 保存设置失败', error)
    }
    return resolved()
  },
  getSettings: () => resolved(readSettings()),
  openFile: async () => {
    const selection = await openDialog({ multiple: false })
    if (Array.isArray(selection)) return selection[0] || null
    return selection ?? null
  },
  openImageFile: async () => {
    const selection = await openDialog({
      multiple: false,
      filters: [
        {
          name: 'Images',
          extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
        },
      ],
    })
    if (Array.isArray(selection)) return selection[0] || null
    return selection ?? null
  },
  clearLocalMusicData: (scope) => {
    if (typeof localStorage === 'undefined') return resolved()
    const keys = {
      downloaded: 'hydrogen-downloaded-music',
      local: 'hydrogen-local-music',
    }
    const key = scope && keys[scope]
    if (key) {
      try {
        localStorage.removeItem(key)
      } catch (error) {
        console.warn('[windowApi] 清理本地音乐缓存失败', error)
      }
    }
    return resolved()
  },
  registerShortcuts: warnStub('registerShortcuts'),
  unregisterShortcuts: warnStub('unregisterShortcuts'),
  getLastPlaylist: () => {
    if (typeof localStorage === 'undefined') return resolved(null)
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.lastPlaylist)
      return resolved(raw ? JSON.parse(raw) : null)
    } catch (error) {
      console.warn('[windowApi] 读取上次播放列表失败', error)
      return resolved(null)
    }
  },
  openLocalFolder: (targetPath) => {
    if (!targetPath) return resolved()
    return openExternal(targetPath)
  },
  saveLastPlaylist: (payload) => {
    if (typeof localStorage === 'undefined') return resolved()
    try {
      const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload || [])
      localStorage.setItem(STORAGE_KEYS.lastPlaylist, serialized)
    } catch (error) {
      console.warn('[windowApi] 保存上次播放列表失败', error)
    }
    return resolved()
  },
  getRequestData: warnStub('getRequestData'),
  getBiliVideo: warnStub('getBiliVideo'),
  downloadVideoProgress: warnStub('downloadVideoProgress'),
  cancelDownloadMusicVideo: warnStub('cancelDownloadMusicVideo'),
  musicVideoIsExists: warnStub('musicVideoIsExists'),
  clearUnusedVideo: warnStub('clearUnusedVideo'),
  deleteMusicVideo: warnStub('deleteMusicVideo'),
  getLocalMusicLyric: warnStub('getLocalMusicLyric'),
  copyTxt: async (text) => {
    if (typeof text !== 'string') return resolved()
    try {
      await writeText(text)
    } catch (error) {
      console.warn('[windowApi] 复制文本失败', error)
    }
    return resolved()
  },
  checkUpdate: warnStub('checkUpdate'),
  manualUpdateAvailable: warnStub('manualUpdateAvailable'),
  updateNotAvailable: warnStub('updateNotAvailable'),
  updateDownloadProgress: warnStub('updateDownloadProgress'),
  updateDownloaded: warnStub('updateDownloaded'),
  updateError: warnStub('updateError'),
  checkForUpdate: warnStub('checkForUpdate'),
  downloadUpdate: warnStub('downloadUpdate'),
  installUpdate: warnStub('installUpdate'),
  cancelUpdate: warnStub('cancelUpdate'),
  setWindowTile: warnStub('setWindowTile'),
  updatePlaylistStatus: warnStub('updatePlaylistStatus'),
  updateDockMenu: warnStub('updateDockMenu'),
  plugins: pluginApi,
}

if (typeof window !== 'undefined') {
  window.windowApi = windowApi
  window.electronAPI = electronBridge
}

export {}
