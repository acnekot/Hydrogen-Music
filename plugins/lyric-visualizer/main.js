const STYLE_ID = 'hm-lyric-visualizer-style'
const SETTINGS_ROOT_CLASS = 'hm-lyric-visualizer-settings'
const AUTO_ENABLE_FLAG_KEY = 'lyricVisualizerHasAutoEnabled'

const DEFAULTS = Object.freeze({
    height: 220,
    frequencyMin: 20,
    frequencyMax: 8000,
    transitionDelay: 0.75,
    barCount: 48,
    barWidth: 55,
    opacity: 100,
    color: 'black',
    style: 'bars',
    radialSize: 100,
    radialOffsetX: 0,
    radialOffsetY: 0,
    radialCoreSize: 62,
})

const clamp = (value, min, max, fallback) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return fallback
    if (numeric < min) return min
    if (numeric > max) return max
    return numeric
}

const roundClamp = (value, min, max, fallback) => {
    const numeric = clamp(value, min, max, fallback)
    return Math.round(numeric)
}

const sanitizeHeight = (value) => roundClamp(value ?? DEFAULTS.height, 80, 480, DEFAULTS.height)
const sanitizeBarCount = (value) => roundClamp(value ?? DEFAULTS.barCount, 8, 120, DEFAULTS.barCount)
const sanitizeBarWidth = (value) => roundClamp(value ?? DEFAULTS.barWidth, 4, 100, DEFAULTS.barWidth)
const sanitizeOpacity = (value) => roundClamp(value ?? DEFAULTS.opacity, 0, 100, DEFAULTS.opacity)
const sanitizeTransitionDelay = (value) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return DEFAULTS.transitionDelay
    const clamped = clamp(numeric, 0, 0.95, DEFAULTS.transitionDelay)
    return Math.round(clamped * 100) / 100
}
const sanitizeVisualizerStyle = (value) => (value === 'radial' ? 'radial' : DEFAULTS.style)
const sanitizeColor = (value) => (value === 'white' ? 'white' : 'black')
const sanitizeRadialSize = (value) => roundClamp(value ?? DEFAULTS.radialSize, 20, 400, DEFAULTS.radialSize)
const sanitizeRadialOffset = (value) => roundClamp(value ?? 0, -100, 100, 0)
const sanitizeRadialCoreSize = (value) => roundClamp(value ?? DEFAULTS.radialCoreSize, 10, 95, DEFAULTS.radialCoreSize)
const sanitizeFrequencyRange = (minValue, maxValue) => {
    let min = roundClamp(minValue ?? DEFAULTS.frequencyMin, 20, 20000, DEFAULTS.frequencyMin)
    let max = roundClamp(maxValue ?? DEFAULTS.frequencyMax, 20, 20000, DEFAULTS.frequencyMax)
    if (min >= max) {
        if (min >= 19990) {
            min = 19980
            max = 20000
        } else {
            max = Math.min(20000, min + 10)
        }
    }
    if (max - min < 10) {
        if (min <= 20) {
            max = min + 10
        } else {
            min = max - 10
        }
    }
    return { min, max }
}

const assignIfChanged = (store, key, value) => {
    if (!store) return
    if (store[key] !== value) store[key] = value
}

