const STYLE_ID = 'hm-lyric-visualizer-style'
const SETTINGS_ROOT_CLASS = 'hm-lyric-visualizer-settings'
const AUTO_ENABLE_FLAG_KEY = 'lyricVisualizerHasAutoEnabled'
const RETRY_DELAY_MS = 600

const DEFAULTS = Object.freeze({
    enabled: true,
    height: 220,
    frequencyMin: 20,
    frequencyMax: 8000,
    transitionDelay: 0.75,
    barCount: 48,
    barWidth: 55,
    opacity: 100,
    color: '#101623',
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

const clampInteger = (value, min, max, fallback) => {
    const numeric = clampNumber(value, min, max, fallback)
    return Math.round(numeric)
}

const sanitizeColor = (value) => {
    if (typeof value !== 'string') return DEFAULTS.color
    const trimmed = value.trim()
    if (!trimmed) return DEFAULTS.color
    if (trimmed === 'black' || trimmed === 'white') return trimmed
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
        return trimmed.length === 4
            ? '#' + trimmed.slice(1).split('').map((ch) => ch + ch).join('').toLowerCase()
            : trimmed.toLowerCase()
    }
    if (/^rgba?\([^)]+\)$/i.test(trimmed)) return trimmed
    return DEFAULTS.color
}

const sanitizeFrequencyRange = (minValue, maxValue) => {
    let min = clampInteger(minValue ?? DEFAULTS.frequencyMin, 20, 19990, DEFAULTS.frequencyMin)
    let max = clampInteger(maxValue ?? DEFAULTS.frequencyMax, 30, 20000, DEFAULTS.frequencyMax)
    if (min >= max) {
        max = clampInteger(min + 10, min + 10, 20000, min + 10)
    }
    if (max - min < 10) {
        if (min <= 20) {
            max = clampInteger(min + 10, min + 10, 20000, min + 10)
        } else {
            min = clampInteger(max - 10, 20, max - 10, max - 10)
        }
    }
    return { min, max }
}

const assignIfChanged = (store, key, value) => {
    if (!store) return
    if (store[key] !== value) store[key] = value
}

const sanitizeVisualizerState = (store) => {
    if (!store) return
    assignIfChanged(store, 'lyricVisualizerHeight', clampInteger(store.lyricVisualizerHeight, 80, 480, DEFAULTS.height))
    assignIfChanged(store, 'lyricVisualizerTransitionDelay', Math.round(clampNumber(store.lyricVisualizerTransitionDelay, 0, 0.95, DEFAULTS.transitionDelay) * 100) / 100)
    assignIfChanged(store, 'lyricVisualizerBarCount', clampInteger(store.lyricVisualizerBarCount, 8, 120, DEFAULTS.barCount))
    assignIfChanged(store, 'lyricVisualizerBarWidth', clampInteger(store.lyricVisualizerBarWidth, 4, 100, DEFAULTS.barWidth))
    assignIfChanged(store, 'lyricVisualizerOpacity', clampInteger(store.lyricVisualizerOpacity, 0, 100, DEFAULTS.opacity))
    assignIfChanged(store, 'lyricVisualizerColor', sanitizeColor(store.lyricVisualizerColor))
    const style = store.lyricVisualizerStyle === 'radial' ? 'radial' : 'bars'
    assignIfChanged(store, 'lyricVisualizerStyle', style)
    assignIfChanged(store, 'lyricVisualizerRadialSize', clampInteger(store.lyricVisualizerRadialSize, 20, 400, DEFAULTS.radialSize))
    assignIfChanged(store, 'lyricVisualizerRadialOffsetX', clampInteger(store.lyricVisualizerRadialOffsetX, -100, 100, DEFAULTS.radialOffsetX))
    assignIfChanged(store, 'lyricVisualizerRadialOffsetY', clampInteger(store.lyricVisualizerRadialOffsetY, -100, 100, DEFAULTS.radialOffsetY))
    assignIfChanged(store, 'lyricVisualizerRadialCoreSize', clampInteger(store.lyricVisualizerRadialCoreSize, 10, 95, DEFAULTS.radialCoreSize))
    const range = sanitizeFrequencyRange(store.lyricVisualizerFrequencyMin, store.lyricVisualizerFrequencyMax)
    assignIfChanged(store, 'lyricVisualizerFrequencyMin', range.min)
    assignIfChanged(store, 'lyricVisualizerFrequencyMax', range.max)
    assignIfChanged(store, 'lyricVisualizer', Boolean(store.lyricVisualizer))
}

