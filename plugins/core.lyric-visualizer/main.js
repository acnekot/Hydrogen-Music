const DEFAULTS = Object.freeze({
    enabled: true,
    height: 220,
    frequencyMin: 20,
    frequencyMax: 8000,
    transitionDelay: 0.75,
    barCount: 48,
    barWidth: 55,
    color: 'auto',
    opacity: 100,
    style: 'bars',
    radialSize: 100,
    radialOffsetX: 0,
    radialOffsetY: 0,
    radialCoreSize: 62,
});

const PRESETS = Object.freeze({
    height: [160, 180, 200, 220, 260, 320],
    frequencyMin: [20, 40, 80, 120, 200],
    frequencyMax: [4000, 6000, 8000, 12000, 16000],
    transitionDelay: [0, 0.25, 0.5, 0.75, 0.9],
    barCount: [24, 32, 48, 64, 96],
    barWidth: [35, 45, 55, 65, 75],
    opacity: [20, 40, 60, 80, 100],
    radialSize: [60, 80, 100, 120, 160],
    radialOffset: [-50, -25, 0, 25, 50],
    radialCoreSize: [40, 52, 62, 72, 84],
});

const sanitizeStyle = value => (value === 'radial' ? 'radial' : 'bars');

const sanitizeColor = (value, fallback = DEFAULTS.color) => {
    if (value === 'auto' || value === 'white' || value === 'black') return value;
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim().toLowerCase();
    if (/^#([0-9a-f]{6})$/.test(trimmed)) return trimmed;
    if (/^#([0-9a-f]{3})$/.test(trimmed)) {
        return `#${trimmed
            .slice(1)
            .split('')
            .map(ch => ch + ch)
            .join('')}`;
    }
    if (/^([0-9a-f]{6})$/.test(trimmed)) return `#${trimmed}`;
    if (/^([0-9a-f]{3})$/.test(trimmed)) {
        return `#${trimmed
            .split('')
            .map(ch => ch + ch)
            .join('')}`;
    }
    return fallback;
};

const sanitizeNumber = (value, { min, max, fallback, allowFloat = false }) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    if (numeric < min || numeric > max) return fallback;
    return allowFloat ? Math.round(numeric * 100) / 100 : Math.round(numeric);
};

const parseNumberInput = (raw, { min, max, allowFloat = false }) => {
    if (raw == null) return null;
    const trimmed = String(raw).trim();
    if (!trimmed.length) return null;
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) return null;
    if (numeric < min || numeric > max) return null;
    return allowFloat ? Math.round(numeric * 100) / 100 : Math.round(numeric);
};

