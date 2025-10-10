<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { usePlayerStore } from '../../store/playerStore';
import { getLyricVisualizerAudioEnv } from '../../utils/lyricVisualizerAudio';

const props = defineProps({
  lyricScrollRef: {
    type: Object,
    default: null,
  },
});

const lyricScroll = computed(() => props.lyricScrollRef?.value ?? null);

const lyricVisualizerCanvas = ref(null);
const visualizerContainerSize = reactive({ width: 0, height: 0 });

const playerStore = usePlayerStore();
const {
  playing,
  lyricsObjArr,
  lyricShow,
  lyricType,
  currentMusic,
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
} = storeToRefs(playerStore);

const audioEnv = getLyricVisualizerAudioEnv();

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
      return {
        r: clampNumber(parts[0], 0, 255, 0),
        g: clampNumber(parts[1], 0, 255, 0),
        b: clampNumber(parts[2], 0, 255, 0),
      };
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
const VISUALIZER_REFERENCE_CONTAINER_HEIGHT = 720;

const hasLyricsList = computed(() => Array.isArray(lyricsObjArr.value) && lyricsObjArr.value.length > 0);
const hasAnyLyricContent = computed(() => {
  if (!Array.isArray(lyricsObjArr.value)) return false;
  return lyricsObjArr.value.some(item => !!(item && item.lyric && String(item.lyric).trim()));
});
const lyricAreaVisible = computed(() => {
  return (
    hasLyricsList.value &&
    hasAnyLyricContent.value &&
    lyricShow.value &&
    lyricType.value &&
    lyricType.value.indexOf('original') !== -1
  );
});

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
  return Math.min(Math.max(ratio, 0), 1);
});
const visualizerStyleValue = computed(() => (lyricVisualizerStyle.value === 'radial' ? 'radial' : 'bars'));
const visualizerRadialSizeValue = computed(() => {
  const value = Number(lyricVisualizerRadialSize.value);
  if (!Number.isFinite(value)) return 100;
  return clampNumber(Math.round(value), 10, 200, 100);
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

const shouldShowVisualizerInLyrics = computed(() => lyricVisualizer.value && lyricAreaVisible.value);
const shouldShowVisualizerInPlaceholder = computed(() => lyricVisualizer.value && !lyricAreaVisible.value);
const shouldShowVisualizer = computed(() => shouldShowVisualizerInLyrics.value || shouldShowVisualizerInPlaceholder.value);

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
  const height = `${visualizerCanvasHeightPx.value}px`;
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
};

const ensureVisualizerLevels = size => {
  if (!size || size <= 0) {
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
  const target = (lyricAreaVisible.value && lyricScroll.value) || lyricVisualizerCanvas.value?.parentElement || null;
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
            if (visualizerContainerSize.width !== width || visualizerContainerSize.height !== height) {
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
      try { resizeObserver.unobserve(resizeTarget); } catch (_) {}
    }
    resizeTarget = target;
    if (resizeTarget) resizeObserver.observe(resizeTarget);
  } else {
    if (!resizeHandler) {
      resizeHandler = () => {
        syncVisualizerContainerMetrics(target || lyricVisualizerCanvas.value || lyricScroll.value || null);
        updateVisualizerCanvasSize();
      };
      window.addEventListener('resize', resizeHandler);
    }
  }
};

const detachVisualizerSizeTracking = () => {
  if (resizeObserver) {
    try {
      if (resizeTarget) resizeObserver.unobserve(resizeTarget);
    } catch (_) {}
    resizeObserver.disconnect();
    resizeObserver = null;
    resizeTarget = null;
  }
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
};

const setupVisualizer = async () => {
  if (!shouldShowVisualizer.value) return;
  await nextTick();
  syncAnalyserConfig();
  const analyser = audioEnv.analyser;
  const audio = audioEnv.howler;
  const gainNode = audioEnv.gainNode;
  if (!analyser || !audio || !gainNode) return;
  if (!canvasCtx && lyricVisualizerCanvas.value) {
    canvasCtx = lyricVisualizerCanvas.value.getContext('2d');
  }
  if (!canvasCtx) return;
  updateVisualizerCanvasSize();
  ensureVisualizerSizeTracking();
  audioEnv.ensureConnection();
};

const fetchVisualizerFrequencies = () => {
  const analyser = audioEnv.analyser;
  if (!analyser || !analyserDataArray) return [];
  analyser.getByteFrequencyData(analyserDataArray);
  return analyserDataArray;
};

const resolveVisualizerFrequency = frequency => {
  const audioContext = audioEnv.audioContext;
  const analyser = audioEnv.analyser;
  if (!audioContext || !analyser) return 0;
  const nyquist = audioContext.sampleRate / 2;
  const normalized = Math.min(Math.max(frequency / nyquist, 0), 1);
  const index = Math.round(normalized * (analyser.frequencyBinCount - 1));
  return analyserDataArray[index] / 255;
};

const renderVisualizerFrame = () => {
  if (!canvasCtx || !lyricVisualizerCanvas.value) return false;
  const analyser = audioEnv.analyser;
  const audioContext = audioEnv.audioContext;
  if (!analyser || !audioContext) return false;
  const width = lyricVisualizerCanvas.value.clientWidth || visualizerContainerSize.width;
  const height = lyricVisualizerCanvas.value.clientHeight || visualizerContainerSize.height;
  if (!width || !height) return false;
  const data = fetchVisualizerFrequencies();
  if (!data || !data.length) {
    canvasCtx.clearRect(0, 0, width, height);
    return false;
  }
  const minFreq = visualizerFrequencyMinValue.value;
  const maxFreq = visualizerFrequencyMaxValue.value;
  const nyquist = audioContext.sampleRate / 2;
  const freqRange = Math.max(maxFreq - minFreq, 1);
  const barCount = Math.max(1, visualizerBarCountValue.value);
  const isRadial = visualizerStyleValue.value === 'radial';
  const r = visualizerColorRGB.value.r;
  const g = visualizerColorRGB.value.g;
  const b = visualizerColorRGB.value.b;
  canvasCtx.clearRect(0, 0, width, height);
  const levels = new Array(barCount).fill(0).map((_, index) => {
    const ratio = index / (barCount - 1 || 1);
    const frequency = minFreq + ratio * freqRange;
    const value = resolveVisualizerFrequency(frequency);
    return Number.isFinite(value) ? value : 0;
  });
  const peakLevel = updateVisualizerLevels(barCount, index => levels[index], { paused: !playing.value });
  const opacityRatio = visualizerOpacityRatio.value;
  if (isRadial) {
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

const renderVisualizerPreview = () => {
  if (!shouldShowVisualizer.value || !lyricVisualizerCanvas.value) return;
  if (!animationFrameId) {
    renderVisualizerFrame();
  }
};

watch(() => lyricVisualizerFrequencyMin.value, value => {
  const safe = visualizerFrequencyMinValue.value;
  if (value !== safe) lyricVisualizerFrequencyMin.value = safe;
  renderVisualizerPreview();
});

watch(() => lyricVisualizerFrequencyMax.value, value => {
  const safe = visualizerFrequencyMaxValue.value;
  if (value !== safe) lyricVisualizerFrequencyMax.value = safe;
  renderVisualizerPreview();
});

watch(() => lyricVisualizerTransitionDelay.value, value => {
  const safe = visualizerSmoothing.value;
  if (value !== safe) lyricVisualizerTransitionDelay.value = safe;
});

watch(() => lyricVisualizerHeight.value, () => {
  renderVisualizerPreview();
});

watch(() => lyricVisualizerBarCount.value, () => {
  resetVisualizerLevels();
  renderVisualizerPreview();
});

watch(() => lyricVisualizerBarWidth.value, () => {
  renderVisualizerPreview();
});

watch(() => lyricVisualizerStyle.value, value => {
  if (value !== 'radial' && value !== 'bars') {
    lyricVisualizerStyle.value = 'bars';
  }
  renderVisualizerPreview();
});

watch(() => lyricVisualizerRadialSize.value, value => {
  const safe = visualizerRadialSizeValue.value;
  if (value !== safe) lyricVisualizerRadialSize.value = safe;
  renderVisualizerPreview();
});

watch(() => lyricVisualizerRadialOffsetX.value, value => {
  const safe = visualizerRadialOffsetXValue.value;
  if (value !== safe) lyricVisualizerRadialOffsetX.value = safe;
  renderVisualizerPreview();
});

watch(() => lyricVisualizerRadialOffsetY.value, value => {
  const safe = visualizerRadialOffsetYValue.value;
  if (value !== safe) lyricVisualizerRadialOffsetY.value = safe;
  renderVisualizerPreview();
});

watch(() => lyricVisualizerRadialCoreSize.value, value => {
  const safe = visualizerRadialCoreSizeValue.value;
  if (value !== safe) lyricVisualizerRadialCoreSize.value = safe;
  renderVisualizerPreview();
});

watch(() => lyricVisualizerColor.value, () => {
  renderVisualizerPreview();
});

watch(() => lyricVisualizerOpacity.value, value => {
  const safe = visualizerOpacityValue.value;
  if (value !== safe) lyricVisualizerOpacity.value = safe;
  renderVisualizerPreview();
});

watch(() => lyricVisualizerCanvas.value, async canvas => {
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
});

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

watch(() => currentMusic.value, () => {
  if (!shouldShowVisualizer.value) return;
  nextTick(async () => {
    await setupVisualizer();
    visualizerPauseState = !playing.value;
    if (playing.value) startVisualizerLoop({ force: true });
    else startVisualizerLoop();
  });
});

watch(playing, isPlaying => {
  visualizerPauseState = !isPlaying;
  if (!shouldShowVisualizer.value) return;
  nextTick(async () => {
    await setupVisualizer();
    if (isPlaying) startVisualizerLoop({ force: true });
    else startVisualizerLoop();
  });
});

onMounted(() => {
  if (shouldShowVisualizer.value) {
    nextTick(async () => {
      await setupVisualizer();
      visualizerPauseState = !playing.value;
      startVisualizerLoop({ force: true });
    });
  }
});

onUnmounted(() => {
  stopVisualizerLoop({ clear: true, teardown: true });
  canvasCtx = null;
  analyserDataArray = null;
});
</script>

<template>
  <canvas
    v-if="shouldShowVisualizer"
    ref="lyricVisualizerCanvas"
    class="lyric-visualizer"
    :style="visualizerCanvasStyle"
  ></canvas>
</template>

<style scoped>
.lyric-visualizer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 200px;
  pointer-events: none;
  z-index: 1;
  filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.45));
}
</style>
