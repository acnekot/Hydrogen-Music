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
});

const CLAMP_BOUNDS = Object.freeze({
    height: { min: 120, max: 480 },
    frequency: { min: 20, max: 20000 },
    transitionDelay: { min: 0, max: 0.95 },
    barCount: { min: 8, max: 160 },
    barWidth: { min: 5, max: 100 },
    opacity: { min: 0, max: 100 },
    radialSize: { min: 10, max: 400 },
    radialOffset: { min: -100, max: 100 },
    radialCoreSize: { min: 10, max: 95 },
});

const STYLE_OPTIONS = [
    { value: 'bars', label: '柱状条形' },
    { value: 'radial', label: '辐射圆环' },
];

const QUICK_COLORS = [
    { value: 'black', label: '深色' },
    { value: 'white', label: '浅色' },
];

function clampNumber(value, min, max, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(Math.max(numeric, min), max);
}

function sanitizeHeight(value) {
    const bounds = CLAMP_BOUNDS.height;
    const numeric = clampNumber(Math.round(Number(value)), bounds.min, bounds.max, DEFAULTS.height);
    return numeric;
}

function sanitizeTransitionDelay(value) {
    const bounds = CLAMP_BOUNDS.transitionDelay;
    const numeric = clampNumber(Number(value), bounds.min, bounds.max, DEFAULTS.transitionDelay);
    return Math.round(numeric * 100) / 100;
}

function sanitizeBarCount(value) {
    const bounds = CLAMP_BOUNDS.barCount;
    return Math.round(clampNumber(Number(value), bounds.min, bounds.max, DEFAULTS.barCount));
}

function sanitizeBarWidth(value) {
    const bounds = CLAMP_BOUNDS.barWidth;
    return Math.round(clampNumber(Number(value), bounds.min, bounds.max, DEFAULTS.barWidth));
}

function sanitizeOpacity(value) {
    const bounds = CLAMP_BOUNDS.opacity;
    return Math.round(clampNumber(Number(value), bounds.min, bounds.max, DEFAULTS.opacity));
}

function sanitizeRadialSize(value) {
    const bounds = CLAMP_BOUNDS.radialSize;
    return Math.round(clampNumber(Number(value), bounds.min, bounds.max, DEFAULTS.radialSize));
}

function sanitizeRadialOffset(value) {
    const bounds = CLAMP_BOUNDS.radialOffset;
    return Math.round(clampNumber(Number(value), bounds.min, bounds.max, 0));
}

function sanitizeRadialCoreSize(value) {
    const bounds = CLAMP_BOUNDS.radialCoreSize;
    return Math.round(clampNumber(Number(value), bounds.min, bounds.max, DEFAULTS.radialCoreSize));
}

function sanitizeStyle(value) {
    return value === 'radial' ? 'radial' : 'bars';
}

function normalizeColor(value) {
    if (!value) return DEFAULTS.color;
    const trimmed = String(value).trim();
    if (!trimmed) return DEFAULTS.color;
    if (trimmed === 'black' || trimmed === 'white') return trimmed;
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
        if (trimmed.length === 4) {
            const expanded = trimmed
                .slice(1)
                .split('')
                .map(ch => ch + ch)
                .join('');
            return `#${expanded.toLowerCase()}`;
        }
        return trimmed.toLowerCase();
    }
    return DEFAULTS.color;
}

function sanitizeFrequencyRange(minValue, maxValue) {
    const bounds = CLAMP_BOUNDS.frequency;
    let min = clampNumber(Number(minValue), bounds.min, bounds.max, DEFAULTS.frequencyMin);
    let max = clampNumber(Number(maxValue), bounds.min, bounds.max, DEFAULTS.frequencyMax);
    min = Math.round(min);
    max = Math.round(max);
    if (min >= max) {
        if (min >= bounds.max - 10) {
            min = bounds.max - 10;
            max = bounds.max;
        } else {
            max = Math.min(bounds.max, min + 10);
        }
    }
    if (max - min < 10) {
        max = Math.min(bounds.max, min + 10);
    }
    return { min, max };
}

function ensurePlayerStore(context) {
    if (context?.stores?.player) return context.stores.player;
    const pinia = context?.pinia;
    if (pinia && typeof pinia._s === 'object' && pinia._s.has('playerStore')) {
        return pinia._s.get('playerStore');
    }
    return null;
}

