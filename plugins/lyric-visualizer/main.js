const STYLE_ID = 'hm-lyric-visualizer-plugin-style'
const SETTINGS_CLASS = 'hm-lyric-visualizer-settings'

const DEFAULTS = Object.freeze({
    height: 220,
    frequencyMin: 20,
    frequencyMax: 8000,
    transitionDelay: 0.75,
    barCount: 48,
    barWidth: 55,
    color: 'black',
    opacity: 100,
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

const sanitizeHeight = value => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return DEFAULTS.height
    return clampNumber(Math.round(numeric), 60, 600, DEFAULTS.height)
}

const sanitizeBarCount = value => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return DEFAULTS.barCount
    return clampNumber(Math.round(numeric), 8, 128, DEFAULTS.barCount)
}

const sanitizeBarWidth = value => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return DEFAULTS.barWidth
    return clampNumber(Math.round(numeric), 5, 100, DEFAULTS.barWidth)
}

const sanitizeVisualizerStyle = value => (value === 'radial' ? 'radial' : DEFAULTS.style)

const sanitizeOpacity = value => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return DEFAULTS.opacity
    return clampNumber(Math.round(numeric), 0, 100, DEFAULTS.opacity)
}

const sanitizeTransitionDelay = value => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return DEFAULTS.transitionDelay
    const clamped = clampNumber(numeric, 0, 0.95, DEFAULTS.transitionDelay)
    return Math.round(clamped * 100) / 100
}

const sanitizeRadialSize = value => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return DEFAULTS.radialSize
    return clampNumber(Math.round(numeric), 20, 400, DEFAULTS.radialSize)
}

const sanitizeRadialOffset = value => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return 0
    return clampNumber(Math.round(numeric), -100, 100, 0)
}

const sanitizeRadialCoreSize = value => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return DEFAULTS.radialCoreSize
    return clampNumber(Math.round(numeric), 10, 95, DEFAULTS.radialCoreSize)
}

const sanitizeFrequencyRange = (min, max) => {
    let safeMin = clampNumber(Math.round(Number(min) || DEFAULTS.frequencyMin), 20, 20000, DEFAULTS.frequencyMin)
    let safeMax = clampNumber(Math.round(Number(max) || DEFAULTS.frequencyMax), 20, 20000, DEFAULTS.frequencyMax)
    if (safeMin >= safeMax) {
        if (safeMin >= 19990) {
            safeMin = 19990
            safeMax = 20000
        } else {
            safeMax = Math.min(20000, safeMin + 10)
        }
    }
    if (safeMax - safeMin < 10) {
        if (safeMin >= 19990) {
            safeMin = 19990
            safeMax = 20000
        } else {
            safeMax = Math.min(20000, safeMin + 10)
        }
    }
    return { min: safeMin, max: safeMax }
}