const applyDefaults = (store) => {
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

const resolvePlayerStore = (context) => {
    if (context?.stores?.player) return context.stores.player
    const pinia = context?.pinia || context?.app?.config?.globalProperties?.$pinia || null
    if (!pinia) return null
    const registry = pinia._s
    if (registry) {
        if (typeof registry.get === 'function') {
            const store = registry.get('playerStore')
            if (store) return store
        }
        if (registry instanceof Map && registry.has('playerStore')) {
            return registry.get('playerStore')
        }
        if (registry.playerStore) return registry.playerStore
    }
    return null
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
    background: linear-gradient(180deg, rgba(243, 248, 255, 0.95), rgba(225, 233, 247, 0.98));
    color: rgba(20, 28, 40, 0.95);
    font-family: 'Microsoft YaHei', 'Segoe UI', 'Source Han Sans CN', sans-serif;
}
.${SETTINGS_ROOT_CLASS} .lv-card {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 24px 28px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(92, 128, 186, 0.35);
    border-radius: 0;
    box-shadow: 0 24px 48px rgba(16, 32, 56, 0.18);
    backdrop-filter: blur(6px);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.${SETTINGS_ROOT_CLASS} .lv-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 28px 56px rgba(16, 32, 56, 0.22);
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
    letter-spacing: 0.5px;
    color: rgba(14, 22, 34, 0.95);
}
.${SETTINGS_ROOT_CLASS} .lv-card-header p {
    margin: 0;
    font-size: 13px;
    color: rgba(14, 22, 34, 0.62);
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
.${SETTINGS_ROOT_CLASS} .lv-field.is-disabled {
    opacity: 0.55;
}
.${SETTINGS_ROOT_CLASS} .lv-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    font-weight: 600;
    color: rgba(18, 26, 40, 0.78);
}
.${SETTINGS_ROOT_CLASS} .lv-label-value {
    font-weight: 500;
    font-size: 12px;
    color: rgba(18, 26, 40, 0.55);
}
.${SETTINGS_ROOT_CLASS} .lv-controls {
    display: flex;
    gap: 12px;
    align-items: center;
}
.${SETTINGS_ROOT_CLASS} .lv-controls input[type='range'] {
    flex: 1;
    accent-color: rgba(74, 116, 186, 0.9);
}
.${SETTINGS_ROOT_CLASS} .lv-number-input {
    width: 82px;
    padding: 6px 8px;
    border: 1px solid rgba(92, 128, 186, 0.35);
    border-radius: 0;
    background: rgba(255, 255, 255, 0.96);
    color: rgba(16, 28, 44, 0.92);
    font-size: 13px;
}
.${SETTINGS_ROOT_CLASS} .lv-select {
    padding: 8px 10px;
    border: 1px solid rgba(92, 128, 186, 0.35);
    border-radius: 0;
    background: rgba(255, 255, 255, 0.96);
    color: rgba(16, 28, 44, 0.92);
    font-size: 13px;
}
.${SETTINGS_ROOT_CLASS} .lv-checkbox {
    display: flex;
    align-items: center;
    gap: 12px;
}
.${SETTINGS_ROOT_CLASS} .lv-checkbox input[type='checkbox'] {
    width: 18px;
    height: 18px;
    border-radius: 0;
}
.${SETTINGS_ROOT_CLASS} .lv-checkbox-description {
    font-size: 12px;
    color: rgba(16, 28, 44, 0.58);
}
.${SETTINGS_ROOT_CLASS} .lv-color-inputs {
    display: flex;
    gap: 12px;
    align-items: center;
}
.${SETTINGS_ROOT_CLASS} .lv-color-inputs input[type='color'] {
    width: 40px;
    height: 32px;
    padding: 0;
    border: 1px solid rgba(92, 128, 186, 0.35);
    border-radius: 0;
    background: transparent;
}
.${SETTINGS_ROOT_CLASS} .lv-color-inputs input[type='text'] {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid rgba(92, 128, 186, 0.35);
    border-radius: 0;
    background: rgba(255, 255, 255, 0.96);
    color: rgba(16, 28, 44, 0.92);
}
.${SETTINGS_ROOT_CLASS} .lv-actions {
    display: flex;
    justify-content: flex-end;
}
.${SETTINGS_ROOT_CLASS} .lv-reset-button {
    padding: 10px 20px;
    border: 1px solid rgba(92, 128, 186, 0.45);
    border-radius: 0;
    background: rgba(245, 249, 255, 0.96);
    color: rgba(18, 36, 68, 0.86);
    cursor: pointer;
    font-size: 13px;
    transition: background 0.2s ease, color 0.2s ease;
}
.${SETTINGS_ROOT_CLASS} .lv-reset-button:hover {
    background: rgba(74, 116, 186, 0.1);
    color: rgba(18, 36, 68, 0.96);
}
.${SETTINGS_ROOT_CLASS} .lv-placeholder {
    min-height: 220px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed rgba(92, 128, 186, 0.45);
    background: rgba(255, 255, 255, 0.5);
    color: rgba(18, 26, 40, 0.6);
    font-size: 14px;
    letter-spacing: 0.4px;
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
        id: `${context.metadata.id}/settings`,
        title: '歌词音频可视化',
        subtitle: '插件初始化中',
        mount(target) {
            if (!target) return
            const root = document.createElement('div')
            root.className = SETTINGS_ROOT_CLASS
            const placeholder = document.createElement('div')
            placeholder.className = 'lv-placeholder'
            placeholder.textContent = message || '插件正在准备播放器数据…'
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
            console.error('[LyricVisualizerPlugin] 卸载占位设置失败', error)
        }
    }
}