const sanitizeState = state => {
    const sanitized = { ...state };
    sanitized.lyricVisualizer = Boolean(state.lyricVisualizer ?? DEFAULTS.enabled);
    sanitized.lyricVisualizerHeight = sanitizeNumber(state.lyricVisualizerHeight ?? DEFAULTS.height, {
        min: 80,
        max: 600,
        fallback: DEFAULTS.height,
    });
    sanitized.lyricVisualizerFrequencyMin = sanitizeNumber(state.lyricVisualizerFrequencyMin ?? DEFAULTS.frequencyMin, {
        min: 20,
        max: 19990,
        fallback: DEFAULTS.frequencyMin,
    });
    sanitized.lyricVisualizerFrequencyMax = sanitizeNumber(state.lyricVisualizerFrequencyMax ?? DEFAULTS.frequencyMax, {
        min: 30,
        max: 20000,
        fallback: DEFAULTS.frequencyMax,
    });
    if (sanitized.lyricVisualizerFrequencyMin >= sanitized.lyricVisualizerFrequencyMax) {
        sanitized.lyricVisualizerFrequencyMin = Math.max(20, sanitized.lyricVisualizerFrequencyMax - 10);
        sanitized.lyricVisualizerFrequencyMax = Math.min(20000, sanitized.lyricVisualizerFrequencyMin + 10);
    }
    sanitized.lyricVisualizerTransitionDelay = sanitizeNumber(state.lyricVisualizerTransitionDelay ?? DEFAULTS.transitionDelay, {
        min: 0,
        max: 0.95,
        fallback: DEFAULTS.transitionDelay,
        allowFloat: true,
    });
    sanitized.lyricVisualizerBarCount = sanitizeNumber(state.lyricVisualizerBarCount ?? DEFAULTS.barCount, {
        min: 1,
        max: 256,
        fallback: DEFAULTS.barCount,
    });
    sanitized.lyricVisualizerBarWidth = sanitizeNumber(state.lyricVisualizerBarWidth ?? DEFAULTS.barWidth, {
        min: 5,
        max: 100,
        fallback: DEFAULTS.barWidth,
    });
    sanitized.lyricVisualizerOpacity = sanitizeNumber(state.lyricVisualizerOpacity ?? DEFAULTS.opacity, {
        min: 0,
        max: 100,
        fallback: DEFAULTS.opacity,
    });
    sanitized.lyricVisualizerStyle = sanitizeStyle(state.lyricVisualizerStyle ?? DEFAULTS.style);
    sanitized.lyricVisualizerRadialSize = sanitizeNumber(state.lyricVisualizerRadialSize ?? DEFAULTS.radialSize, {
        min: 10,
        max: 400,
        fallback: DEFAULTS.radialSize,
    });
    sanitized.lyricVisualizerRadialOffsetX = sanitizeNumber(state.lyricVisualizerRadialOffsetX ?? DEFAULTS.radialOffsetX, {
        min: -100,
        max: 100,
        fallback: DEFAULTS.radialOffsetX,
    });
    sanitized.lyricVisualizerRadialOffsetY = sanitizeNumber(state.lyricVisualizerRadialOffsetY ?? DEFAULTS.radialOffsetY, {
        min: -100,
        max: 100,
        fallback: DEFAULTS.radialOffsetY,
    });
    sanitized.lyricVisualizerRadialCoreSize = sanitizeNumber(state.lyricVisualizerRadialCoreSize ?? DEFAULTS.radialCoreSize, {
        min: 10,
        max: 95,
        fallback: DEFAULTS.radialCoreSize,
    });
    sanitized.lyricVisualizerColor = sanitizeColor(state.lyricVisualizerColor ?? DEFAULTS.color, DEFAULTS.color);
    return sanitized;
};

const createElement = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (typeof text === 'string') el.textContent = text;
    return el;
};

const attach = (target, event, handler, disposers) => {
    target.addEventListener(event, handler);
    disposers.push(() => target.removeEventListener(event, handler));
};

const numberLabel = (value, suffix, isDefault) => {
    const label = suffix ? `${value}${suffix}` : `${value}`;
    return isDefault ? `${label}（默认）` : label;
};

const floatLabel = (value, isDefault) => {
    const label = `${Math.round(Number(value) * 100) / 100}`;
    return isDefault ? `${label}（默认）` : label;
};

const ensureOptions = (initialValues, defaultValue) => {
    const set = new Set(initialValues.map(Number).filter(Number.isFinite));
    if (!set.has(defaultValue)) set.add(defaultValue);
    return set;
};