const ensureStyleSheet = () => {
    if (typeof document === 'undefined') return () => {}
    const existing = document.getElementById(STYLE_ID)
    if (existing) return () => {}
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.${SETTINGS_CLASS} {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 4px 0 48px;
    color: rgba(18, 28, 44, 0.92);
    font-family: 'Source Han Sans CN', 'Segoe UI', 'Microsoft YaHei', sans-serif;
}
.${SETTINGS_CLASS} .lv-card {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px 24px;
    background: rgba(244, 248, 255, 0.78);
    border: 1px solid rgba(96, 128, 186, 0.28);
    border-radius: 0;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
.${SETTINGS_CLASS} .lv-card-header {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.${SETTINGS_CLASS} .lv-card-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: rgba(12, 22, 38, 0.92);
}
.${SETTINGS_CLASS} .lv-card-header p {
    margin: 0;
    font-size: 13px;
    color: rgba(12, 22, 38, 0.6);
}
.${SETTINGS_CLASS} .lv-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.${SETTINGS_CLASS} .lv-field label {
    font-size: 13px;
    font-weight: 500;
    color: rgba(12, 22, 38, 0.75);
}
.${SETTINGS_CLASS} .lv-field-control {
    display: flex;
    align-items: center;
    gap: 12px;
}
.${SETTINGS_CLASS} select,
.${SETTINGS_CLASS} input[type="number"],
.${SETTINGS_CLASS} input[type="range"] {
    width: 100%;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(96, 128, 186, 0.32);
    border-radius: 0;
    font-size: 13px;
    color: rgba(12, 22, 38, 0.85);
    outline: none;
    transition: border-color 0.15s ease;
}
.${SETTINGS_CLASS} input[type="range"] {
    padding: 0;
}
.${SETTINGS_CLASS} select:focus,
.${SETTINGS_CLASS} input[type="number"]:focus {
    border-color: rgba(70, 108, 196, 0.65);
}
.${SETTINGS_CLASS} .lv-switch {
    min-width: 96px;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid rgba(96, 128, 186, 0.45);
    border-radius: 0;
    background: rgba(240, 244, 255, 0.95);
    color: rgba(12, 22, 38, 0.7);
    cursor: pointer;
    transition: all 0.2s ease;
}
.${SETTINGS_CLASS} .lv-switch.is-active {
    background: rgba(70, 108, 196, 0.9);
    border-color: rgba(70, 108, 196, 0.9);
    color: #fff;
}
.${SETTINGS_CLASS} .lv-inline-value {
    font-size: 12px;
    color: rgba(12, 22, 38, 0.55);
}
.${SETTINGS_CLASS} .lv-card[data-mode="radial-hidden"] {
    display: none;
}
.${SETTINGS_CLASS} .lv-actions {
    display: flex;
    justify-content: flex-end;
}
.${SETTINGS_CLASS} .lv-button {
    padding: 10px 20px;
    border: 1px solid rgba(96, 128, 186, 0.45);
    background: rgba(255, 255, 255, 0.9);
    color: rgba(12, 22, 38, 0.75);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border-radius: 0;
    transition: background 0.2s ease;
}
.${SETTINGS_CLASS} .lv-button:hover {
    background: rgba(70, 108, 196, 0.12);
}
.${SETTINGS_CLASS} .lv-suffix {
    font-size: 12px;
    color: rgba(12, 22, 38, 0.55);
    min-width: 40px;
}
`
    document.head.appendChild(style)
    return () => {
        if (style.parentNode) style.parentNode.removeChild(style)
    }
}

const applySanitizedState = store => {
    store.lyricVisualizerHeight = sanitizeHeight(store.lyricVisualizerHeight)
    const range = sanitizeFrequencyRange(store.lyricVisualizerFrequencyMin, store.lyricVisualizerFrequencyMax)
    store.lyricVisualizerFrequencyMin = range.min
    store.lyricVisualizerFrequencyMax = range.max
    store.lyricVisualizerTransitionDelay = sanitizeTransitionDelay(store.lyricVisualizerTransitionDelay)
    store.lyricVisualizerBarCount = sanitizeBarCount(store.lyricVisualizerBarCount)
    store.lyricVisualizerBarWidth = sanitizeBarWidth(store.lyricVisualizerBarWidth)
    store.lyricVisualizerColor = store.lyricVisualizerColor === 'white' ? 'white' : 'black'
    store.lyricVisualizerOpacity = sanitizeOpacity(store.lyricVisualizerOpacity)
    store.lyricVisualizerStyle = sanitizeVisualizerStyle(store.lyricVisualizerStyle)
    store.lyricVisualizerRadialSize = sanitizeRadialSize(store.lyricVisualizerRadialSize)
    store.lyricVisualizerRadialOffsetX = sanitizeRadialOffset(store.lyricVisualizerRadialOffsetX)
    store.lyricVisualizerRadialOffsetY = sanitizeRadialOffset(store.lyricVisualizerRadialOffsetY)
    store.lyricVisualizerRadialCoreSize = sanitizeRadialCoreSize(store.lyricVisualizerRadialCoreSize)
}

const formatNumber = (value, suffix = '', precision = 0) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return ''
    return `${numeric.toFixed(precision)}${suffix}`.replace(/\.0+$/, '')
}

const buildSettingsUI = (container, store) => {
    if (!container) return null
    const root = document.createElement('div')
    root.className = SETTINGS_CLASS
    root.innerHTML = `
        <div class="lv-card" data-card="basics">
            <div class="lv-card-header">
                <h2>音频可视化</h2>
                <p>控制歌词区域的实时频谱效果。</p>
            </div>
            <div class="lv-field">
                <label>可视化状态</label>
                <div class="lv-field-control">
                    <button type="button" class="lv-switch" data-role="toggle"></button>
                </div>
            </div>
            <div class="lv-field">
                <label>显示样式</label>
                <select data-role="style">
                    <option value="bars">线性柱状</option>
                    <option value="radial">环形光束</option>
                </select>
            </div>
            <div class="lv-field">
                <label>高度 <span class="lv-inline-value" data-role="height-display"></span></label>
                <input type="range" min="120" max="480" step="10" data-role="height" />
            </div>
            <div class="lv-field">
                <label>柱体数量 <span class="lv-inline-value" data-role="count-display"></span></label>
                <input type="range" min="8" max="96" step="1" data-role="bar-count" />
            </div>
            <div class="lv-field">
                <label>柱体宽度 <span class="lv-inline-value" data-role="width-display"></span></label>
                <input type="range" min="10" max="100" step="1" data-role="bar-width" />
            </div>
            <div class="lv-field">
                <label>透明度 <span class="lv-inline-value" data-role="opacity-display"></span></label>
                <input type="range" min="0" max="100" step="1" data-role="opacity" />
            </div>
            <div class="lv-field">
                <label>主颜色</label>
                <select data-role="color">
                    <option value="black">深色</option>
                    <option value="white">浅色</option>
                </select>
            </div>
        </div>
        <div class="lv-card" data-card="frequency">
            <div class="lv-card-header">
                <h2>频率与平滑</h2>
                <p>调整采样频段与响应速度。</p>
            </div>
            <div class="lv-field">
                <label>最低频率 (Hz)</label>
                <input type="number" min="20" max="20000" step="10" data-role="freq-min" />
            </div>
            <div class="lv-field">
                <label>最高频率 (Hz)</label>
                <input type="number" min="20" max="20000" step="10" data-role="freq-max" />
            </div>
            <div class="lv-field">
                <label>平滑系数 <span class="lv-inline-value" data-role="smooth-display"></span></label>
                <input type="range" min="0" max="0.95" step="0.01" data-role="smoothing" />
            </div>
        </div>
        <div class="lv-card" data-card="radial">
            <div class="lv-card-header">
                <h2>环形样式</h2>
                <p>下列参数仅在环形模式下生效。</p>
            </div>
            <div class="lv-field">
                <label>整体尺寸 <span class="lv-inline-value" data-role="radial-size-display"></span></label>
                <input type="range" min="40" max="180" step="1" data-role="radial-size" />
            </div>
            <div class="lv-field">
                <label>中心比例 <span class="lv-inline-value" data-role="radial-core-display"></span></label>
                <input type="range" min="20" max="95" step="1" data-role="radial-core" />
            </div>
            <div class="lv-field">
                <label>水平偏移 (%)</label>
                <input type="number" min="-100" max="100" step="5" data-role="radial-offset-x" />
            </div>
            <div class="lv-field">
                <label>垂直偏移 (%)</label>
                <input type="number" min="-100" max="100" step="5" data-role="radial-offset-y" />
            </div>
        </div>
        <div class="lv-card lv-card--actions" data-card="actions">
            <div class="lv-actions">
                <button type="button" class="lv-button" data-role="reset">恢复默认</button>
            </div>
        </div>
    `
    container.appendChild(root)

    const refs = {
        toggle: root.querySelector('[data-role="toggle"]'),
        style: root.querySelector('[data-role="style"]'),
        height: root.querySelector('[data-role="height"]'),
        barCount: root.querySelector('[data-role="bar-count"]'),
        barWidth: root.querySelector('[data-role="bar-width"]'),
        opacity: root.querySelector('[data-role="opacity"]'),
        color: root.querySelector('[data-role="color"]'),
        freqMin: root.querySelector('[data-role="freq-min"]'),
        freqMax: root.querySelector('[data-role="freq-max"]'),
        smoothing: root.querySelector('[data-role="smoothing"]'),
        radialSize: root.querySelector('[data-role="radial-size"]'),
        radialCore: root.querySelector('[data-role="radial-core"]'),
        radialOffsetX: root.querySelector('[data-role="radial-offset-x"]'),
        radialOffsetY: root.querySelector('[data-role="radial-offset-y"]'),
        reset: root.querySelector('[data-role="reset"]'),
        cards: {
            radial: root.querySelector('[data-card="radial"]'),
        },
        displays: {
            height: root.querySelector('[data-role="height-display"]'),
            count: root.querySelector('[data-role="count-display"]'),
            width: root.querySelector('[data-role="width-display"]'),
            opacity: root.querySelector('[data-role="opacity-display"]'),
            smooth: root.querySelector('[data-role="smooth-display"]'),
            radialSize: root.querySelector('[data-role="radial-size-display"]'),
            radialCore: root.querySelector('[data-role="radial-core-display"]'),
        },
    }

    const listeners = []
    const listen = (target, event, handler) => {
        if (!target) return
        target.addEventListener(event, handler)
        listeners.push(() => target.removeEventListener(event, handler))
    }

    const updateRadialVisibility = style => {
        if (!refs.cards.radial) return
        const active = style === 'radial'
        refs.cards.radial.setAttribute('data-mode', active ? 'visible' : 'radial-hidden')
    }

    const update = () => {
        const currentStyle = sanitizeVisualizerStyle(store.lyricVisualizerStyle)
        refs.toggle.classList.toggle('is-active', !!store.lyricVisualizer)
        refs.toggle.textContent = store.lyricVisualizer ? '已开启' : '已关闭'
        refs.style.value = currentStyle
        const heightValue = sanitizeHeight(store.lyricVisualizerHeight)
        refs.height.value = heightValue
        if (refs.displays.height) refs.displays.height.textContent = formatNumber(heightValue, ' px')
        const barCountValue = sanitizeBarCount(store.lyricVisualizerBarCount)
        refs.barCount.value = barCountValue
        if (refs.displays.count) refs.displays.count.textContent = `${barCountValue}`
        const barWidthValue = sanitizeBarWidth(store.lyricVisualizerBarWidth)
        refs.barWidth.value = barWidthValue
        if (refs.displays.width) refs.displays.width.textContent = formatNumber(barWidthValue, '%')
        const opacityValue = sanitizeOpacity(store.lyricVisualizerOpacity)
        refs.opacity.value = opacityValue
        if (refs.displays.opacity) refs.displays.opacity.textContent = formatNumber(opacityValue, '%')
        refs.color.value = store.lyricVisualizerColor === 'white' ? 'white' : 'black'
        const range = sanitizeFrequencyRange(store.lyricVisualizerFrequencyMin, store.lyricVisualizerFrequencyMax)
        refs.freqMin.value = range.min
        refs.freqMax.value = range.max
        const smoothValue = sanitizeTransitionDelay(store.lyricVisualizerTransitionDelay)
        refs.smoothing.value = smoothValue
        if (refs.displays.smooth) refs.displays.smooth.textContent = formatNumber(smoothValue, '', 2)
        const radialSizeValue = sanitizeRadialSize(store.lyricVisualizerRadialSize)
        refs.radialSize.value = radialSizeValue
        if (refs.displays.radialSize) refs.displays.radialSize.textContent = formatNumber(radialSizeValue, '%')
        const radialCoreValue = sanitizeRadialCoreSize(store.lyricVisualizerRadialCoreSize)
        refs.radialCore.value = radialCoreValue
        if (refs.displays.radialCore) refs.displays.radialCore.textContent = formatNumber(radialCoreValue, '%')
        refs.radialOffsetX.value = sanitizeRadialOffset(store.lyricVisualizerRadialOffsetX)
        refs.radialOffsetY.value = sanitizeRadialOffset(store.lyricVisualizerRadialOffsetY)
        updateRadialVisibility(currentStyle)
    }

    listen(refs.toggle, 'click', () => {
        store.lyricVisualizer = !store.lyricVisualizer
        update()
    })

    listen(refs.style, 'change', event => {
        store.lyricVisualizerStyle = sanitizeVisualizerStyle(event.target.value)
        update()
    })

    listen(refs.height, 'input', event => {
        store.lyricVisualizerHeight = sanitizeHeight(event.target.value)
        update()
    })

    listen(refs.barCount, 'input', event => {
        store.lyricVisualizerBarCount = sanitizeBarCount(event.target.value)
        update()
    })

    listen(refs.barWidth, 'input', event => {
        store.lyricVisualizerBarWidth = sanitizeBarWidth(event.target.value)
        update()
    })

    listen(refs.opacity, 'input', event => {
        store.lyricVisualizerOpacity = sanitizeOpacity(event.target.value)
        update()
    })

    listen(refs.color, 'change', event => {
        store.lyricVisualizerColor = event.target.value === 'white' ? 'white' : 'black'
        update()
    })

    const handleFrequencyChange = () => {
        const range = sanitizeFrequencyRange(refs.freqMin.value, refs.freqMax.value)
        store.lyricVisualizerFrequencyMin = range.min
        store.lyricVisualizerFrequencyMax = range.max
        update()
    }

    listen(refs.freqMin, 'change', handleFrequencyChange)
    listen(refs.freqMax, 'change', handleFrequencyChange)

    listen(refs.smoothing, 'input', event => {
        store.lyricVisualizerTransitionDelay = sanitizeTransitionDelay(event.target.value)
        update()
    })

    listen(refs.radialSize, 'input', event => {
        store.lyricVisualizerRadialSize = sanitizeRadialSize(event.target.value)
        update()
    })

    listen(refs.radialCore, 'input', event => {
        store.lyricVisualizerRadialCoreSize = sanitizeRadialCoreSize(event.target.value)
        update()
    })

    listen(refs.radialOffsetX, 'change', event => {
        store.lyricVisualizerRadialOffsetX = sanitizeRadialOffset(event.target.value)
        update()
    })

    listen(refs.radialOffsetY, 'change', event => {
        store.lyricVisualizerRadialOffsetY = sanitizeRadialOffset(event.target.value)
        update()
    })

    listen(refs.reset, 'click', () => {
        store.lyricVisualizerHeight = DEFAULTS.height
        store.lyricVisualizerFrequencyMin = DEFAULTS.frequencyMin
        store.lyricVisualizerFrequencyMax = DEFAULTS.frequencyMax
        store.lyricVisualizerTransitionDelay = DEFAULTS.transitionDelay
        store.lyricVisualizerBarCount = DEFAULTS.barCount
        store.lyricVisualizerBarWidth = DEFAULTS.barWidth
        store.lyricVisualizerColor = DEFAULTS.color
        store.lyricVisualizerOpacity = DEFAULTS.opacity
        store.lyricVisualizerStyle = DEFAULTS.style
        store.lyricVisualizerRadialSize = DEFAULTS.radialSize
        store.lyricVisualizerRadialOffsetX = DEFAULTS.radialOffsetX
        store.lyricVisualizerRadialOffsetY = DEFAULTS.radialOffsetY
        store.lyricVisualizerRadialCoreSize = DEFAULTS.radialCoreSize
        update()
    })

    update()

    return {
        update,
        destroy: () => {
            listeners.forEach(dispose => dispose())
            listeners.length = 0
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

    const removeStyle = ensureStyleSheet()
    applySanitizedState(playerStore)
    playerStore.lyricVisualizerPluginActive = true

    const unsubscribe = playerStore.$subscribe(() => {
        if (typeof uiRef?.update === 'function') {
            uiRef.update()
        }
    })

    let uiRef = null
    const unregisterSettings = context.settings.register({
        id: 'core.lyric-visualizer/settings',
        title: '歌词音频可视化',
        subtitle: '调整歌词频谱的显示效果',
        mount(container) {
            uiRef = buildSettingsUI(container, playerStore)
            return () => {
                uiRef?.destroy?.()
                uiRef = null
            }
        },
        unmount(container) {
            if (uiRef) {
                uiRef.destroy()
                uiRef = null
            }
            if (container) container.innerHTML = ''
        },
    })

    context.onCleanup(() => {
        try {
            unregisterSettings?.()
        } catch (error) {
            console.error('[LyricVisualizerPlugin] 卸载设置页面失败:', error)
        }
        try {
            unsubscribe?.()
        } catch (error) {
            console.error('[LyricVisualizerPlugin] 取消订阅失败:', error)
        }
        try {
            removeStyle?.()
        } catch (error) {
            console.error('[LyricVisualizerPlugin] 移除样式失败:', error)
        }
        try {
            uiRef?.destroy?.()
        } catch (error) {
            console.error('[LyricVisualizerPlugin] 卸载界面失败:', error)
        }
        uiRef = null
        playerStore.lyricVisualizer = false
        playerStore.lyricVisualizerPluginActive = false
    })
}
