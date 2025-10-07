<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, computed, reactive } from 'vue';
import { changeProgress, musicVideoCheck, songTime } from '../utils/player';
import { usePlayerStore } from '../store/playerStore';
import { getLyricVisualizerAudioEnv } from '../utils/lyricVisualizerAudio';
import { computeCustomBackgroundStyle } from '../utils/customBackground';
import { storeToRefs } from 'pinia';

const playerStore = usePlayerStore();
const {
    playing,
    progress,
    lyricsObjArr,
    songList,
    currentIndex,
    currentMusic,
    widgetState,
    lyricShow,
    lyricEle,
    isLyricDelay,
    lyricSize,
    tlyricSize,
    rlyricSize,
    lyricType,
    playerChangeSong,
    lyricInterludeTime,
    lyricBlur,
    lyricVisualizer,
    lyricVisualizerHeight,
    lyricVisualizerFrequencyMin,
    lyricVisualizerFrequencyMax,
    lyricVisualizerTransitionDelay,
    lyricVisualizerBarCount,
    lyricVisualizerBarWidth,
    lyricVisualizerColor,
    lyricVisualizerOpacity,
    lyricVisualizerStyle,
    lyricVisualizerRadialSize,
    lyricVisualizerRadialOffsetX,
    lyricVisualizerRadialOffsetY,
    lyricVisualizerRadialCoreSize,
    customBackgroundEnabled,
    customBackgroundImage,
    customBackgroundMode,
    customBackgroundBlur,
    customBackgroundBrightness,
    customBackgroundApplyToPlayer,
    customBackgroundApplyToChrome,
    playerShow,
    videoIsPlaying,
} = storeToRefs(playerStore);

const lyricScroll = ref();
const lyricScrollArea = ref();
const audioEnv = getLyricVisualizerAudioEnv();
const heightVal = ref(0);
const minHeightVal = ref(null);
const maxHeightVal = ref(null);
const lineOffset = ref(0);
const isLyricActive = ref(true);
const pauseActiveTimer = ref(null);
const lycCurrentIndex = ref(null);
const interludeIndex = ref(null);
const interludeAnimation = ref(false);
const interludeRemainingTime = ref(null);
let interludeInTimer = null;
let interludeOutTimer = null;

let initMax = null;
let initOffset = null;
let size = null;

let lyricLastPosition = null;
// 切回歌词时抑制首帧闪烁（先隐藏，定位完成后再显示）
const suppressLyricFlash = ref(true);

// 在高频同步中避免并发测量
const syncingLayout = ref(false);

const lyricVisualizerCanvas = ref(null);
const visualizerContainerSize = reactive({ width: 0, height: 0 });

const clampNumber = (value, min, max, fallback = min) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return fallback;
    return Math.min(Math.max(numeric, min), max);
};

const parseColorToRGB = color => {
    if (!color || typeof color !== 'string') return { r: 0, g: 0, b: 0 };
    const value = color.trim();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
        let hex = value.substring(1);
        if (hex.length === 3) hex = hex.split('').map(ch => ch + ch).join('');
        const intVal = parseInt(hex, 16);
        return {
            r: (intVal >> 16) & 255,
            g: (intVal >> 8) & 255,
            b: intVal & 255,
        };
    }
    const rgbMatch = value.match(/^rgba?\(([^)]+)\)$/i);
    if (rgbMatch) {
        const parts = rgbMatch[1]
            .split(',')
            .map(part => Number.parseFloat(part.trim()))
            .filter((_, index) => index < 3);
        if (parts.length === 3 && parts.every(part => Number.isFinite(part))) {
            return { r: clampNumber(parts[0], 0, 255, 0), g: clampNumber(parts[1], 0, 255, 0), b: clampNumber(parts[2], 0, 255, 0) };
        }
    }
    return { r: 0, g: 0, b: 0 };
};

const fallbackNumber = (value, fallback) => {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    return fallback;
};

const DEFAULT_FREQ_MIN = 20;
const DEFAULT_FREQ_MAX = 8000;
const VISUALIZER_HEIGHT_OFFSET = 3;
// Preserve the original configuration value as a baseline so the rendered height scales with layout changes
const VISUALIZER_REFERENCE_CONTAINER_HEIGHT = 720;

const visualizerBaseHeightPx = computed(() => Math.max(0, fallbackNumber(lyricVisualizerHeight.value ?? 220, 220)));
const visualizerHeightPx = computed(() => {
    const baseHeight = visualizerBaseHeightPx.value;
    const containerHeight =
        visualizerContainerSize.height ||
        lyricScroll.value?.clientHeight ||
        lyricVisualizerCanvas.value?.parentElement?.clientHeight ||
        0;
    if (!containerHeight) return baseHeight;
    if (containerHeight <= baseHeight) return containerHeight;
    const scaleFactor = containerHeight / VISUALIZER_REFERENCE_CONTAINER_HEIGHT;
    const scaled = baseHeight * scaleFactor;
    const target = Math.min(containerHeight, Math.max(baseHeight, scaled));
    return Math.round(clampNumber(target, baseHeight, containerHeight, baseHeight));
});
const visualizerCanvasHeightPx = computed(() => Math.max(0, visualizerHeightPx.value + VISUALIZER_HEIGHT_OFFSET));