const createChoiceField = ({
    title,
    description,
    presetKey,
    defaultValue,
    formatter,
    parse,
    getValue,
    setValue,
    onReset,
}) => {
    const field = createElement('section', 'hm-visualizer-field');
    const info = createElement('div', 'hm-visualizer-field-info');
    info.appendChild(createElement('h3', 'hm-visualizer-field-title', title));
    if (description) info.appendChild(createElement('p', 'hm-visualizer-field-desc', description));
    field.appendChild(info);

    const controls = createElement('div', 'hm-visualizer-field-controls');
    const select = createElement('select', 'hm-visualizer-select');
    controls.appendChild(select);

    const actions = createElement('div', 'hm-visualizer-actions');
    const input = createElement('input', 'hm-visualizer-input');
    input.type = 'text';
    input.placeholder = String(defaultValue);
    const addButton = createElement('button', 'hm-visualizer-button');
    addButton.textContent = '添加';
    const resetButton = createElement('button', 'hm-visualizer-button');
    resetButton.textContent = '重置';
    actions.appendChild(input);
    actions.appendChild(addButton);
    actions.appendChild(resetButton);
    controls.appendChild(actions);
    field.appendChild(controls);

    const optionSet = ensureOptions(presetKey ? PRESETS[presetKey] || [] : [], defaultValue);
    const disposers = [];

    const rebuildSelect = () => {
        const values = Array.from(optionSet).sort((a, b) => a - b);
        select.innerHTML = '';
        values.forEach(value => {
            const option = document.createElement('option');
            option.value = String(value);
            option.textContent = formatter(value, value === defaultValue);
            select.appendChild(option);
        });
    };

    const syncSelectValue = () => {
        const current = getValue();
        if (!optionSet.has(current)) {
            optionSet.add(current);
            rebuildSelect();
        }
        select.value = String(current);
    };

    const updateButtonState = () => {
        const parsed = parse(input.value);
        if (parsed == null) {
            addButton.disabled = true;
            addButton.textContent = '添加';
            return;
        }
        addButton.disabled = false;
        addButton.textContent = optionSet.has(parsed) ? '删除' : '添加';
    };

    rebuildSelect();
    syncSelectValue();
    updateButtonState();

    attach(select, 'change', () => {
        const parsed = parse(select.value);
        if (parsed != null) {
            setValue(parsed);
        }
        syncSelectValue();
    }, disposers);

    attach(addButton, 'click', () => {
        const parsed = parse(input.value);
        if (parsed == null) return;
        if (optionSet.has(parsed)) {
            if (parsed === defaultValue) return;
            optionSet.delete(parsed);
            if (getValue() === parsed) {
                setValue(defaultValue);
            }
        } else {
            optionSet.add(parsed);
            setValue(parsed);
        }
        input.value = '';
        rebuildSelect();
        syncSelectValue();
        updateButtonState();
    }, disposers);

    attach(resetButton, 'click', () => {
        onReset();
        syncSelectValue();
        updateButtonState();
    }, disposers);

    attach(input, 'input', updateButtonState, disposers);

    return {
        element: field,
        sync() {
            syncSelectValue();
            updateButtonState();
        },
        dispose() {
            while (disposers.length) {
                const fn = disposers.pop();
                try {
                    fn();
                } catch (error) {
                    console.error('[LyricVisualizerPlugin] failed to remove listener', error);
                }
            }
        },
    };
};

const createToggleField = (label, getValue, setValue) => {
    const field = createElement('section', 'hm-visualizer-field');
    const info = createElement('div', 'hm-visualizer-field-info');
    info.appendChild(createElement('h3', 'hm-visualizer-field-title', label));
    field.appendChild(info);
    const controls = createElement('div', 'hm-visualizer-field-controls');
    const toggle = createElement('label', 'hm-visualizer-switch');
    const checkbox = createElement('input');
    checkbox.type = 'checkbox';
    const indicator = createElement('span', 'hm-visualizer-switch-indicator');
    toggle.appendChild(checkbox);
    toggle.appendChild(indicator);
    controls.appendChild(toggle);
    field.appendChild(controls);
    const disposers = [];

    const sync = () => {
        checkbox.checked = Boolean(getValue());
    };

    attach(checkbox, 'change', () => {
        setValue(Boolean(checkbox.checked));
        sync();
    }, disposers);

    sync();

    return {
        element: field,
        sync,
        dispose() {
            while (disposers.length) {
                const fn = disposers.pop();
                fn();
            }
        },
    };
};

const createStyleField = (getValue, setValue) => {
    const field = createElement('section', 'hm-visualizer-field');
    const info = createElement('div', 'hm-visualizer-field-info');
    info.appendChild(createElement('h3', 'hm-visualizer-field-title', '显示样式'));
    field.appendChild(info);
    const controls = createElement('div', 'hm-visualizer-field-controls');
    const select = createElement('select', 'hm-visualizer-select');
    [
        { value: 'bars', label: '柱状频谱' },
        { value: 'radial', label: '辐射光束' },
    ].forEach(option => {
        const node = createElement('option');
        node.value = option.value;
        node.textContent = option.label;
        select.appendChild(node);
    });
    controls.appendChild(select);
    field.appendChild(controls);
    const disposers = [];

    const sync = () => {
        select.value = sanitizeStyle(getValue());
        field.dataset.mode = select.value;
    };

    attach(select, 'change', () => {
        setValue(sanitizeStyle(select.value));
        sync();
    }, disposers);

    sync();

    return {
        element: field,
        sync,
        dispose() {
            while (disposers.length) {
                const fn = disposers.pop();
                fn();
            }
        },
    };
};