const createCard = (title, subtitle) => {
    const card = document.createElement('section')
    card.className = 'lv-card'
    const header = document.createElement('header')
    header.className = 'lv-card-header'
    const heading = document.createElement('h2')
    heading.textContent = title
    header.appendChild(heading)
    if (subtitle) {
        const sub = document.createElement('p')
        sub.textContent = subtitle
        header.appendChild(sub)
    }
    const body = document.createElement('div')
    body.className = 'lv-card-body'
    card.appendChild(header)
    card.appendChild(body)
    return { element: card, body }
}

const createSliderField = ({ label, min, max, step = 1, suffix = '', format, getValue, setValue, sanitize, disabled }) => {
    const field = document.createElement('div')
    field.className = 'lv-field'

    const labelEl = document.createElement('div')
    labelEl.className = 'lv-label'
    labelEl.textContent = label
    const valueEl = document.createElement('span')
    valueEl.className = 'lv-label-value'
    labelEl.appendChild(valueEl)
    field.appendChild(labelEl)

    const controls = document.createElement('div')
    controls.className = 'lv-controls'
    const range = document.createElement('input')
    range.type = 'range'
    range.min = String(min)
    range.max = String(max)
    range.step = String(step)
    controls.appendChild(range)

    const number = document.createElement('input')
    number.type = 'number'
    number.className = 'lv-number-input'
    number.min = String(min)
    number.max = String(max)
    number.step = String(step)
    controls.appendChild(number)

    field.appendChild(controls)

    const formatValue = (value) => {
        if (typeof format === 'function') return format(value)
        return `${value}${suffix}`
    }

    const applyValue = (raw) => {
        const numeric = Number(raw)
        const normalized = Number.isFinite(numeric) ? numeric : min
        const sanitized = typeof sanitize === 'function'
            ? sanitize(normalized)
            : clampNumber(normalized, Number(min), Number(max), Number(min))
        setValue(sanitized)
    }

    const onRangeInput = (event) => {
        applyValue(event.target.value)
    }
    const onNumberChange = (event) => {
        applyValue(event.target.value)
    }

    range.addEventListener('input', onRangeInput)
    number.addEventListener('change', onNumberChange)
    number.addEventListener('blur', onNumberChange)

    const update = () => {
        const value = Number(getValue())
        const safeValue = Number.isFinite(value) ? value : Number(min)
        valueEl.textContent = formatValue(safeValue)
        range.value = String(safeValue)
        number.value = String(safeValue)
        const shouldDisable = typeof disabled === 'function' ? Boolean(disabled()) : false
        range.disabled = shouldDisable
        number.disabled = shouldDisable
        if (shouldDisable) {
            field.classList.add('is-disabled')
        } else {
            field.classList.remove('is-disabled')
        }
    }

    const destroy = () => {
        range.removeEventListener('input', onRangeInput)
        number.removeEventListener('change', onNumberChange)
        number.removeEventListener('blur', onNumberChange)
    }

    return { element: field, update, destroy }
}

