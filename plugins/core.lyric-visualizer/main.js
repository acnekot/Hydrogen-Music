const DEFAULTS = Object.freeze({
    lyricVisualizer: false,
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

const clampNumber = (value, min, max, fallback = min) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    if (numeric < min) return min;
    if (numeric > max) return max;
    return numeric;
};

const sanitizeHeight = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return DEFAULTS.height;
    return clampNumber(Math.round(numeric), 80, 600, DEFAULTS.height);
};

const sanitizeFrequency = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return DEFAULTS.frequencyMin;
    return clampNumber(Math.round(numeric), 20, 20000, DEFAULTS.frequencyMin);
};

const sanitizeFrequencyRange = (minValue, maxValue) => {
    let min = sanitizeFrequency(minValue);
    let max = sanitizeFrequency(maxValue);
    if (min >= max) {
        if (min >= 19990) {
            min = 19990;
            max = 20000;
        } else {
            max = Math.min(20000, min + 10);
        }
    }
    if (max - min < 10) {
        if (min >= 19990) {
            min = 19990;
            max = 20000;
        } else {
            max = Math.min(20000, min + 10);
        }
    }
    return { min, max };
};

const sanitizeBarCount = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return DEFAULTS.barCount;
    return Math.max(1, Math.round(numeric));
};

const sanitizeBarWidth = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return DEFAULTS.barWidth;
    return clampNumber(Math.round(numeric), 5, 100, DEFAULTS.barWidth);
};

const sanitizeTransitionDelay = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return DEFAULTS.transitionDelay;
    return Math.round(clampNumber(numeric, 0, 0.95, DEFAULTS.transitionDelay) * 100) / 100;
};

const sanitizeOpacity = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return DEFAULTS.opacity;
    return clampNumber(Math.round(numeric), 0, 100, DEFAULTS.opacity);
};

const sanitizeStyle = value => (value === 'radial' ? 'radial' : 'bars');

const sanitizeRadialSize = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return DEFAULTS.radialSize;
    return clampNumber(Math.round(numeric), 10, 400, DEFAULTS.radialSize);
};

const sanitizeRadialOffset = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return clampNumber(Math.round(numeric), -100, 100, 0);
};

const sanitizeRadialCoreSize = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return DEFAULTS.radialCoreSize;
    return clampNumber(Math.round(numeric), 10, 95, DEFAULTS.radialCoreSize);
};

const sanitizeColor = (value, fallback = DEFAULTS.color) => {
    if (value === 'auto' || value === 'black' || value === 'white') return value;
    if (typeof value === 'string') {
        const trimmed = value.trim().toLowerCase();
        if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(trimmed)) {
            if (trimmed.length === 4) {
                const expanded = trimmed
                    .split('')
                    .map((ch, index) => (index === 0 ? ch : ch + ch))
                    .join('');
                return expanded;
            }
            return trimmed;
        }
        const hexCandidate = trimmed.replace(/^#/, '');
        if (/^([0-9a-f]{3}|[0-9a-f]{6})$/.test(hexCandidate)) {
            if (hexCandidate.length === 3) {
                return `#${hexCandidate
                    .split('')
                    .map(ch => ch + ch)
                    .join('')}`;
            }
            return `#${hexCandidate}`;
        }
    }
    return fallback;
};

const formatNumber = (value, fractionDigits = 0) => {
    if (!Number.isFinite(value)) return '';
    if (fractionDigits <= 0) return String(Math.round(value));
    return Number(value)
        .toFixed(fractionDigits)
        .replace(/\.0+$/, '')
        .replace(/(\.\d*?)0+$/, '$1');
};

const attachListener = (element, event, handler, subscriptions) => {
    element.addEventListener(event, handler);
    subscriptions.push(() => element.removeEventListener(event, handler));
};

const setupRangeControl = (store, field, rangeInput, numberInput, sanitize, subscriptions) => {
    if (!rangeInput && !numberInput) return;
    const applyValue = raw => {
        const safe = sanitize(raw);
        if (store[field] !== safe) store[field] = safe;
        if (rangeInput && rangeInput.value !== String(safe)) rangeInput.value = safe;
        if (numberInput && numberInput.value !== String(safe)) numberInput.value = safe;
    };
    if (rangeInput) {
        attachListener(
            rangeInput,
            'input',
            event => {
                applyValue(event.target.value);
            },
            subscriptions,
        );
    }
    if (numberInput) {
        attachListener(
            numberInput,
            'change',
            event => {
                applyValue(event.target.value);
            },
            subscriptions,
        );
        attachListener(
            numberInput,
            'blur',
            event => {
                applyValue(event.target.value);
            },
            subscriptions,
        );
    }
};

