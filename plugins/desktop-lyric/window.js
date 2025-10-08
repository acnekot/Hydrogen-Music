const electronAPI = window.electronAPI || {}

const elements = {
    lyric: document.getElementById('lyric-text'),
    sub: document.getElementById('lyric-sub'),
    next: document.getElementById('lyric-next'),
    track: document.getElementById('meta-track'),
    artist: document.getElementById('meta-artist'),
    album: document.getElementById('meta-album'),
    albumGroup: document.getElementById('album-group'),
    menu: document.getElementById('context-menu'),
    lockIndicator: document.getElementById('lock-indicator'),
}

const state = {
    source: 'auto',
    locked: false,
    availableSources: {
        translation: false,
        romaji: false,
        bilingual: false,
    },
}

const DEFAULT_MAIN_FONT = 28
const DEFAULT_SUB_FONT = 18

const sanitize = (value) => (typeof value === 'string' ? value.trim() : '')

const updateMenuState = () => {
    const { menu } = elements
    if (!menu) return
    const lockItem = menu.querySelector('[data-command="toggle-lock"]')
    if (lockItem) {
        lockItem.textContent = state.locked ? '解除锁定' : '锁定位置'
    }
    menu.querySelectorAll('[data-command^="source:"]').forEach((item) => {
        const [, value] = item.dataset.command.split(':')
        item.classList.toggle('is-active', value === state.source)
        if (value === 'translation') {
            item.classList.toggle('is-disabled', !state.availableSources.translation)
        } else if (value === 'romaji') {
            item.classList.toggle('is-disabled', !state.availableSources.romaji)
        } else if (value === 'bilingual') {
            item.classList.toggle('is-disabled', !state.availableSources.bilingual)
        } else {
            item.classList.remove('is-disabled')
        }
    })
}

const applyPayload = (payload = {}) => {
    const lyric = sanitize(payload.lyric) || '♪♪♪'
    const sub = sanitize(payload.subLyric)
    const next = sanitize(payload.nextLyric)

    elements.lyric.textContent = lyric
    elements.sub.textContent = sub
    elements.sub.classList.toggle('is-empty', !sub)
    elements.next.textContent = next ? `NEXT ▸ ${next}` : ''

    elements.track.textContent = sanitize(payload.track)
    elements.artist.textContent = sanitize(payload.artist)
    elements.album.textContent = sanitize(payload.album)
    if (elements.albumGroup) {
        elements.albumGroup.style.display = payload.album ? 'flex' : 'none'
    }

    const mainSize = typeof payload.fontSize === 'number' && payload.fontSize > 0 ? payload.fontSize : DEFAULT_MAIN_FONT
    const subSize = typeof payload.subFontSize === 'number' && payload.subFontSize > 0 ? payload.subFontSize : DEFAULT_SUB_FONT
    document.body.style.setProperty('--lyric-font-size', `${mainSize}px`)
    document.body.style.setProperty('--sub-font-size', `${subSize}px`)

    state.locked = !!payload.locked
    state.source = typeof payload.source === 'string' ? payload.source : 'auto'
    state.availableSources = {
        translation: !!payload?.availableSources?.translation,
        romaji: !!payload?.availableSources?.romaji,
        bilingual: !!payload?.availableSources?.bilingual,
    }

    document.body.classList.toggle('is-locked', state.locked)
    updateMenuState()
}

const closeMenu = () => {
    const { menu } = elements
    if (!menu || menu.hidden) return
    menu.hidden = true
    menu.style.visibility = 'hidden'
}

const openMenu = (x, y) => {
    const { menu } = elements
    if (!menu) return
    updateMenuState()
    menu.hidden = false
    menu.style.visibility = 'hidden'
    menu.style.left = '0px'
    menu.style.top = '0px'
    requestAnimationFrame(() => {
        const rect = menu.getBoundingClientRect()
        const maxLeft = Math.max(8, window.innerWidth - rect.width - 12)
        const maxTop = Math.max(8, window.innerHeight - rect.height - 12)
        const left = Math.min(Math.max(8, x), maxLeft)
        const top = Math.min(Math.max(8, y), maxTop)
        menu.style.left = `${left}px`
        menu.style.top = `${top}px`
        menu.style.visibility = 'visible'
    })
}

const emitCommand = (payload) => {
    if (electronAPI?.emitDesktopLyricCommand) {
        electronAPI.emitDesktopLyricCommand(payload)
    }
}

const handleMenuAction = (command) => {
    if (!command) return
    const [type, value] = command.split(':')
    switch (type) {
        case 'source':
            emitCommand({ type: 'set-source', value })
            break
        case 'toggle-lock':
            emitCommand({ type: 'toggle-lock' })
            break
        case 'font': {
            const delta = parseInt(value, 10)
            if (!Number.isNaN(delta)) emitCommand({ type: 'adjust-font', delta })
            break
        }
        case 'subfont': {
            const delta = parseInt(value, 10)
            if (!Number.isNaN(delta)) emitCommand({ type: 'adjust-sub-font', delta })
            break
        }
        case 'refresh':
            emitCommand({ type: 'request-refresh' })
            break
        case 'close':
            emitCommand({ type: 'close-window' })
            break
        default:
            break
    }
}

if (elements.menu) {
    elements.menu.addEventListener('click', (event) => {
        const target = event.target.closest('.menu-item')
        if (!target) return
        event.preventDefault()
        handleMenuAction(target.dataset.command)
        closeMenu()
    })
}

document.addEventListener('contextmenu', (event) => {
    event.preventDefault()
    openMenu(event.clientX, event.clientY)
})

document.addEventListener('mousedown', (event) => {
    if (!elements.menu || elements.menu.hidden) return
    if (!elements.menu.contains(event.target)) {
        closeMenu()
    }
})

window.addEventListener('blur', () => closeMenu())
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu()
})

const resizeNotifier = (() => {
    let timer = null
    return () => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
            emitCommand({ type: 'window-resized' })
        }, 180)
    }
})()

window.addEventListener('resize', () => resizeNotifier())

if (electronAPI?.onLyricUpdate) {
    electronAPI.onLyricUpdate((_event, payload) => {
        applyPayload(payload)
    })
}

if (electronAPI?.onDesktopLyricCommand) {
    electronAPI.onDesktopLyricCommand((payload) => {
        if (payload?.type === 'close-menu') {
            closeMenu()
        }
    })
}

document.addEventListener('DOMContentLoaded', () => {
    applyPayload({})
    electronAPI?.lyricWindowReady?.()
    electronAPI?.requestLyricData?.()
})

// 在窗口初始化阶段主动上报当前状态
emitCommand({ type: 'ready' })