function sanitizeInitialState(store) {
    try {
        store.lyricVisualizerHeight = sanitizeHeight(store.lyricVisualizerHeight);
        const freq = sanitizeFrequencyRange(store.lyricVisualizerFrequencyMin, store.lyricVisualizerFrequencyMax);
        store.lyricVisualizerFrequencyMin = freq.min;
        store.lyricVisualizerFrequencyMax = freq.max;
        store.lyricVisualizerTransitionDelay = sanitizeTransitionDelay(store.lyricVisualizerTransitionDelay);
        store.lyricVisualizerBarCount = sanitizeBarCount(store.lyricVisualizerBarCount);
        store.lyricVisualizerBarWidth = sanitizeBarWidth(store.lyricVisualizerBarWidth);
        store.lyricVisualizerColor = normalizeColor(store.lyricVisualizerColor);
        store.lyricVisualizerOpacity = sanitizeOpacity(store.lyricVisualizerOpacity);
        store.lyricVisualizerStyle = sanitizeStyle(store.lyricVisualizerStyle);
        store.lyricVisualizerRadialSize = sanitizeRadialSize(store.lyricVisualizerRadialSize);
        store.lyricVisualizerRadialOffsetX = sanitizeRadialOffset(store.lyricVisualizerRadialOffsetX);
        store.lyricVisualizerRadialOffsetY = sanitizeRadialOffset(store.lyricVisualizerRadialOffsetY);
        store.lyricVisualizerRadialCoreSize = sanitizeRadialCoreSize(store.lyricVisualizerRadialCoreSize);
    } catch (error) {
        console.warn('[LyricVisualizer] 无法规范化初始配置:', error);
    }
}

function createSection(doc, title, description) {
    const card = doc.createElement('section');
    card.className = 'hv-visualizer-card';

    const header = doc.createElement('div');
    header.className = 'hv-visualizer-card-header';

    const heading = doc.createElement('h2');
    heading.textContent = title;
    header.appendChild(heading);

    if (description) {
        const desc = doc.createElement('p');
        desc.textContent = description;
        header.appendChild(desc);
    }

    card.appendChild(header);
    return card;
}

function createSliderControl(doc, options) {
    const { label, description, min, max, step, suffix, precision = 0, getValue, setValue, onAfterChange } = options;
    const section = createSection(doc, label, description);

    const valueDisplay = doc.createElement('span');
    valueDisplay.className = 'hv-visualizer-value';

    section.querySelector('.hv-visualizer-card-header').appendChild(valueDisplay);

    const control = doc.createElement('div');
    control.className = 'hv-visualizer-slider-row';

    const range = doc.createElement('input');
    range.type = 'range';
    range.min = String(min);
    range.max = String(max);
    range.step = String(step ?? 1);
    control.appendChild(range);

    const number = doc.createElement('input');
    number.type = 'number';
    number.className = 'hv-visualizer-number';
    number.min = String(min);
    number.max = String(max);
    number.step = String(step ?? 1);
    control.appendChild(number);

    section.appendChild(control);

    const formatValue = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return '';
        const rounded = precision > 0 ? numeric.toFixed(precision) : Math.round(numeric);
        return suffix ? `${rounded}${suffix}` : `${rounded}`;
    };

    const sync = () => {
        const value = Number(getValue());
        const clamped = clampNumber(value, Number(min), Number(max), value);
        range.value = String(clamped);
        number.value = precision > 0 ? Number(clamped).toFixed(precision) : String(clamped);
        valueDisplay.textContent = formatValue(clamped);
    };

    const apply = (raw) => {
        const value = setValue(raw);
        sync();
        if (typeof onAfterChange === 'function') {
            onAfterChange(value);
        }
    };

    range.addEventListener('input', event => {
        apply(event.target.value);
    });
    number.addEventListener('change', event => {
        apply(event.target.value);
    });

    sync();
    return { element: section, sync };
}

