import { effectScope, reactive, watch } from 'vue'
import { storeToRefs } from 'pinia'

const SOURCE_OPTIONS = ['auto', 'original', 'translation', 'romaji', 'bilingual']
const DEFAULT_FONT_SIZE = 28
const MIN_FONT_SIZE = 16
const MAX_FONT_SIZE = 64
const SUB_FONT_MIN = 12

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const sanitize = (value) => (typeof value === 'string' ? value.trim() : '')

const toFileSystemPath = (fileUrl) => {
    const pathname = decodeURIComponent(fileUrl.pathname)
    return pathname.replace(/^\/(?:[A-Za-z]:)/, (match) => match.slice(1))
}

const normalizeBounds = (raw = {}) => {
    const result = {}
    if (Number.isFinite(raw.width)) result.width = Math.max(260, Math.round(raw.width))
    if (Number.isFinite(raw.height)) result.height = Math.max(140, Math.round(raw.height))
    if (Number.isFinite(raw.x)) result.x = Math.round(raw.x)
    if (Number.isFinite(raw.y)) result.y = Math.round(raw.y)
    return result
}

const resolveLyricLines = (entry, source) => {
    if (!entry) {
        return {
            mainLine: '',
            subLine: '',
            available: { translation: false, romaji: false, bilingual: false },
        }
    }

    const original = sanitize(entry.lyric)
    const translation = sanitize(entry.tlyric)
    const romaji = sanitize(entry.rlyric)

    const available = {
        translation: !!translation,
        romaji: !!romaji,
        bilingual: !!translation || !!romaji,
    }

    let mainLine = ''
    let subLine = ''

    switch (source) {
        case 'original':
            mainLine = original || translation || romaji
            break
        case 'translation':
            if (translation) {
                mainLine = translation
                subLine = original && original !== translation ? original : ''
            } else {
                mainLine = original || romaji
            }
            break
        case 'romaji':
            if (romaji) {
                mainLine = romaji
                subLine = original && original !== romaji ? original : ''
            } else {
                mainLine = original || translation
            }
            break
        case 'bilingual':
            mainLine = original || translation || romaji
            subLine = translation || (romaji && romaji !== mainLine ? romaji : '')
            break
        case 'auto':
        default:
            if (translation && original && translation !== original) {
                mainLine = original
                subLine = translation
            } else if (translation && !original) {
                mainLine = translation
            } else if (romaji && original && romaji !== original) {
                mainLine = original
                subLine = romaji
            } else {
                mainLine = original || translation || romaji
            }
            break
    }

    if (subLine && mainLine && subLine === mainLine) {
        subLine = ''
    }

    return { mainLine, subLine, available }
}

const buildTrackInfo = (music) => {
    if (!music) {
        return {
            track: '',
            artist: '',
            album: '',
        }
    }
    const track = sanitize(music.name || music.title || '')
    let artist = ''
    if (Array.isArray(music.ar) && music.ar.length) {
        artist = music.ar.map((item) => sanitize(item.name || item)).filter(Boolean).join(' / ')
    } else if (Array.isArray(music.artists) && music.artists.length) {
        artist = music.artists.map((item) => sanitize(item.name || item)).filter(Boolean).join(' / ')
    } else if (music.artist) {
        artist = sanitize(music.artist)
    }
    const album = sanitize((music.al && music.al.name) || music.album || '')
    return { track, artist, album }
}

