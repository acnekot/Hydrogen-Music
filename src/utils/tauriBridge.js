const isTauri = typeof window !== 'undefined' && typeof window.__TAURI__ !== 'undefined'

const invoke = isTauri ? window.__TAURI__.invoke : () => Promise.reject(new Error('Tauri API unavailable'))
const listen = isTauri ? window.__TAURI__.event.listen : () => Promise.resolve({ unsubscribe: () => {} })
const emit = isTauri ? window.__TAURI__.event.emit : () => Promise.resolve()

const noop = () => {}

const localMusicFilesListeners = []
const localMusicCountListeners = []

function fireLocalMusic(payload) {
  const event = { payload }
  localMusicFilesListeners.forEach(cb => {
    try { cb(event, payload) } catch (_) {}
  })
  const total = typeof payload?.count === 'number' ? payload.count : 0
  localMusicCountListeners.forEach(cb => {
    try { cb(event, total) } catch (_) {}
  })
}

function parseJson(input) {
  if (typeof input === 'string') {
    try { return JSON.parse(input) } catch (_) { return null }
  }
  return input
}

if (isTauri) {
  const windowApi = {
    windowMin: () => invoke('window_min'),
    windowMax: () => invoke('window_max'),
    windowClose: () => invoke('window_close'),
    toRegister: (url) => invoke('open_external', { url }),
    beforeQuit: (callback) => listen('player-save', callback),
    exitApp: (playlist) => invoke('save_last_playlist', { playlist: parseJson(playlist) }).then(() => invoke('window_close')),
    startDownload: () => emit('download-next'),
    download: (payload) => invoke('http_request', { request: { url: payload?.url } }),
    downloadNext: (callback) => listen('download-next', callback),
    downloadProgress: (callback) => listen('download-progress', callback),
    downloadPause: noop,
    downloadResume: noop,
    downloadCancel: noop,
    lyricControl: (callback) => listen('lyric-control', callback),
    scanLocalMusic: (params) => invoke('scan_local_music', { params }).then(result => fireLocalMusic(result)),
    localMusicFiles: (callback) => { if (typeof callback === 'function') localMusicFilesListeners.push(callback) },
    localMusicCount: (callback) => { if (typeof callback === 'function') localMusicCountListeners.push(callback) },
    getLocalMusicImage: (filePath) => invoke('get_local_music_image', { path: filePath }),
    playOrPauseMusic: (callback) => listen('music-playing-control', callback),
    playOrPauseMusicCheck: (playing) => emit('music-playing-check', playing),
    lastOrNextMusic: (callback) => listen('music-song-control', callback),
    changeMusicPlaymode: (callback) => listen('music-playmode-control', callback),
    changeTrayMusicPlaymode: (mode) => emit('music-playmode-tray-change', mode),
    volumeUp: (callback) => listen('music-volume-up', callback),
    volumeDown: (callback) => listen('music-volume-down', callback),
    musicProcessControl: (callback) => listen('music-process-control', callback),
    hidePlayer: (callback) => listen('hide-player', callback),
    setSettings: (settings) => invoke('set_settings', { settings: parseJson(settings) }),
    getSettings: () => invoke('get_settings'),
    openFile: () => invoke('dialog_open_directory'),
    openImageFile: () => invoke('dialog_open_image'),
    clearLocalMusicData: (kind) => invoke('clear_local_music_data', { kind }),
    registerShortcuts: () => invoke('register_shortcuts'),
    unregisterShortcuts: () => invoke('unregister_shortcuts'),
    getLastPlaylist: () => invoke('get_last_playlist'),
    openLocalFolder: (path) => invoke('open_external', { url: path }),
    saveLastPlaylist: (playlist) => invoke('save_last_playlist', { playlist: parseJson(playlist) }),
    getRequestData: (request) => invoke('http_request', { request }),
    getBiliVideo: () => Promise.resolve('unsupported'),
    downloadVideoProgress: (callback) => listen('download-video-progress', callback),
    cancelDownloadMusicVideo: noop,
    musicVideoIsExists: () => Promise.resolve(false),
    clearUnusedVideo: () => Promise.resolve(false),
    deleteMusicVideo: () => Promise.resolve(false),
    getLocalMusicLyric: () => Promise.resolve(false),
    copyTxt: (txt) => invoke('copy_text', { text: txt }),
    checkUpdate: (callback) => listen('check-update', callback),
    manualUpdateAvailable: (callback) => listen('manual-update-available', (event) => callback?.(event.payload?.version, event.payload?.url)),
    updateNotAvailable: (callback) => listen('update-not-available', callback),
    updateDownloadProgress: (callback) => listen('update-download-progress', callback),
    updateDownloaded: (callback) => listen('update-downloaded', callback),
    updateError: (callback) => listen('update-error', callback),
    checkForUpdate: () => emit('check-for-update'),
    downloadUpdate: () => emit('download-update'),
    installUpdate: () => emit('install-update'),
    cancelUpdate: () => emit('cancel-update'),
    setWindowTile: (title) => invoke('set_window_title', { title }),
    updatePlaylistStatus: (status) => emit('music-playlist-status', status),
    updateDockMenu: (songInfo) => emit('update-dock-menu', songInfo),
  }

  const electronAPI = {
    clearNeteaseSession: () => Promise.resolve(),
    openKugouLogin: () => Promise.resolve(),
    clearKugouSession: () => Promise.resolve(),
    openNeteaseLogin: () => Promise.resolve(),
    clearLoginSession: () => Promise.resolve(),
    createLyricWindow: () => Promise.resolve(false),
    closeLyricWindow: () => Promise.resolve(false),
    setLyricWindowMovable: () => Promise.resolve(),
    lyricWindowReady: () => emit('lyric-window-ready'),
    onLyricUpdate: (callback) => listen('lyric-update', callback),
    requestLyricData: () => emit('request-lyric-data'),
    updateLyricData: (data) => emit('update-lyric-data', data),
    getCurrentLyricData: (callback) => listen('get-current-lyric-data', callback),
    sendCurrentLyricData: (data) => emit('current-lyric-data', data),
    isLyricWindowVisible: () => Promise.resolve(false),
    resizeWindow: () => Promise.resolve(),
    notifyLyricWindowClosed: () => emit('lyric-window-closed'),
    onDesktopLyricClosed: (callback) => listen('desktop-lyric-closed', callback),
    getLyricWindowBounds: () => Promise.resolve(null),
    moveLyricWindow: () => Promise.resolve(),
    moveLyricWindowBy: () => Promise.resolve(),
    setLyricWindowResizable: () => Promise.resolve(),
    moveLyricWindowTo: () => Promise.resolve(),
    getLyricWindowMinMax: () => Promise.resolve(null),
    setLyricWindowMinMax: () => Promise.resolve(),
    setLyricWindowAspectRatio: () => Promise.resolve(),
    getLyricWindowContentBounds: () => Promise.resolve(null),
    moveLyricWindowContentTo: () => Promise.resolve(),
  }

  window.windowApi = windowApi
  window.electronAPI = electronAPI
} else {
  window.windowApi = {
    windowMin: noop,
    windowMax: noop,
    windowClose: noop,
    toRegister: (url) => window.open(url, '_blank'),
    beforeQuit: noop,
    exitApp: noop,
    startDownload: noop,
    download: noop,
    downloadNext: noop,
    downloadProgress: noop,
    downloadPause: noop,
    downloadResume: noop,
    downloadCancel: noop,
    lyricControl: noop,
    scanLocalMusic: noop,
    localMusicFiles: noop,
    localMusicCount: noop,
    getLocalMusicImage: () => Promise.resolve(null),
    playOrPauseMusic: noop,
    playOrPauseMusicCheck: noop,
    lastOrNextMusic: noop,
    changeMusicPlaymode: noop,
    changeTrayMusicPlaymode: noop,
    volumeUp: noop,
    volumeDown: noop,
    musicProcessControl: noop,
    hidePlayer: noop,
    setSettings: noop,
    getSettings: () => Promise.resolve(defaultSettings()),
    openFile: () => Promise.resolve(null),
    openImageFile: () => Promise.resolve(null),
    clearLocalMusicData: noop,
    registerShortcuts: noop,
    unregisterShortcuts: noop,
    getLastPlaylist: () => Promise.resolve(null),
    openLocalFolder: noop,
    saveLastPlaylist: noop,
    getRequestData: () => Promise.resolve(null),
    getBiliVideo: () => Promise.resolve('unsupported'),
    downloadVideoProgress: noop,
    cancelDownloadMusicVideo: noop,
    musicVideoIsExists: () => Promise.resolve(false),
    clearUnusedVideo: () => Promise.resolve(false),
    deleteMusicVideo: () => Promise.resolve(false),
    getLocalMusicLyric: () => Promise.resolve(false),
    copyTxt: noop,
    checkUpdate: noop,
    manualUpdateAvailable: noop,
    updateNotAvailable: noop,
    updateDownloadProgress: noop,
    updateDownloaded: noop,
    updateError: noop,
    checkForUpdate: noop,
    downloadUpdate: noop,
    installUpdate: noop,
    cancelUpdate: noop,
    setWindowTile: noop,
    updatePlaylistStatus: noop,
    updateDockMenu: noop,
  }

  window.electronAPI = {
    clearNeteaseSession: () => Promise.resolve(),
    openKugouLogin: () => Promise.resolve(),
    clearKugouSession: () => Promise.resolve(),
    openNeteaseLogin: () => Promise.resolve(),
    clearLoginSession: () => Promise.resolve(),
    createLyricWindow: () => Promise.resolve(false),
    closeLyricWindow: () => Promise.resolve(false),
    setLyricWindowMovable: noop,
    lyricWindowReady: noop,
    onLyricUpdate: noop,
    requestLyricData: noop,
    updateLyricData: noop,
    getCurrentLyricData: noop,
    sendCurrentLyricData: noop,
    isLyricWindowVisible: () => Promise.resolve(false),
    resizeWindow: noop,
    notifyLyricWindowClosed: noop,
    onDesktopLyricClosed: noop,
    getLyricWindowBounds: () => Promise.resolve(null),
    moveLyricWindow: noop,
    moveLyricWindowBy: noop,
    setLyricWindowResizable: noop,
    moveLyricWindowTo: noop,
    getLyricWindowMinMax: () => Promise.resolve(null),
    setLyricWindowMinMax: noop,
    setLyricWindowAspectRatio: noop,
    getLyricWindowContentBounds: () => Promise.resolve(null),
    moveLyricWindowContentTo: noop,
  }
}