const mountSettingsPage = (container, store, context) => {
    container.innerHTML = '';

    const subscriptions = [];
    const nodes = [];

    const style = document.createElement('style');
    style.textContent = `
.hm-visualizer-settings {
    position: relative;
    isolation: isolate;
    font-family: "Source Han Sans", "Microsoft Yahei", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: var(--plugin-settings-text, var(--text, #111213));
    background: transparent;
    min-height: 100%;
    padding: 32px 36px 44px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 24px;
    line-height: 1.6;
    color-scheme: var(--plugin-settings-color-scheme, light);
}
.hm-visualizer-settings::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 28px;
    background: var(--plugin-settings-bg, var(--settings-shell-bg, #f4f6f8));
    opacity: 0.94;
    filter: saturate(1.05);
    z-index: -1;
    pointer-events: none;
}
.dark .hm-visualizer-settings {
    color-scheme: dark;
}
.dark .hm-visualizer-settings::before {
    background: var(--plugin-settings-bg, var(--settings-shell-bg, #181c23));
    opacity: 0.9;
    filter: saturate(1.12) brightness(0.92);
}
.hm-visualizer-settings *,
.hm-visualizer-settings *::before,
.hm-visualizer-settings *::after {
    box-sizing: border-box;
}
.hm-visualizer-banner {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.hm-visualizer-banner h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
}
.hm-visualizer-banner p {
    margin: 0;
    font-size: 14px;
    opacity: 0.78;
}
.hm-visualizer-card {
    background: var(--plugin-settings-surface, var(--panel, rgba(255, 255, 255, 0.92)));
    border: 1px solid var(--plugin-settings-border, var(--border, rgba(0, 0, 0, 0.18)));
    box-shadow: var(--plugin-settings-shadow, 0 22px 48px rgba(20, 32, 58, 0.18));
    border-radius: 20px;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    color: inherit;
    backdrop-filter: blur(18px);
}
.hm-visualizer-card h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
}
.hm-visualizer-row {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
}
.hm-visualizer-row--stack {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
}
.hm-visualizer-field-label {
    min-width: 160px;
    font-size: 14px;
    font-weight: 600;
}
.hm-visualizer-controls {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    color: inherit;
}
.hm-visualizer-controls span {
    opacity: 0.72;
}
.hm-visualizer-controls input[type="range"] {
    flex: 1 1 220px;
    min-width: 200px;
    accent-color: var(--plugin-settings-accent, var(--settings-shell-accent, #4c6edb));
}
.hm-visualizer-controls input[type="number"],
.hm-visualizer-controls input[type="text"],
.hm-visualizer-controls select {
    width: 120px;
    padding: 6px 10px;
    border: 1px solid var(--plugin-settings-border, var(--border, rgba(0, 0, 0, 0.18)));
    background: var(--plugin-settings-input-surface, var(--settings-shell-input-bg, var(--layer, rgba(255, 255, 255, 0.92))));
    border-radius: 10px;
    color: inherit;
    outline: none;
}
.hm-visualizer-controls input[type="number"],
.hm-visualizer-controls input[type="text"] {
    font-variant-numeric: tabular-nums;
}
.hm-visualizer-color-options {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 18px;
}
.hm-visualizer-color-option {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    color: inherit;
    font-size: 14px;
}
.hm-visualizer-color-option input[type="radio"] {
    accent-color: var(--plugin-settings-accent, var(--settings-shell-accent, #4c6edb));
}
.hm-visualizer-color-option--custom input[type="color"] {
    width: 48px;
    height: 28px;
    padding: 0;
    border: 1px solid var(--plugin-settings-border, var(--border, rgba(0, 0, 0, 0.18)));
    background: var(--plugin-settings-input-surface, var(--settings-shell-input-bg, var(--layer, rgba(255, 255, 255, 0.92))));
    border-radius: 8px;
}
.hm-visualizer-color-option--custom input[type="text"] {
    width: 96px;
    text-transform: uppercase;
}
.hm-visualizer-toggle {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-size: 15px;
    cursor: pointer;
    color: inherit;
    user-select: none;
}
.hm-visualizer-toggle input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--plugin-settings-accent, var(--settings-shell-accent, #4c6edb));
}
.hm-visualizer-hint {
    margin: 0;
    font-size: 13px;
    opacity: 0.72;
    color: inherit;
}
.hm-visualizer-note {
    margin: -4px 0 0;
    font-size: 12px;
    opacity: 0.66;
}
.hm-visualizer-input-inline {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}
.hm-visualizer-radial {
    display: none;
}
.hm-visualizer-radial.hm-visible {
    display: flex;
    flex-direction: column;
    gap: 18px;
}
.hm-visualizer-footer {
    display: flex;
    justify-content: flex-end;
}
.hm-visualizer-button {
    padding: 8px 18px;
    border-radius: 12px;
    border: 1px solid var(--plugin-settings-border, var(--border, rgba(0, 0, 0, 0.18)));
    background: var(--plugin-settings-button-bg, rgba(255, 255, 255, 0.88));
    color: inherit;
    cursor: pointer;
    transition: transform 0.15s ease, background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}
.hm-visualizer-button:hover,
.hm-visualizer-button:focus-visible {
    background: var(--plugin-settings-button-hover-bg, rgba(255, 255, 255, 1));
    border-color: var(--plugin-settings-accent, #4c6edb);
    transform: translateY(-1px);
}
@media (max-width: 720px) {
    .hm-visualizer-settings {
        padding: 24px 24px 32px;
    }
    .hm-visualizer-field-label {
        min-width: auto;
        width: 100%;
    }
    .hm-visualizer-row {
        flex-direction: column;
        align-items: flex-start;
    }
    .hm-visualizer-controls input[type="range"] {
        min-width: 100%;
        flex: 1 1 100%;
    }
}
.dark .hm-visualizer-card {
    background: var(--plugin-settings-surface, var(--panel, rgba(52, 58, 68, 0.92)));
    border-color: var(--plugin-settings-border, var(--border, rgba(255, 255, 255, 0.22)));
    box-shadow: var(--plugin-settings-shadow, 0 18px 42px rgba(0, 0, 0, 0.55));
}
.dark .hm-visualizer-button {
    background: var(--plugin-settings-button-bg, rgba(255, 255, 255, 0.12));
}
.dark .hm-visualizer-button:hover,
.dark .hm-visualizer-button:focus-visible {
    background: var(--plugin-settings-button-hover-bg, rgba(255, 255, 255, 0.18));
}
`;
    container.appendChild(style);
    nodes.push(style);

    const root = document.createElement('div');
    root.className = 'hm-visualizer-settings';
    root.innerHTML = `
        <div class="hm-visualizer-banner">
            <h1>歌词可视化插件</h1>
            <p>根据当前歌曲生成动态频谱或辐射特效，并支持主题自适应的配色方案。</p>
        </div>
        <div class="hm-visualizer-card">
            <div class="hm-visualizer-row hm-visualizer-row--stack">
                <label class="hm-visualizer-toggle">
                    <input type="checkbox" data-field="enabled" />
                    <span>在歌词页面启用可视化效果</span>
                </label>
                <p class="hm-visualizer-hint">开启后，歌词面板底部会实时渲染频谱或辐射动画，可通过下方选项调整表现。</p>
            </div>
        </div>
        <div class="hm-visualizer-card">
            <h2>基础外观</h2>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-field-label">可视化样式</div>
                <div class="hm-visualizer-controls">
                    <select data-field="style">
                        <option value="bars">频谱柱</option>
                        <option value="radial">辐射星云</option>
                    </select>
                </div>
            </div>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-field-label">画布高度 (px)</div>
                <div class="hm-visualizer-controls">
                    <input type="range" min="120" max="520" step="10" data-field="height-range" />
                    <input type="number" min="120" max="520" step="10" data-field="height-number" />
                </div>
            </div>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-field-label">柱体数量</div>
                <div class="hm-visualizer-controls">
                    <input type="range" min="16" max="160" step="1" data-field="barcount-range" />
                    <input type="number" min="16" max="160" step="1" data-field="barcount-number" />
                </div>
            </div>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-field-label">柱体宽度 (%)</div>
                <div class="hm-visualizer-controls">
                    <input type="range" min="5" max="100" step="1" data-field="barwidth-range" />
                    <input type="number" min="5" max="100" step="1" data-field="barwidth-number" />
                </div>
            </div>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-field-label">平滑系数</div>
                <div class="hm-visualizer-controls">
                    <input type="range" min="0" max="95" step="5" data-field="transition-range" />
                    <input type="number" min="0" max="0.95" step="0.05" data-field="transition-number" />
                </div>
            </div>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-field-label">不透明度 (%)</div>
                <div class="hm-visualizer-controls">
                    <input type="range" min="0" max="100" step="5" data-field="opacity-range" />
                    <input type="number" min="0" max="100" step="1" data-field="opacity-number" />
                </div>
            </div>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-field-label">频率范围 (Hz)</div>
                <div class="hm-visualizer-controls">
                    <input type="number" min="20" max="19990" step="10" data-field="freqmin-number" />
                    <span>至</span>
                    <input type="number" min="30" max="20000" step="10" data-field="freqmax-number" />
                </div>
            </div>
            <div class="hm-visualizer-row hm-visualizer-row--stack">
                <div class="hm-visualizer-field-label">颜色</div>
                <div class="hm-visualizer-controls hm-visualizer-color-options">
                    <label class="hm-visualizer-color-option">
                        <input type="radio" name="visualizer-color" value="auto" />
                        <span>自动（跟随主题）</span>
                    </label>
                    <label class="hm-visualizer-color-option">
                        <input type="radio" name="visualizer-color" value="black" />
                        <span>深色</span>
                    </label>
                    <label class="hm-visualizer-color-option">
                        <input type="radio" name="visualizer-color" value="white" />
                        <span>浅色</span>
                    </label>
                    <label class="hm-visualizer-color-option hm-visualizer-color-option--custom">
                        <input type="radio" name="visualizer-color" value="custom" />
                        <span>自定义</span>
                        <span class="hm-visualizer-input-inline">
                            <input type="color" data-field="color-picker" value="#4c6edb" />
                            <input type="text" data-field="color-text" maxlength="7" placeholder="#4C6EDB" />
                        </span>
                    </label>
                </div>
                <p class="hm-visualizer-note">“自动” 模式会根据当前主题自动切换浅色或深色，适合快速获得对比度。</p>
            </div>
        </div>
        <div class="hm-visualizer-card hm-visualizer-radial" data-section="radial">
            <h2>辐射样式参数</h2>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-field-label">半径比例 (%)</div>
                <div class="hm-visualizer-controls">
                    <input type="range" min="20" max="240" step="5" data-field="radialsize-range" />
                    <input type="number" min="20" max="240" step="5" data-field="radialsize-number" />
                </div>
            </div>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-field-label">中心偏移 X (%)</div>
                <div class="hm-visualizer-controls">
                    <input type="range" min="-100" max="100" step="5" data-field="offsetx-range" />
                    <input type="number" min="-100" max="100" step="5" data-field="offsetx-number" />
                </div>
            </div>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-field-label">中心偏移 Y (%)</div>
                <div class="hm-visualizer-controls">
                    <input type="range" min="-100" max="100" step="5" data-field="offsety-range" />
                    <input type="number" min="-100" max="100" step="5" data-field="offsety-number" />
                </div>
            </div>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-field-label">核心区域 (%)</div>
                <div class="hm-visualizer-controls">
                    <input type="range" min="20" max="90" step="1" data-field="core-range" />
                    <input type="number" min="20" max="90" step="1" data-field="core-number" />
                </div>
            </div>
        </div>
        <div class="hm-visualizer-footer">
            <button type="button" class="hm-visualizer-button" data-action="reset">恢复默认值</button>
        </div>
    `;
    container.appendChild(root);
    nodes.push(root);

    const q = selector => root.querySelector(selector);

    const controls = {
        enabled: q('[data-field="enabled"]'),
        style: q('[data-field="style"]'),
        heightRange: q('[data-field="height-range"]'),
        heightNumber: q('[data-field="height-number"]'),
        barCountRange: q('[data-field="barcount-range"]'),
        barCountNumber: q('[data-field="barcount-number"]'),
        barWidthRange: q('[data-field="barwidth-range"]'),
        barWidthNumber: q('[data-field="barwidth-number"]'),
        transitionRange: q('[data-field="transition-range"]'),
        transitionNumber: q('[data-field="transition-number"]'),
        opacityRange: q('[data-field="opacity-range"]'),
        opacityNumber: q('[data-field="opacity-number"]'),
        freqMinNumber: q('[data-field="freqmin-number"]'),
        freqMaxNumber: q('[data-field="freqmax-number"]'),
        colorRadios: Array.from(root.querySelectorAll('input[name="visualizer-color"]')),
        colorPicker: q('[data-field="color-picker"]'),
        colorText: q('[data-field="color-text"]'),
        radialSection: root.querySelector('[data-section="radial"]'),
        radialSizeRange: q('[data-field="radialsize-range"]'),
        radialSizeNumber: q('[data-field="radialsize-number"]'),
        offsetXRange: q('[data-field="offsetx-range"]'),
        offsetXNumber: q('[data-field="offsetx-number"]'),
        offsetYRange: q('[data-field="offsety-range"]'),
        offsetYNumber: q('[data-field="offsety-number"]'),
        coreRange: q('[data-field="core-range"]'),
        coreNumber: q('[data-field="core-number"]'),
        resetButton: root.querySelector('[data-action="reset"]'),
    };

    if (controls.enabled) {
        attachListener(
            controls.enabled,
            'change',
            event => {
                const enabled = Boolean(event.target.checked);
                if (store.lyricVisualizer !== enabled) {
                    store.lyricVisualizer = enabled;
                }
                if (enabled) {
                    store.lyricVisualizerHasAutoEnabled = true;
                }
            },
            subscriptions,
        );
    }

    if (controls.style) {
        attachListener(
            controls.style,
            'change',
            event => {
                const safe = sanitizeStyle(event.target.value);
                if (store.lyricVisualizerStyle !== safe) {
                    store.lyricVisualizerStyle = safe;
                }
            },
            subscriptions,
        );
    }

    setupRangeControl(store, 'lyricVisualizerHeight', controls.heightRange, controls.heightNumber, sanitizeHeight, subscriptions);
    setupRangeControl(store, 'lyricVisualizerBarCount', controls.barCountRange, controls.barCountNumber, sanitizeBarCount, subscriptions);
    setupRangeControl(store, 'lyricVisualizerBarWidth', controls.barWidthRange, controls.barWidthNumber, sanitizeBarWidth, subscriptions);

    const applyTransition = raw => {
        const value = sanitizeTransitionDelay(raw);
        if (store.lyricVisualizerTransitionDelay !== value) {
            store.lyricVisualizerTransitionDelay = value;
        }
        if (controls.transitionRange) controls.transitionRange.value = Math.round(value * 100);
        if (controls.transitionNumber) controls.transitionNumber.value = formatNumber(value, 2);
    };

    if (controls.transitionRange) {
        attachListener(
            controls.transitionRange,
            'input',
            event => {
                const normalized = Number(event.target.value) / 100;
                applyTransition(normalized);
            },
            subscriptions,
        );
    }

    if (controls.transitionNumber) {
        attachListener(
            controls.transitionNumber,
            'change',
            event => applyTransition(event.target.value),
            subscriptions,
        );
        attachListener(
            controls.transitionNumber,
            'blur',
            event => applyTransition(event.target.value),
            subscriptions,
        );
    }

    setupRangeControl(store, 'lyricVisualizerOpacity', controls.opacityRange, controls.opacityNumber, sanitizeOpacity, subscriptions);

    if (controls.freqMinNumber && controls.freqMaxNumber) {
        const applyFrequency = () => {
            const { min, max } = sanitizeFrequencyRange(controls.freqMinNumber.value, controls.freqMaxNumber.value);
            if (store.lyricVisualizerFrequencyMin !== min) store.lyricVisualizerFrequencyMin = min;
            if (store.lyricVisualizerFrequencyMax !== max) store.lyricVisualizerFrequencyMax = max;
            controls.freqMinNumber.value = min;
            controls.freqMaxNumber.value = max;
        };
        attachListener(controls.freqMinNumber, 'change', applyFrequency, subscriptions);
        attachListener(controls.freqMinNumber, 'blur', applyFrequency, subscriptions);
        attachListener(controls.freqMaxNumber, 'change', applyFrequency, subscriptions);
        attachListener(controls.freqMaxNumber, 'blur', applyFrequency, subscriptions);
    }

    setupRangeControl(store, 'lyricVisualizerRadialSize', controls.radialSizeRange, controls.radialSizeNumber, sanitizeRadialSize, subscriptions);
    setupRangeControl(store, 'lyricVisualizerRadialOffsetX', controls.offsetXRange, controls.offsetXNumber, sanitizeRadialOffset, subscriptions);
    setupRangeControl(store, 'lyricVisualizerRadialOffsetY', controls.offsetYRange, controls.offsetYNumber, sanitizeRadialOffset, subscriptions);
    setupRangeControl(store, 'lyricVisualizerRadialCoreSize', controls.coreRange, controls.coreNumber, sanitizeRadialCoreSize, subscriptions);

    let syncColorState = () => {};

    if (controls.colorRadios && controls.colorPicker && controls.colorText) {
        let lastCustomColor = '#4c6edb';

        const isDarkTheme = () => {
            if (typeof document === 'undefined') return false;
            return document.documentElement.classList.contains('dark');
        };

        const getAutoColorHex = () => (isDarkTheme() ? '#f5f7ff' : '#101622');

        const toHex = value => {
            const safe = sanitizeColor(value, lastCustomColor);
            if (safe === 'auto' || safe === 'black' || safe === 'white') return safe;
            const normalized = safe.startsWith('#') ? safe : `#${safe.replace(/^#/, '')}`;
            return normalized.toLowerCase();
        };

        const setColorInputs = hex => {
            const normalized = hex.startsWith('#') ? hex.toLowerCase() : `#${hex.replace(/^#/, '').toLowerCase()}`;
            controls.colorPicker.value = normalized;
            controls.colorText.value = normalized.toUpperCase();
        };

        const enableCustomInputs = enabled => {
            controls.colorPicker.disabled = !enabled;
            controls.colorText.disabled = !enabled;
        };

        const selectRadio = mode => {
            controls.colorRadios.forEach(radio => {
                radio.checked = radio.value === mode;
            });
        };

        const updateUIForAuto = () => {
            selectRadio('auto');
            enableCustomInputs(false);
            setColorInputs(getAutoColorHex());
        };

        const updateUIForPreset = mode => {
            selectRadio(mode);
            enableCustomInputs(false);
            const hex = mode === 'white' ? '#ffffff' : '#000000';
            setColorInputs(hex);
        };

        const updateUIForCustom = hex => {
            selectRadio('custom');
            enableCustomInputs(true);
            setColorInputs(hex);
        };

        const syncColorStateImpl = () => {
            const current = sanitizeColor(store.lyricVisualizerColor, lastCustomColor);
            if (current === 'auto') {
                updateUIForAuto();
            } else if (current === 'black' || current === 'white') {
                updateUIForPreset(current);
            } else {
                const normalized = toHex(current);
                if (typeof normalized === 'string' && normalized.startsWith('#')) {
                    lastCustomColor = normalized;
                    updateUIForCustom(normalized);
                } else {
                    lastCustomColor = '#4c6edb';
                    updateUIForCustom(lastCustomColor);
                }
            }
        };

        syncColorState = syncColorStateImpl;

        const applyAuto = () => {
            if (store.lyricVisualizerColor !== 'auto') {
                store.lyricVisualizerColor = 'auto';
            }
            updateUIForAuto();
        };

        const applyPreset = mode => {
            if (store.lyricVisualizerColor !== mode) {
                store.lyricVisualizerColor = mode;
            }
            updateUIForPreset(mode);
        };

        const applyCustom = raw => {
            const normalized = toHex(raw);
            if (normalized === 'auto') {
                applyAuto();
                return;
            }
            if (normalized === 'black' || normalized === 'white') {
                applyPreset(normalized);
                return;
            }
            if (typeof normalized === 'string' && normalized.startsWith('#')) {
                lastCustomColor = normalized;
            }
            if (store.lyricVisualizerColor !== lastCustomColor) {
                store.lyricVisualizerColor = lastCustomColor;
            }
            updateUIForCustom(lastCustomColor);
        };

        const initialColor = sanitizeColor(store.lyricVisualizerColor, DEFAULTS.color);
        if (initialColor !== 'auto' && initialColor !== 'black' && initialColor !== 'white') {
            const normalized = toHex(initialColor);
            if (typeof normalized === 'string' && normalized.startsWith('#')) {
                lastCustomColor = normalized;
            }
        }

        controls.colorRadios.forEach(radio => {
            attachListener(
                radio,
                'change',
                event => {
                    if (!event.target.checked) return;
                    const mode = event.target.value;
                    if (mode === 'auto') applyAuto();
                    else if (mode === 'black' || mode === 'white') applyPreset(mode);
                    else applyCustom(controls.colorPicker.value || controls.colorText.value || lastCustomColor);
                },
                subscriptions,
            );
        });

        attachListener(
            controls.colorPicker,
            'input',
            event => {
                applyCustom(event.target.value);
            },
            subscriptions,
        );

        attachListener(
            controls.colorText,
            'input',
            event => {
                event.target.value = String(event.target.value || '').toUpperCase();
            },
            subscriptions,
        );

        attachListener(
            controls.colorText,
            'change',
            event => {
                applyCustom(event.target.value);
            },
            subscriptions,
        );

        attachListener(
            controls.colorText,
            'blur',
            event => {
                applyCustom(event.target.value);
            },
            subscriptions,
        );

        if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
            try {
                const observer = new MutationObserver(() => {
                    if (store.lyricVisualizerColor === 'auto') {
                        updateUIForAuto();
                    }
                });
                observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
                subscriptions.push(() => observer.disconnect());
            } catch (_) {}
        }

        syncColorState();
    }

    if (controls.resetButton) {
        attachListener(
            controls.resetButton,
            'click',
            () => {
                store.lyricVisualizerHeight = DEFAULTS.height;
                store.lyricVisualizerBarCount = DEFAULTS.barCount;
                store.lyricVisualizerBarWidth = DEFAULTS.barWidth;
                store.lyricVisualizerTransitionDelay = DEFAULTS.transitionDelay;
                store.lyricVisualizerOpacity = DEFAULTS.opacity;
                store.lyricVisualizerFrequencyMin = DEFAULTS.frequencyMin;
                store.lyricVisualizerFrequencyMax = DEFAULTS.frequencyMax;
                store.lyricVisualizerColor = DEFAULTS.color;
                store.lyricVisualizerStyle = DEFAULTS.style;
                store.lyricVisualizerRadialSize = DEFAULTS.radialSize;
                store.lyricVisualizerRadialOffsetX = DEFAULTS.radialOffsetX;
                store.lyricVisualizerRadialOffsetY = DEFAULTS.radialOffsetY;
                store.lyricVisualizerRadialCoreSize = DEFAULTS.radialCoreSize;
                context.utils.notice?.('已恢复可视化默认设置', 2);
                syncFromStore();
            },
            subscriptions,
        );
    }

    const syncRadialVisibility = () => {
        if (!controls.radialSection) return;
        const styleValue = sanitizeStyle(store.lyricVisualizerStyle);
        if (styleValue === 'radial') {
            controls.radialSection.classList.add('hm-visible');
        } else {
            controls.radialSection.classList.remove('hm-visible');
        }
    };

    const syncFromStore = () => {
        if (controls.enabled) controls.enabled.checked = Boolean(store.lyricVisualizer);
        if (controls.style) controls.style.value = sanitizeStyle(store.lyricVisualizerStyle);
        if (controls.heightRange) controls.heightRange.value = sanitizeHeight(store.lyricVisualizerHeight);
        if (controls.heightNumber) controls.heightNumber.value = sanitizeHeight(store.lyricVisualizerHeight);
        if (controls.barCountRange) controls.barCountRange.value = sanitizeBarCount(store.lyricVisualizerBarCount);
        if (controls.barCountNumber) controls.barCountNumber.value = sanitizeBarCount(store.lyricVisualizerBarCount);
        if (controls.barWidthRange) controls.barWidthRange.value = sanitizeBarWidth(store.lyricVisualizerBarWidth);
        if (controls.barWidthNumber) controls.barWidthNumber.value = sanitizeBarWidth(store.lyricVisualizerBarWidth);
        const transitionValue = sanitizeTransitionDelay(store.lyricVisualizerTransitionDelay);
        if (controls.transitionRange) controls.transitionRange.value = Math.round(transitionValue * 100);
        if (controls.transitionNumber) controls.transitionNumber.value = formatNumber(transitionValue, 2);
        const opacityValue = sanitizeOpacity(store.lyricVisualizerOpacity);
        if (controls.opacityRange) controls.opacityRange.value = opacityValue;
        if (controls.opacityNumber) controls.opacityNumber.value = opacityValue;
        if (controls.freqMinNumber && controls.freqMaxNumber) {
            const { min, max } = sanitizeFrequencyRange(store.lyricVisualizerFrequencyMin, store.lyricVisualizerFrequencyMax);
            controls.freqMinNumber.value = min;
            controls.freqMaxNumber.value = max;
        }
        if (controls.radialSizeRange) controls.radialSizeRange.value = sanitizeRadialSize(store.lyricVisualizerRadialSize);
        if (controls.radialSizeNumber) controls.radialSizeNumber.value = sanitizeRadialSize(store.lyricVisualizerRadialSize);
        if (controls.offsetXRange) controls.offsetXRange.value = sanitizeRadialOffset(store.lyricVisualizerRadialOffsetX);
        if (controls.offsetXNumber) controls.offsetXNumber.value = sanitizeRadialOffset(store.lyricVisualizerRadialOffsetX);
        if (controls.offsetYRange) controls.offsetYRange.value = sanitizeRadialOffset(store.lyricVisualizerRadialOffsetY);
        if (controls.offsetYNumber) controls.offsetYNumber.value = sanitizeRadialOffset(store.lyricVisualizerRadialOffsetY);
        if (controls.coreRange) controls.coreRange.value = sanitizeRadialCoreSize(store.lyricVisualizerRadialCoreSize);
        if (controls.coreNumber) controls.coreNumber.value = sanitizeRadialCoreSize(store.lyricVisualizerRadialCoreSize);
        syncRadialVisibility();
        if (controls.colorRadios && controls.colorPicker && controls.colorText) syncColorState();
    };

    syncFromStore();

    const unsubscribe = typeof store.$subscribe === 'function'
        ? store.$subscribe(() => {
            syncFromStore();
        })
        : null;

    if (unsubscribe) {
        subscriptions.push(() => unsubscribe());
    }

    return () => {
        while (subscriptions.length) {
            const dispose = subscriptions.pop();
            try {
                dispose();
            } catch (error) {
                console.error('[LyricVisualizerPlugin] Failed to remove visualizer listeners:', error);
            }
        }
        nodes.forEach(node => {
            if (node && node.parentNode === container) {
                container.removeChild(node);
            }
        });
        container.innerHTML = '';
    };
};