function createSelectControl(doc, options) {
    const { label, description, choices, getValue, setValue } = options;
    const section = createSection(doc, label, description);

    const select = doc.createElement('select');
    select.className = 'hv-visualizer-select';

    for (const choice of choices) {
        const option = doc.createElement('option');
        option.value = choice.value;
        option.textContent = choice.label;
        select.appendChild(option);
    }

    section.appendChild(select);

    const sync = () => {
        const current = String(getValue());
        if (select.value !== current) {
            select.value = current;
        }
    };

    select.addEventListener('change', event => {
        setValue(event.target.value);
        sync();
    });

    sync();
    return { element: section, sync };
}

function createColorControl(doc, options) {
    const { label, description, getValue, setValue } = options;
    const section = createSection(doc, label, description);

    const wrapper = doc.createElement('div');
    wrapper.className = 'hv-visualizer-color-row';

    const colorInput = doc.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'hv-visualizer-color-input';

    const textInput = doc.createElement('input');
    textInput.type = 'text';
    textInput.className = 'hv-visualizer-color-text';
    textInput.placeholder = '#000000 / black';

    const quickWrap = doc.createElement('div');
    quickWrap.className = 'hv-visualizer-color-quick';

    for (const quick of QUICK_COLORS) {
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'hv-visualizer-quick-button';
        button.textContent = quick.label;
        button.addEventListener('click', () => {
            setValue(quick.value);
            sync();
        });
        quickWrap.appendChild(button);
    }

    wrapper.appendChild(colorInput);
    wrapper.appendChild(textInput);
    wrapper.appendChild(quickWrap);
    section.appendChild(wrapper);

    const toHex = (value) => {
        if (!value) return '#000000';
        if (value === 'black') return '#000000';
        if (value === 'white') return '#ffffff';
        if (/^#([0-9a-fA-F]{6})$/.test(value)) return value.toLowerCase();
        if (/^#([0-9a-fA-F]{3})$/.test(value)) {
            return `#${value
                .slice(1)
                .split('')
                .map(ch => ch + ch)
                .join('')
                .toLowerCase()}`;
        }
        return '#000000';
    };

    const sync = () => {
        const value = normalizeColor(getValue());
        const hex = toHex(value);
        if (colorInput.value !== hex) {
            colorInput.value = hex;
        }
        textInput.value = value;
    };

    colorInput.addEventListener('input', event => {
        const value = event.target.value;
        setValue(value);
        sync();
    });

    textInput.addEventListener('change', event => {
        const value = event.target.value;
        setValue(value);
        sync();
    });

    sync();
    return { element: section, sync };
}

function createResetControl(doc, options) {
    const { onReset } = options;
    const section = createSection(doc, '重置设置', '将所有可视化参数恢复到默认值。');
    section.classList.add('hv-visualizer-reset-card');

    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'hv-visualizer-reset-button';
    button.textContent = '恢复默认';

    button.addEventListener('click', () => {
        onReset();
    });

    section.appendChild(button);
    return { element: section, sync: () => {} };
}

function buildSettingsPage(context, player) {
    return {
        id: 'example.lyric-visualizer.settings',
        title: '歌词音频可视化',
        subtitle: '自定义歌词区域的频谱动画',
        mount(container) {
            const doc = container.ownerDocument || document;
            container.innerHTML = '';

            const style = doc.createElement('style');
            style.textContent = `
                .hv-visualizer-root {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
                .hv-visualizer-card {
                    border: 1px solid rgba(80, 110, 160, 0.25);
                    background: rgba(248, 251, 255, 0.92);
                    box-shadow: 0 12px 24px rgba(31, 48, 81, 0.08);
                    padding: 20px 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .hv-visualizer-card-header {
                    display: flex;
                    align-items: baseline;
                    justify-content: space-between;
                    gap: 16px;
                }
                .hv-visualizer-card-header h2 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                    color: rgba(25, 38, 66, 0.92);
                }
                .hv-visualizer-card-header p {
                    margin: 0;
                    font-size: 13px;
                    color: rgba(25, 38, 66, 0.6);
                    flex: 1;
                }
                .hv-visualizer-value {
                    font-size: 14px;
                    color: rgba(25, 38, 66, 0.72);
                    white-space: nowrap;
                }
                .hv-visualizer-slider-row {
                    display: grid;
                    grid-template-columns: 1fr 88px;
                    gap: 16px;
                    align-items: center;
                }
                .hv-visualizer-slider-row input[type="range"] {
                    width: 100%;
                }
                .hv-visualizer-number {
                    width: 100%;
                    border: 1px solid rgba(80, 110, 160, 0.25);
                    padding: 6px 8px;
                    font-size: 14px;
                    color: rgba(25, 38, 66, 0.85);
                    background: rgba(255, 255, 255, 0.92);
                }
                .hv-visualizer-number:focus {
                    outline: none;
                    border-color: rgba(76, 130, 220, 0.55);
                    box-shadow: 0 0 0 2px rgba(76, 130, 220, 0.2);
                }
                .hv-visualizer-select {
                    width: fit-content;
                    min-width: 160px;
                    border: 1px solid rgba(80, 110, 160, 0.25);
                    background: rgba(255, 255, 255, 0.95);
                    padding: 6px 12px;
                    font-size: 14px;
                    color: rgba(25, 38, 66, 0.82);
                }
                .hv-visualizer-color-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    align-items: center;
                }
                .hv-visualizer-color-input {
                    width: 64px;
                    height: 36px;
                    padding: 0;
                    border: 1px solid rgba(80, 110, 160, 0.25);
                    background: rgba(255, 255, 255, 0.95);
                }
                .hv-visualizer-color-text {
                    flex: 1;
                    min-width: 160px;
                    border: 1px solid rgba(80, 110, 160, 0.25);
                    padding: 6px 8px;
                    font-size: 14px;
                    color: rgba(25, 38, 66, 0.82);
                    background: rgba(255, 255, 255, 0.95);
                }
                .hv-visualizer-color-text:focus {
                    outline: none;
                    border-color: rgba(76, 130, 220, 0.55);
                    box-shadow: 0 0 0 2px rgba(76, 130, 220, 0.2);
                }
                .hv-visualizer-color-quick {
                    display: flex;
                    gap: 8px;
                }
                .hv-visualizer-quick-button {
                    border: 1px solid rgba(80, 110, 160, 0.25);
                    background: rgba(255, 255, 255, 0.92);
                    padding: 6px 12px;
                    font-size: 13px;
                    color: rgba(25, 38, 66, 0.75);
                    cursor: pointer;
                    transition: background 0.2s ease, color 0.2s ease;
                }
                .hv-visualizer-quick-button:hover {
                    background: rgba(76, 130, 220, 0.12);
                    color: rgba(25, 38, 66, 0.95);
                }
                .hv-visualizer-reset-card {
                    align-items: flex-start;
                }
                .hv-visualizer-reset-button {
                    border: 1px solid rgba(76, 130, 220, 0.45);
                    background: rgba(76, 130, 220, 0.12);
                    color: rgba(23, 46, 88, 0.9);
                    padding: 10px 18px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
                }
                .hv-visualizer-reset-button:hover {
                    background: rgba(76, 130, 220, 0.2);
                    box-shadow: 0 6px 14px rgba(76, 130, 220, 0.18);
                }
                .hv-visualizer-radial-disabled {
                    opacity: 0.45;
                    pointer-events: none;
                }
                .hv-visualizer-radial-group {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
            `;
            doc.head.appendChild(style);

            const root = doc.createElement('div');
            root.className = 'hv-visualizer-root';
            container.appendChild(root);

            const controls = [];
            let isApplying = false;

            const syncAll = () => {
                for (const control of controls) {
                    if (control && typeof control.sync === 'function') {
                        control.sync();
                    }
                }
                updateRadialState();
            };

            const applyWithGuard = (setter) => {
                return value => {
                    isApplying = true;
                    try {
                        return setter(value);
                    } finally {
                        isApplying = false;
                    }
                };
            };

            const getState = () => player.$state || player;

            const heightControl = createSliderControl(doc, {
                label: '可视化高度',
                description: '控制歌词区域内可视化画布的基础高度。',
                min: CLAMP_BOUNDS.height.min,
                max: CLAMP_BOUNDS.height.max,
                step: 10,
                suffix: 'px',
                getValue: () => sanitizeHeight(getState().lyricVisualizerHeight),
                setValue: applyWithGuard(value => {
                    const sanitized = sanitizeHeight(value);
                    player.lyricVisualizerHeight = sanitized;
                    return sanitized;
                }),
            });
            controls.push(heightControl);
            root.appendChild(heightControl.element);

            let frequencyMaxControl = null;

            const frequencyMinControl = createSliderControl(doc, {
                label: '最低频率',
                description: '调整频谱采样的最低频率范围。',
                min: CLAMP_BOUNDS.frequency.min,
                max: CLAMP_BOUNDS.frequency.max - 10,
                step: 10,
                suffix: 'Hz',
                getValue: () => sanitizeFrequencyRange(getState().lyricVisualizerFrequencyMin, getState().lyricVisualizerFrequencyMax).min,
                setValue: applyWithGuard(value => {
                    const { min, max } = sanitizeFrequencyRange(value, getState().lyricVisualizerFrequencyMax);
                    player.lyricVisualizerFrequencyMin = min;
                    player.lyricVisualizerFrequencyMax = max;
                    return min;
                }),
                onAfterChange: () => {
                    if (frequencyMaxControl) frequencyMaxControl.sync();
                },
            });
            controls.push(frequencyMinControl);
            root.appendChild(frequencyMinControl.element);

            frequencyMaxControl = createSliderControl(doc, {
                label: '最高频率',
                description: '调整频谱采样的最高频率范围。',
                min: CLAMP_BOUNDS.frequency.min + 10,
                max: CLAMP_BOUNDS.frequency.max,
                step: 10,
                suffix: 'Hz',
                getValue: () => sanitizeFrequencyRange(getState().lyricVisualizerFrequencyMin, getState().lyricVisualizerFrequencyMax).max,
                setValue: applyWithGuard(value => {
                    const { min, max } = sanitizeFrequencyRange(getState().lyricVisualizerFrequencyMin, value);
                    player.lyricVisualizerFrequencyMin = min;
                    player.lyricVisualizerFrequencyMax = max;
                    return max;
                }),
                onAfterChange: () => {
                    frequencyMinControl.sync();
                },
            });
            controls.push(frequencyMaxControl);
            root.appendChild(frequencyMaxControl.element);

            const transitionControl = createSliderControl(doc, {
                label: '过渡延迟',
                description: '平滑相邻帧的能量变化，数值越大动画越柔和。',
                min: CLAMP_BOUNDS.transitionDelay.min,
                max: CLAMP_BOUNDS.transitionDelay.max,
                step: 0.05,
                precision: 2,
                suffix: 's',
                getValue: () => sanitizeTransitionDelay(getState().lyricVisualizerTransitionDelay),
                setValue: applyWithGuard(value => {
                    const sanitized = sanitizeTransitionDelay(value);
                    player.lyricVisualizerTransitionDelay = sanitized;
                    return sanitized;
                }),
            });
            controls.push(transitionControl);
            root.appendChild(transitionControl.element);

            const barCountControl = createSliderControl(doc, {
                label: '柱体数量',
                description: '调节频谱柱体的数量。',
                min: CLAMP_BOUNDS.barCount.min,
                max: CLAMP_BOUNDS.barCount.max,
                step: 1,
                suffix: ' 个',
                getValue: () => sanitizeBarCount(getState().lyricVisualizerBarCount),
                setValue: applyWithGuard(value => {
                    const sanitized = sanitizeBarCount(value);
                    player.lyricVisualizerBarCount = sanitized;
                    return sanitized;
                }),
            });
            controls.push(barCountControl);
            root.appendChild(barCountControl.element);

            const barWidthControl = createSliderControl(doc, {
                label: '柱体宽度',
                description: '控制柱体占位的宽度比例。',
                min: CLAMP_BOUNDS.barWidth.min,
                max: CLAMP_BOUNDS.barWidth.max,
                step: 1,
                suffix: '%',
                getValue: () => sanitizeBarWidth(getState().lyricVisualizerBarWidth),
                setValue: applyWithGuard(value => {
                    const sanitized = sanitizeBarWidth(value);
                    player.lyricVisualizerBarWidth = sanitized;
                    return sanitized;
                }),
            });
            controls.push(barWidthControl);
            root.appendChild(barWidthControl.element);

            const opacityControl = createSliderControl(doc, {
                label: '透明度',
                description: '调节可视化的整体透明度。',
                min: CLAMP_BOUNDS.opacity.min,
                max: CLAMP_BOUNDS.opacity.max,
                step: 1,
                suffix: '%',
                getValue: () => sanitizeOpacity(getState().lyricVisualizerOpacity),
                setValue: applyWithGuard(value => {
                    const sanitized = sanitizeOpacity(value);
                    player.lyricVisualizerOpacity = sanitized;
                    return sanitized;
                }),
            });
            controls.push(opacityControl);
            root.appendChild(opacityControl.element);

            const styleControl = createSelectControl(doc, {
                label: '显示样式',
                description: '在柱状条形与辐射圆环之间切换。',
                choices: STYLE_OPTIONS,
                getValue: () => sanitizeStyle(getState().lyricVisualizerStyle),
                setValue: applyWithGuard(value => {
                    const normalized = sanitizeStyle(value);
                    player.lyricVisualizerStyle = normalized;
                    updateRadialState();
                }),
            });
            controls.push(styleControl);
            root.appendChild(styleControl.element);

            const radialGroup = doc.createElement('div');
            radialGroup.className = 'hv-visualizer-radial-group';
            root.appendChild(radialGroup);

            const radialSizeControl = createSliderControl(doc, {
                label: '辐射尺寸',
                description: '调整圆环的整体尺寸。',
                min: CLAMP_BOUNDS.radialSize.min,
                max: CLAMP_BOUNDS.radialSize.max,
                step: 5,
                suffix: '%',
                getValue: () => sanitizeRadialSize(getState().lyricVisualizerRadialSize),
                setValue: applyWithGuard(value => {
                    const sanitized = sanitizeRadialSize(value);
                    player.lyricVisualizerRadialSize = sanitized;
                    return sanitized;
                }),
            });
            controls.push(radialSizeControl);
            radialGroup.appendChild(radialSizeControl.element);

            const radialOffsetXControl = createSliderControl(doc, {
                label: '横向偏移',
                description: '以百分比调整圆环中心的横向偏移。',
                min: CLAMP_BOUNDS.radialOffset.min,
                max: CLAMP_BOUNDS.radialOffset.max,
                step: 1,
                suffix: '%',
                getValue: () => sanitizeRadialOffset(getState().lyricVisualizerRadialOffsetX),
                setValue: applyWithGuard(value => {
                    const sanitized = sanitizeRadialOffset(value);
                    player.lyricVisualizerRadialOffsetX = sanitized;
                    return sanitized;
                }),
            });
            controls.push(radialOffsetXControl);
            radialGroup.appendChild(radialOffsetXControl.element);

            const radialOffsetYControl = createSliderControl(doc, {
                label: '纵向偏移',
                description: '以百分比调整圆环中心的纵向偏移。',
                min: CLAMP_BOUNDS.radialOffset.min,
                max: CLAMP_BOUNDS.radialOffset.max,
                step: 1,
                suffix: '%',
                getValue: () => sanitizeRadialOffset(getState().lyricVisualizerRadialOffsetY),
                setValue: applyWithGuard(value => {
                    const sanitized = sanitizeRadialOffset(value);
                    player.lyricVisualizerRadialOffsetY = sanitized;
                    return sanitized;
                }),
            });
            controls.push(radialOffsetYControl);
            radialGroup.appendChild(radialOffsetYControl.element);

            const radialCoreControl = createSliderControl(doc, {
                label: '中心占比',
                description: '控制圆环中心的空白区域大小。',
                min: CLAMP_BOUNDS.radialCoreSize.min,
                max: CLAMP_BOUNDS.radialCoreSize.max,
                step: 1,
                suffix: '%',
                getValue: () => sanitizeRadialCoreSize(getState().lyricVisualizerRadialCoreSize),
                setValue: applyWithGuard(value => {
                    const sanitized = sanitizeRadialCoreSize(value);
                    player.lyricVisualizerRadialCoreSize = sanitized;
                    return sanitized;
                }),
            });
            controls.push(radialCoreControl);
            radialGroup.appendChild(radialCoreControl.element);

            const colorControl = createColorControl(doc, {
                label: '主色调',
                description: '选择频谱的主颜色，支持主题色与自定义颜色。',
                getValue: () => normalizeColor(getState().lyricVisualizerColor),
                setValue: applyWithGuard(value => {
                    const normalized = normalizeColor(value);
                    player.lyricVisualizerColor = normalized;
                    return normalized;
                }),
            });
            controls.push(colorControl);
            root.appendChild(colorControl.element);

            const resetControl = createResetControl(doc, {
                onReset: () => {
                    isApplying = true;
                    try {
                        player.lyricVisualizerHeight = DEFAULTS.height;
                        player.lyricVisualizerFrequencyMin = DEFAULTS.frequencyMin;
                        player.lyricVisualizerFrequencyMax = DEFAULTS.frequencyMax;
                        player.lyricVisualizerTransitionDelay = DEFAULTS.transitionDelay;
                        player.lyricVisualizerBarCount = DEFAULTS.barCount;
                        player.lyricVisualizerBarWidth = DEFAULTS.barWidth;
                        player.lyricVisualizerColor = DEFAULTS.color;
                        player.lyricVisualizerOpacity = DEFAULTS.opacity;
                        player.lyricVisualizerStyle = DEFAULTS.style;
                        player.lyricVisualizerRadialSize = DEFAULTS.radialSize;
                        player.lyricVisualizerRadialOffsetX = DEFAULTS.radialOffsetX;
                        player.lyricVisualizerRadialOffsetY = DEFAULTS.radialOffsetY;
                        player.lyricVisualizerRadialCoreSize = DEFAULTS.radialCoreSize;
                    } finally {
                        isApplying = false;
                        syncAll();
                    }
                    if (context?.utils?.notice) {
                        context.utils.notice('已恢复歌词可视化默认设置');
                    }
                },
            });
            controls.push(resetControl);
            root.appendChild(resetControl.element);

            function updateRadialState() {
                const styleValue = sanitizeStyle(getState().lyricVisualizerStyle);
                if (styleValue === 'radial') {
                    radialGroup.classList.remove('hv-visualizer-radial-disabled');
                } else {
                    radialGroup.classList.add('hv-visualizer-radial-disabled');
                }
            }

            const stop = typeof player.$subscribe === 'function'
                ? player.$subscribe(() => {
                      if (!isApplying) {
                          syncAll();
                      }
                  })
                : null;

            syncAll();

            return () => {
                if (stop) stop();
                if (style && style.parentNode) {
                    style.parentNode.removeChild(style);
                }
                container.innerHTML = '';
            };
        },
    };
}

export default function activate(context) {
    const cleanups = [];
    let disposed = false;
    let playerStore = ensurePlayerStore(context);

    const teardown = () => {
        for (const cleanup of cleanups.splice(0)) {
            try {
                cleanup();
            } catch (error) {
                console.error('[LyricVisualizer] 清理失败:', error);
            }
        }
        if (playerStore) {
            try {
                playerStore.lyricVisualizerPluginActive = false;
                playerStore.lyricVisualizerToggleAvailable = false;
            } catch (error) {
                console.warn('[LyricVisualizer] 无法重置播放器状态:', error);
            }
        }
    };

    const initializeWithStore = (store) => {
        if (!store || disposed) return;
        playerStore = store;
        try {
            sanitizeInitialState(store);
            store.lyricVisualizerPluginActive = true;
            store.lyricVisualizerToggleAvailable = true;
            if (!store.lyricVisualizerHasAutoEnabled) {
                store.lyricVisualizer = true;
                store.lyricVisualizerHasAutoEnabled = true;
            }
        } catch (error) {
            console.warn('[LyricVisualizer] 初始化状态失败:', error);
        }

        const settingsPage = buildSettingsPage(context, store);
        let unregister = null;
        try {
            unregister = context.settings.register(settingsPage);
        } catch (error) {
            console.error('[LyricVisualizer] 注册设置页面失败:', error);
        }
        if (typeof unregister === 'function') {
            cleanups.push(() => {
                try {
                    unregister();
                } catch (error) {
                    console.error('[LyricVisualizer] 注销设置页面失败:', error);
                }
            });
        }
    };

    if (!playerStore) {
        const attemptResolve = () => {
            if (disposed) return;
            const resolved = ensurePlayerStore(context);
            if (resolved) {
                initializeWithStore(resolved);
            } else {
                setTimeout(attemptResolve, 200);
            }
        };
        attemptResolve();
    } else {
        initializeWithStore(playerStore);
    }

    return {
        deactivate() {
            disposed = true;
            teardown();
        },
    };
}