function defaultSettings() {
  return {
    music: {
      level: 'standard',
      lyricSize: '20',
      tlyricSize: '14',
      rlyricSize: '12',
      lyricInterlude: 13
    },
    local: {
      videoFolder: null,
      downloadFolder: null,
      localFolder: []
    },
    shortcuts: [
      {
        id: 'play',
        name: '播放/暂停',
        shortcut: 'CommandOrControl+P',
        globalShortcut: 'CommandOrControl+Alt+P'
      },
      {
        id: 'last',
        name: '上一首',
        shortcut: 'CommandOrControl+Left',
        globalShortcut: 'CommandOrControl+Alt+Left'
      },
      {
        id: 'next',
        name: '下一首',
        shortcut: 'CommandOrControl+Right',
        globalShortcut: 'CommandOrControl+Alt+Right'
      },
      {
        id: 'volumeUp',
        name: '增加音量',
        shortcut: 'CommandOrControl+Up',
        globalShortcut: 'CommandOrControl+Alt+Up'
      },
      {
        id: 'volumeDown',
        name: '少音量',
        shortcut: 'CommandOrControl+Down',
        globalShortcut: 'CommandOrControl+Alt+Down'
      },
      {
        id: 'processForward',
        name: '快进(3s)',
        shortcut: 'CommandOrControl+]',
        globalShortcut: 'CommandOrControl+Alt+]'
      },
      {
        id: 'processBack',
        name: '后退(3s)',
        shortcut: 'CommandOrControl+[',
        globalShortcut: 'CommandOrControl+Alt+['
      }
    ],
    other: {
      globalShortcuts: true,
      quitApp: 'minimize'
    }
  }
}