const createSelectField = ({ label, options, getValue, setValue }) => {
    const field = document.createElement('div')
    field.className = 'lv-field'

    const labelEl = document.createElement('div')
    labelEl.className = 'lv-label'
    labelEl.textContent = label
    const valueEl = document.createElement('span')
    valueEl.className = 'lv-label-value'
    labelEl.appendChild(valueEl)
    field.appendChild(labelEl)

    const select = document.createElement('select')
    select.className = 'lv-select'
    for (const option of options) {
        const opt = document.createElement('option')
        opt.value = option.value
        opt.textContent = option.label
        select.appendChild(opt)
    }
    const onChange = () => {
        setValue(select.value)
    }
    select.addEventListener('change', onChange)
    field.appendChild(select)

    const update = () => {
        const current = getValue()
        if (current === undefined || current === null) return
        select.value = String(current)
        const option = options.find((item) => String(item.value) === String(current))
        valueEl.textContent = option ? option.label : ''
    }

    const destroy = () => {
        select.removeEventListener('change', onChange)
    }

    return { element: field, update, destroy }
}

const createCheckboxField = ({ label, description, getValue, setValue }) => {
    const field = document.createElement('div')
    field.className = 'lv-field'
    const wrapper = document.createElement('label')
    wrapper.className = 'lv-checkbox'
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    wrapper.appendChild(checkbox)
    const text = document.createElement('span')
    text.textContent = label
    wrapper.appendChild(text)
    field.appendChild(wrapper)
    if (description) {
        const desc = document.createElement('div')
        desc.className = 'lv-checkbox-description'
        desc.textContent = description
        field.appendChild(desc)
    }

    const onChange = () => {
        setValue(Boolean(checkbox.checked))
    }

    checkbox.addEventListener('change', onChange)

    const update = () => {
        checkbox.checked = Boolean(getValue())
    }

    const destroy = () => {
        checkbox.removeEventListener('change', onChange)
    }

    return { element: field, update, destroy }
}

const createColorField = ({ label, getValue, setValue }) => {
    const field = document.createElement('div')
    field.className = 'lv-field'

    const labelEl = document.createElement('div')
    labelEl.className = 'lv-label'
    labelEl.textContent = label
    field.appendChild(labelEl)

    const controls = document.createElement('div')
    controls.className = 'lv-color-inputs'
    const colorInput = document.createElement('input')
    colorInput.type = 'color'
    const textInput = document.createElement('input')
    textInput.type = 'text'

    controls.appendChild(colorInput)
    controls.appendChild(textInput)
    field.appendChild(controls)

    const syncColor = (value) => {
        const sanitized = sanitizeColor(value)
        let preview = sanitized
        if (sanitized === 'black') preview = '#000000'
        else if (sanitized === 'white') preview = '#ffffff'
        else if (!/^#([0-9a-f]{6})$/i.test(sanitized)) {
            preview = '#101623'
        }
        colorInput.value = preview
        textInput.value = sanitized
    }

    const onColorInput = () => {
        setValue(colorInput.value)
    }

    const onTextChange = () => {
        setValue(textInput.value)
    }

    colorInput.addEventListener('input', onColorInput)
    textInput.addEventListener('change', onTextChange)
    textInput.addEventListener('blur', onTextChange)

    const update = () => {
        syncColor(getValue())
    }

    const destroy = () => {
        colorInput.removeEventListener('input', onColorInput)
        textInput.removeEventListener('change', onTextChange)
        textInput.removeEventListener('blur', onTextChange)
    }

    return { element: field, update, destroy }
}