const createColorField = (getValue, setValue) => {
    const field = createElement('section', 'hm-visualizer-field');
    const info = createElement('div', 'hm-visualizer-field-info');
    info.appendChild(createElement('h3', 'hm-visualizer-field-title', '颜色模式'));
    info.appendChild(createElement('p', 'hm-visualizer-field-desc', '自动跟随主题或指定自定义颜色'));
    field.appendChild(info);
    const controls = createElement('div', 'hm-visualizer-field-controls');
    const select = createElement('select', 'hm-visualizer-select');
    [
        { value: 'auto', label: '自动' },
        { value: 'white', label: '白色' },
        { value: 'black', label: '黑色' },
        { value: 'custom', label: '自定义' },
    ].forEach(option => {
        const node = createElement('option');
        node.value = option.value;
        node.textContent = option.label;
        select.appendChild(node);
    });
    const actions = createElement('div', 'hm-visualizer-actions');
    const textInput = createElement('input', 'hm-visualizer-input');
    textInput.type = 'text';
    textInput.placeholder = '#66aaff';
    const colorInput = createElement('input', 'hm-visualizer-color');
    colorInput.type = 'color';
    const applyButton = createElement('button', 'hm-visualizer-button');
    applyButton.textContent = '应用';
    actions.appendChild(textInput);
    actions.appendChild(colorInput);
    actions.appendChild(applyButton);
    controls.appendChild(select);
    controls.appendChild(actions);
    field.appendChild(controls);
    const disposers = [];

    const sync = () => {
        const current = getValue();
        if (current === 'auto' || current === 'white' || current === 'black') {
            select.value = current;
            actions.hidden = true;
        } else {
            select.value = 'custom';
            actions.hidden = false;
            textInput.value = current;
            if (/^#([0-9a-f]{6})$/i.test(current)) {
                colorInput.value = current;
            }
        }
    };

    attach(select, 'change', () => {
        const mode = select.value;
        if (mode === 'auto' || mode === 'white' || mode === 'black') {
            actions.hidden = true;
            setValue(mode);
        } else {
            actions.hidden = false;
        }
        sync();
    }, disposers);

    attach(colorInput, 'input', () => {
        textInput.value = colorInput.value;
    }, disposers);

    attach(applyButton, 'click', () => {
        const value = sanitizeColor(textInput.value, getValue());
        setValue(value);
        sync();
    }, disposers);

    sync();

    return {
        element: field,
        sync,
        dispose() {
            while (disposers.length) {
                const fn = disposers.pop();
                fn();
            }
        },
    };
};