const registerSettingsPage = (context, store) => {
    if (!context?.settings || typeof context.settings.register !== 'function') return null;
    return context.settings.register({
        id: 'core.lyric-visualizer.settings',
        title: '歌词可视化',
        subtitle: '调整频谱与辐射动画的样式与表现',
        mount(container) {
            return mountSettingsPage(container, store, context);
        },
    });
};

module.exports = {
    activate(context) {
        const store = context?.stores?.player;
        if (!store) {
            console.error('[LyricVisualizerPlugin] Unable to access player store');
            return;
        }

        store.lyricVisualizerPluginActive = true;
        store.lyricVisualizerToggleAvailable = true;
        const sanitizedColor = sanitizeColor(store.lyricVisualizerColor, DEFAULTS.color);
        if (sanitizedColor === 'black') {
            store.lyricVisualizerColor = DEFAULTS.color;
        } else if (sanitizedColor !== 'auto' && sanitizedColor !== 'white') {
            const normalized = sanitizedColor.startsWith('#') ? sanitizedColor : `#${sanitizedColor.replace(/^#/, '')}`;
            store.lyricVisualizerColor = normalized.toLowerCase();
        }

        if (!store.lyricVisualizerHasAutoEnabled && !store.lyricVisualizer) {
            store.lyricVisualizer = true;
            store.lyricVisualizerHasAutoEnabled = true;
        } else if (store.lyricVisualizer) {
            store.lyricVisualizerHasAutoEnabled = true;
        }

        const unregisterSettings = registerSettingsPage(context, store);
        if (typeof unregisterSettings === 'function') {
            context.onCleanup(unregisterSettings);
        }

        context.onCleanup(() => {
            try {
                store.lyricVisualizerPluginActive = false;
                store.lyricVisualizerToggleAvailable = false;
                store.lyricVisualizerHasAutoEnabled = false;
                store.lyricVisualizer = false;
            } catch (error) {
                console.error('[LyricVisualizerPlugin] Failed to reset lyric visualizer state during cleanup:', error);
            }
        });

        context.utils?.notice?.('歌词可视化插件已启用', 2.5);
    },
};