const createSettingsUI = (container, store, triggerUpdate) => {
    if (!container || typeof document === 'undefined') {
        return { update() {}, destroy() {} }
    }

    const root = document.createElement('div')
    root.className = SETTINGS_ROOT_CLASS

    const fields = []

    const addField = (cardBody, factory) => {
        const field = factory()
        fields.push(field)
        cardBody.appendChild(field.element)
    }

    const commit = (mutator) => {
        mutator()
        sanitizeVisualizerState(store)
        triggerUpdate()
    }

    const generalCard = createCard('开关与风格', '控制歌词区域音频可视化的启用状态与基础样式')
    addField(generalCard.body, () => createCheckboxField({
        label: '启用歌词音频可视化',
        description: '启用后会在歌词区域显示频谱动画，并在播放器中出现快捷开关。',
        getValue: () => store.lyricVisualizer,
        setValue: (value) => commit(() => assignIfChanged(store, 'lyricVisualizer', Boolean(value))),
    }))
    addField(generalCard.body, () => createSelectField({
        label: '显示样式',
        options: [
            { value: 'bars', label: '柱状频谱' },
            { value: 'radial', label: '辐射频谱' },
        ],
        getValue: () => (store.lyricVisualizerStyle === 'radial' ? 'radial' : 'bars'),
        setValue: (value) => commit(() => assignIfChanged(store, 'lyricVisualizerStyle', value === 'radial' ? 'radial' : 'bars')),
    }))
    addField(generalCard.body, () => createColorField({
        label: '主色调',
        getValue: () => store.lyricVisualizerColor,
        setValue: (value) => commit(() => assignIfChanged(store, 'lyricVisualizerColor', sanitizeColor(value))),
    }))
    addField(generalCard.body, () => createSliderField({
        label: '画面透明度',
        min: 0,
        max: 100,
        step: 1,
        suffix: '%',
        getValue: () => store.lyricVisualizerOpacity,
        setValue: (value) => commit(() => assignIfChanged(store, 'lyricVisualizerOpacity', clampInteger(value, 0, 100, DEFAULTS.opacity)))),
    }))
    addField(generalCard.body, () => createSliderField({
        label: '画面高度',
        min: 80,
        max: 480,
        step: 10,
        suffix: 'px',
        getValue: () => store.lyricVisualizerHeight,
        setValue: (value) => commit(() => assignIfChanged(store, 'lyricVisualizerHeight', clampInteger(value, 80, 480, DEFAULTS.height)))),
    }))

    const spectrumCard = createCard('频谱参数', '调节频率范围、柱体数量和动画平滑度')
    addField(spectrumCard.body, () => createSliderField({
        label: '最低采样频率',
        min: 20,
        max: 18000,
        step: 10,
        suffix: 'Hz',
        getValue: () => store.lyricVisualizerFrequencyMin,
        setValue: (value) => commit(() => {
            const range = sanitizeFrequencyRange(value, store.lyricVisualizerFrequencyMax)
            assignIfChanged(store, 'lyricVisualizerFrequencyMin', range.min)
            assignIfChanged(store, 'lyricVisualizerFrequencyMax', range.max)
        })),
    }))
    addField(spectrumCard.body, () => createSliderField({
        label: '最高采样频率',
        min: 200,
        max: 20000,
        step: 10,
        suffix: 'Hz',
        getValue: () => store.lyricVisualizerFrequencyMax,
        setValue: (value) => commit(() => {
            const range = sanitizeFrequencyRange(store.lyricVisualizerFrequencyMin, value)
            assignIfChanged(store, 'lyricVisualizerFrequencyMin', range.min)
            assignIfChanged(store, 'lyricVisualizerFrequencyMax', range.max)
        })),
    }))
    addField(spectrumCard.body, () => createSliderField({
        label: '柱体数量',
        min: 8,
        max: 120,
        step: 1,
        getValue: () => store.lyricVisualizerBarCount,
        setValue: (value) => commit(() => assignIfChanged(store, 'lyricVisualizerBarCount', clampInteger(value, 8, 120, DEFAULTS.barCount)))),
    }))
    addField(spectrumCard.body, () => createSliderField({
        label: '柱体宽度',
        min: 4,
        max: 100,
        step: 1,
        suffix: '%',
        getValue: () => store.lyricVisualizerBarWidth,
        setValue: (value) => commit(() => assignIfChanged(store, 'lyricVisualizerBarWidth', clampInteger(value, 4, 100, DEFAULTS.barWidth)))),
    }))
    addField(spectrumCard.body, () => createSliderField({
        label: '动画平滑度',
        min: 0,
        max: 95,
        step: 1,
        suffix: '%',
        format: (value) => `${(value / 100).toFixed(2)}s`,
        getValue: () => Math.round(Number(store.lyricVisualizerTransitionDelay || 0) * 100),
        setValue: (value) => commit(() => assignIfChanged(store, 'lyricVisualizerTransitionDelay', clampNumber(value / 100, 0, 0.95, DEFAULTS.transitionDelay)))),
    }))

    const radialCard = createCard('辐射样式', '以下参数仅在选择“辐射频谱”时生效')
    addField(radialCard.body, () => createSliderField({
        label: '整体尺寸',
        min: 20,
        max: 400,
        step: 5,
        suffix: '%',
        getValue: () => store.lyricVisualizerRadialSize,
        setValue: (value) => commit(() => assignIfChanged(store, 'lyricVisualizerRadialSize', clampInteger(value, 20, 400, DEFAULTS.radialSize)))),
        disabled: () => store.lyricVisualizerStyle !== 'radial',
    }))
    addField(radialCard.body, () => createSliderField({
        label: '水平偏移',
        min: -100,
        max: 100,
        step: 1,
        suffix: '%',
        getValue: () => store.lyricVisualizerRadialOffsetX,
        setValue: (value) => commit(() => assignIfChanged(store, 'lyricVisualizerRadialOffsetX', clampInteger(value, -100, 100, DEFAULTS.radialOffsetX)))),
        disabled: () => store.lyricVisualizerStyle !== 'radial',
    }))
    addField(radialCard.body, () => createSliderField({
        label: '垂直偏移',
        min: -100,
        max: 100,
        step: 1,
        suffix: '%',
        getValue: () => store.lyricVisualizerRadialOffsetY,
        setValue: (value) => commit(() => assignIfChanged(store, 'lyricVisualizerRadialOffsetY', clampInteger(value, -100, 100, DEFAULTS.radialOffsetY)))),
        disabled: () => store.lyricVisualizerStyle !== 'radial',
    }))
    addField(radialCard.body, () => createSliderField({
        label: '中心区域尺寸',
        min: 10,
        max: 95,
        step: 1,
        suffix: '%',
        getValue: () => store.lyricVisualizerRadialCoreSize,
        setValue: (value) => commit(() => assignIfChanged(store, 'lyricVisualizerRadialCoreSize', clampInteger(value, 10, 95, DEFAULTS.radialCoreSize)))),
        disabled: () => store.lyricVisualizerStyle !== 'radial',
    }))

    root.appendChild(generalCard.element)
    root.appendChild(spectrumCard.element)
    root.appendChild(radialCard.element)

    const actions = document.createElement('div')
    actions.className = 'lv-actions'
    const resetButton = document.createElement('button')
    resetButton.type = 'button'
    resetButton.className = 'lv-reset-button'
    resetButton.textContent = '恢复默认参数'
    resetButton.addEventListener('click', () => {
        applyDefaults(store)
        sanitizeVisualizerState(store)
        triggerUpdate()
    })
    actions.appendChild(resetButton)
    root.appendChild(actions)

    container.appendChild(root)

    const update = () => {
        for (const field of fields) {
            try {
                field.update()
            } catch (error) {
                console.error('[LyricVisualizerPlugin] 更新设置控件失败', error)
            }
        }
    }

    const destroy = () => {
        for (const field of fields) {
            try {
                field.destroy?.()
            } catch (error) {
                console.error('[LyricVisualizerPlugin] 清理设置控件失败', error)
            }
        }
        if (root.parentNode === container) container.removeChild(root)
    }

    return { update, destroy }
}