const registerSettings = (context, store) => {
    if (!context?.settings || typeof context.settings.register !== 'function') return null;

    return context.settings.register({
        id: 'core.lyric-visualizer.settings',
        title: '歌词可视化',
        subtitle: '自定义歌词区域可视化效果',
        mount(container) {
            container.innerHTML = '';
            const disposers = [];

            const style = createElement('style');
            style.textContent = `
.hm-visualizer-settings {
    position: relative;
    padding: 32px 36px 44px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    color: var(--settings-shell-text, var(--text, #111));
}
.hm-visualizer-settings::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 24px;
    background: var(--settings-shell-surface, var(--panel, rgba(255,255,255,0.92)));
    border: 1px solid var(--settings-shell-border, rgba(0,0,0,0.12));
    opacity: 0.96;
    z-index: -1;
}
.dark .hm-visualizer-settings::before {
    background: var(--settings-shell-surface, rgba(32,36,46,0.9));
    border-color: var(--settings-shell-border, rgba(255,255,255,0.18));
}
.hm-visualizer-field {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    padding: 18px 20px;
    border-radius: 12px;
    border: 1px solid var(--settings-shell-border, rgba(0,0,0,0.12));
    background: var(--settings-shell-surface, rgba(255,255,255,0.85));
    align-items: center;
}
.dark .hm-visualizer-field {
    background: var(--settings-shell-surface, rgba(44,48,58,0.88));
}
.hm-visualizer-field-info {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.hm-visualizer-field-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
}
.hm-visualizer-field-desc {
    margin: 0;
    font-size: 13px;
    opacity: 0.72;
}
.hm-visualizer-field-controls {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
    min-width: 240px;
}
.hm-visualizer-select {
    width: 200px;
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid var(--settings-shell-border, rgba(0,0,0,0.12));
    background: var(--settings-shell-input-bg, rgba(255,255,255,0.94));
    color: inherit;
}
.hm-visualizer-input {
    width: 120px;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid var(--settings-shell-border, rgba(0,0,0,0.12));
    background: var(--settings-shell-input-bg, rgba(255,255,255,0.94));
    color: inherit;
}
.hm-visualizer-color {
    width: 48px;
    height: 32px;
    border: none;
    background: transparent;
}
.hm-visualizer-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}
.hm-visualizer-button {
    padding: 6px 14px;
    border-radius: 6px;
    border: 1px solid var(--settings-shell-border, rgba(0,0,0,0.12));
    background: var(--settings-shell-button-bg, rgba(255,255,255,0.88));
    cursor: pointer;
}
.hm-visualizer-button[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
}
.hm-visualizer-switch {
    position: relative;
    width: 46px;
    height: 24px;
    border-radius: 12px;
    background: rgba(120,128,140,0.35);
    display: inline-flex;
    align-items: center;
    padding: 2px;
    cursor: pointer;
}
.hm-visualizer-switch input {
    opacity: 0;
    position: absolute;
    inset: 0;
    cursor: pointer;
}
.hm-visualizer-switch-indicator {
    width: 20px;
    height: 20px;
    border-radius: 8px;
    background: var(--settings-shell-button-bg, #fff);
    transition: transform 0.2s ease, background 0.2s ease;
}
.hm-visualizer-switch input:checked + .hm-visualizer-switch-indicator {
    transform: translateX(22px);
    background: var(--settings-shell-accent, #4c6edb);
}
.hm-visualizer-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}
.hm-visualizer-footer button {
    padding: 8px 18px;
    border-radius: 6px;
    border: 1px solid var(--settings-shell-border, rgba(0,0,0,0.12));
    background: var(--settings-shell-button-bg, rgba(255,255,255,0.88));
    cursor: pointer;
}
`;
            container.appendChild(style);

            const root = createElement('div', 'hm-visualizer-settings');
            container.appendChild(root);

            const applySanitized = () => {
                const sanitized = sanitizeState(store);
                Object.entries(sanitized).forEach(([key, value]) => {
                    if (key in store && store[key] !== value) {
                        store[key] = value;
                    }
                });
            };

            const fields = [];

            const pushField = field => {
                fields.push(field);
                root.appendChild(field.element);
            };

            pushField(
                createToggleField('启用可视化', () => store.lyricVisualizer, value => {
                    store.lyricVisualizer = Boolean(value);
                }),
            );

            pushField(
                createStyleField(
                    () => store.lyricVisualizerStyle,
                    value => {
                        store.lyricVisualizerStyle = sanitizeStyle(value);
                    },
                ),
            );

            const numericField = (options) => pushField(createChoiceField(options));

            numericField({
                title: '高度',
                description: '歌词面板中可视化的高度（像素）',
                presetKey: 'height',
                defaultValue: DEFAULTS.height,
                formatter: (value, isDefault) => numberLabel(value, 'px', isDefault),
                parse: raw => parseNumberInput(raw, { min: 80, max: 600 }),
                getValue: () => store.lyricVisualizerHeight,
                setValue: value => {
                    store.lyricVisualizerHeight = sanitizeNumber(value, { min: 80, max: 600, fallback: DEFAULTS.height });
                },
                onReset: () => {
                    store.lyricVisualizerHeight = DEFAULTS.height;
                },
            });

            numericField({
                title: '频率下限',
                description: '最小采样频率（Hz）',
                presetKey: 'frequencyMin',
                defaultValue: DEFAULTS.frequencyMin,
                formatter: (value, isDefault) => numberLabel(value, 'Hz', isDefault),
                parse: raw => parseNumberInput(raw, { min: 20, max: 19990 }),
                getValue: () => store.lyricVisualizerFrequencyMin,
                setValue: value => {
                    const sanitized = sanitizeState({
                        lyricVisualizerFrequencyMin: value,
                        lyricVisualizerFrequencyMax: store.lyricVisualizerFrequencyMax,
                    });
                    store.lyricVisualizerFrequencyMin = sanitized.lyricVisualizerFrequencyMin;
                    store.lyricVisualizerFrequencyMax = sanitized.lyricVisualizerFrequencyMax;
                },
                onReset: () => {
                    store.lyricVisualizerFrequencyMin = DEFAULTS.frequencyMin;
                    store.lyricVisualizerFrequencyMax = DEFAULTS.frequencyMax;
                },
            });

            numericField({
                title: '频率上限',
                description: '最大采样频率（Hz）',
                presetKey: 'frequencyMax',
                defaultValue: DEFAULTS.frequencyMax,
                formatter: (value, isDefault) => numberLabel(value, 'Hz', isDefault),
                parse: raw => parseNumberInput(raw, { min: 30, max: 20000 }),
                getValue: () => store.lyricVisualizerFrequencyMax,
                setValue: value => {
                    const sanitized = sanitizeState({
                        lyricVisualizerFrequencyMin: store.lyricVisualizerFrequencyMin,
                        lyricVisualizerFrequencyMax: value,
                    });
                    store.lyricVisualizerFrequencyMin = sanitized.lyricVisualizerFrequencyMin;
                    store.lyricVisualizerFrequencyMax = sanitized.lyricVisualizerFrequencyMax;
                },
                onReset: () => {
                    store.lyricVisualizerFrequencyMin = DEFAULTS.frequencyMin;
                    store.lyricVisualizerFrequencyMax = DEFAULTS.frequencyMax;
                },
            });

            numericField({
                title: '过渡延迟',
                description: '更高的数值会让动画更平滑',
                presetKey: 'transitionDelay',
                defaultValue: DEFAULTS.transitionDelay,
                formatter: (value, isDefault) => floatLabel(value, isDefault),
                parse: raw => parseNumberInput(raw, { min: 0, max: 0.95, allowFloat: true }),
                getValue: () => store.lyricVisualizerTransitionDelay,
                setValue: value => {
                    store.lyricVisualizerTransitionDelay = sanitizeNumber(value, {
                        min: 0,
                        max: 0.95,
                        fallback: DEFAULTS.transitionDelay,
                        allowFloat: true,
                    });
                },
                onReset: () => {
                    store.lyricVisualizerTransitionDelay = DEFAULTS.transitionDelay;
                },
            });

            numericField({
                title: '柱体数量',
                description: '频谱柱体的数量',
                presetKey: 'barCount',
                defaultValue: DEFAULTS.barCount,
                formatter: (value, isDefault) => numberLabel(value, '个', isDefault),
                parse: raw => parseNumberInput(raw, { min: 1, max: 256 }),
                getValue: () => store.lyricVisualizerBarCount,
                setValue: value => {
                    store.lyricVisualizerBarCount = sanitizeNumber(value, {
                        min: 1,
                        max: 256,
                        fallback: DEFAULTS.barCount,
                    });
                },
                onReset: () => {
                    store.lyricVisualizerBarCount = DEFAULTS.barCount;
                },
            });

            numericField({
                title: '柱体宽度',
                description: '柱体宽度百分比',
                presetKey: 'barWidth',
                defaultValue: DEFAULTS.barWidth,
                formatter: (value, isDefault) => numberLabel(value, '%', isDefault),
                parse: raw => parseNumberInput(raw, { min: 5, max: 100 }),
                getValue: () => store.lyricVisualizerBarWidth,
                setValue: value => {
                    store.lyricVisualizerBarWidth = sanitizeNumber(value, {
                        min: 5,
                        max: 100,
                        fallback: DEFAULTS.barWidth,
                    });
                },
                onReset: () => {
                    store.lyricVisualizerBarWidth = DEFAULTS.barWidth;
                },
            });

            numericField({
                title: '透明度',
                description: '可视化整体透明度',
                presetKey: 'opacity',
                defaultValue: DEFAULTS.opacity,
                formatter: (value, isDefault) => numberLabel(value, '%', isDefault),
                parse: raw => parseNumberInput(raw, { min: 0, max: 100 }),
                getValue: () => store.lyricVisualizerOpacity,
                setValue: value => {
                    store.lyricVisualizerOpacity = sanitizeNumber(value, {
                        min: 0,
                        max: 100,
                        fallback: DEFAULTS.opacity,
                    });
                },
                onReset: () => {
                    store.lyricVisualizerOpacity = DEFAULTS.opacity;
                },
            });

            numericField({
                title: '辐射尺寸',
                description: '辐射样式的整体尺寸',
                presetKey: 'radialSize',
                defaultValue: DEFAULTS.radialSize,
                formatter: (value, isDefault) => numberLabel(value, '%', isDefault),
                parse: raw => parseNumberInput(raw, { min: 10, max: 400 }),
                getValue: () => store.lyricVisualizerRadialSize,
                setValue: value => {
                    store.lyricVisualizerRadialSize = sanitizeNumber(value, {
                        min: 10,
                        max: 400,
                        fallback: DEFAULTS.radialSize,
                    });
                },
                onReset: () => {
                    store.lyricVisualizerRadialSize = DEFAULTS.radialSize;
                },
            });

            numericField({
                title: '水平偏移',
                description: '辐射中心的水平偏移',
                presetKey: 'radialOffset',
                defaultValue: DEFAULTS.radialOffsetX,
                formatter: (value, isDefault) => numberLabel(value, '%', isDefault),
                parse: raw => parseNumberInput(raw, { min: -100, max: 100 }),
                getValue: () => store.lyricVisualizerRadialOffsetX,
                setValue: value => {
                    store.lyricVisualizerRadialOffsetX = sanitizeNumber(value, {
                        min: -100,
                        max: 100,
                        fallback: DEFAULTS.radialOffsetX,
                    });
                },
                onReset: () => {
                    store.lyricVisualizerRadialOffsetX = DEFAULTS.radialOffsetX;
                },
            });

            numericField({
                title: '垂直偏移',
                description: '辐射中心的垂直偏移',
                presetKey: 'radialOffset',
                defaultValue: DEFAULTS.radialOffsetY,
                formatter: (value, isDefault) => numberLabel(value, '%', isDefault),
                parse: raw => parseNumberInput(raw, { min: -100, max: 100 }),
                getValue: () => store.lyricVisualizerRadialOffsetY,
                setValue: value => {
                    store.lyricVisualizerRadialOffsetY = sanitizeNumber(value, {
                        min: -100,
                        max: 100,
                        fallback: DEFAULTS.radialOffsetY,
                    });
                },
                onReset: () => {
                    store.lyricVisualizerRadialOffsetY = DEFAULTS.radialOffsetY;
                },
            });

            numericField({
                title: '中心比例',
                description: '辐射样式中心圆占比',
                presetKey: 'radialCoreSize',
                defaultValue: DEFAULTS.radialCoreSize,
                formatter: (value, isDefault) => numberLabel(value, '%', isDefault),
                parse: raw => parseNumberInput(raw, { min: 10, max: 95 }),
                getValue: () => store.lyricVisualizerRadialCoreSize,
                setValue: value => {
                    store.lyricVisualizerRadialCoreSize = sanitizeNumber(value, {
                        min: 10,
                        max: 95,
                        fallback: DEFAULTS.radialCoreSize,
                    });
                },
                onReset: () => {
                    store.lyricVisualizerRadialCoreSize = DEFAULTS.radialCoreSize;
                },
            });

            pushField(
                createColorField(
                    () => store.lyricVisualizerColor,
                    value => {
                        store.lyricVisualizerColor = sanitizeColor(value, DEFAULTS.color);
                    },
                ),
            );

            const footer = createElement('div', 'hm-visualizer-footer');
            const resetButton = createElement('button', null, '恢复默认');
            footer.appendChild(resetButton);
            root.appendChild(footer);

            attach(resetButton, 'click', () => {
                store.lyricVisualizer = DEFAULTS.enabled;
                store.lyricVisualizerHeight = DEFAULTS.height;
                store.lyricVisualizerFrequencyMin = DEFAULTS.frequencyMin;
                store.lyricVisualizerFrequencyMax = DEFAULTS.frequencyMax;
                store.lyricVisualizerTransitionDelay = DEFAULTS.transitionDelay;
                store.lyricVisualizerBarCount = DEFAULTS.barCount;
                store.lyricVisualizerBarWidth = DEFAULTS.barWidth;
                store.lyricVisualizerOpacity = DEFAULTS.opacity;
                store.lyricVisualizerStyle = DEFAULTS.style;
                store.lyricVisualizerRadialSize = DEFAULTS.radialSize;
                store.lyricVisualizerRadialOffsetX = DEFAULTS.radialOffsetX;
                store.lyricVisualizerRadialOffsetY = DEFAULTS.radialOffsetY;
                store.lyricVisualizerRadialCoreSize = DEFAULTS.radialCoreSize;
                store.lyricVisualizerColor = DEFAULTS.color;
                applySanitized();
                fields.forEach(field => field.sync());
                context.utils?.notice?.('已恢复歌词可视化默认设置', 2);
            }, disposers);

            applySanitized();
            fields.forEach(field => field.sync());

            const unsubscribe = typeof store.$subscribe === 'function'
                ? store.$subscribe(() => {
                      applySanitized();
                      fields.forEach(field => field.sync());
                  })
                : null;
            if (unsubscribe) {
                disposers.push(() => unsubscribe());
            }

            return () => {
                fields.forEach(field => field.dispose());
                while (disposers.length) {
                    const fn = disposers.pop();
                    fn();
                }
                container.innerHTML = '';
            };
        },
    });
};

