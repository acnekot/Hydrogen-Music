const STYLE_ID = 'hm-lyric-visualizer-plugin-style'
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

const clampNumber = (value, min, max, fallback) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return fallback
    if (numeric < min) return min
    if (numeric > max) return max
    return numeric
}

const sanitizeHeight = (value) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return DEFAULTS.height
    return Math.max(1, Math.round(numeric))
}
const sanitizeBarCount = (value) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return DEFAULTS.barCount
    return Math.max(1, Math.round(numeric))
}
const sanitizeBarWidth = (value) => clampNumber(Math.round(Number(value) || DEFAULTS.barWidth), 1, 100, DEFAULTS.barWidth)
const sanitizeOpacity = (value) => clampNumber(Math.round(Number(value) || DEFAULTS.opacity), 0, 100, DEFAULTS.opacity)
const sanitizeTransitionDelay = (value) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return DEFAULTS.transitionDelay
    const clamped = clampNumber(numeric, 0, 0.95, DEFAULTS.transitionDelay)
    return Math.round(clamped * 100) / 100
}
const sanitizeVisualizerStyle = (value) => (value === 'radial' ? 'radial' : DEFAULTS.style)
const sanitizeColor = (value) => (value === 'white' ? 'white' : 'black')
const sanitizeRadialSize = (value) => clampNumber(Math.round(Number(value) || DEFAULTS.radialSize), 10, 400, DEFAULTS.radialSize)
const sanitizeRadialOffset = (value) => clampNumber(Math.round(Number(value) || 0), -100, 100, 0)
const sanitizeRadialCoreSize = (value) => clampNumber(Math.round(Number(value) || DEFAULTS.radialCoreSize), 10, 95, DEFAULTS.radialCoreSize)
const sanitizeFrequencyRange = (minValue, maxValue) => {
    let min = clampNumber(Math.round(Number(minValue) || DEFAULTS.frequencyMin), 20, 20000, DEFAULTS.frequencyMin)
    let max = clampNumber(Math.round(Number(maxValue) || DEFAULTS.frequencyMax), 20, 20000, DEFAULTS.frequencyMax)
    if (min >= max) {
        if (min >= 19990) {
            min = 19980
            max = 20000
        } else {
            max = Math.min(20000, min + 10)
        }
    }
    if (max - min < 10) {
        if (min >= 19990) {
            min = 19980
            max = 20000
        } else {
            max = Math.min(20000, min + 10)
        }
    }
    return { min, max }
}