export default {
    async activate(context) {
        if (typeof window === 'undefined') {
            return () => {}
        }
        const electronAPI = window.electronAPI
        if (!electronAPI) {
            context.ui?.notice?.('桌面歌词插件需要在桌面客户端运行', 3)
            return () => {}
        }

        const htmlUrl = new URL('./window.html', import.meta.url)
        const htmlPath = toFileSystemPath(htmlUrl)

        const storageKey = `plugin:${context?.meta?.id || 'desktop-lyric'}:settings`
        const loadSettings = () => {
            try {
                const raw = window.localStorage.getItem(storageKey)
                if (!raw) return {}
                const parsed = JSON.parse(raw)
                if (parsed && typeof parsed === 'object') return parsed
            } catch (error) {
                console.warn('[DesktopLyricPlugin] 读取设置失败', error)
            }
            return {}
        }

        const persistSettings = (settings) => {
            try {
                window.localStorage.setItem(storageKey, JSON.stringify(settings))
            } catch (error) {
                console.warn('[DesktopLyricPlugin] 保存设置失败', error)
            }
        }

        const saved = loadSettings()
        const initialBounds = normalizeBounds(saved.bounds || {})
        const state = reactive({
            windowReady: false,
            windowVisible: false,
            locked: !!saved.locked,
            source: SOURCE_OPTIONS.includes(saved.source) ? saved.source : 'auto',
            fontSize: clamp(Number(saved.fontSize) || DEFAULT_FONT_SIZE, MIN_FONT_SIZE, MAX_FONT_SIZE),
            subFontSize: clamp(Number(saved.subFontSize) || Math.round(DEFAULT_FONT_SIZE * 0.6), SUB_FONT_MIN, MAX_FONT_SIZE),
            bounds: reactive({
                width: initialBounds.width || 520,
                height: initialBounds.height || 180,
                x: initialBounds.x,
                y: initialBounds.y,
            }),
        })

        const queuePersist = (() => {
            let timer = null
            return () => {
                if (timer) clearTimeout(timer)
                timer = setTimeout(() => {
                    persistSettings({
                        source: state.source,
                        locked: state.locked,
                        fontSize: state.fontSize,
                        subFontSize: state.subFontSize,
                        bounds: {
                            width: state.bounds.width,
                            height: state.bounds.height,
                            x: state.bounds.x,
                            y: state.bounds.y,
                        },
                    })
                }, 200)
            }
        })()

        const updateBounds = (next = {}, options = {}) => {
            const { width, height, x, y } = next
            let changed = false
            if (Number.isFinite(width) && width > 0) {
                const normalized = Math.max(260, Math.round(width))
                if (state.bounds.width !== normalized) {
                    state.bounds.width = normalized
                    changed = true
                }
            }
            if (Number.isFinite(height) && height > 0) {
                const normalized = Math.max(140, Math.round(height))
                if (state.bounds.height !== normalized) {
                    state.bounds.height = normalized
                    changed = true
                }
            }
            if (Number.isFinite(x)) {
                const normalized = Math.round(x)
                if (state.bounds.x !== normalized) {
                    state.bounds.x = normalized
                    changed = true
                }
            }
            if (Number.isFinite(y)) {
                const normalized = Math.round(y)
                if (state.bounds.y !== normalized) {
                    state.bounds.y = normalized
                    changed = true
                }
            }
            if (changed && !options.silent) {
                queuePersist()
            }
        }

        const ensureWindow = async () => {
            if (state.windowVisible) return true
            try {
                const result = await electronAPI.createLyricWindow({
                    htmlPath,
                    width: state.bounds.width,
                    height: state.bounds.height,
                    x: state.bounds.x,
                    y: state.bounds.y,
                    backgroundColor: '#11131a',
                    alwaysOnTop: saved.alwaysOnTop !== false,
                    minWidth: 360,
                    minHeight: 140,
                })
                if (result && result.success === false) {
                    context.ui?.notice?.(`桌面歌词窗口创建失败：${result.message}`, 4)
                    return false
                }
                state.windowVisible = true
                return true
            } catch (error) {
                console.error('[DesktopLyricPlugin] 创建窗口失败', error)
                context.ui?.notice?.('桌面歌词窗口创建失败', 3)
                return false
            }
        }

        const playerStore = context.stores?.player
        if (!playerStore) {
            context.ui?.notice?.('桌面歌词插件无法访问播放器状态', 3)
            return () => {}
        }
        const { currentLyricIndex, lyricsObjArr, currentMusic } = storeToRefs(playerStore)

        const scope = effectScope()
        let lastSignature = null
        let destroyed = false
        let boundsWatcher = null

        const fetchAndPersistBounds = async () => {
            try {
                const bounds = await electronAPI.getLyricWindowBounds?.()
                if (bounds) {
                    updateBounds(bounds, { silent: true })
                    queuePersist()
                }
            } catch (error) {
                console.warn('[DesktopLyricPlugin] 获取窗口位置失败', error)
            }
        }

        const startBoundsWatcher = () => {
            if (boundsWatcher) return
            boundsWatcher = setInterval(() => {
                if (destroyed || state.locked) return
                fetchAndPersistBounds()
            }, 2000)
        }

        const stopBoundsWatcher = () => {
            if (boundsWatcher) {
                clearInterval(boundsWatcher)
                boundsWatcher = null
            }
        }

        const pushUpdate = (force = false) => {
            if (!state.windowVisible) return
            const music = currentMusic.value
            const info = buildTrackInfo(music)
            const arr = Array.isArray(lyricsObjArr.value) ? lyricsObjArr.value : []
            const index = typeof currentLyricIndex.value === 'number' ? currentLyricIndex.value : -1
            const target = index >= 0 && index < arr.length ? arr[index] : null
            const next = index + 1 >= 0 && index + 1 < arr.length ? arr[index + 1] : null
            const { mainLine, subLine, available } = resolveLyricLines(target, state.source)
            const nextLines = resolveLyricLines(next, state.source)

            const payload = {
                lyric: mainLine,
                subLyric: subLine,
                nextLyric: nextLines.mainLine,
                track: info.track,
                artist: info.artist,
                album: info.album,
                locked: state.locked,
                source: state.source,
                fontSize: state.fontSize,
                subFontSize: state.subFontSize,
                availableSources: available,
                timestamp: Date.now(),
            }

            const signature = [
                payload.lyric,
                payload.subLyric,
                payload.nextLyric,
                payload.track,
                payload.artist,
                payload.album,
                payload.source,
                payload.locked ? '1' : '0',
                payload.fontSize,
                payload.subFontSize,
            ].join('|')

            if (!force && signature === lastSignature) {
                return
            }
            lastSignature = signature

            electronAPI.updateLyricData(payload)
        }

        const respondCurrentData = () => {
            if (!state.windowVisible) return
            const music = currentMusic.value
            const info = buildTrackInfo(music)
            const arr = Array.isArray(lyricsObjArr.value) ? lyricsObjArr.value : []
            const index = typeof currentLyricIndex.value === 'number' ? currentLyricIndex.value : -1
            const target = index >= 0 && index < arr.length ? arr[index] : null
            const next = index + 1 >= 0 && index + 1 < arr.length ? arr[index + 1] : null
            const { mainLine, subLine, available } = resolveLyricLines(target, state.source)
            const nextLines = resolveLyricLines(next, state.source)

            electronAPI.sendCurrentLyricData({
                lyric: mainLine,
                subLyric: subLine,
                nextLyric: nextLines.mainLine,
                track: info.track,
                artist: info.artist,
                album: info.album,
                locked: state.locked,
                source: state.source,
                fontSize: state.fontSize,
                subFontSize: state.subFontSize,
                availableSources: available,
                timestamp: Date.now(),
            })
        }

        const handleCommand = (payload) => {
            if (!payload || typeof payload !== 'object') return
            switch (payload.type) {
                case 'ready':
                    state.windowReady = true
                    pushUpdate(true)
                    fetchAndPersistBounds()
                    break
                case 'set-source':
                    if (SOURCE_OPTIONS.includes(payload.value)) {
                        state.source = payload.value
                    }
                    break
                case 'toggle-lock':
                    state.locked = !state.locked
                    break
                case 'set-locked':
                    state.locked = !!payload.value
                    break
                case 'adjust-font':
                    if (typeof payload.delta === 'number') {
                        state.fontSize = clamp(state.fontSize + payload.delta, MIN_FONT_SIZE, MAX_FONT_SIZE)
                    }
                    break
                case 'set-font':
                    if (typeof payload.value === 'number') {
                        state.fontSize = clamp(payload.value, MIN_FONT_SIZE, MAX_FONT_SIZE)
                    }
                    break
                case 'adjust-sub-font':
                    if (typeof payload.delta === 'number') {
                        state.subFontSize = clamp(state.subFontSize + payload.delta, SUB_FONT_MIN, MAX_FONT_SIZE)
                    }
                    break
                case 'set-sub-font':
                    if (typeof payload.value === 'number') {
                        state.subFontSize = clamp(payload.value, SUB_FONT_MIN, MAX_FONT_SIZE)
                    }
                    break
                case 'window-resized':
                case 'window-moved':
                case 'request-bounds':
                    fetchAndPersistBounds()
                    break
                case 'request-refresh':
                    pushUpdate(true)
                    break
                case 'close-window':
                    electronAPI.closeLyricWindow()
                    break
                default:
                    break
            }
        }

        const disposers = []
        disposers.push(electronAPI.onDesktopLyricReady(() => {
            state.windowReady = true
            pushUpdate(true)
            fetchAndPersistBounds()
        }))
        disposers.push(electronAPI.onDesktopLyricClosed(() => {
            state.windowReady = false
            state.windowVisible = false
            stopBoundsWatcher()
        }))
        disposers.push(electronAPI.onDesktopLyricCommand(handleCommand))
        disposers.push(electronAPI.getCurrentLyricData(() => respondCurrentData()))

        const windowCreated = await ensureWindow()
        if (!windowCreated) {
            disposers.forEach((off) => off && typeof off === 'function' && off())
            return () => {}
        }

        if (state.locked) {
            electronAPI.setLyricWindowMovable?.(false)
            electronAPI.setLyricWindowResizable?.(false)
        } else {
            electronAPI.setLyricWindowMovable?.(true)
            electronAPI.setLyricWindowResizable?.(true)
            startBoundsWatcher()
        }

        scope.run(() => {
            watch(() => state.locked, (locked) => {
                electronAPI.setLyricWindowMovable?.(!locked)
                electronAPI.setLyricWindowResizable?.(!locked)
                if (locked) {
                    stopBoundsWatcher()
                } else {
                    startBoundsWatcher()
                }
                queuePersist()
                pushUpdate(true)
            }, { immediate: true })

            watch(() => state.source, () => {
                queuePersist()
                pushUpdate(true)
            })

            watch(() => state.fontSize, () => {
                queuePersist()
                pushUpdate(true)
            })

            watch(() => state.subFontSize, () => {
                queuePersist()
                pushUpdate(true)
            })

            watch(() => currentLyricIndex.value, () => {
                pushUpdate()
            }, { immediate: true })

            watch(() => lyricsObjArr.value, () => {
                pushUpdate(true)
            }, { immediate: true })

            watch(() => currentMusic.value, () => {
                pushUpdate(true)
            })
        })

        fetchAndPersistBounds()
        pushUpdate(true)

        return async () => {
            destroyed = true
            stopBoundsWatcher()
            scope.stop()
            disposers.forEach((off) => off && typeof off === 'function' && off())
            try {
                await electronAPI.closeLyricWindow()
            } catch (_) {
                // ignore close errors
            }
        }
    },
}