module.exports = {
    activate(context) {
        const store = context?.stores?.player;
        if (!store) {
            console.error('[LyricVisualizerPlugin] 无法访问播放器状态');
            return;
        }

        const applySanitized = () => {
            const sanitized = sanitizeState(store);
            Object.entries(sanitized).forEach(([key, value]) => {
                if (key in store && store[key] !== value) {
                    store[key] = value;
                }
            });
        };

        applySanitized();

        if (!store.lyricVisualizerHasAutoEnabled && !store.lyricVisualizer) {
            store.lyricVisualizer = DEFAULTS.enabled;
            store.lyricVisualizerHasAutoEnabled = true;
        } else if (store.lyricVisualizer) {
            store.lyricVisualizerHasAutoEnabled = true;
        }

        store.lyricVisualizerPluginActive = true;
        store.lyricVisualizerToggleAvailable = true;

        const unregisterSettings = registerSettings(context, store);
        if (typeof unregisterSettings === 'function') {
            context.onCleanup(unregisterSettings);
        }

        const unsubscribe = typeof store.$subscribe === 'function'
            ? store.$subscribe(() => {
                  applySanitized();
              })
            : null;
        if (unsubscribe) {
            context.onCleanup(() => unsubscribe());
        }

        context.onCleanup(() => {
            try {
                store.lyricVisualizerPluginActive = false;
                store.lyricVisualizerToggleAvailable = false;
                store.lyricVisualizerHasAutoEnabled = false;
                store.lyricVisualizer = false;
            } catch (error) {
                console.error('[LyricVisualizerPlugin] 清理状态失败', error);
            }
        });

        context.utils?.notice?.('歌词可视化插件已启用', 2.5);
    },
};