const assignIfChanged = (store, key, value) => {
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

const resetVisualizerState = (store) => {
    if (!store) return
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
    padding: 28px 32px 48px;
    background: linear-gradient(180deg, rgba(244, 248, 255, 0.92), rgba(226, 234, 248, 0.94));
    color: rgba(14, 22, 38, 0.95);
    font-family: 'Source Han Sans CN', 'Segoe UI', 'Microsoft YaHei', sans-serif;
}
.${SETTINGS_ROOT_CLASS} .lv-card {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 22px 26px;
    background: rgba(255, 255, 255, 0.88);
    border: 1px solid rgba(86, 122, 184, 0.28);
    border-radius: 0;
    box-shadow: 0 18px 36px rgba(18, 32, 56, 0.16);
}
.${SETTINGS_ROOT_CLASS} .lv-card[data-hidden='true'] {
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
    color: rgba(10, 18, 30, 0.96);
}
.${SETTINGS_ROOT_CLASS} .lv-card-header p {
    margin: 0;
    font-size: 13px;
    color: rgba(10, 18, 30, 0.62);
}
.${SETTINGS_ROOT_CLASS} .lv-card-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
}
.${SETTINGS_ROOT_CLASS} .lv-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.${SETTINGS_ROOT_CLASS} .lv-field label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 500;
    color: rgba(12, 20, 34, 0.78);
}
.${SETTINGS_ROOT_CLASS} .lv-field-control {
    display: flex;
    align-items: center;
    gap: 12px;
}
.${SETTINGS_ROOT_CLASS} select,
.${SETTINGS_ROOT_CLASS} input[type='number'],
.${SETTINGS_ROOT_CLASS} input[type='range'] {
    width: 100%;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(86, 122, 184, 0.34);
    border-radius: 0;
    font-size: 13px;
    color: rgba(12, 20, 34, 0.85);
    outline: none;
    transition: border-color 0.15s ease;
    box-sizing: border-box;
}
.${SETTINGS_ROOT_CLASS} input[type='range'] {
    padding: 0;
    cursor: pointer;
}
.${SETTINGS_ROOT_CLASS} select:focus,
.${SETTINGS_ROOT_CLASS} input[type='number']:focus {
    border-color: rgba(66, 110, 198, 0.75);
}
.${SETTINGS_ROOT_CLASS} .lv-inline-value {
    font-size: 12px;
    color: rgba(12, 20, 34, 0.56);
}
.${SETTINGS_ROOT_CLASS} .lv-switch {
    min-width: 110px;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid rgba(86, 122, 184, 0.42);
    border-radius: 0;
    background: rgba(240, 244, 255, 0.92);
    color: rgba(12, 20, 34, 0.68);
    cursor: pointer;
    transition: all 0.2s ease;
}
.${SETTINGS_ROOT_CLASS} .lv-switch.is-active {
    background: rgba(72, 112, 196, 0.9);
    border-color: rgba(72, 112, 196, 0.9);
    color: #fff;
}
.${SETTINGS_ROOT_CLASS} .lv-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 120px;
    padding: 10px 18px;
    border: 1px solid rgba(86, 122, 184, 0.42);
    border-radius: 0;
    background: rgba(240, 244, 255, 0.96);
    color: rgba(12, 20, 34, 0.75);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease;
}
.${SETTINGS_ROOT_CLASS} .lv-button:hover {
    background: rgba(72, 112, 196, 0.16);
}
.${SETTINGS_ROOT_CLASS} .lv-actions {
    display: flex;
    justify-content: flex-end;
}
`
    document.head.appendChild(style)
    return () => {
        if (style.parentNode) style.parentNode.removeChild(style)
    }
}

const createInlineValue = () => {
    const span = document.createElement('span')
    span.className = 'lv-inline-value'
    return span
}

const createFieldContainer = (labelText) => {
    const field = document.createElement('div')
    field.className = 'lv-field'

    const label = document.createElement('label')
    label.textContent = labelText
    field.appendChild(label)

    const control = document.createElement('div')
    control.className = 'lv-field-control'
    field.appendChild(control)

    return { field, label, control }
}

const createToggleField = (label, getter, setter) => {
    const { field, control } = createFieldContainer(label)
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'lv-switch'
    const handleClick = () => {
        try {
            setter(!getter())
        } catch (error) {
            console.error('[LyricVisualizerPlugin] 切换失败', error)
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
    const { field, control } = createFieldContainer(label)
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
            console.error('[LyricVisualizerPlugin] 更新下拉选择失败', error)
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
    const { field, label: labelEl, control } = createFieldContainer(label)
    const inline = createInlineValue()
    labelEl.appendChild(inline)

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
        inline.textContent = typeof format === 'function' ? format(value) : String(value)
    }

    return {
        element: field,
        update,
        destroy: () => input.removeEventListener('input', handleInput),
    }
}

const createNumberField = (label, { min, max, step = 1, suffix = '' }, getter, setter) => {
    const { field, control } = createFieldContainer(label)
    const input = document.createElement('input')
    input.type = 'number'
    if (Number.isFinite(min)) input.min = String(min)
    if (Number.isFinite(max)) input.max = String(max)
    input.step = String(step)

    const suffixSpan = suffix ? document.createElement('span') : null
    if (suffixSpan) {
        suffixSpan.className = 'lv-inline-value'
        suffixSpan.textContent = suffix
    }

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
    if (suffixSpan) control.appendChild(suffixSpan)

    const update = () => {
        const value = getter()
        if (value === undefined || value === null || Number.isNaN(value)) {
            input.value = ''
        } else {
            input.value = String(value)
        }
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
    const card = document.createElement('div')
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

    const registerControl = (target, controlFactory) => {
        const control = controlFactory()
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
        title: '音频可视化',
        subtitle: '控制歌词区域的实时频谱效果',
    })

    registerControl(basics.body, () =>
        createToggleField('可视化状态', () => !!store.lyricVisualizer, (value) => {
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
            (value) => {
                assignIfChanged(store, 'lyricVisualizerStyle', sanitizeVisualizerStyle(value))
            }
        )
    )

    registerControl(basics.body, () =>
        createRangeField(
            '高度',
            {
                min: 120,
                max: 600,
                step: 10,
                format: (value) => `${value}px`,
            },
            () => sanitizeHeight(store.lyricVisualizerHeight),
            (value) => assignIfChanged(store, 'lyricVisualizerHeight', sanitizeHeight(value))
        )
    )

    registerControl(basics.body, () =>
        createRangeField(
            '柱体数量',
            {
                min: 16,
                max: 160,
                step: 1,
                format: (value) => `${value} 个`,
            },
            () => sanitizeBarCount(store.lyricVisualizerBarCount),
            (value) => assignIfChanged(store, 'lyricVisualizerBarCount', sanitizeBarCount(value))
        )
    )

    registerControl(basics.body, () =>
        createRangeField(
            '柱体宽度',
            {
                min: 1,
                max: 100,
                step: 1,
                format: (value) => `${value}%`,
            },
            () => sanitizeBarWidth(store.lyricVisualizerBarWidth),
            (value) => assignIfChanged(store, 'lyricVisualizerBarWidth', sanitizeBarWidth(value))
        )
    )

    registerControl(basics.body, () =>
        createRangeField(
            '透明度',
            {
                min: 0,
                max: 100,
                step: 1,
                format: (value) => `${value}%`,
            },
            () => sanitizeOpacity(store.lyricVisualizerOpacity),
            (value) => assignIfChanged(store, 'lyricVisualizerOpacity', sanitizeOpacity(value))
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

    const frequency = createCard(root, {
        title: '频率与平滑',
        subtitle: '调节采样频段与响应速度',
    })

    registerControl(frequency.body, () =>
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

    registerControl(frequency.body, () =>
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

    registerControl(frequency.body, () =>
        createRangeField(
            '平滑系数',
            {
                min: 0,
                max: 0.95,
                step: 0.01,
                format: (value) => `${value.toFixed(2)} 秒`,
            },
            () => sanitizeTransitionDelay(store.lyricVisualizerTransitionDelay),
            (value) => assignIfChanged(store, 'lyricVisualizerTransitionDelay', sanitizeTransitionDelay(value))
        )
    )

    const radial = createCard(root, {
        title: '环形样式',
        subtitle: '下列参数仅在环形模式下生效',
    })

    registerControl(radial.body, () =>
        createRangeField(
            '整体尺寸',
            {
                min: 40,
                max: 320,
                step: 1,
                format: (value) => `${value}%`,
            },
            () => sanitizeRadialSize(store.lyricVisualizerRadialSize),
            (value) => assignIfChanged(store, 'lyricVisualizerRadialSize', sanitizeRadialSize(value))
        )
    )

    registerControl(radial.body, () =>
        createRangeField(
            '中心比例',
            {
                min: 10,
                max: 95,
                step: 1,
                format: (value) => `${value}%`,
            },
            () => sanitizeRadialCoreSize(store.lyricVisualizerRadialCoreSize),
            (value) => assignIfChanged(store, 'lyricVisualizerRadialCoreSize', sanitizeRadialCoreSize(value))
        )
    )

    registerControl(radial.body, () =>
        createNumberField(
            '水平偏移',
            { min: -100, max: 100, step: 1, suffix: '%' },
            () => sanitizeRadialOffset(store.lyricVisualizerRadialOffsetX),
            (value) => assignIfChanged(store, 'lyricVisualizerRadialOffsetX', sanitizeRadialOffset(value))
        )
    )

    registerControl(radial.body, () =>
        createNumberField(
            '垂直偏移',
            { min: -100, max: 100, step: 1, suffix: '%' },
            () => sanitizeRadialOffset(store.lyricVisualizerRadialOffsetY),
            (value) => assignIfChanged(store, 'lyricVisualizerRadialOffsetY', sanitizeRadialOffset(value))
        )
    )

    const actions = createCard(root, {
        title: '参数预设',
        subtitle: '一键恢复官方推荐配置',
    })
    const actionRow = document.createElement('div')
    actionRow.className = 'lv-actions'
    const resetButton = document.createElement('button')
    resetButton.type = 'button'
    resetButton.className = 'lv-button'
    resetButton.textContent = '恢复默认'
    const handleReset = () => {
        resetVisualizerState(store)
    }
    resetButton.addEventListener('click', handleReset)
    actionRow.appendChild(resetButton)
    actions.body.appendChild(actionRow)
    cleanups.push(() => resetButton.removeEventListener('click', handleReset))

    const update = () => {
        const mode = sanitizeVisualizerStyle(store.lyricVisualizerStyle)
        radial.card.dataset.hidden = mode === 'radial' ? 'false' : 'true'
        for (const control of controls) {
            try {
                if (typeof control.update === 'function') control.update()
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
    const playerStore = context?.stores?.player
    if (!playerStore) {
        console.warn('[LyricVisualizerPlugin] 未找到 playerStore，插件未启用')
        return
    }

    applySanitizedState(playerStore)

    const removeStyle = ensureStyleSheet()
    let uiInstance = null

    if (!playerStore[AUTO_ENABLE_FLAG_KEY]) {
        assignIfChanged(playerStore, AUTO_ENABLE_FLAG_KEY, true)
        assignIfChanged(playerStore, 'lyricVisualizer', true)
    }

    assignIfChanged(playerStore, 'lyricVisualizerPluginActive', true)
    assignIfChanged(playerStore, 'lyricVisualizerToggleAvailable', true)

    const updateSettingsUI = () => {
        try {
            uiInstance?.update?.()
        } catch (error) {
            console.error('[LyricVisualizerPlugin] 更新设置界面失败', error)
        }
    }

    const unsubscribe = typeof playerStore.$subscribe === 'function'
        ? playerStore.$subscribe(() => {
            applySanitizedState(playerStore)
            updateSettingsUI()
        })
        : null

    const unregisterSettings = context.settings.register({
        id: 'core.lyric-visualizer/settings',
        title: '歌词音频可视化',
        subtitle: '调整歌词区域的频谱与视觉风格',
        mount(target) {
            uiInstance = buildSettingsUI(target, playerStore)
            updateSettingsUI()
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
            console.error('[LyricVisualizerPlugin] 注销设置界面失败', error)
        }
        if (typeof unsubscribe === 'function') {
            try {
                unsubscribe()
            } catch (error) {
                console.error('[LyricVisualizerPlugin] 取消订阅失败', error)
            }
        }
        try {
            removeStyle?.()
        } catch (error) {
            console.error('[LyricVisualizerPlugin] 移除样式失败', error)
        }
        try {
            uiInstance?.destroy?.()
        } catch (error) {
            console.error('[LyricVisualizerPlugin] 清理设置界面失败', error)
        }
        uiInstance = null
        assignIfChanged(playerStore, 'lyricVisualizer', false)
        assignIfChanged(playerStore, 'lyricVisualizerPluginActive', false)
        assignIfChanged(playerStore, 'lyricVisualizerToggleAvailable', false)
    })
}
