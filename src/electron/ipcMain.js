const { ipcMain, shell, dialog, globalShortcut, Menu, clipboard, BrowserWindow, session } = require('electron')
const axios = require('axios')
const fs = require('fs')
const fsExtra = require('fs-extra')
const path = require('path')
const { pathToFileURL } = require('url')
const { parseFile } = require('music-metadata')
// const jsmediatags = require("jsmediatags");
const registerShortcuts = require('./shortcuts')
const Store = require('electron-store')
const CancelToken = axios.CancelToken
let cancel = null

module.exports = IpcMainEvent = (win, app, lyricFunctions = {}) => {
    const settingsStore = new Store({ name: 'settings' })
    const lastPlaylistStore = new Store({ name: 'lastPlaylist' })
    const musicVideoStore = new Store({ name: 'musicVideo' })
    const pluginStateStore = new Store({ name: 'plugins' })

    const pluginDirectory = path.join(app.getPath('userData'), 'plugins')

    const ensurePluginDirectory = () => {
        try {
            fs.mkdirSync(pluginDirectory, { recursive: true })
        } catch (_) {}
    }

    ensurePluginDirectory()

    const readPluginManifest = (directory) => {
        const manifestPath = path.join(directory, 'plugin.json')
        if (!fs.existsSync(manifestPath)) {
            throw new Error('缺少 plugin.json 文件')
        }
        const raw = fs.readFileSync(manifestPath, 'utf-8')
        const manifest = JSON.parse(raw)
        if (!manifest.id) {
            throw new Error('插件 manifest 缺少 id 字段')
        }
        if (!manifest.entry) {
            manifest.entry = 'index.js'
        }
        return manifest
    }

    const resolvePluginEntryPath = (directory, manifest) => {
        const entryPath = path.join(directory, manifest.entry)
        if (!fs.existsSync(entryPath)) {
            throw new Error(`入口文件不存在: ${manifest.entry}`)
        }
        return entryPath
    }

    const getPluginStateMap = () => {
        const stored = pluginStateStore.get('plugins')
        if (stored && typeof stored === 'object') return stored
        return {}
    }

    const setPluginStateMap = (state) => {
        pluginStateStore.set('plugins', state)
    }

    const updatePluginEnabledState = (pluginId, enabled) => {
        const state = getPluginStateMap()
        state[pluginId] = { ...(state[pluginId] || {}), enabled: !!enabled }
        setPluginStateMap(state)
    }

    const removePluginState = (pluginId) => {
        const state = getPluginStateMap()
        if (pluginId in state) {
            delete state[pluginId]
            setPluginStateMap(state)
        }
    }

    const copyPluginPackage = async (source, destination) => {
        await fsExtra.copy(source, destination, {
            overwrite: true,
            errorOnExist: false,
            dereference: false,
        })
    }

    // 桌面歌词窗口管理
    let globalLyricWindow = null

    const getLyricWindowInstance = () => {
        if (globalLyricWindow && !globalLyricWindow.isDestroyed()) {
            return globalLyricWindow
        }
        globalLyricWindow = null
        return null
    }

    const normalizeWindowNumber = (value, fallback) => {
        if (typeof value !== 'number') return typeof fallback === 'number' ? Math.round(fallback) : undefined
        if (!Number.isFinite(value)) return typeof fallback === 'number' ? Math.round(fallback) : undefined
        return Math.round(value)
    }

    const createLyricWindowInstance = (rawOptions = {}) => {
        const existing = getLyricWindowInstance()
        if (existing) {
            if (rawOptions && rawOptions.bounds) {
                const nextBounds = rawOptions.bounds
                const next = {
                    x: normalizeWindowNumber(nextBounds.x, undefined),
                    y: normalizeWindowNumber(nextBounds.y, undefined),
                    width: normalizeWindowNumber(nextBounds.width, existing.getBounds().width),
                    height: normalizeWindowNumber(nextBounds.height, existing.getBounds().height),
                }
                existing.setBounds({
                    x: typeof next.x === 'number' ? next.x : existing.getBounds().x,
                    y: typeof next.y === 'number' ? next.y : existing.getBounds().y,
                    width: Math.max(260, next.width || existing.getBounds().width),
                    height: Math.max(140, next.height || existing.getBounds().height),
                })
            }
            if (rawOptions && rawOptions.focus !== false) {
                existing.focus()
            }
            return existing
        }

        const htmlPath = rawOptions && rawOptions.htmlPath ? path.resolve(rawOptions.htmlPath) : null
        if (!htmlPath || !fs.existsSync(htmlPath)) {
            throw new Error('桌面歌词窗口资源不存在')
        }

        const requestedBounds = rawOptions.bounds || {}
        const width = Math.max(260, normalizeWindowNumber(rawOptions.width, requestedBounds.width ?? 520))
        const height = Math.max(140, normalizeWindowNumber(rawOptions.height, requestedBounds.height ?? 180))
        const minWidth = Math.max(260, normalizeWindowNumber(rawOptions.minWidth, rawOptions.minWidth ?? 320))
        const minHeight = Math.max(140, normalizeWindowNumber(rawOptions.minHeight, rawOptions.minHeight ?? 160))
        const positionX = normalizeWindowNumber(rawOptions.x, requestedBounds.x)
        const positionY = normalizeWindowNumber(rawOptions.y, requestedBounds.y)
        const alwaysOnTop = rawOptions.alwaysOnTop !== false
        const resizable = rawOptions.resizable !== false
        const backgroundColor = typeof rawOptions.backgroundColor === 'string' ? rawOptions.backgroundColor : '#11131a'
        const transparent = rawOptions.transparent === true

        const browserOptions = {
            width,
            height,
            minWidth,
            minHeight,
            frame: false,
            resizable,
            movable: true,
            alwaysOnTop,
            skipTaskbar: rawOptions.skipTaskbar !== false,
            transparent,
            backgroundColor,
            hasShadow: true,
            show: false,
            titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
            webPreferences: {
                preload: path.resolve(__dirname, './preload.js'),
                contextIsolation: true,
                nodeIntegration: false,
            },
        }

        const lyricWindow = new BrowserWindow(browserOptions)
        lyricWindow.setMenuBarVisibility(false)
        lyricWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
        if (alwaysOnTop) {
            lyricWindow.setAlwaysOnTop(true, 'screen-saver')
        }
        if (typeof rawOptions.opacity === 'number' && rawOptions.opacity > 0 && rawOptions.opacity <= 1) {
            lyricWindow.setOpacity(rawOptions.opacity)
        }
        lyricWindow.loadFile(htmlPath)
        lyricWindow.once('ready-to-show', () => {
            if (typeof positionX === 'number' && typeof positionY === 'number') {
                lyricWindow.setPosition(positionX, positionY)
            }
            lyricWindow.showInactive()
        })
        lyricWindow.on('closed', () => {
            globalLyricWindow = null
            try {
                win.webContents.send('desktop-lyric-closed')
            } catch (_) {
                // ignore if main window is not available
            }
        })

        globalLyricWindow = lyricWindow
        return lyricWindow
    }

    const closeLyricWindowInstance = () => {
        const instance = getLyricWindowInstance()
        if (instance) {
            instance.close()
        }
    }
    // win.on('restore', () => {
    // win.webContents.send('lyric-control')
    // })
    ipcMain.on('window-min', () => {
        win.minimize()
    })
    // 保存窗口的原始状态
    let savedBounds = null
    let isWindowMaximized = false

    ipcMain.on('window-max', () => {
        if (isWindowMaximized) {
            // macOS 上 restore() 可能不可靠，手动设置窗口大小和位置
            if (savedBounds) {
                win.setBounds(savedBounds)
            } else {
                // 如果没有保存的边界，使用默认大小
                win.setBounds({
                    x: 170,
                    y: 162,
                    width: 1024,
                    height: 672
                })
            }
            isWindowMaximized = false
        } else {
            // 保存当前窗口状态
            savedBounds = win.getBounds()
            win.maximize()
            isWindowMaximized = true
        }
    })

    // 监听窗口状态变化事件
    win.on('maximize', () => {
        if (!isWindowMaximized) {
            isWindowMaximized = true
        }
    })

    win.on('unmaximize', () => {
        if (isWindowMaximized) {
            isWindowMaximized = false
        }
    })

    win.on('restore', () => {
        isWindowMaximized = false
    })
    ipcMain.on('window-close', async () => {
        const settings = await settingsStore.get('settings')
        if (settings.other.quitApp == 'minimize') {
            win.hide()
        } else if (settings.other.quitApp == 'quit') {
            win.close()
        }
    })
    ipcMain.on('to-register', (e, url) => {
        shell.openExternal(url)
    })
    ipcMain.on('download-start', () => {
        win.webContents.send('download-next')
    })
    ipcMain.handle('get-image-base64', async (e, filePath) => {
        try {
            const data = await parseFile(filePath)
            if (data.common.picture)
                return `data:${data.common.picture[0].format};base64,${data.common.picture[0].data.toString('base64')}`

            // 若无内嵌封面，尝试同名图片或常见封面文件
            const parsed = path.parse(filePath)
            const candidates = [
                path.join(parsed.dir, parsed.name + '.jpg'),
                path.join(parsed.dir, parsed.name + '.jpeg'),
                path.join(parsed.dir, parsed.name + '.png'),
                path.join(parsed.dir, parsed.name + '.webp'),
                path.join(parsed.dir, 'cover.jpg'),
                path.join(parsed.dir, 'folder.jpg'),
                path.join(parsed.dir, 'cover.png'),
                path.join(parsed.dir, 'folder.png'),
            ]
            const mapMime = (p) => {
                const ext = (p.split('.').pop() || '').toLowerCase()
                if (ext === 'png') return 'image/png'
                if (ext === 'webp') return 'image/webp'
                return 'image/jpeg'
            }
            for (const p of candidates) {
                try {
                    if (fs.existsSync(p)) {
                        const b64 = fs.readFileSync(p).toString('base64')
                        return `data:${mapMime(p)};base64,${b64}`
                    }
                } catch (_) { /* ignore */ }
            }
        } catch (e) {
            // ignore
        }
        return null
    })
    ipcMain.on('set-settings', (e, settings) => {
        settingsStore.set('settings', JSON.parse(settings))
        registerShortcuts(win)
    })
    ipcMain.handle('get-settings', async () => {
        const settings = await settingsStore.get('settings')
        if (settings) return settings
        else {
            let initSettings = {
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
                        globalShortcut: 'CommandOrControl+Alt+P',
                    },
                    {
                        id: 'last',
                        name: '上一首',
                        shortcut: 'CommandOrControl+Left',
                        globalShortcut: 'CommandOrControl+Alt+Left',
                    },
                    {
                        id: 'next',
                        name: '下一首',
                        shortcut: 'CommandOrControl+Right',
                        globalShortcut: 'CommandOrControl+Alt+Right',
                    },
                    {
                        id: 'volumeUp',
                        name: '增加音量',
                        shortcut: 'CommandOrControl+Up',
                        globalShortcut: 'CommandOrControl+Alt+Up',
                    },
                    {
                        id: 'volumeDown',
                        name: '减少音量',
                        shortcut: 'CommandOrControl+Down',
                        globalShortcut: 'CommandOrControl+Alt+Down',
                    },
                    {
                        id: 'processForward',
                        name: '快进(3s)',
                        shortcut: 'CommandOrControl+]',
                        globalShortcut: 'CommandOrControl+Alt+]',
                    },
                    {
                        id: 'processBack',
                        name: '后退(3s)',
                        shortcut: 'CommandOrControl+[',
                        globalShortcut: 'CommandOrControl+Alt+[',
                    },
                ],
                other: {
                    globalShortcuts: true,
                    quitApp: 'minimize'
                }
            }
            settingsStore.set('settings', initSettings)
            registerShortcuts(win)
            return initSettings
        }
    })
    ipcMain.handle('dialog:openFile', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] })
        if (canceled) {
            return null
        } else {
            return filePaths[0]
        }
    })
    ipcMain.handle('dialog:openImageFile', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                {
                    name: '图片文件',
                    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
                },
            ],
        })
        if (canceled || !filePaths || filePaths.length === 0) {
            return null
        }
        return filePaths[0]
    })

    ipcMain.handle('plugins:select-package', async () => {
        ensurePluginDirectory()
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: '选择 Hydrogen Music 插件目录',
            properties: ['openDirectory'],
        })
        if (canceled || !filePaths || !filePaths.length) {
            return null
        }
        return filePaths[0]
    })

    ipcMain.handle('plugins:install', async (_event, sourcePath) => {
        ensurePluginDirectory()
        if (!sourcePath) {
            throw new Error('未提供插件路径')
        }
        const resolvedSource = path.resolve(sourcePath)
        if (!fs.existsSync(resolvedSource)) {
            throw new Error('插件目录不存在')
        }
        const stat = fs.statSync(resolvedSource)
        if (!stat.isDirectory()) {
            throw new Error('请选择包含 plugin.json 的插件文件夹')
        }

        const manifest = readPluginManifest(resolvedSource)
        const targetDirectory = path.join(pluginDirectory, manifest.id)
        const resolvedTarget = path.resolve(targetDirectory)

        if (resolvedSource !== resolvedTarget) {
            await fsExtra.remove(resolvedTarget)
            await copyPluginPackage(resolvedSource, resolvedTarget)
        } else {
            resolvePluginEntryPath(resolvedTarget, manifest)
        }

        const state = getPluginStateMap()
        state[manifest.id] = { ...(state[manifest.id] || {}) }
        setPluginStateMap(state)
        return manifest
    })

    ipcMain.handle('plugins:list', async () => {
        ensurePluginDirectory()
        const state = getPluginStateMap()
        const result = []
        let entries = []
        try {
            entries = fs.readdirSync(pluginDirectory, { withFileTypes: true })
        } catch (error) {
            return result
        }

        for (const entry of entries) {
            if (!entry.isDirectory()) continue
            const pluginPath = path.join(pluginDirectory, entry.name)
            try {
                const manifest = readPluginManifest(pluginPath)
                const entryPath = resolvePluginEntryPath(pluginPath, manifest)
                result.push({
                    id: manifest.id,
                    name: manifest.name || manifest.id,
                    version: manifest.version || '0.0.0',
                    description: manifest.description || '',
                    author: manifest.author || '',
                    entry: manifest.entry,
                    entryUrl: pathToFileURL(entryPath).href,
                    path: pluginPath,
                    enabled: !!(state[manifest.id] && state[manifest.id].enabled),
                })
            } catch (error) {
                result.push({
                    id: entry.name,
                    name: entry.name,
                    version: '0.0.0',
                    description: '',
                    author: '',
                    broken: true,
                    error: error.message || String(error),
                })
            }
        }
        return result
    })

    const resolvePluginDirectoryById = (pluginId) => {
        const direct = path.join(pluginDirectory, pluginId)
        if (fs.existsSync(direct)) return direct
        let entries = []
        try {
            entries = fs.readdirSync(pluginDirectory, { withFileTypes: true })
        } catch (_) {
            return direct
        }
        for (const entry of entries) {
            if (!entry.isDirectory()) continue
            const candidate = path.join(pluginDirectory, entry.name)
            try {
                const manifest = readPluginManifest(candidate)
                if (manifest.id === pluginId) {
                    return candidate
                }
            } catch (_) {}
        }
        return direct
    }

    ipcMain.handle('plugins:remove', async (_event, pluginId) => {
        if (!pluginId) return false
        const targetDirectory = resolvePluginDirectoryById(pluginId)
        await fsExtra.remove(targetDirectory)
        removePluginState(pluginId)
        return true
    })

    ipcMain.handle('plugins:set-enabled', async (_event, pluginId, enabled) => {
        if (!pluginId) return false
        updatePluginEnabledState(pluginId, !!enabled)
        return true
    })

    ipcMain.handle('plugins:get-entry', async (_event, pluginId) => {
        if (!pluginId) {
            throw new Error('插件 ID 无效')
        }
        const directory = resolvePluginDirectoryById(pluginId)
        const manifest = readPluginManifest(directory)
        const entryPath = resolvePluginEntryPath(directory, manifest)
        return {
            id: manifest.id,
            entry: manifest.entry,
            entryPath,
            entryUrl: pathToFileURL(entryPath).href,
            manifest,
        }
    })
    ipcMain.on('register-shortcuts', () => {
        registerShortcuts(win, app)
    })
    ipcMain.on('unregister-shortcuts', () => {
        Menu.setApplicationMenu(null)
        globalShortcut.unregisterAll()
    })
    ipcMain.on('save-last-playlist', (e, playlist) => {
        lastPlaylistStore.set('playlist', JSON.parse(playlist))
    })
    ipcMain.on('exit-app', (e, playlist) => {
        lastPlaylistStore.set('playlist', JSON.parse(playlist))
        app.exit()
    })
    ipcMain.handle('get-last-playlist', async () => {
        const lastPlaylist = await lastPlaylistStore.get('playlist')
        if (lastPlaylist) return lastPlaylist
        else return null
    })
    ipcMain.on('open-local-folder', (e, path) => {
        shell.showItemInFolder(path)
    })
    ipcMain.handle('get-request-data', async (e, request) => {
        const result = await axios.get(request.url, request.option)
        return result.data
    })
    async function searchMusicVideo(id) {
        if (musicVideoStore.has('musicVideo')) {
            const result = await musicVideoStore.get('musicVideo')
            const index = (result || []).findIndex((music) => music.id == id)
            if (index != -1) {
                return { data: result[index], index: index }
            } else return false
        } else return false
    }
    async function saveMusicVideo(data) {
        if (musicVideoStore.has('musicVideo')) {
            const musicVideo = await musicVideoStore.get('musicVideo')
            searchMusicVideo(data.id).then(result => {
                if (result) musicVideo.splice(result.index, 1)
                musicVideo.push(data)
                musicVideoStore.set('musicVideo', musicVideo)
            })
        } else {
            musicVideoStore.set('musicVideo', [data])
        }
    }
    function fileIsExists(path) {
        return new Promise((resolve, reject) => {
            fs.access(path, fs.constants.F_OK, (err) => {
                if (!err) resolve(true)
                else return resolve(false)
            })
        })
    }
    ipcMain.handle('get-bili-video', async (e, request) => {
        const settings = await settingsStore.get('settings')
        if (!settings.local.videoFolder) return 'noSavePath'
        const videoPath = path.join(settings.local.videoFolder, request.option.params.cid + '_' + request.option.params.quality.substring(3) + '.mp4')
        let returnCode = 'success'
        if (await fileIsExists(videoPath)) {
            request.option.params.timing = JSON.parse(request.option.params.timing)
            request.option.params.path = videoPath
            saveMusicVideo(request.option.params)
            return returnCode
        } else {
            if (cancel != null) cancel()
            const result = await axios({
                url: request.url,
                method: 'get',
                headers: request.option.headers,
                responseType: 'stream',
                onDownloadProgress: (progressEvent) => {
                    let progress = Math.round(progressEvent.loaded / progressEvent.total * 100)
                    win.webContents.send('download-video-progress', progress)
                    if (returnCode == 'cancel') win.setProgressBar(-1)
                    else win.setProgressBar(progress / 100)
                },
                cancelToken: new CancelToken(function executor(c) {
                    cancel = c
                })
            })
            const writer = fs.createWriteStream(videoPath)
            await result.data.pipe(writer)
            ipcMain.on('cancel-download-music-video', () => {
                returnCode = 'cancel'
                writer.close()
                writer.once('close', () => {
                    cancel()
                    win.setProgressBar(-1)
                    fs.unlinkSync(videoPath)
                })
            })
            return new Promise((resolve, reject) => {
                writer.on("finish", () => {
                    win.setProgressBar(-1)
                    if (returnCode == 'cancel') {
                        resolve(returnCode)
                        return returnCode
                    }
                    request.option.params.timing = JSON.parse(request.option.params.timing)
                    request.option.params.path = videoPath
                    saveMusicVideo(request.option.params)
                    resolve(returnCode)
                })
                writer.on("error", () => {
                    win.setProgressBar(-1)
                    reject('failed')
                })
            })
        }
    })
    ipcMain.handle('music-video-isexists', async (e, obj) => {
        console.log('检查视频是否存在 - 歌曲ID:', obj.id, '方法:', obj.method)
        const result = await searchMusicVideo(obj.id)
        console.log('searchMusicVideo 结果:', result)

        if (result) {
            if (obj.method == 'get') return result
            const file = await fileIsExists(result.data.path)
            console.log('文件是否存在:', file, '路径:', result.data.path)
            if (!file) return '404'
            else return result
        } else {
            console.log('没有找到该歌曲的视频数据')
            return false
        }
    })
    ipcMain.handle('clear-unused-video', async (e) => {
        const settings = await settingsStore.get('settings')
        const folderPath = settings.local.videoFolder
        if (!folderPath) return 'noSavePath'
        const musicVideo = await musicVideoStore.get('musicVideo')
        const files = fs.readdirSync(folderPath)
        files.forEach(filename => {
            const filePath = path.join(folderPath, filename)
            if (!musicVideo.some(video => video.path == filePath)) {
                fs.unlinkSync(filePath)
            }
        })
        return true
    })
    ipcMain.handle('delete-music-video', async (e, id) => {
        const musicVideo = await musicVideoStore.get('musicVideo')
        return new Promise((resolve, reject) => {
            searchMusicVideo(id).then(result => {
                if (result) {
                    musicVideo.splice(result.index, 1)
                    musicVideoStore.set('musicVideo', musicVideo)
                    resolve(true)
                } else resolve(false)
            })
        })
    })
    //获取本地歌词
    ipcMain.handle('get-local-music-lyric', async (e, filePath) => {
        // async function getLyricByFile(filePath) {
        //     return new Promise((resolve, reject) => {
        //         jsmediatags.read(filePath, {
        //             onSuccess: (tag) => {
        //                 resolve(tag)
        //             },
        //             onError: (error) => {
        //                 
        //                 reject(error)
        //             }
        //         });
        //     })
        // }
        // return await getLyricByFile(filePath)
        const str = filePath.split(path.sep)
        const folderPath = filePath.substring(0, filePath.length - str[str.length - 1].length - 1)
        const fileName = path.basename(filePath, path.extname(filePath))
        async function readLyric(path) {
            return fs.readFileSync(path, 'utf8', (err, data) => {
                if (err) return false
                else return data
            })
        }
        function lyricHandle(data) {
            const lines = data.split(/\r?\n/)
            let lyricArr = ''
            lines.forEach((line) => {
                if (line) lyricArr += line + '\n'
            })
            return lyricArr
        }
        if (await fileIsExists(path.join(folderPath, fileName + '.lrc'))) {
            const res = await readLyric(path.join(folderPath, fileName + '.lrc'))
            if (res) return lyricHandle(res)
        }
        if (await fileIsExists(path.join(folderPath, fileName + '.txt'))) {
            const res = await readLyric(path.join(folderPath, fileName + '.txt'))
            if (res) return lyricHandle(res)
        }
        const metedata = await parseFile(filePath)
        if (metedata.common.lyrics) return metedata.common.lyrics[0]

        return false
    })
    ipcMain.on('copy-txt', (e, txt) => {
        clipboard.writeText(txt)
    })
    ipcMain.on('set-window-title', (e, title) => {
        win.setTitle(title)
    })

    // 处理更新 Dock 菜单的事件（仅限 macOS，有效负载保护）
    ipcMain.on('update-dock-menu', (e, songInfo) => {
        // 非 macOS 直接忽略，防止误调用引发标题回退等副作用
        if (process.platform !== 'darwin') return

        // 基本负载校验：需要包含 name 与 artist 字段
        if (!songInfo || typeof songInfo !== 'object' || !songInfo.name) return

        // 通知主进程窗口处理 Dock 菜单与菜单栏
        win.emit('update-dock-menu', songInfo)
    })

    // 网易云内嵌登录功能
    ipcMain.handle('open-netease-login', async () => {
        return new Promise((resolve, reject) => {
            // 创建独立的session，确保每次都是全新的登录环境
            const loginSession = session.fromPartition('login-session-' + Date.now(), {
                cache: false
            })

            const loginWindow = new BrowserWindow({
                width: 900,
                height: 700,
                title: '网易云音乐登录',
                autoHideMenuBar: true,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    webSecurity: true,
                    session: loginSession // 使用独立session
                }
            })

            // 清理可能存在的相关缓存
            loginSession.clearCache()
            loginSession.clearStorageData({
                storages: ['cookies', 'localstorage', 'sessionstorage', 'indexdb', 'websql']
            })

            // 先加载一个空页面，然后跳转到登录页面
            loginWindow.loadURL('about:blank')

            // 检查登录状态的函数
            const checkLoginStatus = async () => {
                try {
                    // 从登录窗口的session获取cookies
                    const cookies = await loginSession.cookies.get({
                        domain: '.music.163.com'
                    })

                    // 检查是否包含登录必需的cookie
                    const musicUCookie = cookies.find(cookie => cookie.name === 'MUSIC_U')

                    if (musicUCookie && musicUCookie.value && musicUCookie.value.length > 10) {
                        // 将cookies转换为字符串格式
                        const cookieString = cookies.map(cookie =>
                            `${cookie.name}=${cookie.value}`
                        ).join('; ')

                        loginWindow.close()
                        resolve({
                            success: true,
                            cookies: cookieString,
                            message: '登录成功'
                        })
                        return true
                    }
                    return false
                } catch (error) {

                    return false
                }
            }

            // 强制加载登录页面的函数
            const forceLoadLoginPage = async () => {
                try {

                    // 加载登录页面并注入脚本确保显示登录界面
                    await loginWindow.loadURL('https://music.163.com/#/login')

                    // 延迟一下确保页面加载完成
                    setTimeout(async () => {
                        try {
                            await loginWindow.webContents.executeJavaScript(`
                                // 强制清理所有本地存储
                                localStorage.clear();
                                sessionStorage.clear();
                                
                                // 删除所有cookie
                                document.cookie.split(";").forEach(function(c) { 
                                    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
                                });
                                
                                // 强制跳转到登录页面
                                if (!window.location.href.includes('/login')) {
                                    window.location.href = 'https://music.163.com/#/login';
                                }
                                
                                // 如果页面已经显示登录状态，尝试触发退出
                                setTimeout(() => {
                                    const logoutButtons = document.querySelectorAll('[class*="logout"], [class*="exit"], [data-action="logout"]');
                                    if (logoutButtons.length > 0) {
                                        logoutButtons[0].click();
                                    }
                                    
                                    // 再次确保跳转到登录页面
                                    setTimeout(() => {
                                        if (!window.location.href.includes('/login')) {
                                            window.location.href = 'https://music.163.com/#/login';
                                        }
                                    }, 1000);
                                }, 1000);
                            `)
                        } catch (error) {

                        }
                    }, 2000)
                } catch (error) {

                }
            }

            // 初始加载完成后，开始加载登录页面
            loginWindow.webContents.once('did-finish-load', () => {

                forceLoadLoginPage()
            })

            // 监听页面加载完成
            loginWindow.webContents.on('did-finish-load', async () => {
                const currentURL = loginWindow.webContents.getURL()


                // 如果不是登录页面，强制跳转
                if (currentURL.includes('music.163.com') && !currentURL.includes('/login')) {

                    setTimeout(() => forceLoadLoginPage(), 1000)
                }

                // 延迟检查登录状态
                setTimeout(async () => {
                    await checkLoginStatus()
                }, 3000)
            })

            // 监听URL变化
            loginWindow.webContents.on('did-navigate', async (event, navigationUrl) => {


                // 延迟检查登录状态
                setTimeout(async () => {
                    await checkLoginStatus()
                }, 2000)
            })

            // 监听页面内导航（适用于SPA应用）
            loginWindow.webContents.on('did-navigate-in-page', async (event, navigationUrl) => {


                // 检查是否跳转到了登录后的页面
                if (navigationUrl.includes('music.163.com') &&
                    (navigationUrl.includes('#/my') ||
                        navigationUrl.includes('#/discover') ||
                        navigationUrl.includes('#/friend'))) {

                    // 延迟检查，确保cookie已设置
                    setTimeout(async () => {
                        const success = await checkLoginStatus()
                        if (!success) {

                        }
                    }, 3000)
                }
            })

            // 定期强制检查并刷新登录页面
            let forceRefreshCount = 0
            const forceRefreshInterval = setInterval(() => {
                forceRefreshCount++
                if (forceRefreshCount > 10) { // 最多尝试10次
                    clearInterval(forceRefreshInterval)
                    return
                }

                try {
                    const currentURL = loginWindow.webContents.getURL()


                    if (currentURL.includes('music.163.com') && !currentURL.includes('/login')) {

                        forceLoadLoginPage()
                    }
                } catch (error) {

                }
            }, 5000)

            // 定期检查登录状态（作为备用机制）
            const loginCheckInterval = setInterval(async () => {
                const success = await checkLoginStatus()
                if (success) {
                    clearInterval(loginCheckInterval)
                    clearInterval(forceRefreshInterval)
                }
            }, 5000)

            // 窗口关闭事件
            loginWindow.on('closed', () => {
                clearInterval(loginCheckInterval)
                clearInterval(forceRefreshInterval)
                // 清理session
                loginSession.clearCache()
                loginSession.clearStorageData()
                resolve({
                    success: false,
                    message: '用户取消登录'
                })
            })

            // 处理登录错误
            let failedLoadCount = 0
            const maxFailedLoads = 5
            loginWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
                failedLoadCount++
                console.log(`登录页面加载失败 (${failedLoadCount}/${maxFailedLoads}):`, errorDescription)
                
                // 只有在连续失败多次后才真正失败
                if (failedLoadCount >= maxFailedLoads) {
                    console.error('登录页面多次加载失败，终止登录流程')
                    clearInterval(loginCheckInterval)
                    clearInterval(forceRefreshInterval)
                    // 清理session
                    loginSession.clearCache()
                    loginSession.clearStorageData()
                    reject({
                        success: false,
                        message: `页面加载失败: ${errorDescription}`
                    })
                } else {
                    // 尝试重新加载登录页面
                    console.log('尝试重新加载登录页面...')
                    setTimeout(() => {
                        try {
                            forceLoadLoginPage()
                        } catch (retryError) {
                            console.error('重试加载登录页面失败:', retryError)
                        }
                    }, 2000)
                }
            })
        })
    })

    // 清理登录session的辅助方法
    ipcMain.handle('clear-login-session', async () => {
        try {
            // 清理默认session中的网易云相关数据
            await session.defaultSession.clearStorageData({
                storages: ['cookies', 'localstorage', 'sessionstorage'],
                quotas: ['temporary', 'persistent', 'syncable'],
                origin: 'https://music.163.com'
            })

            // 清理网易云相关的cookies
            const cookies = await session.defaultSession.cookies.get({
                domain: '.music.163.com'
            })

            for (const cookie of cookies) {
                await session.defaultSession.cookies.remove(
                    `https://${cookie.domain}${cookie.path}`,
                    cookie.name
                )
            }


            return { success: true, message: '登录session已清理' }
        } catch (error) {

            return { success: false, message: '清理失败' }
        }
    })

    // 桌面歌词相关 IPC 处理
    ipcMain.handle('create-lyric-window', async (_event, options = {}) => {
        try {
            const lyricWin = createLyricWindowInstance(options)
            if (lyricWin) {
                return { success: true, message: '桌面歌词窗口已创建' }
            }
            return { success: false, message: '创建窗口失败' }
        } catch (error) {
            return { success: false, message: error?.message || '创建失败' }
        }
    })

    ipcMain.handle('close-lyric-window', async () => {
        try {
            closeLyricWindowInstance()
            return { success: true, message: '桌面歌词窗口已关闭' }
        } catch (error) {
            return { success: false, message: error?.message || '关闭失败' }
        }
    })

    ipcMain.handle('set-lyric-window-movable', async (_event, movable) => {
        try {
            const lyricWindow = getLyricWindowInstance()
            if (lyricWindow) {
                lyricWindow.setMovable(!!movable)
                if (process.platform === 'win32') {
                    lyricWindow.setIgnoreMouseEvents(false)
                }
                return { success: true, message: '窗口移动状态已更新' }
            }
            return { success: false, message: '桌面歌词窗口不存在' }
        } catch (error) {
            return { success: false, message: error?.message || '设置失败' }
        }
    })

    ipcMain.on('lyric-window-ready', () => {
        try {
            win.webContents.send('desktop-lyric-ready')
        } catch (_) {
            // ignore if主窗口不可用
        }
    })

    ipcMain.on('update-lyric-data', (_event, data) => {
        const lyricWindow = getLyricWindowInstance()
        if (lyricWindow) {
            lyricWindow.webContents.send('lyric-update', data)
        }
    })

    ipcMain.on('request-lyric-data', (event) => {
        win.webContents.send('get-current-lyric-data')
    })

    ipcMain.on('current-lyric-data', (_event, data) => {
        const lyricWindow = getLyricWindowInstance()
        if (lyricWindow) {
            lyricWindow.webContents.send('lyric-update', data)
        }
    })

    ipcMain.handle('is-lyric-window-visible', () => {
        const lyricWindow = getLyricWindowInstance()
        return !!(lyricWindow && lyricWindow.isVisible())
    });

    // 调整桌面歌词窗口大小
    ipcMain.handle('resize-lyric-window', (_event, { width, height }) => {
        const lyricWindow = getLyricWindowInstance();
        if (!lyricWindow) return { success: false, error: '窗口不存在' };
        try {
            lyricWindow.setSize(width, height);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // 获取桌面歌词窗口位置与尺寸
    ipcMain.handle('get-lyric-window-bounds', () => {
        const lyricWindow = getLyricWindowInstance();
        if (lyricWindow) {
            try {
                return lyricWindow.getBounds();
            } catch (error) {
                return null;
            }
        }
        return null;
    });

    // 移动桌面歌词窗口到指定坐标（基于屏幕坐标）
    ipcMain.on('move-lyric-window', (event, { x, y }) => {
        const lyricWindow = getLyricWindowInstance();
        if (lyricWindow && typeof x === 'number' && typeof y === 'number') {
            try {
                lyricWindow.setPosition(Math.round(x), Math.round(y));
            } catch (error) {
                // 忽略移动错误
            }
        }
    });

    // 按增量移动桌面歌词窗口（无需预先获取窗口位置）
    ipcMain.on('move-lyric-window-by', (event, { dx, dy }) => {
        if (process.platform === 'darwin') return; // macOS 保持原生
        const lyricWindow = getLyricWindowInstance();
        if (lyricWindow && typeof dx === 'number' && typeof dy === 'number') {
            try {
                const { x, y } = lyricWindow.getBounds();
                lyricWindow.setPosition(Math.round(x + dx), Math.round(y + dy));
            } catch (error) {
                // 忽略移动错误
            }
        }
    });

    // 将窗口移动到指定位置，并强制保持给定宽高
    ipcMain.on('move-lyric-window-to', (event, { x, y, width, height }) => {
        if (process.platform === 'darwin') return; // macOS 保持原生
        const lyricWindow = getLyricWindowInstance();
        if (
            lyricWindow &&
            typeof x === 'number' && typeof y === 'number' &&
            typeof width === 'number' && typeof height === 'number'
        ) {
            try {
                lyricWindow.setBounds({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) });
            } catch (error) {
                // 忽略移动错误
            }
        }
    });

    // 读取窗口最小/最大尺寸（Windows专用）
    ipcMain.handle('get-lyric-window-min-max', () => {
        if (process.platform === 'darwin') return null;
        const lyricWindow = getLyricWindowInstance();
        if (lyricWindow) {
            try {
                const [minWidth, minHeight] = lyricWindow.getMinimumSize();
                const [maxWidth, maxHeight] = lyricWindow.getMaximumSize();
                return { minWidth, minHeight, maxWidth, maxHeight };
            } catch (error) {
                return null;
            }
        }
        return null;
    });

    // 设置窗口最小/最大尺寸（Windows专用）
    ipcMain.on('set-lyric-window-min-max', (event, { minWidth, minHeight, maxWidth, maxHeight }) => {
        if (process.platform === 'darwin') return;
        const lyricWindow = getLyricWindowInstance();
        if (lyricWindow) {
            try {
                if (typeof minWidth === 'number' && typeof minHeight === 'number') {
                    lyricWindow.setMinimumSize(Math.max(0, Math.round(minWidth)), Math.max(0, Math.round(minHeight)));
                }
                if (typeof maxWidth === 'number' && typeof maxHeight === 'number') {
                    lyricWindow.setMaximumSize(Math.max(0, Math.round(maxWidth)), Math.max(0, Math.round(maxHeight)));
                }
            } catch (error) {
                // 忽略错误
            }
        }
    });

    // 设置窗口宽高比（Windows专用）
    ipcMain.on('set-lyric-window-aspect-ratio', (event, { aspectRatio }) => {
        if (process.platform === 'darwin') return;
        const lyricWindow = getLyricWindowInstance();
        if (lyricWindow) {
            try {
                const ratio = typeof aspectRatio === 'number' ? aspectRatio : 0;
                lyricWindow.setAspectRatio(ratio > 0 ? ratio : 0);
            } catch (error) {
                // 忽略错误
            }
        }
    });

    // 读取内容区域的bounds（Windows专用）
    ipcMain.handle('get-lyric-window-content-bounds', () => {
        if (process.platform === 'darwin') return null;
        const lyricWindow = getLyricWindowInstance();
        if (lyricWindow) {
            try {
                return lyricWindow.getContentBounds();
            } catch (error) {
                return null;
            }
        }
        return null;
    });

    // 设置内容区域的bounds（Windows专用）
    ipcMain.on('move-lyric-window-content-to', (event, { x, y, width, height }) => {
        if (process.platform === 'darwin') return;
        const lyricWindow = getLyricWindowInstance();
        if (
            lyricWindow &&
            typeof x === 'number' && typeof y === 'number' &&
            typeof width === 'number' && typeof height === 'number'
        ) {
            try {
                lyricWindow.setContentBounds({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) });
            } catch (error) {
                // 忽略错误
            }
        }
    });

    // 设置桌面歌词窗口的可调整大小状态（用于拖拽期间临时禁用）
    ipcMain.on('set-lyric-window-resizable', (event, { resizable }) => {
        if (process.platform !== 'win32') return; // 仅Windows需要
        const lyricWindow = getLyricWindowInstance();
        if (lyricWindow) {
            try {
                lyricWindow.setResizable(!!resizable);
            } catch (error) {
                // 忽略错误
            }
        }
    });

    // 处理桌面歌词窗口关闭通知
    ipcMain.on('lyric-window-closed', () => {
        // 通知主窗口桌面歌词已关闭
        win.webContents.send('desktop-lyric-closed');
    });

    ipcMain.on('desktop-lyric-command', (event, payload) => {
        const lyricWindow = getLyricWindowInstance()
        const isFromMainWindow = win && !win.isDestroyed() && event.sender === win.webContents
        if (isFromMainWindow) {
            if (lyricWindow) {
                lyricWindow.webContents.send('desktop-lyric-command', payload)
            }
            return
        }
        try {
            if (win && !win.isDestroyed()) {
                win.webContents.send('desktop-lyric-command', payload)
            }
        } catch (_) {
            // ignore forward errors
        }
    })

    // 处理应用更新相关的 IPC 事件
    ipcMain.on('check-for-update', async () => {
        // 在 macOS 上，改为使用 GitHub API 手动检查
        if (process.platform === 'darwin') {
            try {
                const current = app.getVersion();
                const api = 'https://api.github.com/repos/ldx123000/Hydrogen-Music/releases/latest';
                const { data } = await axios.get(api, { headers: { 'User-Agent': 'HydrogenMusic-Updater' } });
                let latest = data.tag_name || data.name || '';
                if (typeof latest === 'string' && latest.startsWith('v')) latest = latest.slice(1);

                const isNewer = (a, b) => {
                    const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
                    const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
                    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
                        const da = pa[i] || 0, db = pb[i] || 0;
                        if (da > db) return true;
                        if (da < db) return false;
                    }
                    return false;
                };

                if (latest && isNewer(latest, current)) {
                    const pageUrl = data.html_url || `https://github.com/ldx123000/Hydrogen-Music/releases/tag/v${latest}`;
                    console.log('手动检查更新完成（macOS），发现新版本:', latest, pageUrl);
                    win.webContents.send('manual-update-available', latest, pageUrl);
                } else {
                    console.log('手动检查更新完成（macOS），当前已是最新版本');
                    win.webContents.send('update-not-available');
                }
            } catch (error) {
                console.error('手动检查更新失败（macOS）:', error);
                win.webContents.send('update-error', error.message || '检查更新失败');
            }
            return;
        }

        // 其他平台走 electron-updater
        const { autoUpdater } = require("electron-updater");
        // 为手动检查设置一次性事件监听器
        const handleUpdateAvailable = (info) => {
            console.log('手动检查更新完成，发现新版本:', info.version);
            win.webContents.send('manual-update-available', info.version);
            autoUpdater.removeListener('update-available', handleUpdateAvailable);
            autoUpdater.removeListener('update-not-available', handleUpdateNotAvailable);
            autoUpdater.removeListener('error', handleUpdateError);
        };
        const handleUpdateNotAvailable = () => {
            console.log('手动检查更新完成，当前已是最新版本');
            win.webContents.send('update-not-available');
            autoUpdater.removeListener('update-available', handleUpdateAvailable);
            autoUpdater.removeListener('update-not-available', handleUpdateNotAvailable);
            autoUpdater.removeListener('error', handleUpdateError);
        };
        const handleUpdateError = (error) => {
            console.error('手动检查更新失败:', error);
            win.webContents.send('update-error', error.message);
            autoUpdater.removeListener('update-available', handleUpdateAvailable);
            autoUpdater.removeListener('update-not-available', handleUpdateNotAvailable);
            autoUpdater.removeListener('error', handleUpdateError);
        };
        autoUpdater.once('update-available', handleUpdateAvailable);
        autoUpdater.once('update-not-available', handleUpdateNotAvailable);
        autoUpdater.once('error', handleUpdateError);
        autoUpdater.checkForUpdates().catch(error => {
            console.error('检查更新失败:', error);
            win.webContents.send('update-error', error.message);
        });
    });

    ipcMain.on('download-update', () => {
        const { autoUpdater } = require("electron-updater");
        console.log('开始下载更新...');
        autoUpdater.downloadUpdate()
            .catch(error => {
                console.error('下载更新失败:', error);
                win.webContents.send('update-error', error.message);
            });
    });

    ipcMain.on('install-update', () => {
        const { autoUpdater } = require("electron-updater");
        console.log('开始安装更新并重启应用...');
        autoUpdater.quitAndInstall();
    });

    ipcMain.on('cancel-update', () => {
        console.log('用户取消了更新');
        // 可以在这里添加取消更新的逻辑，例如停止下载等
        win.setProgressBar(-1); // 隐藏进度条
    });
}