const normalizeFrequencyRange = (minValue, maxValue) => {
    let min = fallbackNumber(minValue ?? DEFAULT_FREQ_MIN, DEFAULT_FREQ_MIN);
    let max = fallbackNumber(maxValue ?? DEFAULT_FREQ_MAX, DEFAULT_FREQ_MAX);
    min = clampNumber(Math.round(min), 20, 20000, DEFAULT_FREQ_MIN);
    max = clampNumber(Math.round(max), 20, 20000, DEFAULT_FREQ_MAX);
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

const visualizerFrequencyRange = computed(() =>
    normalizeFrequencyRange(lyricVisualizerFrequencyMin.value, lyricVisualizerFrequencyMax.value)
);
const visualizerFrequencyMinValue = computed(() => visualizerFrequencyRange.value.min);
const visualizerFrequencyMaxValue = computed(() => visualizerFrequencyRange.value.max);
const visualizerSmoothing = computed(() => {
    const value = Number(lyricVisualizerTransitionDelay.value);
    if (Number.isFinite(value)) return Math.min(Math.max(value, 0), 0.95);
    return 0.75;
});
const visualizerBarCountValue = computed(() => {
    const value = Number(lyricVisualizerBarCount.value);
    if (!Number.isFinite(value) || value <= 0) return 1;
    return Math.round(value);
});
const visualizerBarWidthRatio = computed(() => {
    const value = Number(lyricVisualizerBarWidth.value);
    if (!Number.isFinite(value) || value <= 0) return 0.55;
    return Math.min(value, 100) / 100;
});
const visualizerColorRGB = computed(() => {
    if (lyricVisualizerColor.value === 'white') return { r: 255, g: 255, b: 255 };
    if (lyricVisualizerColor.value === 'black') return { r: 0, g: 0, b: 0 };
    return parseColorToRGB(lyricVisualizerColor.value);
});

const visualizerOpacityValue = computed(() => {
    const value = Number(lyricVisualizerOpacity.value);
    if (!Number.isFinite(value)) return 100;
    return Math.min(Math.max(Math.round(value), 0), 100);
});

const visualizerOpacityRatio = computed(() => {
    const ratio = visualizerOpacityValue.value / 100;
    if (!Number.isFinite(ratio)) return 1;
    return Math.min(Math.max(ratio, 0), 1);
});

const visualizerStyleValue = computed(() => (lyricVisualizerStyle.value === 'radial' ? 'radial' : 'bars'));

const visualizerRadialSizeValue = computed(() => {
    const value = Number(lyricVisualizerRadialSize.value);
    if (!Number.isFinite(value)) return 100;
    return clampNumber(Math.round(value), 10, 400, 100);
});

const visualizerRadialSizeRatio = computed(() => visualizerRadialSizeValue.value / 100);

const visualizerRadialOffsetXValue = computed(() => {
    const value = Number(lyricVisualizerRadialOffsetX.value);
    if (!Number.isFinite(value)) return 0;
    return clampNumber(Math.round(value), -100, 100, 0);
});

const visualizerRadialOffsetYValue = computed(() => {
    const value = Number(lyricVisualizerRadialOffsetY.value);
    if (!Number.isFinite(value)) return 0;
    return clampNumber(Math.round(value), -100, 100, 0);
});

const visualizerRadialCoreSizeValue = computed(() => {
    const value = Number(lyricVisualizerRadialCoreSize.value);
    if (!Number.isFinite(value)) return 62;
    return clampNumber(Math.round(value), 10, 95, 62);
});

const visualizerRadialCoreSizeRatio = computed(() => visualizerRadialCoreSizeValue.value / 100);

const lyricBackgroundActive = computed(
    () =>
        customBackgroundEnabled.value &&
        !!customBackgroundImage.value &&
        (customBackgroundApplyToPlayer.value || customBackgroundApplyToChrome.value)
);

const lyricBackgroundStyle = computed(() =>
    computeCustomBackgroundStyle({
        active: lyricBackgroundActive.value,
        image: customBackgroundImage.value,
        mode: customBackgroundMode.value,
        blur: customBackgroundBlur.value,
        brightness: customBackgroundBrightness.value,
    })
);

const lyricContainerClasses = computed(() => ({
    'blur-enabled': lyricBlur.value,
    'lyric-container--custom': lyricBackgroundActive.value,
}));

const visualizerCanvasStyle = computed(() => {
       const isRadial = visualizerStyleValue.value === 'radial';
    if (isRadial) {
        return {
            width: 'calc(100% - 3vh)',
            height: 'calc(100% - 3vh)',
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            transform: 'translate(-50%, -50%)',
        };
    }

    const height = visualizerCanvasHeightPx.value + 'px';
    const base = {
        height,
        top: 'auto',
    };

    if (shouldShowVisualizerInLyrics.value || shouldShowVisualizerInPlaceholder.value) {
        return {
            ...base,
            width: 'calc(100% - 3vh)',
            left: '50%',
            right: 'auto',
            bottom: '1.5vh',
            transform: 'translateX(-50%)',
        };
    }

    return {
        ...base,
        width: '100%',
        left: '0',
        right: '0',
        bottom: '1.5vh',
        transform: 'none',
    };
});

const shouldShowVisualizerInLyrics = computed(() => lyricVisualizer.value && lyricAreaVisible.value);
const shouldShowVisualizerInPlaceholder = computed(() => lyricVisualizer.value && !lyricAreaVisible.value);
const shouldShowVisualizer = computed(
    () => shouldShowVisualizerInLyrics.value || shouldShowVisualizerInPlaceholder.value
);

let analyserDataArray = null;
let canvasCtx = null;
let animationFrameId = null;
let resizeObserver = null;
let resizeHandler = null;
let resizeTarget = null;
let visualizerBarLevels = null;
let visualizerPauseState = false;

const syncAnalyserConfig = () => {
    const analyser = audioEnv.analyser;
    if (!analyser) return;
    const fftSize = 2048;
    if (analyser.fftSize !== fftSize) {
        analyser.fftSize = fftSize;
        analyserDataArray = new Uint8Array(analyser.frequencyBinCount);
    } else if (!analyserDataArray || analyserDataArray.length !== analyser.frequencyBinCount) {
        analyserDataArray = new Uint8Array(analyser.frequencyBinCount);
    }
    analyser.smoothingTimeConstant = visualizerSmoothing.value;
};

const ensureVisualizerLevels = size => {
    if (size <= 0) {
        visualizerBarLevels = null;
        return visualizerBarLevels;
    }
    if (!visualizerBarLevels || visualizerBarLevels.length !== size) {
        visualizerBarLevels = new Float32Array(size);
    }
    return visualizerBarLevels;
};

const resetVisualizerLevels = () => {
    visualizerBarLevels = null;
};

const updateVisualizerLevels = (size, resolveTarget, { paused = false } = {}) => {
    const levels = ensureVisualizerLevels(size);
    if (!levels) return 0;
    const smoothing = visualizerSmoothing.value;
    const attackBase = Math.min(0.85, Math.max(0.25, 0.55 + (1 - smoothing) * 0.35));
    const attack = paused ? Math.max(0.12, attackBase * 0.5) : attackBase;
    const releaseBase = 0.02 + smoothing * 0.045;
    const release = paused ? releaseBase * 0.35 : releaseBase;
    let peak = 0;
    for (let index = 0; index < size; index++) {
        const target = Math.max(0, Math.min(1, resolveTarget(index) ?? 0));
        const current = levels[index] ?? 0;
        let nextValue;
        if (target >= current) {
            nextValue = current + (target - current) * attack;
        } else {
            const drop = release + current * 0.04;
            nextValue = current - Math.min(current - target, drop);
        }
        if (paused && target === 0 && nextValue < current) {
            nextValue = Math.max(0, nextValue);
        }
        if (!Number.isFinite(nextValue)) nextValue = 0;
        nextValue = Math.max(0, Math.min(1, nextValue));
        levels[index] = nextValue;
        if (nextValue > peak) peak = nextValue;
    }
    return peak;
};

const renderVisualizerPreview = () => {
    if (!shouldShowVisualizer.value || !lyricVisualizerCanvas.value) return;
    if (!animationFrameId) {
        renderVisualizerFrame();
    }
};

const syncVisualizerContainerMetrics = element => {
    if (!element) return;
    const rect = element.getBoundingClientRect?.();
    if (!rect) return;
    const width = Math.max(0, Math.round(rect.width));
    const height = Math.max(0, Math.round(rect.height));
    if (visualizerContainerSize.width !== width || visualizerContainerSize.height !== height) {
        visualizerContainerSize.width = width;
        visualizerContainerSize.height = height;
    }
};

const resetVisualizerContainerMetrics = () => {
    if (visualizerContainerSize.width !== 0 || visualizerContainerSize.height !== 0) {
        visualizerContainerSize.width = 0;
        visualizerContainerSize.height = 0;
    }
};

const updateVisualizerCanvasSize = () => {
    const canvas = lyricVisualizerCanvas.value;
    if (!canvas) {
        resetVisualizerContainerMetrics();
        return;
    }

    const hostElement = lyricScroll.value || canvas.parentElement || canvas;
    syncVisualizerContainerMetrics(hostElement);

    const displayWidth = Math.max(canvas.clientWidth, visualizerContainerSize.width);
    const isRadial = visualizerStyleValue.value === 'radial';
    const displayHeight = isRadial
        ? Math.max(canvas.clientHeight || 0, visualizerContainerSize.height)
        : Math.max(visualizerCanvasHeightPx.value, canvas.clientHeight || 0);
    if (!displayWidth || !displayHeight) return;

    if (!canvasCtx) return;

    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.round(displayWidth * dpr);
    const targetHeight = Math.round(displayHeight * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
    }

    if (typeof canvasCtx.resetTransform === 'function') canvasCtx.resetTransform();
    else canvasCtx.setTransform(1, 0, 0, 1, 0, 0);
    canvasCtx.scale(dpr, dpr);
};

const ensureVisualizerSizeTracking = () => {
    updateVisualizerCanvasSize();
    const target =
        (lyricAreaVisible.value && lyricScroll.value) || lyricVisualizerCanvas.value?.parentElement || null;
    if (typeof ResizeObserver !== 'undefined') {
        if (!target) return;
        if (!resizeObserver) {
            resizeObserver = new ResizeObserver(entries => {
                let handled = false;
                for (const entry of entries) {
                    if (!entry) continue;
                    const { contentRect, target: entryTarget } = entry;
                    if (contentRect) {
                        const width = Math.max(0, Math.round(contentRect.width));
                        const height = Math.max(0, Math.round(contentRect.height));
                        if (
                            visualizerContainerSize.width !== width ||
                            visualizerContainerSize.height !== height
                        ) {
                            visualizerContainerSize.width = width;
                            visualizerContainerSize.height = height;
                        }
                        handled = true;
                    } else if (entryTarget) {
                        syncVisualizerContainerMetrics(entryTarget);
                        handled = true;
                    }
                }
                if (!handled && target) syncVisualizerContainerMetrics(target);
                updateVisualizerCanvasSize();
            });
        }
        if (resizeTarget && resizeTarget !== target) {
            resizeObserver.unobserve(resizeTarget);
            resizeTarget = null;
        }
        if (!resizeTarget) {
            resizeObserver.observe(target);
            resizeTarget = target;
        }
    } else if (typeof window !== 'undefined' && !resizeHandler) {
        resizeHandler = () => updateVisualizerCanvasSize();
        window.addEventListener('resize', resizeHandler);
    }
};

const detachVisualizerSizeTracking = () => {
    if (resizeObserver && resizeTarget) {
        resizeObserver.unobserve(resizeTarget);
        resizeTarget = null;
    }
    if (resizeObserver && !resizeTarget && typeof resizeObserver.disconnect === 'function') {
        resizeObserver.disconnect();
        resizeObserver = null;
    }
    if (resizeHandler && typeof window !== 'undefined') {
        window.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
    }
    resetVisualizerContainerMetrics();
};

const setupVisualizer = async () => {
    if (!shouldShowVisualizer.value || !lyricVisualizerCanvas.value) return;
    if (!currentMusic.value || !currentMusic.value._sounds || !currentMusic.value._sounds.length) return;
    const audioNode = currentMusic.value._sounds[0]?._node;
    if (!audioNode) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioEnv.audioContext) {
        try {
            audioEnv.audioContext = new AudioContextClass();
        } catch (error) {
            console.warn('创建音频上下文失败:', error);
            return;
        }
    }

    const audioContext = audioEnv.audioContext;

    if (audioContext.state === 'suspended') {
        try {
            await audioContext.resume();
        } catch (error) {
            console.warn('恢复音频上下文失败:', error);
        }
    }

    if (!audioEnv.analyser) {
        audioEnv.analyser = audioContext.createAnalyser();
    }
    syncAnalyserConfig();

    const analyser = audioEnv.analyser;

    let source = audioEnv.audioSourceCache.get(audioNode);
    try {
        if (!source) {
            source = audioContext.createMediaElementSource(audioNode);
            audioEnv.audioSourceCache.set(audioNode, source);
        }
    } catch (error) {
        console.warn('创建音频源失败:', error);
        return;
    }

    try {
        source.disconnect();
    } catch (_) {}
    source.connect(analyser);

    if (!audioEnv.analyserConnected) {
        analyser.connect(audioContext.destination);
        audioEnv.analyserConnected = true;
    }

    canvasCtx = lyricVisualizerCanvas.value.getContext('2d');
    if (!canvasCtx) return;

    ensureVisualizerSizeTracking();
};