const applySanitizedState = (store) => {
    if (!store) return
    assignIfChanged(store, 'lyricVisualizerHeight', sanitizeHeight(store.lyricVisualizerHeight))
    const range = sanitizeFrequencyRange(store.lyricVisualizerFrequencyMin, store.lyricVisualizerFrequencyMax)
    assignIfChanged(store, 'lyricVisualizerFrequencyMin', range.min)
    assignIfChanged(store, 'lyricVisualizerFrequencyMax', range.max)
    assignIfChanged(store, 'lyricVisualizerTransitionDelay', sanitizeTransitionDelay(store.lyricVisualizerTransitionDelay))
    assignIfChanged(store, 'lyricVisualizerBarCount', sanitizeBarCount(store.lyricVisualizerBarCount))
    assignIfChanged(store, 'lyricVisualizerBarWidth', sanitizeBarWidth(store.lyricVisualizerBarWidth))
    assignIfChanged(store, 'lyricVisualizerOpacity', sanitizeOpacity(store.lyricVisualizerOpacity))
    assignIfChanged(store, 'lyricVisualizerColor', sanitizeColor(store.lyricVisualizerColor))
    assignIfChanged(store, 'lyricVisualizerStyle', sanitizeVisualizerStyle(store.lyricVisualizerStyle))
    assignIfChanged(store, 'lyricVisualizerRadialSize', sanitizeRadialSize(store.lyricVisualizerRadialSize))
    assignIfChanged(store, 'lyricVisualizerRadialOffsetX', sanitizeRadialOffset(store.lyricVisualizerRadialOffsetX))
    assignIfChanged(store, 'lyricVisualizerRadialOffsetY', sanitizeRadialOffset(store.lyricVisualizerRadialOffsetY))
    assignIfChanged(store, 'lyricVisualizerRadialCoreSize', sanitizeRadialCoreSize(store.lyricVisualizerRadialCoreSize))
}

