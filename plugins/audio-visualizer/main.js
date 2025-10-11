const clampNumber = (value, min, max, fallback = min) => {
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number)) return fallback;
    if (number < min) return min;
    if (number > max) return max;
    return number;
};

const normalizeStoreValues = store => {
    if (!store) return;
    store.lyricVisualizerHeight = Math.round(clampNumber(store.lyricVisualizerHeight, 80, 640, 220));
    let freqMin = Math.round(clampNumber(store.lyricVisualizerFrequencyMin, 20, 20000, 20));
    let freqMax = Math.round(clampNumber(store.lyricVisualizerFrequencyMax, 20, 20000, 8000));
    if (freqMin > freqMax) {
        const temp = freqMin;
        freqMin = freqMax;
        freqMax = temp;
    }
    store.lyricVisualizerFrequencyMin = freqMin;
    store.lyricVisualizerFrequencyMax = Math.max(freqMax, freqMin);
    store.lyricVisualizerTransitionDelay = clampNumber(store.lyricVisualizerTransitionDelay, 0, 0.95, 0.75);
    store.lyricVisualizerBarCount = Math.round(clampNumber(store.lyricVisualizerBarCount, 4, 256, 48));
    store.lyricVisualizerBarWidth = Math.round(clampNumber(store.lyricVisualizerBarWidth, 5, 100, 55));
    store.lyricVisualizerOpacity = Math.round(clampNumber(store.lyricVisualizerOpacity, 0, 100, 100));
    store.lyricVisualizerStyle = store.lyricVisualizerStyle === 'radial' ? 'radial' : 'bars';
    store.lyricVisualizerRadialSize = Math.round(clampNumber(store.lyricVisualizerRadialSize, 10, 400, 100));
    store.lyricVisualizerRadialOffsetX = Math.round(clampNumber(store.lyricVisualizerRadialOffsetX, -100, 100, 0));
    store.lyricVisualizerRadialOffsetY = Math.round(clampNumber(store.lyricVisualizerRadialOffsetY, -100, 100, 0));
    store.lyricVisualizerRadialCoreSize = Math.round(clampNumber(store.lyricVisualizerRadialCoreSize, 10, 95, 62));
    if (store.lyricVisualizerColor !== 'white') {
        store.lyricVisualizerColor = 'black';
    }
};

const formatNumber = (value, options = {}) => {
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number)) return options.fallback || '0';
    if (typeof options.precision === 'number') {
        return number.toFixed(options.precision);
    }
    return String(Math.round(number));
};