const renderVisualizerFrame = () => {
    if (!shouldShowVisualizer.value || !canvasCtx || !lyricVisualizerCanvas.value) return false;
    const canvas = lyricVisualizerCanvas.value;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return true;

    const analyser = audioEnv.analyser;
    if (analyser && analyserDataArray) {
        try {
            analyser.getByteFrequencyData(analyserDataArray);
        } catch (_) {}
    }

    const { r, g, b } = visualizerColorRGB.value;
    const opacityRatio = visualizerOpacityRatio.value;
    const styleMode = visualizerStyleValue.value;

    const nyquist = audioEnv.audioContext ? audioEnv.audioContext.sampleRate / 2 : 22050;
    const binCount = analyserDataArray ? analyserDataArray.length : 0;
    const frequencyMin = Math.max(0, Math.min(visualizerFrequencyMinValue.value, nyquist));
    const frequencyMax = Math.max(frequencyMin + 10, Math.min(visualizerFrequencyMaxValue.value, nyquist));
    const minIndex = binCount
        ? Math.min(binCount - 1, Math.max(0, Math.floor((frequencyMin / nyquist) * binCount)))
        : 0;
    const maxIndex = binCount
        ? Math.max(minIndex + 1, Math.min(binCount, Math.floor((frequencyMax / nyquist) * binCount)))
        : 1;
    const rangeSize = Math.max(1, maxIndex - minIndex);
    const barCount = Math.max(1, visualizerBarCountValue.value);
    const step = rangeSize / barCount;

    const levels = ensureVisualizerLevels(barCount);
    if (!levels) return false;

    const paused = !playing.value || visualizerPauseState;
    const peakLevel = updateVisualizerLevels(
        barCount,
        index => {
            if (!analyserDataArray || !binCount) return 0;
            const samplePosition = minIndex + (index + 0.5) * step;
            const dataIndex = Math.min(binCount - 1, Math.max(0, Math.floor(samplePosition)));
            return analyserDataArray[dataIndex] / 255;
        },
        { paused }
    );

    canvasCtx.clearRect(0, 0, width, height);

    if (styleMode === 'radial') {
        const maxBaseRadius = Math.min(width, height) / 2;
        if (maxBaseRadius <= 0) return true;
        const sizeRatio = Math.max(visualizerRadialSizeRatio.value, 0.05);
        const outerRadius = Math.max(8, maxBaseRadius * sizeRatio);
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const offsetX = (visualizerRadialOffsetXValue.value / 100) * halfWidth;
        const offsetY = (visualizerRadialOffsetYValue.value / 100) * halfHeight;
        const centerX = halfWidth + offsetX;
        const centerY = halfHeight + offsetY;

        const coreRatio = Math.min(Math.max(visualizerRadialCoreSizeRatio.value, 0.1), 0.95);
        const innerRadius = Math.min(Math.max(outerRadius * coreRatio, 6), outerRadius * 0.96);
        const startGap = Math.max(innerRadius * 0.08, outerRadius * 0.02, 3);
        const startRadius = Math.min(innerRadius + startGap, outerRadius * 0.98);
        const radialExtent = Math.max(outerRadius - startRadius, 2);
        const circumference = 2 * Math.PI * Math.max(startRadius, 1);
        const widthRatio = Math.min(Math.max(visualizerBarWidthRatio.value, 0.05), 1);
        const lineWidth = Math.max(1.2, (circumference / barCount) * widthRatio);

        canvasCtx.save();
        canvasCtx.lineCap = 'round';
        canvasCtx.lineWidth = lineWidth;

        for (let i = 0; i < barCount; i++) {
            const value = levels[i] ?? 0;
            const endRadius = startRadius + value * radialExtent;
            const angle = (i / barCount) * Math.PI * 2;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const x1 = centerX + startRadius * cos;
            const y1 = centerY + startRadius * sin;
            const x2 = centerX + endRadius * cos;
            const y2 = centerY + endRadius * sin;
            const baseAlpha = 0.18 + value * 0.55;
            const alpha = Math.min(Math.max(baseAlpha * opacityRatio, 0), 1);
            canvasCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            canvasCtx.beginPath();
            canvasCtx.moveTo(x1, y1);
            canvasCtx.lineTo(x2, y2);
            canvasCtx.stroke();
        }

        const coreAlpha = Math.min(Math.max(0.18 * opacityRatio, 0), 1);
        if (coreAlpha > 0) {
            const coreFillRadius = Math.max(0, Math.min(innerRadius * 0.95, startRadius - startGap * 0.4));
            canvasCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${coreAlpha})`;
            canvasCtx.beginPath();
            canvasCtx.arc(centerX, centerY, coreFillRadius, 0, Math.PI * 2);
            canvasCtx.fill();
        }

        canvasCtx.restore();
    } else {
        const barWidth = width / barCount;
        const innerWidth = barWidth * Math.min(Math.max(visualizerBarWidthRatio.value, 0.01), 1);
        const offset = (barWidth - innerWidth) / 2;

        for (let i = 0; i < barCount; i++) {
            const value = levels[i] ?? 0;
            const barHeight = height * value;
            const x = i * barWidth + offset;
            const y = height - barHeight;
            const baseAlpha = 0.12 + value * 0.45;
            const alpha = Math.min(Math.max(baseAlpha * opacityRatio, 0), 1);
            canvasCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            canvasCtx.fillRect(x, y, innerWidth, barHeight);
        }
    }

    if (!playing.value && peakLevel < 0.002) {
        return false;
    }
    return true;
};

const startVisualizerLoop = ({ force = false } = {}) => {
    if (!shouldShowVisualizer.value || !lyricVisualizerCanvas.value || !canvasCtx) return;
    updateVisualizerCanvasSize();
    if (animationFrameId) {
        if (!force) return;
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    const draw = () => {
        const keepGoing = renderVisualizerFrame();
        if (keepGoing === false) {
            animationFrameId = null;
            return;
        }
        animationFrameId = requestAnimationFrame(draw);
    };
    draw();
};

const stopVisualizerLoop = ({ clear = false, teardown = false } = {}) => {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    if (canvasCtx && lyricVisualizerCanvas.value && clear) {
        const width = lyricVisualizerCanvas.value.clientWidth;
        const height = lyricVisualizerCanvas.value.clientHeight;
        canvasCtx.clearRect(0, 0, width, height);
    }
    if (clear || teardown) {
        resetVisualizerLevels();
        visualizerPauseState = false;
    }
    if (teardown) {
        detachVisualizerSizeTracking();
        canvasCtx = null;
    }
};

const waitForNextFrame = () =>
    new Promise(resolve => {
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => resolve());
        } else {
            setTimeout(resolve, 16);
        }
    });

const waitForLayoutCommit = async () => {
    await nextTick();
    await waitForNextFrame();
};

// 是否存在歌词列表与有效原文内容
const hasLyricsList = computed(() => Array.isArray(lyricsObjArr.value) && lyricsObjArr.value.length > 0);
const hasAnyLyricContent = computed(() => {
    if (!Array.isArray(lyricsObjArr.value)) return false;
    return lyricsObjArr.value.some(item => !!(item && item.lyric && String(item.lyric).trim()))
});

const lyricAreaVisible = computed(() => {
    return !!(hasLyricsList.value && hasAnyLyricContent.value && lyricShow.value && lyricType.value && lyricType.value.indexOf('original') !== -1);
});

const lyricPlaceholderVisible = computed(() => !lyricAreaVisible.value);

// 计算指定索引之前（含该索引）的累计高度，优先使用实际DOM高度，回退为均匀估算
function computeCumulativeOffset(index) {
    if (!lyricEle.value || !lyricEle.value.length) {
        return (index + 1) * (size || 0)
    }
    let offset = 0
    for (let i = 0; i <= index && i < lyricEle.value.length; i++) {
        const el = lyricEle.value[i]
        if (el && el.offsetParent !== null) offset += el.clientHeight + 10
        else offset += (size || 0)
    }
    return offset
}

// 计算整份歌词的总高度（用于边界与容器高度），优先DOM，回退估算
function computeTotalHeight() {
    if (!lyricEle.value || !lyricEle.value.length) return initMax || 0
    let total = 0
    for (let i = 0; i < lyricEle.value.length; i++) {
        const el = lyricEle.value[i]
        if (el && el.offsetParent !== null) total += el.clientHeight + 10
        else total += (size || 0)
    }
    return total
}

const clearLycAnimation = flag => {
    if (flag) isLyricDelay.value = false;
    for (let i = 0; i < lyricEle.value.length; i++) {
        lyricEle.value[i].style.transitionDelay = 0 + 's';
        // 当启用歌词模糊时，移除内联 filter 以便使用样式表控制
        if (lyricBlur.value) lyricEle.value[i].firstChild.style.removeProperty('filter');
    }
    if (flag) {
        const forbidDelayTimer = setTimeout(() => {
            isLyricDelay.value = true;
            clearTimeout(forbidDelayTimer);
        }, 500);
    }
};

const setMaxHeight = change => {
    if (!lyricsObjArr.value) return;

    // 判断本首歌实际是否存在翻译/罗马音，避免没有对应内容时仍按照勾选项计算高度
    const hasAnyTrans = Array.isArray(lyricsObjArr.value) && lyricsObjArr.value.some(item => !!(item.tlyric && item.tlyric.trim()))
    const hasAnyRoma = Array.isArray(lyricsObjArr.value) && lyricsObjArr.value.some(item => !!(item.rlyric && item.rlyric.trim()))

    const showOriginal = lyricType.value.indexOf('noOriginal') == -1 && lyricType.value.indexOf('original') != -1
    const showTrans = (lyricType.value.indexOf('noTrans') == -1 && lyricType.value.indexOf('trans') != -1) && hasAnyTrans
    const showRoma = (lyricType.value.indexOf('noRoma') == -1 && lyricType.value.indexOf('roma') != -1) && hasAnyRoma

    size = (
        parseInt(showOriginal ? lyricSize.value : 0) +
        parseInt(showTrans ? tlyricSize.value : 0) +
        parseInt(showRoma ? rlyricSize.value : 0)
    ) * 1.5 + 30;
    initMax = lyricsObjArr.value.length * size;
    heightVal.value = initMax;
    initOffset = -(initMax - 260);
    // 使用DOM实际高度计算偏移，回退到均匀估算
    let offset = computeCumulativeOffset(lycCurrentIndex.value)
    if (change) {
        // 同步容器总高度并重算基础偏移
        const total = computeTotalHeight()
        initMax = total || initMax
        initOffset = -(initMax - 260)
        lineOffset.value = initOffset - offset
        minHeightVal.value = offset
        maxHeightVal.value = initMax + offset
    } else {
        const total = computeTotalHeight()
        initMax = total || initMax
        initOffset = -(initMax - 260)
        maxHeightVal.value = initMax
    }
    if (lyricScrollArea.value) lyricScrollArea.value.style.height = initMax + 'Px';
};

const setDefaultStyle = async () => {
    lycCurrentIndex.value = currentLyricIndex.value >= 0 ? currentLyricIndex.value : -1;
    interludeAnimation.value = false;
    lyricEle.value = document.getElementsByClassName('lyric-line');
    initMax = 0;
    setMaxHeight(false);
    minHeightVal.value = 0;
    lineOffset.value = initOffset;

    // 隐藏首帧，等待DOM稳定后同步到正确位置
    suppressLyricFlash.value = true;
    await nextTick();
    if (lycCurrentIndex.value >= 0 && size > 0) {
        syncLyricPosition();
    }
    await nextTick();
    suppressLyricFlash.value = false;

    if (!lyricShow.value && !widgetState.value) {
        const changeTimer = setTimeout(() => {
            lyricShow.value = true;
            playerChangeSong.value = false;
            clearTimeout(changeTimer);
        }, 400);
    }
};

// 监听歌词数组变化，重新设置样式
watch(
    () => lyricsObjArr.value,
    async newLyrics => {
        if (newLyrics && newLyrics.length > 0) {
            await setDefaultStyle();
        }
    }
);

watch([visualizerFrequencyMinValue, visualizerFrequencyMaxValue], () => {
    renderVisualizerPreview();
});

watch(
    () => lyricVisualizerHeight.value,
    value => {
        const safe = visualizerBaseHeightPx.value;
        if (value !== safe) lyricVisualizerHeight.value = safe;
    },
    { immediate: true }
);

watch(
    [() => lyricVisualizerFrequencyMin.value, () => lyricVisualizerFrequencyMax.value],
    ([min, max]) => {
        const { min: safeMin, max: safeMax } = normalizeFrequencyRange(min, max);
        if (min !== safeMin) lyricVisualizerFrequencyMin.value = safeMin;
        if (max !== safeMax) lyricVisualizerFrequencyMax.value = safeMax;
    },
    { immediate: true }
);

watch(
    () => lyricVisualizerTransitionDelay.value,
    value => {
        const safe = visualizerSmoothing.value;
        if (value !== safe) lyricVisualizerTransitionDelay.value = safe;
    },
    { immediate: true }
);

watch(visualizerHeightPx, () => {
    nextTick(() => {
        updateVisualizerCanvasSize();
        renderVisualizerPreview();
    });
});

watch(visualizerBarCountValue, () => {
    resetVisualizerLevels();
    renderVisualizerPreview();
});

watch(visualizerBarWidthRatio, () => {
    renderVisualizerPreview();
});

watch(visualizerSmoothing, () => {
    if (audioEnv.analyser) {
        syncAnalyserConfig();
    }
    renderVisualizerPreview();
});

watch(
    () => lyricVisualizerStyle.value,
    value => {
        const safe = visualizerStyleValue.value;
        if (value !== safe) lyricVisualizerStyle.value = safe;
    },
    { immediate: true }
);

watch(visualizerStyleValue, () => {
    resetVisualizerLevels();
    nextTick(() => {
        updateVisualizerCanvasSize();
        renderVisualizerPreview();
    });
});

watch(
    () => lyricVisualizerRadialSize.value,
    value => {
        const safe = visualizerRadialSizeValue.value;
        if (value !== safe) lyricVisualizerRadialSize.value = safe;
        renderVisualizerPreview();
    },
    { immediate: true }
);

watch(
    () => lyricVisualizerRadialOffsetX.value,
    value => {
        const safe = visualizerRadialOffsetXValue.value;
        if (value !== safe) lyricVisualizerRadialOffsetX.value = safe;
        renderVisualizerPreview();
    },
    { immediate: true }
);

watch(
    () => lyricVisualizerRadialOffsetY.value,
    value => {
        const safe = visualizerRadialOffsetYValue.value;
        if (value !== safe) lyricVisualizerRadialOffsetY.value = safe;
        renderVisualizerPreview();
    },
    { immediate: true }
);

watch(
    () => lyricVisualizerRadialCoreSize.value,
    value => {
        const safe = visualizerRadialCoreSizeValue.value;
        if (value !== safe) lyricVisualizerRadialCoreSize.value = safe;
        renderVisualizerPreview();
    },
    { immediate: true }
);

watch(
    () => lyricVisualizerColor.value,
    () => {
        renderVisualizerPreview();
    }
);

watch(
    () => lyricVisualizerOpacity.value,
    value => {
        const safe = visualizerOpacityValue.value;
        if (value !== safe) lyricVisualizerOpacity.value = safe;
        renderVisualizerPreview();
    },
    { immediate: true }
);

watch(
    () => lyricVisualizerCanvas.value,
    async canvas => {
        if (!canvas) {
            stopVisualizerLoop({ clear: true, teardown: true });
            canvasCtx = null;
            return;
        }
        await nextTick();
        updateVisualizerCanvasSize();
        renderVisualizerPreview();
        if (!shouldShowVisualizer.value) return;
        await setupVisualizer();
        visualizerPauseState = !playing.value;
        startVisualizerLoop({ force: true });
    }
);

watch(shouldShowVisualizer, active => {
    if (active) {
        nextTick(async () => {
            await setupVisualizer();
            visualizerPauseState = !playing.value;
            startVisualizerLoop({ force: true });
        });
    } else {
        stopVisualizerLoop({ clear: true, teardown: true });
    }
});

watch(
    () => currentMusic.value,
    () => {
        if (!shouldShowVisualizer.value) return;
        nextTick(async () => {
            await setupVisualizer();
            visualizerPauseState = !playing.value;
            if (playing.value) startVisualizerLoop({ force: true });
            else startVisualizerLoop();
        });
    }
);

watch(playing, isPlaying => {
    visualizerPauseState = !isPlaying;
    if (!shouldShowVisualizer.value) return;
    nextTick(async () => {
        await setupVisualizer();
        if (isPlaying) startVisualizerLoop({ force: true });
        else startVisualizerLoop();
    });
});

// 根据显示配置（翻译/原文/罗马音、字号）动态调整高度与位置
const applyLyricLayout = async ({ waitForPaint = false } = {}) => {
    if (!lyricsObjArr.value || !lyricsObjArr.value.length) return;
    if (syncingLayout.value) return;
    syncingLayout.value = true;
    try {
        await waitForLayoutCommit();
        lyricEle.value = document.getElementsByClassName('lyric-line');
        setMaxHeight(true);
        syncLyricPosition();
        if (waitForPaint) {
            await waitForLayoutCommit();
        }
    } finally {
        syncingLayout.value = false;
    }
};

const recalcLyricLayout = async () => {
    await applyLyricLayout();
};

// 过渡完成后再同步，避免在缩放/透明过渡中测量
const onLyricAreaAfterEnter = async () => {
    suppressLyricFlash.value = true;
    await applyLyricLayout({ waitForPaint: true });
    suppressLyricFlash.value = false;
};

// Resize 触发同步：容器尺寸改变后重新测量与同步
let lyricResizeObserver = null;
let resizeRaf = 0;
const scheduleLayout = () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(async () => {
        await applyLyricLayout();
    });
};

// 仅在类型变化时做常规重算（显示/隐藏由可见性观察处理）
watch(
    lyricType,
    async () => {
        await recalcLyricLayout();
    },
    { deep: true, flush: 'post' }
);

// 观察歌词区域的真实可见性（包含 lyrics 存在、显示开关和原文开关，并且有可显示的原文内容）
// 在切换为“显示原文”和“显示歌词”之前，先同步开启 no-flash，避免用户看到首帧
const showOriginal = computed(() => !!(lyricType.value && lyricType.value.indexOf('original') !== -1));
watch(
    showOriginal,
    show => {
        if (show) suppressLyricFlash.value = true;
    },
    { flush: 'sync' }
);
watch(
    () => lyricShow.value,
    show => {
        if (show) suppressLyricFlash.value = true;
    },
    { flush: 'sync' }
);

// 当区域从隐藏 -> 显示时，隐藏首帧并等待布局稳定后再同步，避免位置错乱
watch(
    lyricAreaVisible,
    async (visible) => {
        if (visible) {
            suppressLyricFlash.value = true;
            // 具体的布局同步放在过渡 after-enter 回调中完成
        }
        if (shouldShowVisualizer.value) {
            await nextTick();
            ensureVisualizerSizeTracking();
        }
    },
    { flush: 'post' }
);

watch([lyricSize, tlyricSize, rlyricSize], recalcLyricLayout, { flush: 'post' });

// 增强版的当前歌词索引监听（统一复用 syncLyricPosition，避免重复逻辑导致状态不一致）
const { currentLyricIndex } = storeToRefs(playerStore);
watch(
    currentLyricIndex,
    async (newIndex) => {
        lycCurrentIndex.value = newIndex;
        // 等待DOM稳定后，统一调用同步函数，确保 scroll-area 高度与偏移一并更新
        await nextTick();
        syncLyricPosition();
    },
    { immediate: true, flush: 'post' }
); // 添加 immediate 选项确保立即执行

const changeProgressLyc = (time, index) => {
    lyricScrollArea.value.style.height = initMax + 'Px';
    lycCurrentIndex.value = index;
    playerStore.currentLyricIndex = index;

    if (!playing.value) {
        const offset = computeCumulativeOffset(lycCurrentIndex.value)
        const total = computeTotalHeight()
        initMax = total || initMax
        initOffset = -(initMax - 260)
        lineOffset.value = initOffset - offset
        minHeightVal.value = offset
        maxHeightVal.value = initMax + offset
    }
    progress.value = time;
    changeProgress(time);
};

// 同步当前歌词位置的函数
const syncLyricPosition = () => {
    if (lycCurrentIndex.value !== null && lycCurrentIndex.value >= 0 && lyricEle.value && lyricEle.value[lycCurrentIndex.value]) {
        const offset = computeCumulativeOffset(lycCurrentIndex.value)
        const total = computeTotalHeight()
        initMax = total || initMax
        initOffset = -(initMax - 260)
        lineOffset.value = initOffset - offset
        minHeightVal.value = offset
        maxHeightVal.value = initMax + offset
        // 确保歌词容器高度正确
        if (lyricScrollArea.value) {
            lyricScrollArea.value.style.height = initMax + 'Px';
            heightVal.value = initMax;
        }
        // 重置为激活状态
        isLyricActive.value = true;
    }
};

// 监听歌词显示状态变化，当重新显示歌词时同步位置
watch(
    () => lyricShow.value,
    async (newVal) => {
        if (newVal) {
            // 当歌词重新显示时，先隐藏，再同步位置，避免看到跳变
            suppressLyricFlash.value = true;
            // 具体的布局同步放在过渡 after-enter 回调中完成
        }
    }
);

// 检测大幅进度跳转（拖动进度条）时立即恢复歌词同步
watch(
    () => progress.value,
    (newVal, oldVal) => {
        if (typeof oldVal !== 'number') return;
        if (Math.abs(newVal - oldVal) <= 1.2) return;

        if (pauseActiveTimer.value) {
            clearTimeout(pauseActiveTimer.value);
            pauseActiveTimer.value = null;
        }

        isLyricActive.value = true;
        syncLyricPosition();
    }
);

onMounted(() => {
    visualizerPauseState = !playing.value;
    if (shouldShowVisualizer.value) {
        nextTick(async () => {
            await setupVisualizer();
            visualizerPauseState = !playing.value;
            startVisualizerLoop({ force: true });
        });
    }

    lyricScroll.value.addEventListener('wheel', e => {
        isLyricActive.value = false;
        heightVal.value += e.wheelDeltaY < 0 ? e.wheelDeltaY + 76 : e.wheelDeltaY - 76;

        if (heightVal.value < minHeightVal.value) heightVal.value = minHeightVal.value;
        if (heightVal.value > maxHeightVal.value) heightVal.value = maxHeightVal.value;

        lyricScrollArea.value.style.height = heightVal.value + 'Px';

        clearTimeout(pauseActiveTimer.value);
        pauseActiveTimer.value = setTimeout(() => {
            syncLyricPosition();
        }, 3000);
    });
    
    // 组件挂载后立即检查并同步歌词位置（先隐藏，定位完成后再显示，避免闪烁）
    setTimeout(async () => {
        if (lyricsObjArr.value && lyricsObjArr.value.length > 0) {
            suppressLyricFlash.value = true;
            await nextTick();
            setDefaultStyle();
            // 如果有当前歌词索引，确保同步到正确位置
            if (currentLyricIndex.value >= 0) {
                syncLyricPosition();
            }
            await nextTick();
            suppressLyricFlash.value = false;
        }
    }, 100);
    // 监听容器尺寸变化，变化后重新同步（例如窗口尺寸变化、父容器变化、字体替换等）
    if (typeof ResizeObserver !== 'undefined') {
        lyricResizeObserver = new ResizeObserver(() => scheduleLayout());
        if (lyricScroll.value) lyricResizeObserver.observe(lyricScroll.value);
    } else {
        window.addEventListener('resize', scheduleLayout);
    }
});

onUnmounted(() => {
    if (lyricResizeObserver) {
        lyricResizeObserver.disconnect();
        lyricResizeObserver = null;
    } else {
        window.removeEventListener('resize', scheduleLayout);
    }
    stopVisualizerLoop({ clear: true, teardown: true });
    canvasCtx = null;
    analyserDataArray = null;
});
</script>

<template>
    <div class="lyric-container" :class="lyricContainerClasses" :style="lyricBackgroundStyle">
        <canvas
            v-if="shouldShowVisualizer"
            ref="lyricVisualizerCanvas"
            class="lyric-visualizer"
            :style="visualizerCanvasStyle"
        ></canvas>
        <Transition name="fade" @after-enter="onLyricAreaAfterEnter">
            <div v-show="hasLyricsList && hasAnyLyricContent && lyricShow && lyricType.indexOf('original') != -1" class="lyric-area" :class="{ 'no-flash': suppressLyricFlash }" ref="lyricScroll">
                <div class="lyric-scroll-area" ref="lyricScrollArea"></div>
                <div class="lyric-line" :style="{ transform: 'translateY(' + lineOffset + 'Px)' }" v-for="(item, index) in lyricsObjArr" v-show="item.lyric" :key="index">
                    <div class="line" @click="changeProgressLyc(item.time, index)" :class="{ 'line-highlight': index == lycCurrentIndex, 'lyric-inactive': !isLyricActive || item.active }">
                        <span class="roma" :style="{ 'font-size': rlyricSize + 'px' }" v-if="item.rlyric && lyricType.indexOf('roma') != -1">{{ item.rlyric }}</span>
                        <span class="original" :style="{ 'font-size': lyricSize + 'px' }" v-if="lyricType.indexOf('original') != -1">{{ item.lyric }}</span>
                        <span class="trans" :style="{ 'font-size': tlyricSize + 'px' }" v-if="item.tlyric && lyricType.indexOf('trans') != -1">{{ item.tlyric }}</span>
                        <div
                            class="hilight"
                            :class="{ 'hilight-active': index == lycCurrentIndex }"
                            :style="{ backgroundColor: videoIsPlaying ? 'var(--lyric-hilight-bg-dim)' : 'var(--lyric-hilight-bg)' }"
                        ></div>
                    </div>
                    <div v-if="lycCurrentIndex != -1 && interludeIndex == index" class="music-interlude" :class="{ 'music-interlude-in': interludeAnimation }">
                        <div class="interlude-left">
                            <div class="diamond">
                                <div class="diamond-inner"></div>
                            </div>
                        </div>
                        <div class="interlude-right">
                            <div class="triangle"></div>
                            <span class="remaining">THE REMAINING TIME: {{ interludeRemainingTime }}</span>
                            <div class="interlude-title">
                                <span class="title">MUSIC INTERLUDE</span>
                                <div class="title-style">
                                    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="49" height="50" viewBox="0 0 49 50" fill="none">
                                        <defs><rect id="path_0" x="0" y="0" width="49" height="50" /></defs>
                                        <g opacity="1" transform="translate(0 0)  rotate(0 24.5 25)">
                                            <mask id="bg-mask-0" fill="white"><use xlink:href="#path_0" /></mask>
                                            <g mask="url(#bg-mask-0)">
                                                <path id="line" style="fill: #ffffff" transform="translate(46 0)  rotate(0 0.0005 50)" opacity="1" d="" />
                                                <path
                                                    id="line"
                                                    style="stroke: #ffffff; stroke-width: 1; stroke-opacity: 1; stroke-dasharray: 0 0"
                                                    transform="translate(46 0)  rotate(0 0.0005 50)"
                                                    d="M0,0L0,100 "
                                                />
                                                <path id="line" style="fill: #ffffff" transform="translate(27 0)  rotate(0 0.0005 50)" opacity="1" d="" />
                                                <path
                                                    id="line"
                                                    style="stroke: #ffffff; stroke-width: 1; stroke-opacity: 1; stroke-dasharray: 0 0"
                                                    transform="translate(27 0)  rotate(0 0.0005 50)"
                                                    d="M0,0L0,100 "
                                                />
                                                <path id="line" style="fill: #ffffff" transform="translate(48 0)  rotate(0 0.0005 50)" opacity="1" d="" />
                                                <path
                                                    id="line"
                                                    style="stroke: #ffffff; stroke-width: 1; stroke-opacity: 1; stroke-dasharray: 0 0"
                                                    transform="translate(48 0)  rotate(0 0.0005 50)"
                                                    d="M0,0L0,100 "
                                                />
                                                <path id="line" style="fill: #ffffff" transform="translate(19 0)  rotate(0 0.0005 50)" opacity="1" d="" />
                                                <path
                                                    id="line"
                                                    style="stroke: #ffffff; stroke-width: 2; stroke-opacity: 1; stroke-dasharray: 0 0"
                                                    transform="translate(19 0)  rotate(0 0.0005 50)"
                                                    d="M0,0L0,100 "
                                                />
                                                <path id="line" style="fill: #ffffff" transform="translate(34 0)  rotate(0 0.0005 50)" opacity="1" d="" />
                                                <path
                                                    id="line"
                                                    style="stroke: #ffffff; stroke-width: 1; stroke-opacity: 1; stroke-dasharray: 0 0"
                                                    transform="translate(34 0)  rotate(0 0.0005 50)"
                                                    d="M0,0L0,100 "
                                                />
                                                <path id="line" style="fill: #ffffff" transform="translate(16 0)  rotate(0 0.0005 50)" opacity="1" d="" />
                                                <path
                                                    id="line"
                                                    style="stroke: #ffffff; stroke-width: 1; stroke-opacity: 1; stroke-dasharray: 0 0"
                                                    transform="translate(16 0)  rotate(0 0.0005 50)"
                                                    d="M0,0L0,100 "
                                                />
                                                <path id="line" style="fill: #ffffff" transform="translate(43 0)  rotate(0 0.0005 50)" opacity="1" d="" />
                                                <path
                                                    id="line"
                                                    style="stroke: #ffffff; stroke-width: 1; stroke-opacity: 1; stroke-dasharray: 0 0"
                                                    transform="translate(43 0)  rotate(0 0.0005 50)"
                                                    d="M0,0L0,100 "
                                                />
                                                <path id="line" style="fill: #ffffff" transform="translate(43 0)  rotate(0 0.0005 50)" opacity="1" d="" />
                                                <path
                                                    id="line"
                                                    style="stroke: #ffffff; stroke-width: 1; stroke-opacity: 1; stroke-dasharray: 0 0"
                                                    transform="translate(43 0)  rotate(0 0.0005 50)"
                                                    d="M0,0L0,100 "
                                                />
                                                <path id="line" style="fill: #ffffff" transform="translate(23 0)  rotate(0 0.0005 50)" opacity="1" d="" />
                                                <path
                                                    id="line"
                                                    style="stroke: #ffffff; stroke-width: 2; stroke-opacity: 1; stroke-dasharray: 0 0"
                                                    transform="translate(23 0)  rotate(0 0.0005 50)"
                                                    d="M0,0L0,100 "
                                                />
                                                <path id="line" style="fill: #ffffff" transform="translate(12 0)  rotate(0 0.0005 50)" opacity="1" d="" />
                                                <path
                                                    id="line"
                                                    style="stroke: #ffffff; stroke-width: 2; stroke-opacity: 1; stroke-dasharray: 0 0"
                                                    transform="translate(12 0)  rotate(0 0.0005 50)"
                                                    d="M0,0L0,100 "
                                                />
                                                <path id="line" style="fill: #ffffff" transform="translate(5 0)  rotate(0 0.0005 50)" opacity="1" d="" />
                                                <path
                                                    id="line"
                                                    style="stroke: #ffffff; stroke-width: 1; stroke-opacity: 1; stroke-dasharray: 0 0"
                                                    transform="translate(5 0)  rotate(0 0.0005 50)"
                                                    d="M0,0L0,100 "
                                                />
                                                <path id="line" style="fill: #ffffff" transform="translate(8 0)  rotate(0 0.0005 50)" opacity="1" d="" />
                                                <path
                                                    id="line"
                                                    style="stroke: #ffffff; stroke-width: 2; stroke-opacity: 1; stroke-dasharray: 0 0"
                                                    transform="translate(8 0)  rotate(0 0.0005 50)"
                                                    d="M0,0L0,100 "
                                                />
                                                <path id="line" style="fill: #ffffff" transform="translate(30 0)  rotate(0 0.0005 50)" opacity="1" d="" />
                                                <path
                                                    id="line"
                                                    style="stroke: #ffffff; stroke-width: 2; stroke-opacity: 1; stroke-dasharray: 0 0"
                                                    transform="translate(30 0)  rotate(0 0.0005 50)"
                                                    d="M0,0L0,100 "
                                                />
                                                <path id="line" style="fill: #ffffff" transform="translate(1 0)  rotate(0 0.0005 50)" opacity="1" d="" />
                                                <path
                                                    id="line"
                                                    style="stroke: #ffffff; stroke-width: 3; stroke-opacity: 1; stroke-dasharray: 0 0"
                                                    transform="translate(1 0)  rotate(0 0.0005 50)"
                                                    d="M0,0L0,100 "
                                                />
                                                <path id="line" style="fill: #ffffff" transform="translate(40 0)  rotate(0 0.0005 50)" opacity="1" d="" />
                                                <path
                                                    id="line"
                                                    style="stroke: #ffffff; stroke-width: 3; stroke-opacity: 1; stroke-dasharray: 0 0"
                                                    transform="translate(40 0)  rotate(0 0.0005 50)"
                                                    d="M0,0L0,100 "
                                                />
                                            </g>
                                        </g>
                                    </svg>
                                </div>
                            </div>
                            <div class="interlude-progress"></div>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
        <Transition name="fade">
            <div v-show="lyricPlaceholderVisible" class="lyric-nodata">
                <div class="line1"></div>
                <span class="tip">Lyric-Area</span>
                <div class="line2"></div>
            </div>
        </Transition>

        <span class="song-quality" v-if="songList[currentIndex].type == 'local'">
            {{ songList[currentIndex].sampleRate }}KHz/{{ songList[currentIndex].bitsPerSample }}Bits/{{ songList[currentIndex].bitrate }}Kpbs
        </span>
        <span class="song-quality" v-if="songList[currentIndex].level">
            {{ songList[currentIndex].level.sr / 1000 }}KHz/{{ Math.round(songList[currentIndex].level.br / 1000) }}Kpbs/{{ songList[currentIndex].quality.toUpperCase() }}
        </span>
        <div class="border border1"></div>
        <div class="border border2"></div>
        <div class="border border3"></div>
        <div class="border border4"></div>
    </div>
</template>

<style scoped lang="scss">
.lyric-container {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1;
    .lyric-visualizer {
        position: absolute;
        pointer-events: none;
        z-index: 0;
        opacity: 0.75;
        mix-blend-mode: multiply;
        transition: opacity 0.35s cubic-bezier(0.3, 0, 0.12, 1);
    }
    &.lyric-container--custom {
        background: transparent;
    }
    &.lyric-container--custom::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image: var(--custom-background-image);
        background-size: var(--custom-background-size, cover);
        background-repeat: var(--custom-background-repeat, no-repeat);
        background-position: var(--custom-background-position, center center);
        filter: blur(var(--custom-background-blur, 0px)) brightness(var(--custom-background-brightness, 100%));
        z-index: 0;
        pointer-events: none;
    }
    .lyric-area {
        width: calc(100% - 3vh);
        height: calc(100% - 3vh);
        overflow: hidden;
        transition: 0.3s cubic-bezier(0.3, 0, 0.12, 1);
        position: relative;
        z-index: 2;
        &.no-flash {
            opacity: 0;
            /* 取消进入过渡的缩放，以免影响布局测量/视觉位置 */
            transform: none !important;
        }
        &.no-flash, &.no-flash * {
            transition: none !important;
        }
        .lyric-scroll-area {
            width: 100%;
            transition: 0.3s;
        }
        .lyric-line {
            position: relative;
            z-index: 1;
            margin-bottom: 10px;
            width: 100%;
            text-align: left;
            transition: 0.58s cubic-bezier(0.4, 0, 0.12, 1);
            .line {
                padding: 10px 130px 10px 25px;
                width: 100%;
                height: 100%;
                position: relative;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                transition-duration: 0.6s;
                transition-timing-function: cubic-bezier(0.3, 0, 0.12, 1);
                user-select: text;
                &:hover {
                    cursor: pointer;
                    background-color: rgba(0, 0, 0, 0.045);
                }
                &:active {
                    transform: scale(0.9);
                    filter: blur(0) !important;
                }
                .original,
                .trans,
                .roma {
                    font: 20px SourceHanSansCN-Bold;
                    font-weight: bold;
                    color: black;
                    text-align: left;
                    display: inline-block;
                    transition: 0.5s cubic-bezier(0.3, 0, 0.12, 1);
                }
                .hilight {
                    width: 100%;
                    height: 100%;
                    background-color: black;
                    position: absolute;
                    z-index: -1;
                    top: 0;
                    left: 0;
                    transform: translateX(-101%);
                    transition: 0.55s cubic-bezier(0.3, 0, 0.12, 1);
                }
                .hilight-active {
                    transform: translateX(0);
                    transition: 0.62s cubic-bezier(0.3, 0, 0.12, 1);
                }
            }
            .lyric-inactive {
                filter: blur(0) !important;
                span {
                    transform: scale(1.05);
                }
            }
            .line-highlight {
                transition-duration: 0.4s;
                .original,
                .trans,
                .roma {
                    transform-origin: left center;
                    transform: scale(1.15) translateX(26px);
                    color: white;
                    transition: 0.4s cubic-bezier(0.3, 0, 0.12, 1);
                }
            }
            .music-interlude {
                padding-top: 0;
                padding-left: 25px;
                width: 240px;
                height: 0;
                opacity: 0;
                transform: scale(0);
                transition: 0.8s cubic-bezier(1, -0.49, 0.61, 0.36);
                display: flex;
                flex-direction: row;
                justify-content: center;
                align-items: center;
                position: relative;
                left: 0;
                .interlude-left {
                    .diamond {
                        width: 28px;
                        height: 28px;
                        border: 2px solid black;
                        transform: rotate(45deg);
                        animation: diamond-rotate 1.6s 0.6s cubic-bezier(0.3, 0, 0.12, 1) infinite;
                        position: relative;
                        @keyframes diamond-rotate {
                            0% {
                                transform: rotate(45deg);
                            }
                            50% {
                                transform: rotate(135deg);
                            }
                            100% {
                                transform: rotate(135deg);
                            }
                        }
                        .diamond-inner {
                            width: 85%;
                            height: 85%;
                            background-color: black;
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                        }
                    }
                }
                .interlude-right {
                    margin-left: 15px;
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    position: relative;
                    .triangle {
                        width: 0;
                        height: 0;
                        border-top: 6px solid black;
                        border-left: 6px solid transparent;
                        position: absolute;
                        top: 1px;
                        right: 0;
                    }
                    .remaining {
                        font: 8px SourceHanSansCN-Bold;
                        color: black;
                        white-space: nowrap;
                    }
                    .interlude-title {
                        padding: 0 4px;
                        width: 100%;
                        background-color: black;
                        display: flex;
                        flex-direction: row;
                        align-items: center;
                        justify-content: space-between;
                        white-space: nowrap;
                        .title {
                            font: 10px SourceHanSansCN-Bold;
                            color: white;
                        }
                        .title-style {
                            width: 15%;
                            height: 8px;
                            overflow: hidden;
                        }
                    }
                    .interlude-progress {
                        margin-top: 3px;
                        width: 100%;
                        height: 4px;
                        background-color: black;
                    }
                }
            }
            .music-interlude-in {
                padding-top: 10px;
                height: 80px;
                opacity: 1;
                transform: scale(1);
                transition: 0.8s cubic-bezier(0.3, 0, 0.12, 1);
            }
        }
    }

    /* 开启歌词模糊后的样式：默认行模糊，当前高亮行清晰 */
    &.blur-enabled {
        .lyric-line {
            .line {
                filter: blur(2px) !important;
                transition: filter 0.25s ease;
            }
            .line.line-highlight {
                filter: none !important;
            }
        }
    }
    .lyric-area-hidden {
        transition: 0.2s cubic-bezier(0.3, 0, 0.12, 1);
        transform: scale(0.85);
        opacity: 0;
    }
    .lyric-nodata {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        position: relative;
        z-index: 2;
        .line1,
        .line2 {
            width: 0;
            height: 0;
            position: absolute;
            background: linear-gradient(to bottom right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) calc(50% - 0.5px), rgba(0, 0, 0, 0.8) 50%, rgba(0, 0, 0, 0) calc(50% + 0.5px), rgba(0, 0, 0, 0) 100%);
            animation: nodata-open1 0.8s 0.5s cubic-bezier(0.32, 0.81, 0.56, 0.98) forwards;
            @keyframes nodata-open1 {
                0% {
                    width: 0;
                    height: 0;
                }
                100% {
                    width: 38%;
                    height: 38%;
                }
            }
        }
        .tip {
            font: 16px Bender-Bold;
            color: black;
            white-space: nowrap;
            opacity: 0;
            animation: nodata-open2 0.1s 1.3s forwards;
            @keyframes nodata-open2 {
                10% {
                    opacity: 0;
                }
                20% {
                    opacity: 1;
                }
                30% {
                    opacity: 1;
                }
                40% {
                    opacity: 0;
                }
                50% {
                    opacity: 0;
                }
                60% {
                    opacity: 1;
                }
                70% {
                    opacity: 1;
                }
                80% {
                    opacity: 0;
                }
                90% {
                    opacity: 0;
                }
                100% {
                    opacity: 1;
                }
            }
        }
        .line1 {
            left: 4%;
            bottom: 4%;
        }
        .line2 {
            top: 4%;
            right: 4%;
        }
    }
    .song-quality {
        font: 1.5vh Bender-Bold;
        color: black;
        position: absolute;
        bottom: -0.9vh;
        right: 1.5vh;
        z-index: 2;
    }

    $boderPosition: -0.75 + vh;
    .border {
        width: 1.5vh;
        height: 1.5vh;
        border: 1px solid black;
        position: absolute;
    }
    .border1 {
        top: $boderPosition;
        left: $boderPosition;
    }
    .border2 {
        top: $boderPosition;
        right: $boderPosition;
    }
    .border3 {
        bottom: $boderPosition;
        right: $boderPosition;
        &::after {
            content: '';
            width: 0.5vh;
            height: 0.5vh;
            background-color: black;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
    }
    .border4 {
        bottom: $boderPosition;
        left: $boderPosition;
    }
}
.fade-enter-active {
    transition: 0.4s cubic-bezier(0.3, 0.79, 0.55, 0.99) !important;
}
.fade-leave-active {
    transition: 0.2s cubic-bezier(0.3, 0.79, 0.55, 0.99) !important;
}
.fade-enter-from,
.fade-leave-to {
    transform: scale(0.85);
    opacity: 0;
}
</style>
