const { ipcMain, shell, dialog, globalShortcut, Menu, clipboard, BrowserWindow, session } = require('electron')
const axios = require('axios')
const fs = require('fs')
const fsExtra = require('fs-extra')
const path = require('path')
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

    const resolvePathSafe = (targetPath) => {
        if (!targetPath) return null
        try {
            return path.normalize(path.resolve(targetPath))
        } catch (error) {
            console.warn('Failed to normalize path', targetPath, error)
            return null
        }
    }

    const computeDefaultPluginDirectory = () => {
        try {
            const exeDir = resolvePathSafe(path.dirname(app.getPath('exe')))
            if (exeDir) {
                const candidate = resolvePathSafe(path.join(exeDir, 'plugins'))
                if (candidate) return candidate
            }
        } catch (error) {
            console.warn('Failed to resolve default plugin directory from exe path', error)
        }

        try {
            const appPath = resolvePathSafe(app?.getAppPath?.())
            if (appPath) {
                if (appPath.includes('.asar')) {
                    const resourcesDir = resolvePathSafe(path.dirname(appPath))
                    if (resourcesDir) {
                        const unpackedRoot = resolvePathSafe(path.join(resourcesDir, '..'))
                        if (unpackedRoot) {
                            const candidate = resolvePathSafe(path.join(unpackedRoot, 'plugins'))
                            if (candidate) return candidate
                        }
                    }
                }
                const candidate = resolvePathSafe(path.join(appPath, 'plugins'))
                if (candidate) return candidate
            }
        } catch (error) {
            console.warn('Failed to resolve default plugin directory from app path', error)
        }

        try {
            const candidate = resolvePathSafe(path.join(app.getPath('userData'), 'plugins'))
            if (candidate) return candidate
        } catch (error) {
            console.warn('Failed to resolve default plugin directory from userData path', error)
        }

        return null
    }

    const defaultPluginDirectory = computeDefaultPluginDirectory()
    let legacyPluginDirectory = null
    try {
        legacyPluginDirectory = resolvePathSafe(path.join(app.getPath('userData'), 'plugins'))
    } catch (error) {
        console.warn('Failed to resolve legacy plugin directory', error)
    }

    const normalizeDirectory = (dirPath) => {
        if (!dirPath || typeof dirPath !== 'string') return null
        const trimmed = dirPath.trim()
        if (!trimmed) return null
        const normalised = resolvePathSafe(trimmed)
        if (!normalised) return null
        if (normalised.includes('.asar')) {
            console.warn('Rejecting plugin directory inside asar archive', normalised)
            return null
        }
        return normalised
    }

    const pluginStore = new Store({
        name: 'plugins',
        defaults: { list: [], directory: defaultPluginDirectory || undefined, removedBuiltinIds: [] },
    })

    const builtinPluginIds = new Set()
    const legacyBuiltinPluginIds = new Set()

    const getPluginDirectory = () => {
        const stored = pluginStore.get('directory')
        const normalizedStored = normalizeDirectory(stored)
        if (normalizedStored) {
            pluginStore.set('directory', normalizedStored)
            return normalizedStored
        }
        if (defaultPluginDirectory) {
            pluginStore.set('directory', defaultPluginDirectory)
            return defaultPluginDirectory
        }
        throw new Error('无法确定插件目录，请在设置中手动选择目录')
    }

    const ensurePluginDirectory = () => {
        const pluginRoot = getPluginDirectory()
        fsExtra.ensureDirSync(pluginRoot)
        return pluginRoot
    }

    const isSamePath = (a, b) => {
        try {
            if (!a || !b) return false
            return path.normalize(path.resolve(a)) === path.normalize(path.resolve(b))
        } catch (_) {
            return false
        }
    }

    const getStoredPlugins = () => {
        const list = pluginStore.get('list')
        if (Array.isArray(list)) return list
        return []
    }

    const sanitizePluginId = (pluginId) => {
        if (typeof pluginId !== 'string') return null
        const trimmed = pluginId.trim()
        if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) return null
        return trimmed
    }

    const sanitizePluginIdList = (candidates = []) => {
        const result = []
        const seen = new Set()
        if (!Array.isArray(candidates)) return result
        for (const candidate of candidates) {
            const sanitized = sanitizePluginId(candidate)
            if (!sanitized || seen.has(sanitized)) continue
            seen.add(sanitized)
            result.push(sanitized)
        }
        return result
    }

    const getRemovedBuiltinPluginIds = () => {
        const raw = pluginStore.get('removedBuiltinIds')
        const sanitized = sanitizePluginIdList(raw)
        if (Array.isArray(raw) && raw.length !== sanitized.length) {
            pluginStore.set('removedBuiltinIds', sanitized)
        }
        return sanitized
    }

    const saveRemovedBuiltinPluginIds = (ids) => {
        const sanitized = sanitizePluginIdList(ids)
        pluginStore.set('removedBuiltinIds', sanitized)
    }

    const rememberRemovedBuiltinPluginId = (pluginId) => {
        const sanitized = sanitizePluginId(pluginId)
        if (!sanitized) return
        const current = new Set(getRemovedBuiltinPluginIds())
        if (current.has(sanitized)) return
        current.add(sanitized)
        saveRemovedBuiltinPluginIds(Array.from(current))
    }

    const clearRemovedBuiltinPluginId = (pluginId) => {
        const sanitized = sanitizePluginId(pluginId)
        if (!sanitized) return
        const current = getRemovedBuiltinPluginIds()
        if (!current.length) return
        const next = current.filter(id => id !== sanitized)
        if (next.length === current.length) return
        saveRemovedBuiltinPluginIds(next)
    }

    const saveStoredPlugins = (plugins) => {
        pluginStore.set('list', plugins)
    }

    const resolvePluginDir = (pluginId) => {
        const sanitized = sanitizePluginId(pluginId)
        if (!sanitized) return null
        const pluginRoot = ensurePluginDirectory()
        return path.join(pluginRoot, sanitized)
    }

    const readPluginManifestFromDir = async (pluginDir) => {
        if (!pluginDir) return null
        const manifestPath = path.join(pluginDir, 'manifest.json')
        if (!fs.existsSync(manifestPath)) return null
        let manifestRaw
        try {
            manifestRaw = await fs.promises.readFile(manifestPath, 'utf-8')
        } catch (error) {
            console.warn('读取插件 manifest 失败:', manifestPath, error)
            return null
        }
        let manifest
        try {
            manifest = JSON.parse(manifestRaw)
        } catch (error) {
            console.warn('解析插件 manifest 失败:', manifestPath, error)
            return null
        }
        const sanitizedId = sanitizePluginId(manifest.id)
        if (!sanitizedId) return null
        if (!manifest.name || typeof manifest.name !== 'string') return null
        if (!manifest.version || typeof manifest.version !== 'string') return null
        if (!manifest.main || typeof manifest.main !== 'string') return null
        if (path.isAbsolute(manifest.main)) return null
        const normalizedMain = manifest.main.replace(/\\/g, '/')
        if (normalizedMain.includes('..')) return null
        const entryPath = path.join(pluginDir, normalizedMain)
        if (!fs.existsSync(entryPath)) return null
        return {
            id: sanitizedId,
            name: manifest.name.trim(),
            version: manifest.version.trim(),
            description: typeof manifest.description === 'string' ? manifest.description.trim() : '',
            author: typeof manifest.author === 'string' ? manifest.author.trim() : '',
            homepage: typeof manifest.homepage === 'string' ? manifest.homepage.trim() : '',
            entry: normalizedMain,
            enabledByDefault: manifest.enabledByDefault !== false,
            builtin: manifest.builtin === true,
        }
    }

    const readDirectoryNames = async (targetDir) => {
        try {
            const entries = await fs.promises.readdir(targetDir, { withFileTypes: true })
            return entries.filter(entry => entry.isDirectory()).map(entry => entry.name)
        } catch (error) {
            const fallbackError = error?.message?.includes('withFileTypes') || error?.code === 'ERR_INVALID_ARG_TYPE'
            if (!fallbackError) throw error

            const names = await fs.promises.readdir(targetDir)
            const directories = []
            for (const name of names) {
                try {
                    const stats = await fs.promises.stat(path.join(targetDir, name))
                    if (stats.isDirectory()) {
                        directories.push(name)
                    }
                } catch (_) {
                    // ignore files that disappear or cannot be read
                }
            }
            return directories
        }
    }

    const copyDirectoryResilient = async (sourceDir, targetDir) => {
        let entries
        try {
            entries = await fs.promises.readdir(sourceDir)
        } catch (error) {
            console.error('读取目录失败:', sourceDir, error)
            return
        }

        await fsExtra.ensureDir(targetDir)

        for (const entry of entries) {
            const sourcePath = path.join(sourceDir, entry)
            const targetPath = path.join(targetDir, entry)

            let stats
            try {
                stats = await fs.promises.stat(sourcePath)
            } catch (error) {
                console.warn('读取文件信息失败:', sourcePath, error)
                continue
            }

            if (stats.isDirectory()) {
                await copyDirectoryResilient(sourcePath, targetPath)
            } else if (stats.isFile()) {
                try {
                    await fsExtra.ensureDir(path.dirname(targetPath))
                    await fs.promises.copyFile(sourcePath, targetPath)
                } catch (error) {
                    console.error('复制文件失败:', sourcePath, error)
                }
            } else if (stats.isSymbolicLink()) {
                try {
                    const linkTarget = await fs.promises.readlink(sourcePath)
                    await fsExtra.ensureDir(path.dirname(targetPath))
                    await fs.promises.symlink(linkTarget, targetPath)
                } catch (error) {
                    console.warn('复制符号链接失败，尝试解析后复制:', sourcePath, error)
                    try {
                        const resolvedPath = await fs.promises.realpath(sourcePath)
                        await fsExtra.ensureDir(path.dirname(targetPath))
                        await fs.promises.copyFile(resolvedPath, targetPath)
                    } catch (fallbackError) {
                        console.error('复制符号链接失败:', sourcePath, fallbackError)
                    }
                }
            }
        }
    }

    const purgeLegacyBuiltinPluginDirectories = async () => {
        const pluginRoot = ensurePluginDirectory()

        for (const legacyId of legacyBuiltinPluginIds) {
            const targetDir = path.join(pluginRoot, legacyId)
            if (!fs.existsSync(targetDir)) continue

            try {
                const manifest = await readPluginManifestFromDir(targetDir)
                const shouldRemove = !manifest || manifest.builtin === true
                if (shouldRemove) {
                    await fsExtra.remove(targetDir)
                }
            } catch (error) {
                console.warn('清理遗留内置插件失败:', targetDir, error)
            }
        }
    }

    const syncBuiltinPlugins = async () => {
        builtinPluginIds.clear()

        const removedBuiltinIds = new Set(getRemovedBuiltinPluginIds())
        const availableBuiltinIds = new Set()

        const pluginRoot = ensurePluginDirectory()
        const appPath = resolvePathSafe(app?.getAppPath?.())
        if (!appPath) return

        const builtinRoot = resolvePathSafe(path.join(appPath, 'plugins'))
        if (!builtinRoot || !fs.existsSync(builtinRoot)) return

        let directories
        try {
            directories = await readDirectoryNames(builtinRoot)
        } catch (error) {
            if (error?.code !== 'ENOENT') {
                console.warn('读取内置插件目录失败:', error)
            }
            return
        }

        for (const name of directories) {
            const sourceDir = path.join(builtinRoot, name)
            let manifest
            try {
                manifest = await readPluginManifestFromDir(sourceDir)
            } catch (error) {
                console.warn('解析内置插件失败:', sourceDir, error)
                continue
            }
            if (!manifest) continue

            const isBuiltinManifest = manifest.builtin === true
            if (isBuiltinManifest) {
                builtinPluginIds.add(manifest.id)
            }

            if (isBuiltinManifest) {
                availableBuiltinIds.add(manifest.id)
                if (removedBuiltinIds.has(manifest.id)) {
                    continue
                }
            }

            const targetDir = path.join(pluginRoot, manifest.id)
            if (isSamePath(sourceDir, targetDir)) continue

            const targetExists = fs.existsSync(targetDir)
            let shouldCopy = false
            let existingManifest = null

            if (targetExists) {
                try {
                    existingManifest = await readPluginManifestFromDir(targetDir)
                } catch (error) {
                    existingManifest = null
                }
            }

            if (!targetExists) {
                shouldCopy = true
            } else if (isBuiltinManifest) {
                if (!existingManifest) {
                    shouldCopy = true
                } else if (
                    existingManifest.version !== manifest.version ||
                    existingManifest.entry !== manifest.entry
                ) {
                    shouldCopy = true
                } else {
                    const entryPath = path.join(targetDir, manifest.entry)
                    if (!fs.existsSync(entryPath)) {
                        shouldCopy = true
                    }
                }
            } else if (existingManifest && existingManifest.version !== manifest.version) {
                shouldCopy = true
            } else if (existingManifest) {
                const entryPath = path.join(targetDir, manifest.entry)
                if (!fs.existsSync(entryPath)) {
                    shouldCopy = true
                }
            }

            if (!shouldCopy) continue

            try {
                await fsExtra.remove(targetDir)
            } catch (_) {}

            try {
                await copyDirectoryResilient(sourceDir, targetDir)
            } catch (error) {
                console.error('复制内置插件失败:', manifest.id, error)
            }
        }
        const filteredRemoved = Array.from(removedBuiltinIds).filter(id => availableBuiltinIds.has(id))
        if (filteredRemoved.length !== removedBuiltinIds.size) {
            saveRemovedBuiltinPluginIds(filteredRemoved)
        }
    }

    const syncPluginsFromDisk = async () => {
        const pluginRoot = ensurePluginDirectory()
        await purgeLegacyBuiltinPluginDirectories()
        await syncBuiltinPlugins()
        let directories
        try {
            directories = await readDirectoryNames(pluginRoot)
        } catch (error) {
            console.error('读取插件目录失败:', error)
            return
        }

        let stored = getStoredPlugins()
        let removedLegacyFromStore = false
        if (stored.length) {
            const filtered = []
            for (const item of stored) {
                if (legacyBuiltinPluginIds.has(item.id) && item.builtin === true) {
                    removedLegacyFromStore = true
                    continue
                }
                filtered.push(item)
            }
            if (removedLegacyFromStore) {
                stored = filtered
            }
        }

        const diskPlugins = new Map()
        for (const name of directories) {
            const pluginDir = path.join(pluginRoot, name)
            let manifest
            try {
                manifest = await readPluginManifestFromDir(pluginDir)
            } catch (error) {
                console.warn('扫描插件目录失败:', pluginDir, error)
                continue
            }
            if (!manifest) continue
            diskPlugins.set(manifest.id, { ...manifest, dir: pluginDir })
        }

        const nextList = []
        let changed = removedLegacyFromStore

        for (const [id, manifest] of diskPlugins.entries()) {
            const existing = stored.find(item => item.id === id)
            const isBuiltin = builtinPluginIds.has(id) || manifest.builtin === true
            if (legacyBuiltinPluginIds.has(id) && isBuiltin) {
                changed = true
                continue
            }
            const record = {
                id,
                name: manifest.name,
                version: manifest.version,
                description: manifest.description,
                author: manifest.author,
                homepage: manifest.homepage,
                entry: manifest.entry,
                enabled: existing ? existing.enabled : manifest.enabledByDefault,
                importTime: existing ? existing.importTime : Date.now(),
                builtin: isBuiltin,
            }
            if (!existing) {
                changed = true
            } else if (
                existing.name !== record.name ||
                existing.version !== record.version ||
                existing.description !== record.description ||
                existing.author !== record.author ||
                existing.homepage !== record.homepage ||
                existing.entry !== record.entry ||
                (existing.builtin === true) !== isBuiltin
            ) {
                changed = true
            }
            nextList.push(record)
        }

        for (const plugin of stored) {
            if (legacyBuiltinPluginIds.has(plugin.id) && plugin.builtin === true) continue
            if (!diskPlugins.has(plugin.id)) {
                changed = true
            }
        }

        if (changed) {
            nextList.sort((a, b) => (b.importTime || 0) - (a.importTime || 0))
            saveStoredPlugins(nextList)
        }
    }

    // 全局存储桌面歌词窗口引用
    let globalLyricWindow = null;
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
    ipcMain.handle('plugin:choose-source', async () => {
        const defaultPath = ensurePluginDirectory()
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory'],
            defaultPath: fs.existsSync(defaultPath) ? defaultPath : undefined,
        })
        if (canceled || !filePaths || filePaths.length === 0) {
            return null
        }
        return path.normalize(filePaths[0])
    })
    ipcMain.handle('plugin:choose-directory', async (_event, currentPath) => {
        try {
            const normalizedCurrent = normalizeDirectory(currentPath) || ensurePluginDirectory()
            const { canceled, filePaths } = await dialog.showOpenDialog({
                properties: ['openDirectory', 'createDirectory'],
                defaultPath: fs.existsSync(normalizedCurrent) ? normalizedCurrent : undefined,
            })
            if (canceled || !filePaths || filePaths.length === 0) {
                return null
            }
            return path.normalize(filePaths[0])
        } catch (error) {
            console.error('选择插件目录失败:', error)
            return null
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
    const { createLyricWindow, closeLyricWindow, setLyricWindowMovable, getLyricWindow } = lyricFunctions

    ipcMain.handle('create-lyric-window', async () => {
        try {
            if (createLyricWindow) {
                const lyricWin = createLyricWindow()
                if (lyricWin) {
                    globalLyricWindow = lyricWin

                    // 监听窗口关闭事件
                    lyricWin.on('closed', () => {
                        globalLyricWindow = null
                    })


                    return { success: true, message: '桌面歌词窗口已创建' }
                } else {
                    return { success: false, message: '创建窗口失败' }
                }
            }
            return { success: false, message: '桌面歌词功能不可用' }
        } catch (error) {

            return { success: false, message: '创建失败' }
        }
    })

    ipcMain.handle('close-lyric-window', async () => {
        try {
            if (closeLyricWindow) {
                closeLyricWindow()
                return { success: true, message: '桌面歌词窗口已关闭' }
            }
            return { success: false, message: '桌面歌词功能不可用' }
        } catch (error) {

            return { success: false, message: '关闭失败' }
        }
    })

    ipcMain.handle('set-lyric-window-movable', async (event, movable) => {
        try {
            if (setLyricWindowMovable) {
                setLyricWindowMovable(movable)
                return { success: true, message: '窗口移动状态已更新' }
            }
            return { success: false, message: '桌面歌词功能不可用' }
        } catch (error) {

            return { success: false, message: '设置失败' }
        }
    })

    ipcMain.on('lyric-window-ready', () => {

    })

    ipcMain.on('update-lyric-data', (event, data) => {
        let lyricWindow = globalLyricWindow
        if (!lyricWindow && getLyricWindow) {
            lyricWindow = getLyricWindow()
        }

        if (lyricWindow && !lyricWindow.isDestroyed()) {
            lyricWindow.webContents.send('lyric-update', data)
        }
    })

    ipcMain.on('request-lyric-data', (event) => {
        win.webContents.send('get-current-lyric-data')
    })

    ipcMain.on('current-lyric-data', (event, data) => {
        const lyricWindow = getLyricWindow && getLyricWindow()
        if (lyricWindow && !lyricWindow.isDestroyed()) {
            lyricWindow.webContents.send('lyric-update', data)
        }
    })

    ipcMain.handle('is-lyric-window-visible', () => {
        const lyricWindow = getLyricWindow && getLyricWindow();
        return lyricWindow && !lyricWindow.isDestroyed() && lyricWindow.isVisible();
    });

    // 调整桌面歌词窗口大小
    ipcMain.handle('resize-lyric-window', (event, { width, height }) => {
        const lyricWindow = getLyricWindow && getLyricWindow();
        if (lyricWindow && !lyricWindow.isDestroyed()) {
            try {
                lyricWindow.setSize(width, height);
                return { success: true };
            } catch (error) {

                return { success: false, error: error.message };
            }
        }
        return { success: false, error: '窗口不存在' };
    });

    // 获取桌面歌词窗口位置与尺寸
    ipcMain.handle('get-lyric-window-bounds', () => {
        const lyricWindow = getLyricWindow && getLyricWindow();
        if (lyricWindow && !lyricWindow.isDestroyed()) {
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
        const lyricWindow = getLyricWindow && getLyricWindow();
        if (lyricWindow && !lyricWindow.isDestroyed() && typeof x === 'number' && typeof y === 'number') {
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
        const lyricWindow = getLyricWindow && getLyricWindow();
        if (lyricWindow && !lyricWindow.isDestroyed() && typeof dx === 'number' && typeof dy === 'number') {
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
        const lyricWindow = getLyricWindow && getLyricWindow();
        if (
            lyricWindow &&
            !lyricWindow.isDestroyed() &&
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
        const lyricWindow = getLyricWindow && getLyricWindow();
        if (lyricWindow && !lyricWindow.isDestroyed()) {
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
        const lyricWindow = getLyricWindow && getLyricWindow();
        if (lyricWindow && !lyricWindow.isDestroyed()) {
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
        const lyricWindow = getLyricWindow && getLyricWindow();
        if (lyricWindow && !lyricWindow.isDestroyed()) {
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
        const lyricWindow = getLyricWindow && getLyricWindow();
        if (lyricWindow && !lyricWindow.isDestroyed()) {
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
        const lyricWindow = getLyricWindow && getLyricWindow();
        if (
            lyricWindow &&
            !lyricWindow.isDestroyed() &&
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
        const lyricWindow = getLyricWindow && getLyricWindow();
        if (lyricWindow && !lyricWindow.isDestroyed()) {
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

    ipcMain.handle('plugin:get-directory', async () => {
        try {
            const directory = ensurePluginDirectory()
            const normalizedLegacy = normalizeDirectory(legacyPluginDirectory)
            const legacyExists =
                normalizedLegacy && !isSamePath(directory, normalizedLegacy) && fs.existsSync(normalizedLegacy)
            return {
                success: true,
                directory,
                defaultDirectory: defaultPluginDirectory,
                legacyDirectory: legacyExists ? normalizedLegacy : null,
            }
        } catch (error) {
            console.error('获取插件目录失败:', error)
            return { success: false, message: error.message || '获取插件目录失败' }
        }
    })

    ipcMain.handle('plugin:set-directory', async (_event, targetPath, moveExisting = false) => {
        try {
            const normalizedTarget = normalizeDirectory(targetPath)
            if (!normalizedTarget) throw new Error('无效的插件目录')

            const previousDir = ensurePluginDirectory()
            if (isSamePath(previousDir, normalizedTarget)) {
                await syncPluginsFromDisk()
                return {
                    success: true,
                    directory: previousDir,
                    defaultDirectory: defaultPluginDirectory,
                    moved: false,
                }
            }

            if (normalizedTarget.startsWith(previousDir + path.sep)) {
                throw new Error('新的插件目录不能位于旧目录内部')
            }
            if (previousDir.startsWith(normalizedTarget + path.sep)) {
                throw new Error('新的插件目录不能包含旧目录')
            }

            await fsExtra.ensureDir(normalizedTarget)

            let moved = false
            if (moveExisting && fs.existsSync(previousDir)) {
                const entries = await fs.promises.readdir(previousDir)
                if (entries.length > 0) {
                    await fsExtra.copy(previousDir, normalizedTarget, { overwrite: true, errorOnExist: false })
                    await fsExtra.remove(previousDir)
                    moved = true
                }
            }

            pluginStore.set('directory', normalizedTarget)

            await syncPluginsFromDisk()

            const normalizedLegacy = normalizeDirectory(legacyPluginDirectory)
            const legacyExists =
                normalizedLegacy && !isSamePath(normalizedTarget, normalizedLegacy) && fs.existsSync(normalizedLegacy)
            return {
                success: true,
                directory: normalizedTarget,
                defaultDirectory: defaultPluginDirectory,
                legacyDirectory: legacyExists ? normalizedLegacy : null,
                moved,
            }
        } catch (error) {
            console.error('更新插件目录失败:', error)
            return { success: false, message: error.message || '更新插件目录失败' }
        }
    })

    ipcMain.handle('plugin:import', async (_event, sourcePath) => {
        try {
            if (!sourcePath || typeof sourcePath !== 'string') {
                throw new Error('未选择插件目录');
            }

            const manifestPath = path.join(sourcePath, 'manifest.json')
            if (!fs.existsSync(manifestPath)) {
                throw new Error('插件缺少 manifest.json');
            }

            const manifestRaw = await fsExtra.readFile(manifestPath, 'utf-8')
            let manifest
            try {
                manifest = JSON.parse(manifestRaw)
            } catch (e) {
                throw new Error('manifest.json 解析失败')
            }

            const sanitizedId = sanitizePluginId(manifest.id)
            if (!sanitizedId) {
                throw new Error('manifest.json 中的 id 非法，仅允许字母、数字、下划线、点和中横线')
            }

            if (!manifest.name || typeof manifest.name !== 'string') {
                throw new Error('manifest.json 缺少 name 字段')
            }

            if (!manifest.version || typeof manifest.version !== 'string') {
                throw new Error('manifest.json 缺少 version 字段')
            }

            if (!manifest.main || typeof manifest.main !== 'string') {
                throw new Error('manifest.json 缺少 main 字段')
            }

            if (path.isAbsolute(manifest.main)) {
                throw new Error('manifest.json 中的 main 不能为绝对路径')
            }

            const normalizedMain = manifest.main.replace(/\\/g, '/')
            if (normalizedMain.includes('..')) {
                throw new Error('manifest.json 中的 main 不允许包含 ..')
            }

            const pluginDir = resolvePluginDir(sanitizedId)
            if (!pluginDir) {
                throw new Error('无法解析插件目录')
            }

            await ensurePluginDirectory()

            if (fs.existsSync(pluginDir)) {
                await fsExtra.remove(pluginDir)
            }

            await fsExtra.copy(sourcePath, pluginDir, { overwrite: true, errorOnExist: false })

            const entryPath = path.join(pluginDir, normalizedMain)
            if (!fs.existsSync(entryPath)) {
                await fsExtra.remove(pluginDir)
                throw new Error('插件入口文件不存在，请确认 manifest.json 中的 main 配置正确')
            }

            const existingPlugins = getStoredPlugins()
            const previous = existingPlugins.find((item) => item.id === sanitizedId)

            const metadata = {
                id: sanitizedId,
                name: manifest.name.trim(),
                version: manifest.version.trim(),
                description: typeof manifest.description === 'string' ? manifest.description.trim() : '',
                author: typeof manifest.author === 'string' ? manifest.author.trim() : '',
                homepage: typeof manifest.homepage === 'string' ? manifest.homepage.trim() : '',
                entry: normalizedMain,
                enabled: previous ? previous.enabled : manifest.enabledByDefault !== false,
                importTime: Date.now(),
                builtin: false,
            }

            const nextPlugins = existingPlugins.filter((item) => item.id !== sanitizedId)
            nextPlugins.push(metadata)
            saveStoredPlugins(nextPlugins)

            return { success: true, plugin: metadata }
        } catch (error) {
            console.error('导入插件失败:', error)
            return { success: false, message: error.message || '导入失败' }
        }
    })

    ipcMain.handle('plugin:list', async () => {
        try {
            await syncPluginsFromDisk()
            const list = getStoredPlugins().map((item) => ({
                ...item,
                builtin: item.builtin === true,
            }))
            return { success: true, plugins: list }
        } catch (error) {
            console.error('读取插件列表失败:', error)
            return { success: false, message: error.message || '读取插件列表失败' }
        }
    })

    ipcMain.handle('plugin:set-enabled', async (_event, pluginId, enabled) => {
        try {
            const sanitizedId = sanitizePluginId(pluginId)
            if (!sanitizedId) throw new Error('无效的插件 ID')
            const plugins = getStoredPlugins()
            let updated = null
            const nextPlugins = plugins.map((item) => {
                if (item.id !== sanitizedId) return item
                updated = { ...item, enabled: Boolean(enabled) }
                return updated
            })
            if (!updated) throw new Error('插件不存在')
            saveStoredPlugins(nextPlugins)
            await syncPluginsFromDisk()
            return { success: true, plugin: updated }
        } catch (error) {
            console.error('更新插件启用状态失败:', error)
            return { success: false, message: error.message || '更新插件状态失败' }
        }
    })

    ipcMain.handle('plugin:delete', async (_event, pluginId) => {
        try {
            const sanitizedId = sanitizePluginId(pluginId)
            if (!sanitizedId) throw new Error('无效的插件 ID')
            const plugins = getStoredPlugins()
            const target = plugins.find((item) => item.id === sanitizedId)
            const nextPlugins = plugins.filter((item) => item.id !== sanitizedId)
            if (nextPlugins.length === plugins.length) throw new Error('插件不存在')
            const pluginDir = resolvePluginDir(sanitizedId)
            if (pluginDir && fs.existsSync(pluginDir)) {
                await fsExtra.remove(pluginDir)
            }
            saveStoredPlugins(nextPlugins)
            if (target?.builtin) {
                rememberRemovedBuiltinPluginId(sanitizedId)
            } else {
                clearRemovedBuiltinPluginId(sanitizedId)
            }
            await syncPluginsFromDisk()
            return { success: true }
        } catch (error) {
            console.error('删除插件失败:', error)
            return { success: false, message: error.message || '删除插件失败' }
        }
    })

    ipcMain.handle('plugin:get-enabled', async () => {
        try {
            await syncPluginsFromDisk()
            const enabledPlugins = getStoredPlugins().filter((item) => item.enabled)
            const payload = []
            for (const plugin of enabledPlugins) {
                const pluginDir = resolvePluginDir(plugin.id)
                if (!pluginDir) continue
                const entryPath = path.join(pluginDir, plugin.entry)
                if (!fs.existsSync(entryPath)) {
                    console.warn(`插件入口不存在: ${plugin.id}`)
                    continue
                }
                let code = null
                try {
                    code = await fsExtra.readFile(entryPath, 'utf-8')
                } catch (err) {
                    console.error(`读取插件入口失败: ${plugin.id}`, err)
                    continue
                }
                payload.push({
                    ...plugin,
                    entryPath: entryPath.replace(/\\/g, '/'),
                    basePath: pluginDir.replace(/\\/g, '/'),
                    code,
                })
            }
            return { success: true, plugins: payload }
        } catch (error) {
            console.error('加载插件失败:', error)
            return { success: false, message: error.message || '加载插件失败' }
        }
    })

    ipcMain.handle('plugin:read-file', async (_event, pluginId, relativePath, encoding = 'utf-8') => {
        try {
            const sanitizedId = sanitizePluginId(pluginId)
            if (!sanitizedId) throw new Error('无效的插件 ID')
            if (typeof relativePath !== 'string' || !relativePath) throw new Error('无效的文件路径')
            const pluginDir = resolvePluginDir(sanitizedId)
            if (!pluginDir) throw new Error('插件目录不存在')
            const normalizedRelative = path.normalize(relativePath).replace(/^\.\//, '')
            const candidatePath = path.join(pluginDir, normalizedRelative)
            if (!candidatePath.startsWith(pluginDir)) {
                throw new Error('非法的文件访问')
            }
            if (!fs.existsSync(candidatePath)) {
                throw new Error('文件不存在')
            }
            const buffer = await fsExtra.readFile(candidatePath)
            if (encoding === 'base64') {
                return { success: true, data: buffer.toString('base64') }
            }
            const usedEncoding = typeof encoding === 'string' && encoding ? encoding : 'utf-8'
            return { success: true, data: buffer.toString(usedEncoding) }
        } catch (error) {
            console.error('读取插件文件失败:', error)
            return { success: false, message: error.message || '读取插件文件失败' }
        }
    })

    ipcMain.handle('app:reload', async () => {
        try {
            setImmediate(() => {
                if (!win.isDestroyed()) {
                    win.reload()
                }
            })
            return { success: true }
        } catch (error) {
            console.error('重新加载应用失败:', error)
            return { success: false, message: error.message || '重新加载应用失败' }
        }
    })
}
