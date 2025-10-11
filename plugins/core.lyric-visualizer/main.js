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

const CHOICE_PRESETS = Object.freeze({
    height: Object.freeze([160, 180, 200, 220, 260, 320]),
    barCount: Object.freeze([24, 32, 48, 64, 96]),
    barWidth: Object.freeze([35, 45, 55, 65, 75]),
    frequencyMin: Object.freeze([20, 40, 80, 120, 200]),
    frequencyMax: Object.freeze([4000, 6000, 8000, 12000, 16000]),
    transitionDelay: Object.freeze([0, 0.25, 0.5, 0.75, 0.9]),
    opacity: Object.freeze([20, 40, 60, 80, 100]),
    radialSize: Object.freeze([60, 80, 100, 120, 160]),
    radialOffset: Object.freeze([-50, -25, 0, 25, 50]),
    radialCoreSize: Object.freeze([40, 52, 62, 72, 84]),
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

const uniqueSorted = values =>
    [...new Set(values.filter(value => Number.isFinite(value)).map(value => Number(value)))].sort((a, b) => a - b);

const formatOptionLabel = (value, suffix = '', defaultValue = null, fractionDigits = 0) => {
    if (!Number.isFinite(value)) return '';
    const normalized = fractionDigits > 0 ? Number(value).toFixed(fractionDigits).replace(/\.0+$/, '') : Math.round(value);
    const label = `${normalized}${suffix}`;
    if (defaultValue !== null && Number(value) === Number(defaultValue)) {
        return `${label}（默认）`;
    }
    return label;
};


const mountSettingsPage = (container, store, context) => {
    container.innerHTML = '';

    const subscriptions = [];
    const nodes = [];

    const style = document.createElement('style');
    style.textContent = `
.hm-visualizer-settings {
    --plugin-settings-bg: var(--settings-shell-bg, var(--bg, #f4f6f8));
    --plugin-settings-surface: var(--settings-shell-surface, var(--panel, rgba(255, 255, 255, 0.92)));
    --plugin-settings-text: var(--settings-shell-text, var(--text, #111213));
    --plugin-settings-muted: var(--settings-shell-muted, var(--muted-text, rgba(17, 18, 19, 0.68)));
    --plugin-settings-border: var(--settings-shell-border, var(--border, rgba(0, 0, 0, 0.18)));
    --plugin-settings-button-bg: var(--settings-shell-button-bg, rgba(255, 255, 255, 0.88));
    --plugin-settings-button-hover-bg: var(--settings-shell-button-hover-bg, rgba(255, 255, 255, 1));
    --plugin-settings-shadow: var(--settings-shell-shadow, 0 22px 48px rgba(20, 32, 58, 0.18));
    --plugin-settings-empty-bg: var(--settings-shell-empty-bg, rgba(255, 255, 255, 0.78));
    --plugin-settings-empty-border: var(--settings-shell-empty-border, rgba(92, 122, 170, 0.32));
    --plugin-settings-input-surface: var(--settings-shell-input-bg, var(--layer, rgba(255, 255, 255, 0.92)));
    --plugin-settings-accent: var(--settings-shell-accent, #4c6edb);
    position: relative;
    isolation: isolate;
    font-family: "Source Han Sans", "Microsoft Yahei", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: var(--plugin-settings-text);
    background: var(--plugin-settings-bg);
    min-height: 100%;
    padding: 28px 32px 40px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 24px;
    color-scheme: light;
}
.dark .hm-visualizer-settings {
    --plugin-settings-bg: var(--settings-shell-bg, var(--bg, #21262b));
    --plugin-settings-surface: var(--settings-shell-surface, var(--panel, rgba(52, 58, 68, 0.92)));
    --plugin-settings-text: var(--settings-shell-text, var(--text, #f1f3f5));
    --plugin-settings-muted: var(--settings-shell-muted, rgba(241, 243, 245, 0.72));
    --plugin-settings-border: var(--settings-shell-border, var(--border, rgba(255, 255, 255, 0.24)));
    --plugin-settings-button-bg: var(--settings-shell-button-bg, rgba(255, 255, 255, 0.12));
    --plugin-settings-button-hover-bg: var(--settings-shell-button-hover-bg, rgba(255, 255, 255, 0.18));
    --plugin-settings-shadow: var(--settings-shell-shadow, 0 18px 42px rgba(0, 0, 0, 0.55));
    --plugin-settings-empty-bg: var(--settings-shell-empty-bg, rgba(255, 255, 255, 0.08));
    --plugin-settings-empty-border: var(--settings-shell-empty-border, rgba(255, 255, 255, 0.22));
    --plugin-settings-input-surface: var(--settings-shell-input-bg, rgba(44, 48, 56, 0.88));
    --plugin-settings-accent: var(--settings-shell-accent, #6b8cff);
    color-scheme: dark;
}
.hm-visualizer-settings *,
.hm-visualizer-settings *::before,
.hm-visualizer-settings *::after {
    box-sizing: border-box;
}
.hm-visualizer-panel {
    background: var(--plugin-settings-surface);
    border: 1px solid var(--plugin-settings-border);
    box-shadow: var(--plugin-settings-shadow);
    border-radius: 0;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    backdrop-filter: blur(16px);
}
.hm-visualizer-header {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.hm-visualizer-title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
}
.hm-visualizer-subtitle {
    margin: 0;
    font-size: 13px;
    color: var(--plugin-settings-muted);
}
.hm-visualizer-section-title {
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 600;
}
.hm-visualizer-option {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 6px 0;
}
.hm-visualizer-option-label {
    font-size: 14px;
    font-weight: 600;
    min-width: 160px;
}
.hm-visualizer-option-controls {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
}
.hm-visualizer-option-controls--column {
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
}
.hm-visualizer-select select {
    min-width: 140px;
    padding: 6px 12px;
    border: 1px solid var(--plugin-settings-border);
    border-radius: 0;
    background: var(--plugin-settings-input-surface);
    color: inherit;
    outline: none;
    transition: border-color 0.2s ease;
}
.hm-visualizer-custom {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}
.hm-visualizer-custom input {
    width: 96px;
    padding: 6px 10px;
    border-radius: 0;
    border: 1px solid var(--plugin-settings-border);
    background: var(--plugin-settings-input-surface);
    color: inherit;
    outline: none;
}
.hm-visualizer-action {
    padding: 6px 14px;
    border-radius: 0;
    border: 1px solid transparent;
    background: var(--plugin-settings-accent);
    color: #fff;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
}
.hm-visualizer-action--ghost {
    background: transparent;
    border-color: var(--plugin-settings-border);
    color: inherit;
}
.hm-visualizer-action--remove {
    background: #f04134;
    border-color: #f04134;
}
.hm-visualizer-action:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}
.hm-visualizer-switch {
    position: relative;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
}
.hm-visualizer-switch input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
}
.hm-visualizer-switch-track {
    width: 46px;
    height: 26px;
    background: rgba(28, 44, 78, 0.22);
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    padding: 4px;
    transition: background 0.2s ease;
}
.dark .hm-visualizer-switch-track {
    background: rgba(255, 255, 255, 0.18);
}
.hm-visualizer-switch-handle {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
    transform: translateX(0);
    transition: transform 0.2s ease;
}
.hm-visualizer-switch input:checked + .hm-visualizer-switch-track {
    background: var(--plugin-settings-accent);
}
.hm-visualizer-switch input:checked + .hm-visualizer-switch-track .hm-visualizer-switch-handle {
    transform: translateX(20px);
}
.hm-visualizer-option--stack {
    align-items: flex-start;
}
.hm-visualizer-color-options {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 18px;
    justify-content: flex-end;
}
.hm-visualizer-color-option {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
}
.hm-visualizer-color-option input[type="radio"] {
    accent-color: var(--plugin-settings-accent);
}
.hm-visualizer-color-option--custom .hm-visualizer-color-custom {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}
.hm-visualizer-color-custom input[type="color"] {
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    padding: 0;
}
.hm-visualizer-color-custom input[type="text"] {
    width: 90px;
    padding: 6px 8px;
    border-radius: 0;
    border: 1px solid var(--plugin-settings-border);
    background: var(--plugin-settings-input-surface);
    color: inherit;
}
.hm-visualizer-note {
    margin: 0;
    font-size: 12px;
    color: var(--plugin-settings-muted);
    text-align: right;
}
.hm-visualizer-panel--radial {
    display: none;
}
.hm-visualizer-panel--radial.hm-visible {
    display: flex;
}
.hm-visualizer-footer {
    display: flex;
    justify-content: flex-end;
}
.hm-visualizer-button {
    padding: 8px 20px;
    border-radius: 0;
    border: 1px solid var(--plugin-settings-border);
    background: var(--plugin-settings-button-bg);
    color: inherit;
    cursor: pointer;
    transition: transform 0.15s ease, background 0.2s ease, border-color 0.2s ease;
}
.hm-visualizer-button:hover {
    background: var(--plugin-settings-button-hover-bg);
    border-color: var(--plugin-settings-accent);
    transform: translateY(-1px);
}
.hm-visualizer-button:focus {
    outline: none;
}
.hm-visualizer-switch-track {
    outline: none;
}
.hm-visualizer-switch input:focus-visible + .hm-visualizer-switch-track {
    box-shadow: none;
}
@media (max-width: 720px) {
    .hm-visualizer-settings {
        padding: 20px 20px 32px;
    }
    .hm-visualizer-option-label {
        min-width: 0;
        width: 100%;
    }
    .hm-visualizer-option {
        align-items: flex-start;
    }
    .hm-visualizer-option-controls {
        justify-content: flex-start;
    }
    .hm-visualizer-option-controls--column {
        align-items: flex-start;
    }
}
`;
    container.appendChild(style);
    nodes.push(style);

    const root = document.createElement('div');
    root.className = 'hm-visualizer-settings';
    root.innerHTML = `
        <div class="hm-visualizer-panel">
            <div class="hm-visualizer-header">
                <div class="hm-visualizer-title">歌词可视化插件</div>
                <div class="hm-visualizer-subtitle">根据当前歌曲生成动态频谱或辐射特效，并支持主题自适应的配色方案。</div>
            </div>
            <div class="hm-visualizer-option">
                <div class="hm-visualizer-option-label">启用歌词可视化</div>
                <div class="hm-visualizer-option-controls">
                    <label class="hm-visualizer-switch">
                        <input type="checkbox" data-field="enabled" />
                        <span class="hm-visualizer-switch-track">
                            <span class="hm-visualizer-switch-handle"></span>
                        </span>
                    </label>
                </div>
            </div>
        </div>
        <div class="hm-visualizer-panel">
            <div class="hm-visualizer-section-title">基础外观</div>
            <div class="hm-visualizer-option">
                <div class="hm-visualizer-option-label">可视化样式</div>
                <div class="hm-visualizer-option-controls">
                    <div class="hm-visualizer-select">
                        <select data-field="style">
                            <option value="bars">频谱柱</option>
                            <option value="radial">辐射星云</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="hm-visualizer-option">
                <div class="hm-visualizer-option-label">画布高度</div>
                <div class="hm-visualizer-option-controls">
                    <div class="hm-visualizer-select">
                        <select data-field="height-select"></select>
                    </div>
                    <div class="hm-visualizer-custom">
                        <input type="number" min="80" max="600" step="10" placeholder="自定义" data-field="height-custom" />
                        <button type="button" class="hm-visualizer-action" data-action="height-add">添加</button>
                        <button type="button" class="hm-visualizer-action hm-visualizer-action--ghost" data-action="height-reset">重置</button>
                    </div>
                </div>
            </div>
            <div class="hm-visualizer-option">
                <div class="hm-visualizer-option-label">柱体数量</div>
                <div class="hm-visualizer-option-controls">
                    <div class="hm-visualizer-select">
                        <select data-field="barcount-select"></select>
                    </div>
                    <div class="hm-visualizer-custom">
                        <input type="number" min="16" max="200" step="1" placeholder="自定义" data-field="barcount-custom" />
                        <button type="button" class="hm-visualizer-action" data-action="barcount-add">添加</button>
                        <button type="button" class="hm-visualizer-action hm-visualizer-action--ghost" data-action="barcount-reset">重置</button>
                    </div>
                </div>
            </div>
            <div class="hm-visualizer-option">
                <div class="hm-visualizer-option-label">柱体宽度</div>
                <div class="hm-visualizer-option-controls">
                    <div class="hm-visualizer-select">
                        <select data-field="barwidth-select"></select>
                    </div>
                    <div class="hm-visualizer-custom">
                        <input type="number" min="5" max="100" step="1" placeholder="自定义" data-field="barwidth-custom" />
                        <button type="button" class="hm-visualizer-action" data-action="barwidth-add">添加</button>
                        <button type="button" class="hm-visualizer-action hm-visualizer-action--ghost" data-action="barwidth-reset">重置</button>
                    </div>
                </div>
            </div>
            <div class="hm-visualizer-option">
                <div class="hm-visualizer-option-label">平滑系数</div>
                <div class="hm-visualizer-option-controls">
                    <div class="hm-visualizer-select">
                        <select data-field="transition-select"></select>
                    </div>
                    <div class="hm-visualizer-custom">
                        <input type="number" min="0" max="0.95" step="0.05" placeholder="自定义" data-field="transition-custom" />
                        <button type="button" class="hm-visualizer-action" data-action="transition-add">添加</button>
                        <button type="button" class="hm-visualizer-action hm-visualizer-action--ghost" data-action="transition-reset">重置</button>
                    </div>
                </div>
            </div>
            <div class="hm-visualizer-option">
                <div class="hm-visualizer-option-label">不透明度</div>
                <div class="hm-visualizer-option-controls">
                    <div class="hm-visualizer-select">
                        <select data-field="opacity-select"></select>
                    </div>
                    <div class="hm-visualizer-custom">
                        <input type="number" min="0" max="100" step="1" placeholder="自定义" data-field="opacity-custom" />
                        <button type="button" class="hm-visualizer-action" data-action="opacity-add">添加</button>
                        <button type="button" class="hm-visualizer-action hm-visualizer-action--ghost" data-action="opacity-reset">重置</button>
                    </div>
                </div>
            </div>
            <div class="hm-visualizer-option">
                <div class="hm-visualizer-option-label">最低频率</div>
                <div class="hm-visualizer-option-controls">
                    <div class="hm-visualizer-select">
                        <select data-field="freqmin-select"></select>
                    </div>
                    <div class="hm-visualizer-custom">
                        <input type="number" min="20" max="19990" step="10" placeholder="自定义" data-field="freqmin-custom" />
                        <button type="button" class="hm-visualizer-action" data-action="freqmin-add">添加</button>
                        <button type="button" class="hm-visualizer-action hm-visualizer-action--ghost" data-action="freqmin-reset">重置</button>
                    </div>
                </div>
            </div>
            <div class="hm-visualizer-option">
                <div class="hm-visualizer-option-label">最高频率</div>
                <div class="hm-visualizer-option-controls">
                    <div class="hm-visualizer-select">
                        <select data-field="freqmax-select"></select>
                    </div>
                    <div class="hm-visualizer-custom">
                        <input type="number" min="30" max="20000" step="10" placeholder="自定义" data-field="freqmax-custom" />
                        <button type="button" class="hm-visualizer-action" data-action="freqmax-add">添加</button>
                        <button type="button" class="hm-visualizer-action hm-visualizer-action--ghost" data-action="freqmax-reset">重置</button>
                    </div>
                </div>
            </div>
            <div class="hm-visualizer-option hm-visualizer-option--stack">
                <div class="hm-visualizer-option-label">颜色</div>
                <div class="hm-visualizer-option-controls hm-visualizer-option-controls--column">
                    <div class="hm-visualizer-color-options">
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
                            <span class="hm-visualizer-color-custom">
                                <input type="color" data-field="color-picker" value="#4c6edb" />
                                <input type="text" data-field="color-text" maxlength="7" placeholder="#4C6EDB" />
                            </span>
                        </label>
                    </div>
                    <p class="hm-visualizer-note">“自动” 模式会根据当前主题自动切换浅色或深色。</p>
                </div>
            </div>
        </div>
        <div class="hm-visualizer-panel hm-visualizer-panel--radial" data-section="radial">
            <div class="hm-visualizer-section-title">辐射样式参数</div>
            <div class="hm-visualizer-option">
                <div class="hm-visualizer-option-label">半径比例</div>
                <div class="hm-visualizer-option-controls">
                    <div class="hm-visualizer-select">
                        <select data-field="radialsize-select"></select>
                    </div>
                    <div class="hm-visualizer-custom">
                        <input type="number" min="10" max="400" step="5" placeholder="自定义" data-field="radialsize-custom" />
                        <button type="button" class="hm-visualizer-action" data-action="radialsize-add">添加</button>
                        <button type="button" class="hm-visualizer-action hm-visualizer-action--ghost" data-action="radialsize-reset">重置</button>
                    </div>
                </div>
            </div>
            <div class="hm-visualizer-option">
                <div class="hm-visualizer-option-label">中心偏移 X</div>
                <div class="hm-visualizer-option-controls">
                    <div class="hm-visualizer-select">
                        <select data-field="offsetx-select"></select>
                    </div>
                    <div class="hm-visualizer-custom">
                        <input type="number" min="-100" max="100" step="5" placeholder="自定义" data-field="offsetx-custom" />
                        <button type="button" class="hm-visualizer-action" data-action="offsetx-add">添加</button>
                        <button type="button" class="hm-visualizer-action hm-visualizer-action--ghost" data-action="offsetx-reset">重置</button>
                    </div>
                </div>
            </div>
            <div class="hm-visualizer-option">
                <div class="hm-visualizer-option-label">中心偏移 Y</div>
                <div class="hm-visualizer-option-controls">
                    <div class="hm-visualizer-select">
                        <select data-field="offsety-select"></select>
                    </div>
                    <div class="hm-visualizer-custom">
                        <input type="number" min="-100" max="100" step="5" placeholder="自定义" data-field="offsety-custom" />
                        <button type="button" class="hm-visualizer-action" data-action="offsety-add">添加</button>
                        <button type="button" class="hm-visualizer-action hm-visualizer-action--ghost" data-action="offsety-reset">重置</button>
                    </div>
                </div>
            </div>
            <div class="hm-visualizer-option">
                <div class="hm-visualizer-option-label">核心区域</div>
                <div class="hm-visualizer-option-controls">
                    <div class="hm-visualizer-select">
                        <select data-field="core-select"></select>
                    </div>
                    <div class="hm-visualizer-custom">
                        <input type="number" min="10" max="95" step="1" placeholder="自定义" data-field="core-custom" />
                        <button type="button" class="hm-visualizer-action" data-action="core-add">添加</button>
                        <button type="button" class="hm-visualizer-action hm-visualizer-action--ghost" data-action="core-reset">重置</button>
                    </div>
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
        heightSelect: q('[data-field="height-select"]'),
        heightCustom: q('[data-field="height-custom"]'),
        heightAdd: q('[data-action="height-add"]'),
        heightReset: q('[data-action="height-reset"]'),
        barCountSelect: q('[data-field="barcount-select"]'),
        barCountCustom: q('[data-field="barcount-custom"]'),
        barCountAdd: q('[data-action="barcount-add"]'),
        barCountReset: q('[data-action="barcount-reset"]'),
        barWidthSelect: q('[data-field="barwidth-select"]'),
        barWidthCustom: q('[data-field="barwidth-custom"]'),
        barWidthAdd: q('[data-action="barwidth-add"]'),
        barWidthReset: q('[data-action="barwidth-reset"]'),
        transitionSelect: q('[data-field="transition-select"]'),
        transitionCustom: q('[data-field="transition-custom"]'),
        transitionAdd: q('[data-action="transition-add"]'),
        transitionReset: q('[data-action="transition-reset"]'),
        opacitySelect: q('[data-field="opacity-select"]'),
        opacityCustom: q('[data-field="opacity-custom"]'),
        opacityAdd: q('[data-action="opacity-add"]'),
        opacityReset: q('[data-action="opacity-reset"]'),
        freqMinSelect: q('[data-field="freqmin-select"]'),
        freqMinCustom: q('[data-field="freqmin-custom"]'),
        freqMinAdd: q('[data-action="freqmin-add"]'),
        freqMinReset: q('[data-action="freqmin-reset"]'),
        freqMaxSelect: q('[data-field="freqmax-select"]'),
        freqMaxCustom: q('[data-field="freqmax-custom"]'),
        freqMaxAdd: q('[data-action="freqmax-add"]'),
        freqMaxReset: q('[data-action="freqmax-reset"]'),
        radialSizeSelect: q('[data-field="radialsize-select"]'),
        radialSizeCustom: q('[data-field="radialsize-custom"]'),
        radialSizeAdd: q('[data-action="radialsize-add"]'),
        radialSizeReset: q('[data-action="radialsize-reset"]'),
        offsetXSelect: q('[data-field="offsetx-select"]'),
        offsetXCustom: q('[data-field="offsetx-custom"]'),
        offsetXAdd: q('[data-action="offsetx-add"]'),
        offsetXReset: q('[data-action="offsetx-reset"]'),
        offsetYSelect: q('[data-field="offsety-select"]'),
        offsetYCustom: q('[data-field="offsety-custom"]'),
        offsetYAdd: q('[data-action="offsety-add"]'),
        offsetYReset: q('[data-action="offsety-reset"]'),
        coreSelect: q('[data-field="core-select"]'),
        coreCustom: q('[data-field="core-custom"]'),
        coreAdd: q('[data-action="core-add"]'),
        coreReset: q('[data-action="core-reset"]'),
        colorRadios: Array.from(root.querySelectorAll('input[name="visualizer-color"]')),
        colorPicker: q('[data-field="color-picker"]'),
        colorText: q('[data-field="color-text"]'),
        radialSection: root.querySelector('[data-section="radial"]'),
        resetButton: root.querySelector('[data-action="reset"]'),
    };

    const choiceManagers = [];

    const registerChoiceManager = config => {
        const manager = {
            baseValues: uniqueSorted(config.baseValues || []),
            values: uniqueSorted(config.baseValues || []),
            sanitize: config.sanitize,
            format: config.format,
            defaultValue: config.defaultValue,
            getValue: config.getValue,
            setValue: config.setValue,
            parseInput: config.parseInput,
            onAdd: config.onAdd,
            onRemove: config.onRemove,
            onReset: config.onReset,
            select: null,
            input: null,
            addButton: null,
            resetButton: null,
        };

        manager.valueToKey = value => {
            if (!Number.isFinite(value)) return '';
            const numeric = Number(value);
            return Number.isInteger(numeric) ? String(numeric) : String(Number.parseFloat(numeric.toFixed(4)));
        };

        manager.ensureValue = value => {
            if (!Number.isFinite(value)) return;
            if (!manager.values.some(item => Number(item) === Number(value))) {
                manager.values = uniqueSorted([...manager.values, Number(value)]);
            }
        };

        manager.renderOptions = () => {
            if (!manager.select) return;
            const doc = manager.select.ownerDocument;
            manager.select.innerHTML = '';
            manager.values.forEach(value => {
                const option = doc.createElement('option');
                option.value = manager.valueToKey(value);
                option.textContent = typeof manager.format === 'function' ? manager.format(value) : String(value);
                manager.select.appendChild(option);
            });
        };

        manager.parseInputValue = () => {
            if (typeof manager.parseInput === 'function') {
                return manager.parseInput(manager);
            }
            if (!manager.input) return { valid: false };
            const raw = manager.input.value;
            const trimmed = String(raw ?? '').trim();
            if (!trimmed) return { valid: false };
            const sanitized = manager.sanitize(trimmed);
            if (!Number.isFinite(sanitized)) return { valid: false };
            const exists = manager.values.some(item => Number(item) === Number(sanitized));
            return { valid: true, value: sanitized, mode: exists ? 'remove' : 'add' };
        };

        manager.updateAddButtonState = () => {
            if (!manager.addButton) return;
            const parsed = manager.parseInputValue();
            if (!parsed.valid) {
                manager.addButton.disabled = true;
                manager.addButton.textContent = '添加';
                manager.addButton.classList.remove('hm-visualizer-action--remove');
                return;
            }
            manager.addButton.disabled = false;
            const mode = parsed.mode || (manager.values.some(item => Number(item) === Number(parsed.value)) ? 'remove' : 'add');
            manager.addButton.textContent = mode === 'remove' ? '删除' : '添加';
            manager.addButton.classList.toggle('hm-visualizer-action--remove', mode === 'remove');
        };

        manager.handleAdd = () => {
            const parsed = manager.parseInputValue();
            if (!parsed.valid) return;
            const mode = parsed.mode || (manager.values.some(item => Number(item) === Number(parsed.value)) ? 'remove' : 'add');
            if (mode === 'remove') {
                if (manager.values.length <= 1) return;
                manager.values = manager.values.filter(item => Number(item) !== Number(parsed.value));
                if (typeof manager.onRemove === 'function') {
                    manager.onRemove(parsed, manager);
                } else if (Number(manager.getValue()) === Number(parsed.value)) {
                    manager.setValue(manager.defaultValue);
                }
            } else {
                manager.ensureValue(parsed.value);
                if (typeof manager.onAdd === 'function') {
                    manager.onAdd(parsed, manager);
                }
                manager.setValue(parsed.value);
            }
            if (manager.input) manager.input.value = '';
            manager.updateAddButtonState();
            syncFromStore();
        };

        manager.handleSelectChange = event => {
            const sanitized = manager.sanitize(event.target.value);
            if (!Number.isFinite(sanitized)) return;
            manager.setValue(sanitized);
            syncFromStore();
        };

        manager.resetValues = ({ skipOnReset = false } = {}) => {
            manager.values = uniqueSorted(manager.baseValues);
            manager.renderOptions();
            if (typeof manager.onReset === 'function') {
                manager.onReset(manager, { skipStore: skipOnReset });
            } else if (!skipOnReset) {
                manager.setValue(manager.defaultValue);
            }
            manager.updateAddButtonState();
        };

        manager.sync = () => {
            const safeValue = manager.getValue();
            if (Number.isFinite(safeValue)) manager.ensureValue(safeValue);
            manager.renderOptions();
            if (manager.select) manager.select.value = manager.valueToKey(manager.getValue());
            manager.updateAddButtonState();
        };

        manager.attach = elements => {
            manager.select = elements.select || null;
            manager.input = elements.input || null;
            manager.addButton = elements.addButton || null;
            manager.resetButton = elements.resetButton || null;

            if (manager.select) {
                manager.renderOptions();
                attachListener(manager.select, 'change', manager.handleSelectChange, subscriptions);
            }
            if (manager.input) {
                attachListener(
                    manager.input,
                    'input',
                    () => manager.updateAddButtonState(),
                    subscriptions,
                );
                attachListener(
                    manager.input,
                    'keyup',
                    event => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            manager.handleAdd();
                        }
                    },
                    subscriptions,
                );
            }
            if (manager.addButton) {
                attachListener(
                    manager.addButton,
                    'click',
                    event => {
                        event.preventDefault();
                        manager.handleAdd();
                    },
                    subscriptions,
                );
            }
            if (manager.resetButton) {
                attachListener(
                    manager.resetButton,
                    'click',
                    event => {
                        event.preventDefault();
                        manager.resetValues();
                        syncFromStore();
                    },
                    subscriptions,
                );
            }

            manager.sync();
        };

        choiceManagers.push(manager);
        return manager;
    };

    let frequencyMinManager;
    let frequencyMaxManager;

    const heightManager = registerChoiceManager({
        baseValues: CHOICE_PRESETS.height,
        sanitize: sanitizeHeight,
        defaultValue: DEFAULTS.height,
        format: value => formatOptionLabel(value, 'px', DEFAULTS.height),
        getValue: () => sanitizeHeight(store.lyricVisualizerHeight),
        setValue: value => {
            const safe = sanitizeHeight(value);
            if (store.lyricVisualizerHeight !== safe) store.lyricVisualizerHeight = safe;
        },
    });

    const barCountManager = registerChoiceManager({
        baseValues: CHOICE_PRESETS.barCount,
        sanitize: sanitizeBarCount,
        defaultValue: DEFAULTS.barCount,
        format: value => formatOptionLabel(value, ' 个', DEFAULTS.barCount),
        getValue: () => sanitizeBarCount(store.lyricVisualizerBarCount),
        setValue: value => {
            const safe = sanitizeBarCount(value);
            if (store.lyricVisualizerBarCount !== safe) store.lyricVisualizerBarCount = safe;
        },
    });

    const barWidthManager = registerChoiceManager({
        baseValues: CHOICE_PRESETS.barWidth,
        sanitize: sanitizeBarWidth,
        defaultValue: DEFAULTS.barWidth,
        format: value => formatOptionLabel(value, '%', DEFAULTS.barWidth),
        getValue: () => sanitizeBarWidth(store.lyricVisualizerBarWidth),
        setValue: value => {
            const safe = sanitizeBarWidth(value);
            if (store.lyricVisualizerBarWidth !== safe) store.lyricVisualizerBarWidth = safe;
        },
    });

    const transitionManager = registerChoiceManager({
        baseValues: CHOICE_PRESETS.transitionDelay,
        sanitize: sanitizeTransitionDelay,
        defaultValue: DEFAULTS.transitionDelay,
        format: value => formatOptionLabel(value, ' 秒', DEFAULTS.transitionDelay, 2),
        getValue: () => sanitizeTransitionDelay(store.lyricVisualizerTransitionDelay),
        setValue: value => {
            const safe = sanitizeTransitionDelay(value);
            if (store.lyricVisualizerTransitionDelay !== safe) store.lyricVisualizerTransitionDelay = safe;
        },
    });

    const opacityManager = registerChoiceManager({
        baseValues: CHOICE_PRESETS.opacity,
        sanitize: sanitizeOpacity,
        defaultValue: DEFAULTS.opacity,
        format: value => formatOptionLabel(value, '%', DEFAULTS.opacity),
        getValue: () => sanitizeOpacity(store.lyricVisualizerOpacity),
        setValue: value => {
            const safe = sanitizeOpacity(value);
            if (store.lyricVisualizerOpacity !== safe) store.lyricVisualizerOpacity = safe;
        },
    });

    frequencyMinManager = registerChoiceManager({
        baseValues: CHOICE_PRESETS.frequencyMin,
        sanitize: sanitizeFrequency,
        defaultValue: DEFAULTS.frequencyMin,
        format: value => formatOptionLabel(value, 'Hz', DEFAULTS.frequencyMin),
        getValue: () => sanitizeFrequency(store.lyricVisualizerFrequencyMin),
        setValue: value => {
            const range = sanitizeFrequencyRange(value, store.lyricVisualizerFrequencyMax);
            if (store.lyricVisualizerFrequencyMin !== range.min) store.lyricVisualizerFrequencyMin = range.min;
            if (store.lyricVisualizerFrequencyMax !== range.max) store.lyricVisualizerFrequencyMax = range.max;
            if (frequencyMaxManager) frequencyMaxManager.ensureValue(range.max);
        },
        parseInput: manager => {
            if (!manager.input) return { valid: false };
            const raw = manager.input.value;
            const trimmed = String(raw ?? '').trim();
            if (!trimmed) return { valid: false };
            const range = sanitizeFrequencyRange(sanitizeFrequency(trimmed), store.lyricVisualizerFrequencyMax);
            const exists = manager.values.some(item => Number(item) === Number(range.min));
            return {
                valid: true,
                value: range.min,
                pairedMax: range.max,
                mode: exists ? 'remove' : 'add',
            };
        },
        onAdd: parsed => {
            if (frequencyMaxManager && Number.isFinite(parsed.pairedMax)) {
                frequencyMaxManager.ensureValue(parsed.pairedMax);
            }
        },
        onRemove: parsed => {
            if (Number(store.lyricVisualizerFrequencyMin) === Number(parsed.value)) {
                store.lyricVisualizerFrequencyMin = DEFAULTS.frequencyMin;
                store.lyricVisualizerFrequencyMax = DEFAULTS.frequencyMax;
            }
        },
        onReset: (_manager, options = {}) => {
            if (!options.skipStore) {
                store.lyricVisualizerFrequencyMin = DEFAULTS.frequencyMin;
                store.lyricVisualizerFrequencyMax = DEFAULTS.frequencyMax;
            }
            if (frequencyMaxManager) {
                frequencyMaxManager.values = uniqueSorted(CHOICE_PRESETS.frequencyMax);
                frequencyMaxManager.renderOptions();
                frequencyMaxManager.updateAddButtonState();
            }
        },
    });

    frequencyMaxManager = registerChoiceManager({
        baseValues: CHOICE_PRESETS.frequencyMax,
        sanitize: sanitizeFrequency,
        defaultValue: DEFAULTS.frequencyMax,
        format: value => formatOptionLabel(value, 'Hz', DEFAULTS.frequencyMax),
        getValue: () => sanitizeFrequency(store.lyricVisualizerFrequencyMax),
        setValue: value => {
            const range = sanitizeFrequencyRange(store.lyricVisualizerFrequencyMin, value);
            if (store.lyricVisualizerFrequencyMin !== range.min) store.lyricVisualizerFrequencyMin = range.min;
            if (store.lyricVisualizerFrequencyMax !== range.max) store.lyricVisualizerFrequencyMax = range.max;
            if (frequencyMinManager) frequencyMinManager.ensureValue(range.min);
        },
        parseInput: manager => {
            if (!manager.input) return { valid: false };
            const raw = manager.input.value;
            const trimmed = String(raw ?? '').trim();
            if (!trimmed) return { valid: false };
            const range = sanitizeFrequencyRange(store.lyricVisualizerFrequencyMin, sanitizeFrequency(trimmed));
            const exists = manager.values.some(item => Number(item) === Number(range.max));
            return {
                valid: true,
                value: range.max,
                pairedMin: range.min,
                mode: exists ? 'remove' : 'add',
            };
        },
        onAdd: parsed => {
            if (frequencyMinManager && Number.isFinite(parsed.pairedMin)) {
                frequencyMinManager.ensureValue(parsed.pairedMin);
            }
        },
        onRemove: parsed => {
            if (Number(store.lyricVisualizerFrequencyMax) === Number(parsed.value)) {
                store.lyricVisualizerFrequencyMin = DEFAULTS.frequencyMin;
                store.lyricVisualizerFrequencyMax = DEFAULTS.frequencyMax;
            }
        },
        onReset: (_manager, options = {}) => {
            if (!options.skipStore) {
                store.lyricVisualizerFrequencyMin = DEFAULTS.frequencyMin;
                store.lyricVisualizerFrequencyMax = DEFAULTS.frequencyMax;
            }
            if (frequencyMinManager) {
                frequencyMinManager.values = uniqueSorted(CHOICE_PRESETS.frequencyMin);
                frequencyMinManager.renderOptions();
                frequencyMinManager.updateAddButtonState();
            }
        },
    });

    const radialSizeManager = registerChoiceManager({
        baseValues: CHOICE_PRESETS.radialSize,
        sanitize: sanitizeRadialSize,
        defaultValue: DEFAULTS.radialSize,
        format: value => formatOptionLabel(value, '%', DEFAULTS.radialSize),
        getValue: () => sanitizeRadialSize(store.lyricVisualizerRadialSize),
        setValue: value => {
            const safe = sanitizeRadialSize(value);
            if (store.lyricVisualizerRadialSize !== safe) store.lyricVisualizerRadialSize = safe;
        },
    });

    const offsetXManager = registerChoiceManager({
        baseValues: CHOICE_PRESETS.radialOffset,
        sanitize: sanitizeRadialOffset,
        defaultValue: DEFAULTS.radialOffsetX,
        format: value => formatOptionLabel(value, '%', DEFAULTS.radialOffsetX),
        getValue: () => sanitizeRadialOffset(store.lyricVisualizerRadialOffsetX),
        setValue: value => {
            const safe = sanitizeRadialOffset(value);
            if (store.lyricVisualizerRadialOffsetX !== safe) store.lyricVisualizerRadialOffsetX = safe;
        },
    });

    const offsetYManager = registerChoiceManager({
        baseValues: CHOICE_PRESETS.radialOffset,
        sanitize: sanitizeRadialOffset,
        defaultValue: DEFAULTS.radialOffsetY,
        format: value => formatOptionLabel(value, '%', DEFAULTS.radialOffsetY),
        getValue: () => sanitizeRadialOffset(store.lyricVisualizerRadialOffsetY),
        setValue: value => {
            const safe = sanitizeRadialOffset(value);
            if (store.lyricVisualizerRadialOffsetY !== safe) store.lyricVisualizerRadialOffsetY = safe;
        },
    });

    const coreManager = registerChoiceManager({
        baseValues: CHOICE_PRESETS.radialCoreSize,
        sanitize: sanitizeRadialCoreSize,
        defaultValue: DEFAULTS.radialCoreSize,
        format: value => formatOptionLabel(value, '%', DEFAULTS.radialCoreSize),
        getValue: () => sanitizeRadialCoreSize(store.lyricVisualizerRadialCoreSize),
        setValue: value => {
            const safe = sanitizeRadialCoreSize(value);
            if (store.lyricVisualizerRadialCoreSize !== safe) store.lyricVisualizerRadialCoreSize = safe;
        },
    });

    heightManager.attach({
        select: controls.heightSelect,
        input: controls.heightCustom,
        addButton: controls.heightAdd,
        resetButton: controls.heightReset,
    });
    barCountManager.attach({
        select: controls.barCountSelect,
        input: controls.barCountCustom,
        addButton: controls.barCountAdd,
        resetButton: controls.barCountReset,
    });
    barWidthManager.attach({
        select: controls.barWidthSelect,
        input: controls.barWidthCustom,
        addButton: controls.barWidthAdd,
        resetButton: controls.barWidthReset,
    });
    transitionManager.attach({
        select: controls.transitionSelect,
        input: controls.transitionCustom,
        addButton: controls.transitionAdd,
        resetButton: controls.transitionReset,
    });
    opacityManager.attach({
        select: controls.opacitySelect,
        input: controls.opacityCustom,
        addButton: controls.opacityAdd,
        resetButton: controls.opacityReset,
    });
    frequencyMinManager.attach({
        select: controls.freqMinSelect,
        input: controls.freqMinCustom,
        addButton: controls.freqMinAdd,
        resetButton: controls.freqMinReset,
    });
    frequencyMaxManager.attach({
        select: controls.freqMaxSelect,
        input: controls.freqMaxCustom,
        addButton: controls.freqMaxAdd,
        resetButton: controls.freqMaxReset,
    });
    radialSizeManager.attach({
        select: controls.radialSizeSelect,
        input: controls.radialSizeCustom,
        addButton: controls.radialSizeAdd,
        resetButton: controls.radialSizeReset,
    });
    offsetXManager.attach({
        select: controls.offsetXSelect,
        input: controls.offsetXCustom,
        addButton: controls.offsetXAdd,
        resetButton: controls.offsetXReset,
    });
    offsetYManager.attach({
        select: controls.offsetYSelect,
        input: controls.offsetYCustom,
        addButton: controls.offsetYAdd,
        resetButton: controls.offsetYReset,
    });
    coreManager.attach({
        select: controls.coreSelect,
        input: controls.coreCustom,
        addButton: controls.coreAdd,
        resetButton: controls.coreReset,
    });

    const syncRadialVisibility = () => {
        if (!controls.radialSection) return;
        const styleValue = sanitizeStyle(store.lyricVisualizerStyle);
        if (styleValue === 'radial') controls.radialSection.classList.add('hm-visible');
        else controls.radialSection.classList.remove('hm-visible');
    };

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
                    syncFromStore();
                },
                subscriptions,
            );
        });

        attachListener(
            controls.colorPicker,
            'input',
            event => {
                applyCustom(event.target.value);
                syncFromStore();
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
                syncFromStore();
            },
            subscriptions,
        );

        attachListener(
            controls.colorText,
            'blur',
            event => {
                applyCustom(event.target.value);
                syncFromStore();
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

    function syncFromStore() {
        if (controls.enabled) controls.enabled.checked = Boolean(store.lyricVisualizer);
        if (controls.style) controls.style.value = sanitizeStyle(store.lyricVisualizerStyle);
        choiceManagers.forEach(manager => manager.sync());
        syncRadialVisibility();
        if (controls.colorRadios && controls.colorPicker && controls.colorText) syncColorState();
    }

    if (controls.enabled) {
        attachListener(
            controls.enabled,
            'change',
            event => {
                store.lyricVisualizer = Boolean(event.target.checked);
                syncFromStore();
            },
            subscriptions,
        );
    }

    if (controls.style) {
        attachListener(
            controls.style,
            'change',
            event => {
                const styleValue = sanitizeStyle(event.target.value);
                if (store.lyricVisualizerStyle !== styleValue) store.lyricVisualizerStyle = styleValue;
                syncFromStore();
            },
            subscriptions,
        );
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
                choiceManagers.forEach(manager => manager.resetValues({ skipOnReset: true }));
                syncFromStore();
                context.utils.notice?.('已恢复可视化默认设置', 2);
            },
            subscriptions,
        );
    }

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