const setupWithStore = (context, store) => {
    sanitizeVisualizerState(store)

    if (!store[AUTO_ENABLE_FLAG_KEY]) {
        assignIfChanged(store, AUTO_ENABLE_FLAG_KEY, true)
        if (DEFAULTS.enabled) assignIfChanged(store, 'lyricVisualizer', true)
    }

    assignIfChanged(store, 'lyricVisualizerPluginActive', true)
    assignIfChanged(store, 'lyricVisualizerToggleAvailable', true)

    let settingsUI = null

    const triggerUpdate = () => {
        try {
            settingsUI?.update?.()
        } catch (error) {
            console.error('[LyricVisualizerPlugin] 刷新设置界面失败', error)
        }
    }

    const unsubscribe = typeof store.$subscribe === 'function'
        ? store.$subscribe(() => {
              sanitizeVisualizerState(store)
              triggerUpdate()
          })
        : null

    const unregisterSettings = context.settings.register({
        id: `${context.metadata.id}/settings`,
        title: '歌词音频可视化',
        subtitle: '自定义歌词区域的可视化效果',
        mount(target) {
            settingsUI = createSettingsUI(target, store, triggerUpdate)
            requestAnimationFrame(() => settingsUI?.update?.())
            return () => {
                try {
                    settingsUI?.destroy?.()
                } catch (error) {
                    console.error('[LyricVisualizerPlugin] 卸载设置界面失败', error)
                }
                settingsUI = null
            }
        },
        unmount(target) {
            try {
                settingsUI?.destroy?.()
            } catch (error) {
                console.error('[LyricVisualizerPlugin] 清理设置界面失败', error)
            }
            settingsUI = null
            if (target) target.innerHTML = ''
        },
    })

    return () => {
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
            settingsUI?.destroy?.()
        } catch (error) {
            console.error('[LyricVisualizerPlugin] 清理设置界面失败', error)
        }
        settingsUI = null

        assignIfChanged(store, 'lyricVisualizer', false)
        assignIfChanged(store, 'lyricVisualizerPluginActive', false)
        assignIfChanged(store, 'lyricVisualizerToggleAvailable', false)
    }
}

