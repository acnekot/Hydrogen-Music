const DEFAULTS = Object.freeze({
    lyricVisualizer: false,
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

const sanitizeColor = value => {
    if (value === 'black' || value === 'white') return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
            if (trimmed.length === 4) {
                const expanded = trimmed
                    .split('')
                    .map((ch, index) => (index === 0 ? ch : ch + ch))
                    .join('');
                return expanded.toLowerCase();
            }
            return trimmed.toLowerCase();
        }
    }
    return DEFAULTS.color;
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
    font-family: "Source Han Sans", "Microsoft Yahei", sans-serif;
    color: rgba(18, 24, 38, 0.92);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(226, 232, 244, 0.98));
    min-height: 100%;
    padding: 28px 32px 40px;
    box-sizing: border-box;
}
.hm-visualizer-settings *,
.hm-visualizer-settings *::before,
.hm-visualizer-settings *::after {
    color: inherit !important;
    box-sizing: border-box;
}
.hm-visualizer-settings h2 {
    margin: 24px 0 12px;
    font-size: 18px;
    font-weight: 600;
}
.hm-visualizer-settings h2:first-of-type {
    margin-top: 0;
}
.hm-visualizer-card {
    border: 1px solid rgba(92, 122, 170, 0.28);
    background: rgba(255, 255, 255, 0.88);
    box-shadow: 0 16px 38px rgba(26, 40, 68, 0.16);
    padding: 20px 24px 24px;
    margin-bottom: 24px;
    color: inherit;
}
.hm-visualizer-row {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
    margin-bottom: 18px;
}
.hm-visualizer-row:last-child {
    margin-bottom: 0;
}
.hm-visualizer-label {
    min-width: 160px;
    font-size: 14px;
    font-weight: 600;
    color: inherit;
}
.hm-visualizer-inputs {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
}
.hm-visualizer-inputs input[type="range"] {
    flex: 1 1 220px;
    min-width: 200px;
    accent-color: rgba(70, 108, 196, 0.85);
}
.hm-visualizer-inputs input[type="number"],
.hm-visualizer-inputs input[type="text"],
.hm-visualizer-inputs select {
    width: 120px;
    padding: 6px 10px;
    border: 1px solid rgba(92, 122, 170, 0.35);
    background: rgba(255, 255, 255, 0.96);
    color: inherit;
    outline: none;
}
.hm-visualizer-inputs input[type="color"] {
    width: 48px;
    height: 28px;
    padding: 0;
    border: 1px solid rgba(92, 122, 170, 0.35);
    background: rgba(255, 255, 255, 0.96);
}
.hm-visualizer-toggle {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-size: 15px;
    cursor: pointer;
    color: inherit;
}
.hm-visualizer-toggle input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
}
.hm-visualizer-hint {
    margin: 6px 0 0;
    font-size: 13px;
    color: rgba(18, 24, 38, 0.6) !important;
}
.hm-visualizer-radial {
    display: none;
}
.hm-visualizer-radial.hm-visible {
    display: block;
}
.hm-visualizer-color-options {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
}
.hm-visualizer-color-option {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    color: inherit;
}
.hm-visualizer-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
}
.hm-visualizer-button {
    padding: 8px 18px;
    border: 1px solid rgba(92, 122, 170, 0.38);
    background: rgba(242, 245, 255, 0.92);
    color: rgba(18, 24, 38, 0.88) !important;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease;
}
.hm-visualizer-button:hover,
.hm-visualizer-button:focus-visible {
    background: rgba(255, 255, 255, 1);
}
.dark .hm-visualizer-settings {
    color: var(--text, #f1f3f5);
    background: linear-gradient(180deg, rgba(44, 52, 64, 0.96), rgba(32, 39, 50, 0.98));
}
.dark .hm-visualizer-card {
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(46, 56, 68, 0.86);
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.35);
}
.dark .hm-visualizer-hint {
    color: rgba(241, 243, 245, 0.75) !important;
}
.dark .hm-visualizer-inputs input[type="number"],
.dark .hm-visualizer-inputs input[type="text"],
.dark .hm-visualizer-inputs select,
.dark .hm-visualizer-inputs input[type="color"] {
    background: rgba(29, 36, 46, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.24);
    color: inherit !important;
}
.dark .hm-visualizer-inputs input[type="range"] {
    accent-color: rgba(129, 168, 255, 0.85);
}
.dark .hm-visualizer-button {
    border: 1px solid rgba(255, 255, 255, 0.22);
    background: rgba(76, 92, 120, 0.82);
    color: var(--text, #f1f3f5) !important;
}
.dark .hm-visualizer-button:hover,
.dark .hm-visualizer-button:focus-visible {
    background: rgba(98, 118, 150, 0.88);
}
`;
    container.appendChild(style);
    nodes.push(style);

    const root = document.createElement('div');
    root.className = 'hm-visualizer-settings';
    root.innerHTML = `
        <div class="hm-visualizer-card">
            <div class="hm-visualizer-row">
                <label class="hm-visualizer-toggle">
                    <input type="checkbox" data-field="enabled" />
                    <span>Enable lyric visualizer</span>
                </label>
            </div>
            <p class="hm-visualizer-hint">When enabled, the lyric view renders a live spectrum or radial visualizer powered by your current song.</p>
        </div>
        <div class="hm-visualizer-card">
            <h2>Appearance</h2>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-label">Visualizer style</div>
                <div class="hm-visualizer-inputs">
                    <select data-field="style">
                        <option value="bars">Spectrum bars</option>
                        <option value="radial">Radial nebula</option>
                    </select>
                </div>
            </div>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-label">Canvas height (px)</div>
                <div class="hm-visualizer-inputs">
                    <input type="range" min="120" max="520" step="10" data-field="height-range" />
                    <input type="number" min="120" max="520" step="10" data-field="height-number" />
                </div>
            </div>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-label">Bar count</div>
                <div class="hm-visualizer-inputs">
                    <input type="range" min="16" max="160" step="1" data-field="barcount-range" />
                    <input type="number" min="16" max="160" step="1" data-field="barcount-number" />
                </div>
            </div>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-label">Bar width (%)</div>
                <div class="hm-visualizer-inputs">
                    <input type="range" min="5" max="100" step="1" data-field="barwidth-range" />
                    <input type="number" min="5" max="100" step="1" data-field="barwidth-number" />
                </div>
            </div>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-label">Smoothing</div>
                <div class="hm-visualizer-inputs">
                    <input type="range" min="0" max="95" step="5" data-field="transition-range" />
                    <input type="number" min="0" max="0.95" step="0.05" data-field="transition-number" />
                </div>
            </div>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-label">Opacity (%)</div>
                <div class="hm-visualizer-inputs">
                    <input type="range" min="0" max="100" step="5" data-field="opacity-range" />
                    <input type="number" min="0" max="100" step="1" data-field="opacity-number" />
                </div>
            </div>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-label">Frequency range (Hz)</div>
                <div class="hm-visualizer-inputs">
                    <input type="number" min="20" max="19990" step="10" data-field="freqmin-number" />
                    <span>to</span>
                    <input type="number" min="30" max="20000" step="10" data-field="freqmax-number" />
                </div>
            </div>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-label">Visualizer colour</div>
                <div class="hm-visualizer-inputs hm-visualizer-color-options">
                    <label class="hm-visualizer-color-option">
                        <input type="radio" name="visualizer-color" value="black" />
                        <span>Dark</span>
                    </label>
                    <label class="hm-visualizer-color-option">
                        <input type="radio" name="visualizer-color" value="white" />
                        <span>Light</span>
                    </label>
                    <label class="hm-visualizer-color-option">
                        <input type="radio" name="visualizer-color" value="custom" />
                        <span>Custom</span>
                        <input type="color" data-field="color-picker" value="#000000" />
                        <input type="text" data-field="color-text" maxlength="7" placeholder="#000000" />
                    </label>
                </div>
            </div>
        </div>
        <div class="hm-visualizer-card hm-visualizer-radial" data-section="radial">
            <h2>Radial style</h2>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-label">Radial radius (%)</div>
                <div class="hm-visualizer-inputs">
                    <input type="range" min="20" max="240" step="5" data-field="radialsize-range" />
                    <input type="number" min="20" max="240" step="5" data-field="radialsize-number" />
                </div>
            </div>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-label">Center offset X (%)</div>
                <div class="hm-visualizer-inputs">
                    <input type="range" min="-100" max="100" step="5" data-field="offsetx-range" />
                    <input type="number" min="-100" max="100" step="5" data-field="offsetx-number" />
                </div>
            </div>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-label">Center offset Y (%)</div>
                <div class="hm-visualizer-inputs">
                    <input type="range" min="-100" max="100" step="5" data-field="offsety-range" />
                    <input type="number" min="-100" max="100" step="5" data-field="offsety-number" />
                </div>
            </div>
            <div class="hm-visualizer-row">
                <div class="hm-visualizer-label">Core radius (%)</div>
                <div class="hm-visualizer-inputs">
                    <input type="range" min="20" max="90" step="1" data-field="core-range" />
                    <input type="number" min="20" max="90" step="1" data-field="core-number" />
                </div>
            </div>
        </div>
        <div class="hm-visualizer-footer">
            <button type="button" class="hm-visualizer-button" data-action="reset">Restore defaults</button>
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

    if (controls.colorRadios && controls.colorPicker && controls.colorText) {
        const syncColorState = () => {
            const current = store.lyricVisualizerColor;
            if (current === 'black' || current === 'white') {
                controls.colorRadios.forEach(radio => {
                    radio.checked = radio.value === current;
                });
                const baseHex = current === 'white' ? '#ffffff' : '#000000';
                controls.colorPicker.value = baseHex;
                controls.colorText.value = baseHex;
                controls.colorPicker.disabled = true;
                controls.colorText.disabled = true;
            } else {
                const hex = sanitizeColor(current);
                controls.colorRadios.forEach(radio => {
                    radio.checked = radio.value === 'custom';
                });
                const hexValue = hex.startsWith('#') ? hex : `#${hex.replace(/^#/, '')}`;
                controls.colorPicker.value = hexValue;
                controls.colorText.value = hexValue;
                controls.colorPicker.disabled = false;
                controls.colorText.disabled = false;
            }
        };

        const applyColorValue = next => {
            const safe = sanitizeColor(next);
            if (store.lyricVisualizerColor !== safe) {
                store.lyricVisualizerColor = safe;
            }
            syncColorState();
        };

        controls.colorRadios.forEach(radio => {
            attachListener(
                radio,
                'change',
                event => {
                    if (!event.target.checked) return;
                    const mode = event.target.value;
                    if (mode === 'black' || mode === 'white') {
                        applyColorValue(mode);
                    } else {
                        applyColorValue(controls.colorPicker.value || '#000000');
                    }
                },
                subscriptions,
            );
        });

        attachListener(
            controls.colorPicker,
            'input',
            event => {
                const value = event.target.value;
                controls.colorText.value = value;
                applyColorValue(value);
            },
            subscriptions,
        );

        attachListener(
            controls.colorText,
            'change',
            event => {
                const raw = event.target.value;
                const safe = sanitizeColor(raw);
                const normalized = safe.startsWith('#') ? safe : `#${safe.replace(/^#/, '')}`;
                controls.colorPicker.value = normalized;
                controls.colorText.value = normalized;
                applyColorValue(normalized);
            },
            subscriptions,
        );

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
                controls.colorRadios?.forEach(radio => {
                    radio.checked = radio.value === DEFAULTS.color;
                });
                controls.colorPicker.value = '#000000';
                controls.colorText.value = '#000000';
                context.utils.notice?.('Visualizer defaults restored', 2);
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
        if (controls.colorRadios && controls.colorPicker && controls.colorText) {
            const current = store.lyricVisualizerColor;
            if (current === 'black' || current === 'white') {
                controls.colorRadios.forEach(radio => {
                    radio.checked = radio.value === current;
                });
                const baseHex = current === 'white' ? '#ffffff' : '#000000';
                controls.colorPicker.value = baseHex;
                controls.colorText.value = baseHex;
                controls.colorPicker.disabled = true;
                controls.colorText.disabled = true;
            } else {
                controls.colorRadios.forEach(radio => {
                    radio.checked = radio.value === 'custom';
                });
                const hex = sanitizeColor(current);
                const hexValue = hex.startsWith('#') ? hex : `#${hex.replace(/^#/, '')}`;
                controls.colorPicker.value = hexValue;
                controls.colorText.value = hexValue;
                controls.colorPicker.disabled = false;
                controls.colorText.disabled = false;
            }
        }
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
        title: 'Lyric Visualizer',
        subtitle: 'Tune how the lyric visualizer looks and behaves',
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
        if (store.lyricVisualizer) {
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

        context.utils?.notice?.('Lyric visualizer plugin is active', 2.5);
    },
};