const ensureStyleSheet = () => {
    if (typeof document === 'undefined') return () => {}
    const existing = document.getElementById(STYLE_ID)
    if (existing) return () => {}
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.${SETTINGS_ROOT_CLASS} {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 32px 36px 48px;
    background: linear-gradient(180deg, rgba(244, 248, 255, 0.94), rgba(228, 236, 250, 0.96));
    color: rgba(12, 22, 36, 0.95);
    font-family: 'Source Han Sans CN', 'Segoe UI', 'Microsoft YaHei', sans-serif;
}
.${SETTINGS_ROOT_CLASS} .lv-card {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 24px 28px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(82, 118, 176, 0.35);
    border-radius: 0;
    box-shadow: 0 22px 44px rgba(18, 32, 56, 0.16);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.${SETTINGS_ROOT_CLASS} .lv-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 26px 52px rgba(18, 32, 56, 0.2);
}
.${SETTINGS_ROOT_CLASS} .lv-card.is-hidden {
    display: none;
}
.${SETTINGS_ROOT_CLASS} .lv-card-header {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.${SETTINGS_ROOT_CLASS} .lv-card-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: rgba(10, 18, 30, 0.95);
}
.${SETTINGS_ROOT_CLASS} .lv-card-header p {
    margin: 0;
    font-size: 13px;
    color: rgba(10, 18, 30, 0.6);
}
.${SETTINGS_ROOT_CLASS} .lv-card-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
}
.${SETTINGS_ROOT_CLASS} .lv-field {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.${SETTINGS_ROOT_CLASS} .lv-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    font-weight: 600;
    color: rgba(12, 22, 36, 0.78);
}
.${SETTINGS_ROOT_CLASS} .lv-inline-value {
    font-size: 12px;
    font-weight: 500;
    color: rgba(12, 22, 36, 0.56);
}
.${SETTINGS_ROOT_CLASS} .lv-control {
    display: flex;
    align-items: center;
    gap: 12px;
}
.${SETTINGS_ROOT_CLASS} select,
.${SETTINGS_ROOT_CLASS} input[type='number'],
.${SETTINGS_ROOT_CLASS} input[type='range'] {
    flex: 1;
    min-width: 0;
    padding: 8px 12px;
    border: 1px solid rgba(82, 118, 176, 0.4);
    border-radius: 0;
    background: rgba(255, 255, 255, 0.96);
    color: rgba(12, 22, 36, 0.85);
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.${SETTINGS_ROOT_CLASS} input[type='range'] {
    padding: 0;
    cursor: pointer;
}
.${SETTINGS_ROOT_CLASS} select:focus,
.${SETTINGS_ROOT_CLASS} input[type='number']:focus,
.${SETTINGS_ROOT_CLASS} input[type='range']:focus {
    border-color: rgba(66, 110, 198, 0.78);
    box-shadow: 0 0 0 2px rgba(82, 118, 176, 0.16);
}
.${SETTINGS_ROOT_CLASS} .lv-switch {
    min-width: 120px;
    padding: 10px 18px;
    border: 1px solid rgba(82, 118, 176, 0.45);
    border-radius: 0;
    background: rgba(236, 242, 255, 0.95);
    color: rgba(12, 22, 36, 0.7);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
.${SETTINGS_ROOT_CLASS} .lv-switch.is-active {
    background: rgba(72, 112, 196, 0.92);
    border-color: rgba(72, 112, 196, 0.92);
    color: #fff;
}
.${SETTINGS_ROOT_CLASS} .lv-actions {
    display: flex;
    justify-content: flex-end;
}
.${SETTINGS_ROOT_CLASS} .lv-button {
    padding: 10px 20px;
    border: 1px solid rgba(82, 118, 176, 0.45);
    border-radius: 0;
    background: rgba(236, 242, 255, 0.95);
    color: rgba(12, 22, 36, 0.75);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease;
}
.${SETTINGS_ROOT_CLASS} .lv-button:hover {
    background: rgba(72, 112, 196, 0.18);
    border-color: rgba(72, 112, 196, 0.54);
}
.${SETTINGS_ROOT_CLASS} .lv-placeholder {
    padding: 48px 32px;
    border: 1px dashed rgba(82, 118, 176, 0.45);
    border-radius: 0;
    background: rgba(255, 255, 255, 0.82);
    text-align: center;
    font-size: 14px;
    color: rgba(12, 22, 36, 0.65);
}
`
    document.head.appendChild(style)
    return () => {
        if (style.parentNode) style.parentNode.removeChild(style)
    }
}

const registerPlaceholderSettings = (context, message) => {
    if (!context?.settings?.register || typeof document === 'undefined') return () => {}
    const unregister = context.settings.register({
        id: 'core.lyric-visualizer/settings',
        title: '歌词音频可视化',
        subtitle: '插件状态不可用',
        mount(target) {
            if (!target) return
            const root = document.createElement('div')
            root.className = SETTINGS_ROOT_CLASS
            const placeholder = document.createElement('div')
            placeholder.className = 'lv-placeholder'
            placeholder.textContent = message || '暂时无法加载歌词可视化设置。'
            root.appendChild(placeholder)
            target.appendChild(root)
            return () => {
                if (root.parentNode === target) target.removeChild(root)
            }
        },
        unmount(target) {
            if (target) target.innerHTML = ''
        },
    })
    return () => {
        try {
            unregister?.()
        } catch (error) {
            console.error('[LyricVisualizerPlugin] 注销占位设置失败', error)
        }
    }
}

const resolvePlayerStore = (context) => {
    if (context?.stores?.player) return context.stores.player
    const pinia = context?.pinia || context?.app?.config?.globalProperties?.$pinia || null
    const registry = pinia && pinia._s
    if (registry) {
        try {
            if (typeof registry.get === 'function') {
                const store = registry.get('playerStore')
                if (store) return store
            }
            if (registry instanceof Map && registry.has('playerStore')) {
                return registry.get('playerStore')
            }
            if (registry.playerStore) return registry.playerStore
        } catch (error) {
            console.warn('[LyricVisualizerPlugin] 通过 Pinia 获取播放器状态失败', error)
        }
    }
    return null
}

const createFieldContainer = (labelText) => {
    const field = document.createElement('div')
    field.className = 'lv-field'

    const label = document.createElement('div')
    label.className = 'lv-label'
    label.textContent = labelText
    field.appendChild(label)

    const inline = document.createElement('span')
    inline.className = 'lv-inline-value'
    label.appendChild(inline)

    const control = document.createElement('div')
    control.className = 'lv-control'
    field.appendChild(control)

    return { field, label, inline, control }
}

const createToggleField = (label, getter, setter) => {
    const { field, inline, control } = createFieldContainer(label)
    inline.remove()

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'lv-switch'
    const handleClick = () => {
        try {
            setter(!getter())
        } catch (error) {
            console.error('[LyricVisualizerPlugin] 切换可视化失败', error)
        }
    }
    button.addEventListener('click', handleClick)
    control.appendChild(button)

    const update = () => {
        const active = !!getter()
        button.classList.toggle('is-active', active)
        button.textContent = active ? '已开启' : '已关闭'
    }

    return {
        element: field,
        update,
        destroy: () => button.removeEventListener('click', handleClick),
    }
}

const createSelectField = (label, options, getter, setter) => {
    const { field, inline, control } = createFieldContainer(label)
    inline.remove()

    const select = document.createElement('select')
    for (const option of options) {
        const node = document.createElement('option')
        node.value = option.value
        node.textContent = option.label
        select.appendChild(node)
    }

    const handleChange = (event) => {
        try {
            setter(event.target.value)
        } catch (error) {
            console.error('[LyricVisualizerPlugin] 更新选择项失败', error)
        }
    }

    select.addEventListener('change', handleChange)
    control.appendChild(select)

    const update = () => {
        const value = getter()
        if (select.value !== value) select.value = value
    }

    return {
        element: field,
        update,
        destroy: () => select.removeEventListener('change', handleChange),
    }
}

const createRangeField = (label, { min, max, step = 1, format }, getter, setter) => {
    const { field, inline, control } = createFieldContainer(label)

    const input = document.createElement('input')
    input.type = 'range'
    input.min = String(min)
    input.max = String(max)
    input.step = String(step)

    const handleInput = (event) => {
        const value = Number(event.target.value)
        try {
            setter(value)
        } catch (error) {
            console.error('[LyricVisualizerPlugin] 更新滑块失败', error)
        }
    }

    input.addEventListener('input', handleInput)
    control.appendChild(input)

    const update = () => {
        const value = getter()
        input.value = String(value)
        inline.textContent = typeof format === 'function' ? format(value) : `${value}`
    }

    return {
        element: field,
        update,
        destroy: () => input.removeEventListener('input', handleInput),
    }
}

const createNumberField = (label, { min, max, step = 1, suffix = '' }, getter, setter) => {
    const { field, inline, control } = createFieldContainer(label)
    inline.textContent = suffix

    const input = document.createElement('input')
    input.type = 'number'
    if (Number.isFinite(min)) input.min = String(min)
    if (Number.isFinite(max)) input.max = String(max)
    input.step = String(step)

    const commitValue = () => {
        const value = Number(input.value)
        try {
            setter(value)
        } catch (error) {
            console.error('[LyricVisualizerPlugin] 更新数值失败', error)
        }
    }

    input.addEventListener('change', commitValue)
    input.addEventListener('blur', commitValue)
    control.appendChild(input)

    const update = () => {
        const value = getter()
        input.value = Number.isFinite(value) ? String(value) : ''
    }

    return {
        element: field,
        update,
        destroy: () => {
            input.removeEventListener('change', commitValue)
            input.removeEventListener('blur', commitValue)
        },
    }
}

const createCard = (root, { title, subtitle }) => {
    const card = document.createElement('section')
    card.className = 'lv-card'

    const header = document.createElement('div')
    header.className = 'lv-card-header'

    if (title) {
        const titleEl = document.createElement('h2')
        titleEl.textContent = title
        header.appendChild(titleEl)
    }

    if (subtitle) {
        const subtitleEl = document.createElement('p')
        subtitleEl.textContent = subtitle
        header.appendChild(subtitleEl)
    }

    const body = document.createElement('div')
    body.className = 'lv-card-body'

    card.appendChild(header)
    card.appendChild(body)
    root.appendChild(card)

    return { card, body }
}

const buildSettingsUI = (container, store) => {
    if (!container || !store) return null

    const root = document.createElement('div')
    root.className = SETTINGS_ROOT_CLASS
    container.appendChild(root)

    const controls = []
    const cleanups = []

    const registerControl = (target, factory) => {
        const control = factory()
        if (!control) return
        target.appendChild(control.element)
        controls.push(control)
        if (typeof control.destroy === 'function') {
            cleanups.push(() => {
                try {
                    control.destroy()
                } catch (error) {
                    console.error('[LyricVisualizerPlugin] 清理控件失败', error)
                }
            })
        }
    }

    const basics = createCard(root, {
        title: '基础设置',
        subtitle: '控制歌词区域的可视化启用状态与主要参数',
    })

    registerControl(basics.body, () =>
        createToggleField('可视化开关', () => !!store.lyricVisualizer, (value) => {
            assignIfChanged(store, 'lyricVisualizer', Boolean(value))
        })
    )

    registerControl(basics.body, () =>
        createSelectField(
            '显示样式',
            [
                { value: 'bars', label: '线性柱状' },
                { value: 'radial', label: '环形光束' },
            ],
            () => sanitizeVisualizerStyle(store.lyricVisualizerStyle),
            (value) => assignIfChanged(store, 'lyricVisualizerStyle', sanitizeVisualizerStyle(value))
        )
    )

    registerControl(basics.body, () =>
        createRangeField(
            '可视化高度',
            { min: 80, max: 480, step: 10, format: (value) => `${value}px` },
            () => sanitizeHeight(store.lyricVisualizerHeight),
            (value) => assignIfChanged(store, 'lyricVisualizerHeight', sanitizeHeight(value))
        )
    )

    registerControl(basics.body, () =>
        createRangeField(
            '柱体数量',
            { min: 8, max: 120, step: 2, format: (value) => `${value} 根` },
            () => sanitizeBarCount(store.lyricVisualizerBarCount),
            (value) => assignIfChanged(store, 'lyricVisualizerBarCount', sanitizeBarCount(value))
        )
    )

    registerControl(basics.body, () =>
        createRangeField(
            '柱体宽度',
            { min: 4, max: 100, step: 1, format: (value) => `${value}%` },
            () => sanitizeBarWidth(store.lyricVisualizerBarWidth),
            (value) => assignIfChanged(store, 'lyricVisualizerBarWidth', sanitizeBarWidth(value))
        )
    )

    registerControl(basics.body, () =>
        createRangeField(
            '透明度',
            { min: 0, max: 100, step: 5, format: (value) => `${value}%` },
            () => sanitizeOpacity(store.lyricVisualizerOpacity),
            (value) => assignIfChanged(store, 'lyricVisualizerOpacity', sanitizeOpacity(value))
        )
    )

    registerControl(basics.body, () =>
        createRangeField(
            '过渡延迟',
            { min: 0, max: 95, step: 5, format: (value) => `${(value / 100).toFixed(2)}s` },
            () => Math.round(sanitizeTransitionDelay(store.lyricVisualizerTransitionDelay) * 100),
            (value) => assignIfChanged(store, 'lyricVisualizerTransitionDelay', sanitizeTransitionDelay(value / 100))
        )
    )

    registerControl(basics.body, () =>
        createNumberField(
            '最低频率',
            { min: 20, max: 20000, step: 10, suffix: 'Hz' },
            () => sanitizeFrequencyRange(store.lyricVisualizerFrequencyMin, store.lyricVisualizerFrequencyMax).min,
            (value) => {
                const range = sanitizeFrequencyRange(value, store.lyricVisualizerFrequencyMax)
                assignIfChanged(store, 'lyricVisualizerFrequencyMin', range.min)
                assignIfChanged(store, 'lyricVisualizerFrequencyMax', range.max)
            }
        )
    )

    registerControl(basics.body, () =>
        createNumberField(
            '最高频率',
            { min: 20, max: 20000, step: 10, suffix: 'Hz' },
            () => sanitizeFrequencyRange(store.lyricVisualizerFrequencyMin, store.lyricVisualizerFrequencyMax).max,
            (value) => {
                const range = sanitizeFrequencyRange(store.lyricVisualizerFrequencyMin, value)
                assignIfChanged(store, 'lyricVisualizerFrequencyMin', range.min)
                assignIfChanged(store, 'lyricVisualizerFrequencyMax', range.max)
            }
        )
    )

    registerControl(basics.body, () =>
        createSelectField(
            '主颜色',
            [
                { value: 'black', label: '深色' },
                { value: 'white', label: '浅色' },
            ],
            () => sanitizeColor(store.lyricVisualizerColor),
            (value) => assignIfChanged(store, 'lyricVisualizerColor', sanitizeColor(value))
        )
    )

    const radial = createCard(root, {
        title: '环形样式',
        subtitle: '仅在选择环形光束时生效的参数',
    })

    registerControl(radial.body, () =>
        createRangeField(
            '整体尺寸',
            { min: 20, max: 400, step: 5, format: (value) => `${value}%` },
            () => sanitizeRadialSize(store.lyricVisualizerRadialSize),
            (value) => assignIfChanged(store, 'lyricVisualizerRadialSize', sanitizeRadialSize(value))
        )
    )

    registerControl(radial.body, () =>
        createRangeField(
            '中心圆比例',
            { min: 10, max: 95, step: 1, format: (value) => `${value}%` },
            () => sanitizeRadialCoreSize(store.lyricVisualizerRadialCoreSize),
            (value) => assignIfChanged(store, 'lyricVisualizerRadialCoreSize', sanitizeRadialCoreSize(value))
        )
    )

    registerControl(radial.body, () =>
        createRangeField(
            '水平偏移',
            { min: -100, max: 100, step: 1, format: (value) => `${value}%` },
            () => sanitizeRadialOffset(store.lyricVisualizerRadialOffsetX),
            (value) => assignIfChanged(store, 'lyricVisualizerRadialOffsetX', sanitizeRadialOffset(value))
        )
    )

    registerControl(radial.body, () =>
        createRangeField(
            '垂直偏移',
            { min: -100, max: 100, step: 1, format: (value) => `${value}%` },
            () => sanitizeRadialOffset(store.lyricVisualizerRadialOffsetY),
            (value) => assignIfChanged(store, 'lyricVisualizerRadialOffsetY', sanitizeRadialOffset(value))
        )
    )

    const actions = createCard(root, {
        title: '高级操作',
        subtitle: '快速恢复官方推荐配置',
    })

    const actionRow = document.createElement('div')
    actionRow.className = 'lv-actions'

    const resetButton = document.createElement('button')
    resetButton.type = 'button'
    resetButton.className = 'lv-button'
    resetButton.textContent = '恢复默认设置'

    const handleReset = () => {
        assignIfChanged(store, 'lyricVisualizerHeight', DEFAULTS.height)
        assignIfChanged(store, 'lyricVisualizerFrequencyMin', DEFAULTS.frequencyMin)
        assignIfChanged(store, 'lyricVisualizerFrequencyMax', DEFAULTS.frequencyMax)
        assignIfChanged(store, 'lyricVisualizerTransitionDelay', DEFAULTS.transitionDelay)
        assignIfChanged(store, 'lyricVisualizerBarCount', DEFAULTS.barCount)
        assignIfChanged(store, 'lyricVisualizerBarWidth', DEFAULTS.barWidth)
        assignIfChanged(store, 'lyricVisualizerOpacity', DEFAULTS.opacity)
        assignIfChanged(store, 'lyricVisualizerColor', DEFAULTS.color)
        assignIfChanged(store, 'lyricVisualizerStyle', DEFAULTS.style)
        assignIfChanged(store, 'lyricVisualizerRadialSize', DEFAULTS.radialSize)
        assignIfChanged(store, 'lyricVisualizerRadialOffsetX', DEFAULTS.radialOffsetX)
        assignIfChanged(store, 'lyricVisualizerRadialOffsetY', DEFAULTS.radialOffsetY)
        assignIfChanged(store, 'lyricVisualizerRadialCoreSize', DEFAULTS.radialCoreSize)
    }

    resetButton.addEventListener('click', handleReset)
    actionRow.appendChild(resetButton)
    actions.body.appendChild(actionRow)
    cleanups.push(() => resetButton.removeEventListener('click', handleReset))

    const update = () => {
        const mode = sanitizeVisualizerStyle(store.lyricVisualizerStyle)
        radial.card.classList.toggle('is-hidden', mode !== 'radial')
        for (const control of controls) {
            try {
                control.update?.()
            } catch (error) {
                console.error('[LyricVisualizerPlugin] 同步控件状态失败', error)
            }
        }
    }

    update()

    return {
        update,
        destroy: () => {
            for (const cleanup of cleanups) {
                try {
                    cleanup()
                } catch (error) {
                    console.error('[LyricVisualizerPlugin] 清理设置界面失败', error)
                }
            }
            cleanups.length = 0
            if (root.parentNode === container) {
                container.removeChild(root)
            }
        },
    }
}

module.exports = function activate(context) {
    const removeStyle = ensureStyleSheet()
    const playerStore = resolvePlayerStore(context)

    if (!playerStore) {
        console.warn('[LyricVisualizerPlugin] 未找到播放器状态，无法启用插件')
        const unregisterPlaceholder = registerPlaceholderSettings(
            context,
            '播放器状态尚未就绪，暂时无法展示歌词可视化设置。'
        )
        context?.onCleanup?.(() => {
            try {
                unregisterPlaceholder?.()
            } catch (error) {
                console.error('[LyricVisualizerPlugin] 清理占位设置失败', error)
            }
            try {
                removeStyle?.()
            } catch (error) {
                console.error('[LyricVisualizerPlugin] 移除样式失败', error)
            }
        })
        return
    }

    applySanitizedState(playerStore)

    if (!playerStore[AUTO_ENABLE_FLAG_KEY]) {
        assignIfChanged(playerStore, AUTO_ENABLE_FLAG_KEY, true)
        assignIfChanged(playerStore, 'lyricVisualizer', true)
    }

    assignIfChanged(playerStore, 'lyricVisualizerPluginActive', true)
    assignIfChanged(playerStore, 'lyricVisualizerToggleAvailable', true)

    let uiInstance = null

    const updateUI = () => {
        try {
            uiInstance?.update?.()
        } catch (error) {
            console.error('[LyricVisualizerPlugin] 更新设置界面失败', error)
        }
    }

    const unsubscribe = typeof playerStore.$subscribe === 'function'
        ? playerStore.$subscribe(() => {
              applySanitizedState(playerStore)
              updateUI()
          })
        : null

    const unregisterSettings = context.settings.register({
        id: 'core.lyric-visualizer/settings',
        title: '歌词音频可视化',
        subtitle: '调节歌词区域的频谱与视觉风格',
        mount(target) {
            uiInstance = buildSettingsUI(target, playerStore)
            updateUI()
            return () => {
                if (uiInstance) {
                    try {
                        uiInstance.destroy?.()
                    } catch (error) {
                        console.error('[LyricVisualizerPlugin] 卸载设置界面失败', error)
                    }
                    uiInstance = null
                }
            }
        },
        unmount(target) {
            if (uiInstance) {
                try {
                    uiInstance.destroy?.()
                } catch (error) {
                    console.error('[LyricVisualizerPlugin] 卸载设置界面失败', error)
                }
                uiInstance = null
            }
            if (target) target.innerHTML = ''
        },
    })

    context.onCleanup(() => {
        try {
            unregisterSettings?.()
        } catch (error) {
            console.error('[LyricVisualizerPlugin] 注销设置失败', error)
        }

        if (typeof unsubscribe === 'function') {
            try {
                unsubscribe()
            } catch (error) {
                console.error('[LyricVisualizerPlugin] 取消订阅失败', error)
            }
        }

        try {
            uiInstance?.destroy?.()
        } catch (error) {
            console.error('[LyricVisualizerPlugin] 清理设置界面失败', error)
        }
        uiInstance = null

        try {
            removeStyle?.()
        } catch (error) {
            console.error('[LyricVisualizerPlugin] 移除样式失败', error)
        }

        assignIfChanged(playerStore, 'lyricVisualizer', false)
        assignIfChanged(playerStore, 'lyricVisualizerPluginActive', false)
        assignIfChanged(playerStore, 'lyricVisualizerToggleAvailable', false)
    })
}