module.exports = function activate(context) {
    const removeStyle = ensureStyleSheet()

    let disposed = false
    let runtimeCleanup = null
    let placeholderCleanup = null
    let retryHandle = null

    const cleanupPlaceholder = () => {
        if (placeholderCleanup) {
            try {
                placeholderCleanup()
            } catch (error) {
                console.error('[LyricVisualizerPlugin] 清理占位设置失败', error)
            }
            placeholderCleanup = null
        }
    }

    const cleanupRuntime = () => {
        if (typeof runtimeCleanup === 'function') {
            try {
                runtimeCleanup()
            } catch (error) {
                console.error('[LyricVisualizerPlugin] 卸载运行时失败', error)
            }
        }
        runtimeCleanup = null
    }

    const scheduleRetry = () => {
        if (retryHandle) clearTimeout(retryHandle)
        retryHandle = setTimeout(attemptResolveStore, RETRY_DELAY_MS)
    }

    const attemptResolveStore = () => {
        if (disposed) return
        const store = resolvePlayerStore(context)
        if (!store) {
            if (!placeholderCleanup) {
                placeholderCleanup = registerPlaceholderSettings(context, '正在等待播放器状态，稍后即可调整参数…')
            }
            scheduleRetry()
            return
        }

        cleanupPlaceholder()
        cleanupRuntime()
        try {
            runtimeCleanup = setupWithStore(context, store)
        } catch (error) {
            console.error('[LyricVisualizerPlugin] 初始化失败，将稍后重试', error)
            runtimeCleanup = null
            if (!placeholderCleanup) {
                placeholderCleanup = registerPlaceholderSettings(context, '初始化失败，正在准备重新连接播放器…')
            }
            scheduleRetry()
        }
    }

    attemptResolveStore()

    context.onCleanup(() => {
        disposed = true
        if (retryHandle) clearTimeout(retryHandle)
        cleanupRuntime()
        cleanupPlaceholder()
        try {
            removeStyle?.()
        } catch (error) {
            console.error('[LyricVisualizerPlugin] 移除样式失败', error)
        }
    })
}
