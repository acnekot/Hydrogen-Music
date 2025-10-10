const PANEL_CLASS = 'hm-horizontal-lyrics-demo__root'
const STYLE_ID = 'hm-horizontal-lyrics-demo-style'
const STORAGE_KEY = 'hm-horizontal-lyrics-demo-settings'

const defaultSettings = Object.freeze({
    alignment: 'bottom',
    offsetX: 0,
    offsetY: 48,
    scale: 1,
})

const settingsState = {
    value: null,
}

const settingsListeners = new Set()

function clamp(value, min, max) {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return min
    if (numeric < min) return min
    if (numeric > max) return max
    return numeric
}

function loadSettings() {
    if (settingsState.value) return settingsState.value
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) {
            settingsState.value = { ...defaultSettings }
            return settingsState.value
        }
        const parsed = JSON.parse(raw)
        settingsState.value = {
            alignment: parsed?.alignment === 'top' ? 'top' : 'bottom',
            offsetX: clamp(parsed?.offsetX ?? defaultSettings.offsetX, -480, 480),
            offsetY: clamp(parsed?.offsetY ?? defaultSettings.offsetY, 0, 480),
            scale: clamp(parsed?.scale ?? defaultSettings.scale, 0.7, 1.4),
        }
        return settingsState.value
    } catch (_) {
        settingsState.value = { ...defaultSettings }
        return settingsState.value
    }
}

function saveSettings(next) {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch (_) {
        // ignore storage errors
    }
}

function subscribeSettings(listener) {
    if (typeof listener !== 'function') return () => {}
    settingsListeners.add(listener)
    listener(loadSettings())
    return () => {
        settingsListeners.delete(listener)
    }
}

function emitSettings(next) {
    for (const listener of settingsListeners) {
        try {
            listener(next)
        } catch (error) {
            console.error('[HorizontalLyrics] 通知设置变更失败', error)
        }
    }
}

function updateSettings(partial) {
    const current = { ...loadSettings() }
    if (partial && typeof partial === 'object') {
        if (partial.alignment) {
            current.alignment = partial.alignment === 'top' ? 'top' : 'bottom'
        }
        if (Object.prototype.hasOwnProperty.call(partial, 'offsetX')) {
            current.offsetX = clamp(partial.offsetX, -480, 480)
        }
        if (Object.prototype.hasOwnProperty.call(partial, 'offsetY')) {
            current.offsetY = clamp(partial.offsetY, 0, 480)
        }
        if (Object.prototype.hasOwnProperty.call(partial, 'scale')) {
            current.scale = clamp(partial.scale, 0.7, 1.4)
        }
    }
    settingsState.value = current
    saveSettings(current)
    emitSettings(current)
    return current
}