const mountSettings = (container, store) => {
    container.innerHTML = '';
    const nodes = [];
    const cleanups = [];

    const style = document.createElement('style');
    style.textContent = `
.hm-av-settings {
    position: relative;
    font-family: "Source Han Sans", "Microsoft Yahei", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: var(--plugin-settings-text, var(--text, #111213));
    padding: 32px 36px 44px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 24px;
    line-height: 1.6;
    color-scheme: var(--plugin-settings-color-scheme, light);
}
.dark .hm-av-settings {
    color-scheme: dark;
}
.hm-av-settings::before {
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
.dark .hm-av-settings::before {
    background: var(--plugin-settings-bg, var(--settings-shell-bg, #181c23));
    opacity: 0.9;
    filter: saturate(1.12) brightness(0.92);
}
.hm-av-card {
    background: var(--plugin-settings-surface, var(--panel, rgba(255, 255, 255, 0.92)));
    border: 1px solid var(--plugin-settings-border, var(--border, rgba(0, 0, 0, 0.18)));
    box-shadow: var(--plugin-settings-shadow, 0 18px 36px rgba(20, 32, 58, 0.18));
    border-radius: 20px;
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    backdrop-filter: blur(18px);
}
.dark .hm-av-card {
    background: var(--plugin-settings-surface, var(--panel, rgba(52, 58, 68, 0.92)));
    border-color: var(--plugin-settings-border, var(--border, rgba(255, 255, 255, 0.22)));
    box-shadow: var(--plugin-settings-shadow, 0 18px 36px rgba(0, 0, 0, 0.55));
}
.hm-av-card h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
}
.hm-av-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.hm-av-field label {
    font-size: 14px;
    font-weight: 500;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
}
.hm-av-field label span[data-display] {
    font-size: 12px;
    opacity: 0.72;
}
.hm-av-field input[type='range'] {
    width: 100%;
}
.hm-av-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px 20px;
}
.hm-av-select,
.hm-av-input {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border-radius: 12px;
    border: 1px solid var(--plugin-settings-border, rgba(0, 0, 0, 0.18));
    background: var(--plugin-settings-surface, rgba(255, 255, 255, 0.9));
    color: inherit;
    font: inherit;
}
.dark .hm-av-select,
.dark .hm-av-input {
    background: var(--plugin-settings-surface, rgba(255, 255, 255, 0.12));
}
.hm-av-note {
    font-size: 13px;
    opacity: 0.7;
}
.hm-av-card[data-section='radial'] {
    display: none;
}
.hm-av-settings[data-style='radial'] .hm-av-card[data-section='radial'] {
    display: flex;
}
@media (max-width: 720px) {
    .hm-av-settings {
        padding: 24px 24px 32px;
    }
    .hm-av-card {
        padding: 20px 22px;
    }
}
`;
    container.appendChild(style);
    nodes.push(style);

    const root = document.createElement('div');
    root.className = 'hm-av-settings';
    root.innerHTML = `
        <div class="hm-av-card">
            <h2>基础外观</h2>
            <div class="hm-av-grid">
                <div class="hm-av-field">
                    <label>可视化样式</label>
                    <select class="hm-av-select" data-field="style">
                        <option value="bars">柱状条形</option>
                        <option value="radial">辐射圆环</option>
                    </select>
                </div>
                <div class="hm-av-field">
                    <label>主色调</label>
                    <select class="hm-av-select" data-field="color">
                        <option value="black">黑色</option>
                        <option value="white">白色</option>
                    </select>
                </div>
            </div>
            <div class="hm-av-field">
                <label>可视化高度<span data-display="height"></span></label>
                <input type="range" min="80" max="640" step="10" data-field="height" />
            </div>
            <div class="hm-av-field">
                <label>可视化透明度<span data-display="opacity"></span></label>
                <input type="range" min="0" max="100" step="1" data-field="opacity" />
            </div>
            <div class="hm-av-field">
                <label>过渡延迟<span data-display="transition"></span></label>
                <input type="range" min="0" max="0.95" step="0.01" data-field="transition" />
                <div class="hm-av-note">用于控制频谱响应的平滑度，值越大变化越柔和。</div>
            </div>
        </div>
        <div class="hm-av-card">
            <h2>频率与柱体</h2>
            <div class="hm-av-grid">
                <div class="hm-av-field">
                    <label>最低频率<span data-display="freqMin"></span></label>
                    <input class="hm-av-input" type="number" min="20" max="20000" step="10" data-field="frequency-min" />
                </div>
                <div class="hm-av-field">
                    <label>最高频率<span data-display="freqMax"></span></label>
                    <input class="hm-av-input" type="number" min="20" max="20000" step="10" data-field="frequency-max" />
                </div>
            </div>
            <div class="hm-av-field">
                <label>柱体数量<span data-display="barCount"></span></label>
                <input type="range" min="4" max="160" step="1" data-field="bar-count" />
            </div>
            <div class="hm-av-field">
                <label>柱体宽度<span data-display="barWidth"></span></label>
                <input type="range" min="5" max="100" step="1" data-field="bar-width" />
            </div>
        </div>
        <div class="hm-av-card" data-section="radial">
            <h2>辐射样式</h2>
            <div class="hm-av-field">
                <label>圆环尺寸<span data-display="radialSize"></span></label>
                <input type="range" min="10" max="400" step="1" data-field="radial-size" />
            </div>
            <div class="hm-av-grid">
                <div class="hm-av-field">
                    <label>水平偏移<span data-display="radialOffsetX"></span></label>
                    <input type="range" min="-100" max="100" step="1" data-field="radial-offset-x" />
                </div>
                <div class="hm-av-field">
                    <label>垂直偏移<span data-display="radialOffsetY"></span></label>
                    <input type="range" min="-100" max="100" step="1" data-field="radial-offset-y" />
                </div>
            </div>
            <div class="hm-av-field">
                <label>圆心大小<span data-display="radialCore"></span></label>
                <input type="range" min="10" max="95" step="1" data-field="radial-core" />
            </div>
            <div class="hm-av-note">辐射样式支持自定义位置与核心占比，可根据歌词布局微调。</div>
        </div>
    `;
    container.appendChild(root);
    nodes.push(root);

    const q = selector => root.querySelector(selector);

    const updateDisplays = state => {
        const setText = (key, text) => {
            const node = q(`[data-display="${key}"]`);
            if (node) node.textContent = text;
        };
        setText('height', `${state.height}px`);
        setText('opacity', `${state.opacity}%`);
        setText('transition', formatNumber(state.transition, { precision: 2 }));
        setText('freqMin', `${state.frequencyMin} Hz`);
        setText('freqMax', `${state.frequencyMax} Hz`);
        setText('barCount', `${state.barCount} 条`);
        setText('barWidth', `${state.barWidth}%`);
        setText('radialSize', `${state.radialSize}%`);
        setText('radialOffsetX', `${state.radialOffsetX}%`);
        setText('radialOffsetY', `${state.radialOffsetY}%`);
        setText('radialCore', `${state.radialCore}%`);
    };

    const readState = () => {
        if (!store) {
            return {
                style: 'bars',
                color: 'black',
                height: 220,
                opacity: 100,
                transition: 0.75,
                frequencyMin: 20,
                frequencyMax: 8000,
                barCount: 48,
                barWidth: 55,
                radialSize: 100,
                radialOffsetX: 0,
                radialOffsetY: 0,
                radialCore: 62,
            };
        }
        const state = {
            style: store.lyricVisualizerStyle === 'radial' ? 'radial' : 'bars',
            color: store.lyricVisualizerColor === 'white' ? 'white' : 'black',
            height: Math.round(clampNumber(store.lyricVisualizerHeight, 80, 640, 220)),
            opacity: Math.round(clampNumber(store.lyricVisualizerOpacity, 0, 100, 100)),
            transition: clampNumber(store.lyricVisualizerTransitionDelay, 0, 0.95, 0.75),
            frequencyMin: Math.round(clampNumber(store.lyricVisualizerFrequencyMin, 20, 20000, 20)),
            frequencyMax: Math.round(clampNumber(store.lyricVisualizerFrequencyMax, 20, 20000, 8000)),
            barCount: Math.round(clampNumber(store.lyricVisualizerBarCount, 4, 256, 48)),
            barWidth: Math.round(clampNumber(store.lyricVisualizerBarWidth, 5, 100, 55)),
            radialSize: Math.round(clampNumber(store.lyricVisualizerRadialSize, 10, 400, 100)),
            radialOffsetX: Math.round(clampNumber(store.lyricVisualizerRadialOffsetX, -100, 100, 0)),
            radialOffsetY: Math.round(clampNumber(store.lyricVisualizerRadialOffsetY, -100, 100, 0)),
            radialCore: Math.round(clampNumber(store.lyricVisualizerRadialCoreSize, 10, 95, 62)),
        };
        if (state.frequencyMin > state.frequencyMax) {
            state.frequencyMax = state.frequencyMin;
        }
        return state;
    };

    const applyStateToInputs = state => {
        const setValue = (selector, value) => {
            const element = q(selector);
            if (!element) return;
            if (element.type === 'range' || element.type === 'number') {
                if (String(element.value) !== String(value)) element.value = String(value);
            } else {
                if (element.value !== value) element.value = value;
            }
        };
        setValue('[data-field="style"]', state.style);
        setValue('[data-field="color"]', state.color);
        setValue('[data-field="height"]', state.height);
        setValue('[data-field="opacity"]', state.opacity);
        setValue('[data-field="transition"]', state.transition);
        setValue('[data-field="frequency-min"]', state.frequencyMin);
        setValue('[data-field="frequency-max"]', state.frequencyMax);
        setValue('[data-field="bar-count"]', state.barCount);
        setValue('[data-field="bar-width"]', state.barWidth);
        setValue('[data-field="radial-size"]', state.radialSize);
        setValue('[data-field="radial-offset-x"]', state.radialOffsetX);
        setValue('[data-field="radial-offset-y"]', state.radialOffsetY);
        setValue('[data-field="radial-core"]', state.radialCore);
        root.dataset.style = state.style;
        updateDisplays(state);
    };

    const syncFromStore = () => {
        const state = readState();
        applyStateToInputs(state);
    };

    const bind = (selector, event, handler) => {
        const element = q(selector);
        if (!element) return;
        element.addEventListener(event, handler);
        cleanups.push(() => element.removeEventListener(event, handler));
    };

    bind('[data-field="style"]', 'change', event => {
        if (!store) return;
        const value = event.target.value === 'radial' ? 'radial' : 'bars';
        if (store.lyricVisualizerStyle !== value) {
            store.lyricVisualizerStyle = value;
        }
        syncFromStore();
    });

    bind('[data-field="color"]', 'change', event => {
        if (!store) return;
        const value = event.target.value === 'white' ? 'white' : 'black';
        if (store.lyricVisualizerColor !== value) {
            store.lyricVisualizerColor = value;
        }
        syncFromStore();
    });

    const bindRange = (selector, apply) => {
        bind(selector, 'input', event => {
            if (!store) return;
            apply(event.target.value);
            syncFromStore();
        });
        bind(selector, 'change', event => {
            if (!store) return;
            apply(event.target.value);
            syncFromStore();
        });
    };

    bindRange('[data-field="height"]', value => {
        if (!store) return;
        const next = Math.round(clampNumber(value, 80, 640, 220));
        if (store.lyricVisualizerHeight !== next) store.lyricVisualizerHeight = next;
    });

    bindRange('[data-field="opacity"]', value => {
        if (!store) return;
        const next = Math.round(clampNumber(value, 0, 100, 100));
        if (store.lyricVisualizerOpacity !== next) store.lyricVisualizerOpacity = next;
    });

    bindRange('[data-field="transition"]', value => {
        if (!store) return;
        const next = clampNumber(value, 0, 0.95, 0.75);
        if (store.lyricVisualizerTransitionDelay !== next) store.lyricVisualizerTransitionDelay = next;
    });

    bindRange('[data-field="bar-count"]', value => {
        if (!store) return;
        const next = Math.round(clampNumber(value, 4, 256, 48));
        if (store.lyricVisualizerBarCount !== next) store.lyricVisualizerBarCount = next;
    });

    bindRange('[data-field="bar-width"]', value => {
        if (!store) return;
        const next = Math.round(clampNumber(value, 5, 100, 55));
        if (store.lyricVisualizerBarWidth !== next) store.lyricVisualizerBarWidth = next;
    });

    bindRange('[data-field="radial-size"]', value => {
        if (!store) return;
        const next = Math.round(clampNumber(value, 10, 400, 100));
        if (store.lyricVisualizerRadialSize !== next) store.lyricVisualizerRadialSize = next;
    });

    bindRange('[data-field="radial-offset-x"]', value => {
        if (!store) return;
        const next = Math.round(clampNumber(value, -100, 100, 0));
        if (store.lyricVisualizerRadialOffsetX !== next) store.lyricVisualizerRadialOffsetX = next;
    });

    bindRange('[data-field="radial-offset-y"]', value => {
        if (!store) return;
        const next = Math.round(clampNumber(value, -100, 100, 0));
        if (store.lyricVisualizerRadialOffsetY !== next) store.lyricVisualizerRadialOffsetY = next;
    });

    bindRange('[data-field="radial-core"]', value => {
        if (!store) return;
        const next = Math.round(clampNumber(value, 10, 95, 62));
        if (store.lyricVisualizerRadialCoreSize !== next) store.lyricVisualizerRadialCoreSize = next;
    });

    const frequencyMinInput = q('[data-field="frequency-min"]');
    const frequencyMaxInput = q('[data-field="frequency-max"]');

    const applyFrequencyMin = value => {
        if (!store) return;
        const next = Math.round(clampNumber(value, 20, 20000, 20));
        if (store.lyricVisualizerFrequencyMin !== next) {
            store.lyricVisualizerFrequencyMin = next;
        }
        if (store.lyricVisualizerFrequencyMax < next) {
            store.lyricVisualizerFrequencyMax = next;
        }
    };

    const applyFrequencyMax = value => {
        if (!store) return;
        const next = Math.round(clampNumber(value, 20, 20000, 8000));
        if (store.lyricVisualizerFrequencyMax !== next) {
            store.lyricVisualizerFrequencyMax = next;
        }
        if (store.lyricVisualizerFrequencyMin > next) {
            store.lyricVisualizerFrequencyMin = next;
        }
    };

    if (frequencyMinInput) {
        const handler = event => {
            applyFrequencyMin(event.target.value);
            syncFromStore();
        };
        frequencyMinInput.addEventListener('change', handler);
        frequencyMinInput.addEventListener('blur', handler);
        cleanups.push(() => {
            frequencyMinInput.removeEventListener('change', handler);
            frequencyMinInput.removeEventListener('blur', handler);
        });
    }

    if (frequencyMaxInput) {
        const handler = event => {
            applyFrequencyMax(event.target.value);
            syncFromStore();
        };
        frequencyMaxInput.addEventListener('change', handler);
        frequencyMaxInput.addEventListener('blur', handler);
        cleanups.push(() => {
            frequencyMaxInput.removeEventListener('change', handler);
            frequencyMaxInput.removeEventListener('blur', handler);
        });
    }

    let unsubscribe = null;
    if (store?.$subscribe) {
        unsubscribe = store.$subscribe(() => syncFromStore());
    }

    syncFromStore();

    return () => {
        cleanups.forEach(dispose => {
            try {
                dispose();
            } catch (_) {}
        });
        if (unsubscribe) {
            try {
                unsubscribe();
            } catch (_) {}
            unsubscribe = null;
        }
        nodes.forEach(node => {
            if (node && node.parentNode === container) container.removeChild(node);
        });
        container.innerHTML = '';
    };
};

module.exports = {
    activate(context) {
        const store = context?.stores?.player || null;
        if (!store) {
            context.utils?.notice?.('歌词音频可视化：未能访问播放器状态', 3);
            return;
        }

        normalizeStoreValues(store);
        store.lyricVisualizerPluginActive = true;
        store.lyricVisualizerToggleAvailable = true;
        if (store.lyricVisualizerColor !== 'white' && store.lyricVisualizerColor !== 'black') {
            store.lyricVisualizerColor = 'black';
        }

        const disposables = [];

        const unregisterSettings = context.settings?.register?.({
            id: 'core.audio-visualizer.settings',
            title: '歌词音频可视化',
            subtitle: '调整歌词区域的频谱动画与样式参数',
            mount(container) {
                return mountSettings(container, store);
            },
        });

        if (typeof unregisterSettings === 'function') {
            disposables.push(unregisterSettings);
        }

        context.onCleanup(() => {
            disposables.forEach(dispose => {
                try {
                    dispose();
                } catch (_) {}
            });
            if (store) {
                store.lyricVisualizerPluginActive = false;
                store.lyricVisualizerToggleAvailable = false;
            }
        });

        context.utils?.notice?.('歌词音频可视化插件已启用', 2.5);
    },
};