function createStyleElement() {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.${PANEL_CLASS} {
    position: fixed;
    left: 50%;
    transform: translate3d(calc(-50% + var(--hm-horizontal-lyrics-offset-x, 0px)), 0, 0) scale(var(--hm-horizontal-lyrics-scale, 1));
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    width: min(780px, calc(100vw - 48px));
    color: #e8edf8;
    font-family: 'Orbitron', 'Share Tech Mono', 'Nunito Sans', 'Noto Sans CJK SC', system-ui, sans-serif;
    letter-spacing: 0.06em;
    z-index: 9999;
    pointer-events: none;
    --hm-horizontal-lyrics-scale: 1;
    --hm-horizontal-lyrics-offset-x: 0px;
}
.${PANEL_CLASS}[data-alignment="top"] {
    top: var(--hm-horizontal-lyrics-edge-offset, 48px);
}
.${PANEL_CLASS}[data-alignment="bottom"] {
    bottom: var(--hm-horizontal-lyrics-edge-offset, 48px);
}
.${PANEL_CLASS} *,
.${PANEL_CLASS} *::before,
.${PANEL_CLASS} *::after {
    box-sizing: border-box;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__frame {
    background: linear-gradient(130deg, rgba(30, 36, 48, 0.92), rgba(19, 25, 36, 0.94));
    border: 1px solid rgba(92, 122, 170, 0.55);
    box-shadow: 0 18px 48px rgba(10, 16, 32, 0.45);
    backdrop-filter: blur(6px);
    display: flex;
    flex-direction: row;
    align-items: stretch;
    pointer-events: auto;
}
.${PANEL_CLASS}.is-paused .hm-horizontal-lyrics-demo__frame {
    opacity: 0.85;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__sidebar {
    width: 72px;
    background: linear-gradient(180deg, rgba(64, 90, 129, 0.38), rgba(37, 55, 83, 0.78));
    border-right: 1px solid rgba(86, 117, 166, 0.32);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 24px 0;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__play-icon {
    width: 0;
    height: 0;
    border-top: 14px solid transparent;
    border-bottom: 14px solid transparent;
    border-left: 22px solid #b8d7ff;
    filter: drop-shadow(0 0 6px rgba(184, 215, 255, 0.5));
    transition: opacity 0.2s ease;
}
.${PANEL_CLASS}.is-paused .hm-horizontal-lyrics-demo__play-icon {
    opacity: 0.5;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__status-text {
    font-size: 11px;
    letter-spacing: 0.28em;
    color: rgba(199, 212, 238, 0.88);
    writing-mode: vertical-rl;
    text-transform: uppercase;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__center {
    position: relative;
    flex: 1;
    background: #f3f6ff;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 26px 36px;
    overflow: hidden;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__line {
    position: relative;
    width: 100%;
    max-width: 520px;
    font-size: 28px;
    font-weight: 600;
    text-align: center;
    color: #1a1f2b;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__text-base,
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__highlight-text {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: 0.08em;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__text-base {
    position: relative;
    z-index: 1;
    color: #1a1f2b;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__highlight {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(90deg, #121722 0%, #1b2232 100%);
    color: #eaf3ff;
    text-shadow: 0 0 8px rgba(108, 194, 255, 0.4);
    transform-origin: left center;
    transform: scaleX(0);
    opacity: 0.95;
    will-change: transform;
    overflow: hidden;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__highlight--active {
    animation: hm-horizontal-lyrics-demo-sweep var(--hm-horizontal-lyrics-duration, 2.4s) cubic-bezier(0.32, 0.04, 0.26, 1) forwards;
}
@keyframes hm-horizontal-lyrics-demo-sweep {
    0% { transform: scaleX(0); }
    12% { transform: scaleX(0.08); }
    100% { transform: scaleX(1); }
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__meta {
    width: 228px;
    padding: 24px 28px;
    background: linear-gradient(180deg, rgba(31, 43, 62, 0.76), rgba(21, 30, 44, 0.92));
    border-left: 1px solid rgba(86, 117, 166, 0.32);
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 14px;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__meta-line {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__meta-label {
    font-size: 11px;
    letter-spacing: 0.28em;
    color: rgba(149, 180, 226, 0.75);
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__meta-value {
    font-size: 14px;
    letter-spacing: 0.05em;
    color: #e5ecff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__meta-value.is-placeholder,
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__text-base.is-placeholder,
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__highlight-text.is-placeholder {
    opacity: 0.45;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__progress {
    height: 6px;
    margin-top: 8px;
    background: rgba(28, 36, 48, 0.4);
    border: 1px solid rgba(92, 122, 170, 0.45);
    overflow: hidden;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__progress-track {
    width: 100%;
    height: 100%;
    background: rgba(18, 23, 34, 0.55);
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__progress-bar {
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, #64b0ff, #8ab8ff);
    transition: width 0.3s ease;
}

.hm-horizontal-lyrics-settings {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 24px;
    color: var(--text-color, #1a1f2b);
    font-family: 'HarmonyOS Sans', 'Noto Sans SC', system-ui, sans-serif;
}
.hm-horizontal-lyrics-settings .settings-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: rgba(240, 245, 255, 0.75);
    border: 1px solid rgba(92, 122, 170, 0.2);
    border-radius: 8px;
    padding: 20px;
}
.hm-horizontal-lyrics-settings .group-title {
    font-size: 16px;
    font-weight: 600;
    color: #1c2432;
}
.hm-horizontal-lyrics-settings .group-description {
    font-size: 13px;
    color: rgba(28, 36, 50, 0.66);
    line-height: 1.6;
}
.hm-horizontal-lyrics-settings .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.hm-horizontal-lyrics-settings label {
    font-size: 13px;
    font-weight: 500;
    color: rgba(28, 36, 50, 0.8);
}
.hm-horizontal-lyrics-settings select,
.hm-horizontal-lyrics-settings input[type="number"],
.hm-horizontal-lyrics-settings input[type="range"] {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid rgba(92, 122, 170, 0.35);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.9);
    color: inherit;
    font-size: 14px;
}
.hm-horizontal-lyrics-settings .range-value {
    font-size: 12px;
    color: rgba(28, 36, 50, 0.6);
}
.hm-horizontal-lyrics-settings .actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 8px;
}
.hm-horizontal-lyrics-settings .button {
    padding: 8px 16px;
    border-radius: 6px;
    border: 1px solid rgba(92, 122, 170, 0.45);
    background: rgba(255, 255, 255, 0.85);
    color: rgba(28, 36, 50, 0.82);
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s ease;
}
.hm-horizontal-lyrics-settings .button:hover {
    background: rgba(255, 255, 255, 1);
}
`
    return style
}

function buildMarkup() {
    const root = document.createElement('div')
    root.className = PANEL_CLASS
    root.setAttribute('data-alignment', 'bottom')
    root.innerHTML = `
        <div class="hm-horizontal-lyrics-demo__frame">
            <div class="hm-horizontal-lyrics-demo__sidebar">
                <div class="hm-horizontal-lyrics-demo__play-icon"></div>
                <div class="hm-horizontal-lyrics-demo__status-text" data-role="status-text">PLAYING</div>
            </div>
            <div class="hm-horizontal-lyrics-demo__center">
                <div class="hm-horizontal-lyrics-demo__line">
                    <span class="hm-horizontal-lyrics-demo__text-base" data-role="lyric-text">咔啦咔啦啦……</span>
                    <span class="hm-horizontal-lyrics-demo__highlight" data-role="lyric-highlight">
                        <span class="hm-horizontal-lyrics-demo__highlight-text" data-role="lyric-highlight-text">咔啦咔啦啦……</span>
                    </span>
                </div>
            </div>
            <div class="hm-horizontal-lyrics-demo__meta">
                <div class="hm-horizontal-lyrics-demo__meta-line">
                    <span class="hm-horizontal-lyrics-demo__meta-label">TRACK</span>
                    <span class="hm-horizontal-lyrics-demo__meta-value" data-role="track-value">カラカラカラのカラ</span>
                </div>
                <div class="hm-horizontal-lyrics-demo__meta-line">
                    <span class="hm-horizontal-lyrics-demo__meta-label">ARTIST</span>
                    <span class="hm-horizontal-lyrics-demo__meta-value" data-role="artist-value">きくお / 初音ミク</span>
                </div>
            </div>
        </div>
        <div class="hm-horizontal-lyrics-demo__progress">
            <div class="hm-horizontal-lyrics-demo__progress-track">
                <div class="hm-horizontal-lyrics-demo__progress-bar" data-role="progress-bar"></div>
            </div>
        </div>
    `
    return {
        root,
        elements: {
            root,
            text: root.querySelector('[data-role="lyric-text"]'),
            highlight: root.querySelector('[data-role="lyric-highlight"]'),
            highlightText: root.querySelector('[data-role="lyric-highlight-text"]'),
            track: root.querySelector('[data-role="track-value"]'),
            artist: root.querySelector('[data-role="artist-value"]'),
            status: root.querySelector('[data-role="status-text"]'),
            progress: root.querySelector('[data-role="progress-bar"]'),
        },
    }
}

function pickSongFromState(state) {
    if (!state) return null
    const { songList, currentIndex, listInfo, currentMusic } = state
    const index = Number.isInteger(currentIndex) ? currentIndex : 0

    if (Array.isArray(songList) && songList.length > 0) {
        return songList[Math.max(0, Math.min(index, songList.length - 1))] || null
    }
    if (listInfo && Array.isArray(listInfo.tracks) && listInfo.tracks.length > 0) {
        return listInfo.tracks[Math.max(0, Math.min(index, listInfo.tracks.length - 1))] || null
    }
    if (currentMusic && typeof currentMusic === 'object') {
        return currentMusic
    }
    return null
}

function getSongTitle(song) {
    if (!song) return ''
    return (
        song.name ||
        song.title ||
        song.songName ||
        song.filename ||
        song.trackName ||
        ''
    )
}

function readArtistName(artist) {
    if (!artist) return ''
    if (typeof artist === 'string') return artist
    if (typeof artist === 'object') {
        return artist.name || artist.nickname || artist.title || ''
    }
    return ''
}

function getSongArtists(song) {
    if (!song) return ''
    if (Array.isArray(song.ar) && song.ar.length) {
        return song.ar.map(readArtistName).filter(Boolean).join(' / ')
    }
    if (Array.isArray(song.artists) && song.artists.length) {
        return song.artists.map(readArtistName).filter(Boolean).join(' / ')
    }
    if (Array.isArray(song.artist) && song.artist.length) {
        return song.artist.map(readArtistName).filter(Boolean).join(' / ')
    }
    if (Array.isArray(song.singers) && song.singers.length) {
        return song.singers.map(readArtistName).filter(Boolean).join(' / ')
    }
    if (song.ar) {
        const value = readArtistName(song.ar)
        if (value) return value
    }
    if (song.artist) {
        const value = readArtistName(song.artist)
        if (value) return value
    }
    if (song.singer) {
        const value = readArtistName(song.singer)
        if (value) return value
    }
    return ''
}

function resolveLyricPreference(state) {
    if (!state) return ['auto']
    const { lyricType } = state
    if (Array.isArray(lyricType) && lyricType.length) {
        return lyricType
    }
    return ['auto']
}

function formatLyricText(lyricObj, preference) {
    if (!lyricObj) return ''
    const types = Array.isArray(preference) ? preference : ['auto']
    const tryResolve = (type) => {
        if (type === 'auto') {
            return lyricObj.tlyric || lyricObj.lyric || lyricObj.rlyric || ''
        }
        if (type === 'trans') return lyricObj.tlyric || ''
        if (type === 'roma') return lyricObj.rlyric || ''
        if (type === 'original') return lyricObj.lyric || ''
        return ''
    }
    for (const type of types) {
        const value = tryResolve(type)
        if (value) return value
    }
    return lyricObj.lyric || lyricObj.tlyric || lyricObj.rlyric || ''
}

function pickLyricLine(state) {
    if (!state || !Array.isArray(state.lyricsObjArr) || state.lyricsObjArr.length === 0) {
        return { text: '', nextText: '', index: -1, nextTime: null, currentTime: null }
    }
    const preference = resolveLyricPreference(state)
    const index = Number.isInteger(state.currentLyricIndex) ? state.currentLyricIndex : -1
    const arr = state.lyricsObjArr
    const current = index >= 0 && index < arr.length ? arr[index] : arr[0]
    const next = index >= 0 && index + 1 < arr.length ? arr[index + 1] : arr[Math.min(arr.length - 1, index + 1)]
    const text = formatLyricText(current, preference)
    const nextText = formatLyricText(next, preference)
    const currentTime = current && typeof current.time === 'number' ? current.time : null
    const nextTime = next && typeof next.time === 'number' ? next.time : null
    return { text, nextText, index, currentTime, nextTime }
}

function computeHighlightDuration(currentTime, nextTime) {
    if (typeof currentTime === 'number' && typeof nextTime === 'number') {
        const delta = Math.max(0, nextTime - currentTime)
        if (Number.isFinite(delta) && delta > 0.05) {
            return Math.min(Math.max(delta, 0.8), 8)
        }
    }
    return 2.4
}

function updateLyricElements(elements, payload) {
    const { text, duration, animate } = payload
    const displayText = text || '……'
    if (elements.text) {
        elements.text.textContent = displayText
        elements.text.classList.toggle('is-placeholder', !text)
    }
    if (!elements.highlight || !elements.highlightText) return

    elements.highlightText.textContent = displayText
    elements.highlightText.classList.toggle('is-placeholder', !text)
    elements.highlight.style.setProperty('--hm-horizontal-lyrics-duration', `${duration}s`)

    elements.highlight.classList.remove('hm-horizontal-lyrics-demo__highlight--active')
    void elements.highlight.offsetWidth
    if (animate) {
        elements.highlight.classList.add('hm-horizontal-lyrics-demo__highlight--active')
    }
}

function updateMetaElements(elements, { track, artist }) {
    if (elements.track) {
        const value = track || 'カラカラカラのカラ'
        elements.track.textContent = value
        elements.track.classList.toggle('is-placeholder', !track)
    }
    if (elements.artist) {
        const value = artist || 'きくお / 初音ミク'
        elements.artist.textContent = value
        elements.artist.classList.toggle('is-placeholder', !artist)
    }
}

function updatePlaybackState(elements, playing) {
    const isPlaying = Boolean(playing)
    if (elements.root) {
        elements.root.classList.toggle('is-paused', !isPlaying)
    }
    if (elements.status) {
        elements.status.textContent = isPlaying ? 'PLAYING' : 'PAUSED'
    }
}

function updateProgress(elements, state) {
    if (!elements.progress) return
    if (!state || !Array.isArray(state.lyricsObjArr) || state.lyricsObjArr.length === 0) {
        elements.progress.style.width = '0%'
        return
    }
    const index = Number.isInteger(state.currentLyricIndex) ? state.currentLyricIndex + 1 : 0
    const percentage = Math.max(0, Math.min(1, index / state.lyricsObjArr.length)) * 100
    elements.progress.style.width = `${percentage}%`
}

function applySettingsToPanel(root, settings) {
    if (!root) return
    const applied = settings || loadSettings()
    root.style.setProperty('--hm-horizontal-lyrics-offset-x', `${applied.offsetX}px`)
    root.style.setProperty('--hm-horizontal-lyrics-scale', `${applied.scale}`)
    root.setAttribute('data-alignment', applied.alignment === 'top' ? 'top' : 'bottom')
    root.style.setProperty('--hm-horizontal-lyrics-edge-offset', `${Math.max(0, applied.offsetY)}px`)
}

function renderSettingsPage(container, onUpdate) {
    if (!container) return () => {}
    container.innerHTML = ''

    const root = document.createElement('div')
    root.className = 'hm-horizontal-lyrics-settings'
    root.innerHTML = `
        <div class="settings-group">
            <div class="group-title">面板布局</div>
            <div class="group-description">根据桌面布局调整歌词面板在屏幕中的位置与缩放比例。</div>
            <div class="field">
                <label for="hm-horizontal-lyrics-alignment">垂直位置</label>
                <select id="hm-horizontal-lyrics-alignment">
                    <option value="bottom">靠下（默认）</option>
                    <option value="top">靠上</option>
                </select>
            </div>
            <div class="field">
                <label for="hm-horizontal-lyrics-offset-x">水平偏移（-480 ~ 480 px）</label>
                <input id="hm-horizontal-lyrics-offset-x" type="number" min="-480" max="480" step="10" />
            </div>
            <div class="field">
                <label for="hm-horizontal-lyrics-offset-y">边缘距离（0 ~ 480 px）</label>
                <input id="hm-horizontal-lyrics-offset-y" type="number" min="0" max="480" step="10" />
            </div>
            <div class="field">
                <label for="hm-horizontal-lyrics-scale">整体缩放（0.7 ~ 1.4）</label>
                <input id="hm-horizontal-lyrics-scale" type="range" min="0.7" max="1.4" step="0.01" />
                <div class="range-value" data-role="scale-value">100%</div>
            </div>
            <div class="actions">
                <div class="button" data-role="reset">恢复默认</div>
            </div>
        </div>
    `

    container.appendChild(root)

    const alignmentEl = root.querySelector('#hm-horizontal-lyrics-alignment')
    const offsetXEl = root.querySelector('#hm-horizontal-lyrics-offset-x')
    const offsetYEl = root.querySelector('#hm-horizontal-lyrics-offset-y')
    const scaleEl = root.querySelector('#hm-horizontal-lyrics-scale')
    const scaleValueEl = root.querySelector('[data-role="scale-value"]')
    const resetEl = root.querySelector('[data-role="reset"]')

    const updateForm = (settings) => {
        if (!settings) return
        if (alignmentEl) alignmentEl.value = settings.alignment
        if (offsetXEl) offsetXEl.value = settings.offsetX
        if (offsetYEl) offsetYEl.value = settings.offsetY
        if (scaleEl) scaleEl.value = settings.scale
        if (scaleValueEl) {
            scaleValueEl.textContent = `${Math.round(settings.scale * 100)}%`
        }
    }

    const unsubscribe = subscribeSettings((settings) => {
        updateForm(settings)
    })

    const listeners = []

    if (alignmentEl) {
        const handler = (event) => {
            const value = event.target.value === 'top' ? 'top' : 'bottom'
            onUpdate({ alignment: value })
        }
        alignmentEl.addEventListener('change', handler)
        listeners.push(() => alignmentEl.removeEventListener('change', handler))
    }

    if (offsetXEl) {
        const handler = (event) => {
            onUpdate({ offsetX: Number(event.target.value) })
        }
        offsetXEl.addEventListener('change', handler)
        listeners.push(() => offsetXEl.removeEventListener('change', handler))
    }

    if (offsetYEl) {
        const handler = (event) => {
            onUpdate({ offsetY: Number(event.target.value) })
        }
        offsetYEl.addEventListener('change', handler)
        listeners.push(() => offsetYEl.removeEventListener('change', handler))
    }

    if (scaleEl) {
        const handler = (event) => {
            onUpdate({ scale: Number(event.target.value) })
            if (scaleValueEl) {
                scaleValueEl.textContent = `${Math.round(Number(event.target.value) * 100)}%`
            }
        }
        scaleEl.addEventListener('input', handler)
        listeners.push(() => scaleEl.removeEventListener('input', handler))
    }

    if (resetEl) {
        const handler = () => {
            onUpdate({ ...defaultSettings })
        }
        resetEl.addEventListener('click', handler)
        listeners.push(() => resetEl.removeEventListener('click', handler))
    }

    return () => {
        unsubscribe()
        for (const dispose of listeners) {
            try {
                dispose()
            } catch (_) {
                // ignore
            }
        }
        if (root.parentNode) {
            root.parentNode.removeChild(root)
        }
    }
}

function resolveStateSnapshot(store) {
    if (!store) return null
    if (store.$state) return store.$state
    return store
}

module.exports = {
    activate(context) {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return
        }
        const player = context && context.stores && context.stores.player
        if (!player) {
            context?.utils?.notice?.('横向桌面歌词示例：无法读取播放器状态')
            return
        }

        if (!document.getElementById(STYLE_ID)) {
            document.head.appendChild(createStyleElement())
        }

        const { root, elements } = buildMarkup()
        document.body.appendChild(root)
        applySettingsToPanel(root, loadSettings())

        let lastLyricKey = null
        let unsubscribeSettings = null

        const render = (rawState) => {
            if (!rawState) return
            const state = resolveStateSnapshot(rawState)
            updatePlaybackState(elements, state.playing)

            const song = pickSongFromState(state)
            const title = getSongTitle(song)
            const artists = getSongArtists(song)
            updateMetaElements(elements, {
                track: title,
                artist: artists,
            })

            const { text, currentTime, nextTime, index } = pickLyricLine(state)
            const duration = computeHighlightDuration(currentTime, nextTime)
            const lyricKey = `${index}:${text}`
            const shouldAnimate = text ? lyricKey !== lastLyricKey : false
            updateLyricElements(elements, { text, duration, animate: shouldAnimate })
            if (shouldAnimate) {
                lastLyricKey = lyricKey
            }

            updateProgress(elements, state)
        }

        render(player.$state || player)

        const unsubscribePlayer = typeof player.$subscribe === 'function'
            ? player.$subscribe((_, state) => {
                render(state)
            })
            : null

        unsubscribeSettings = subscribeSettings((settings) => {
            applySettingsToPanel(elements.root, settings)
        })

        let unregisterSettingsPage = null
        if (context?.settings?.register) {
            try {
                unregisterSettingsPage = context.settings.register({
                    title: '横向桌面歌词示例',
                    subtitle: '自定义桌面歌词的布局与尺寸。',
                    mount(container) {
                        return renderSettingsPage(container, (partial) => updateSettings(partial))
                    },
                })
            } catch (error) {
                console.error('[HorizontalLyrics] 注册插件设置页面失败', error)
            }
        }

        context.onCleanup(() => {
            try {
                unsubscribePlayer?.()
            } catch (_) {
                // ignore
            }
            try {
                unsubscribeSettings?.()
            } catch (_) {
                // ignore
            }
            try {
                unregisterSettingsPage?.()
            } catch (_) {
                // ignore
            }
            if (root && root.parentNode) {
                root.parentNode.removeChild(root)
            }
            const styleEl = document.getElementById(STYLE_ID)
            if (styleEl && styleEl.parentNode && document.querySelectorAll(`#${STYLE_ID}`).length <= 1) {
                styleEl.parentNode.removeChild(styleEl)
            }
        })
    },
}
