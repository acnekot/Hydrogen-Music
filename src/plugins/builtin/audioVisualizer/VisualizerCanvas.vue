<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { usePlayerStore } from '../../../store/playerStore';
import { storeToRefs } from 'pinia';
import { getLyricVisualizerAudioEnv } from '../../../utils/lyricVisualizerAudio';

const playerStore = usePlayerStore();
const {
  playing,
  progress,
  lyricsObjArr,
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
  lyricShow,
  lyricType,
  videoIsPlaying,
} = storeToRefs(playerStore);

const audioEnv = getLyricVisualizerAudioEnv();
const lyricVisualizerCanvas = ref(null);
const visualizerContainerSize = reactive({ width: 0, height: 0 });

const clampNumber = (value, min, max, fallback = min) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return fallback;
  return Math.min(Math.max(numeric, min), max);
};

const parseColorToRGB = (color) => {
  if (!color || typeof color !== 'string') return { r: 0, g: 0, b: 0 };
  const value = color.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
    let hex = value.substring(1);
    if (hex.length === 3) hex = hex.split('').map((ch) => ch + ch).join('');
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
      .map((part) => Number.parseFloat(part.trim()))
      .filter((_, index) => index < 3);
    if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) {
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
  return lyricsObjArr.value.some((item) => !!(item && item.lyric && String(item.lyric).trim()));
});

const lyricAreaVisible = computed(() => {
  return !!(
    hasLyricsList.value &&
    hasAnyLyricContent.value &&
    lyricShow.value &&
    lyricType.value &&
    lyricType.value.indexOf('original') !== -1
  );
});

const lyricPlaceholderVisible = computed(() => !lyricAreaVisible.value);

const visualizerBaseHeightPx = computed(() => Math.max(0, fallbackNumber(lyricVisualizerHeight.value ?? 220, 220)));
const visualizerHeightPx = computed(() => {
  const baseHeight = visualizerBaseHeightPx.value;
  const containerHeight = visualizerContainerSize.height || lyricVisualizerCanvas.value?.parentElement?.clientHeight || 0;
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

const visualizerFrequencyRange = computed(() => normalizeFrequencyRange(lyricVisualizerFrequencyMin.value, lyricVisualizerFrequencyMax.value));
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
const visualizerRadialSizeValue = computed(() => Number.isFinite(Number(lyricVisualizerRadialSize.value)) ? Number(lyricVisualizerRadialSize.value) : 100);
const visualizerRadialSizeRatio = computed(() => visualizerRadialSizeValue.value / 100);
const visualizerRadialOffsetXValue = computed(() => Number.isFinite(Number(lyricVisualizerRadialOffsetX.value)) ? Number(lyricVisualizerRadialOffsetX.value) : 0);
const visualizerRadialOffsetYValue = computed(() => Number.isFinite(Number(lyricVisualizerRadialOffsetY.value)) ? Number(lyricVisualizerRadialOffsetY.value) : 0);
const visualizerRadialCoreSizeValue = computed(() => Number.isFinite(Number(lyricVisualizerRadialCoreSize.value)) ? Number(lyricVisualizerRadialCoreSize.value) : 62);
const visualizerRadialCoreSizeRatio = computed(() => visualizerRadialCoreSizeValue.value / 100);

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

  if (lyricVisualizer.value && lyricAreaVisible.value) {
    return {
      ...base,
      width: 'calc(100% - 3vh)',
      left: '50%',
      right: 'auto',
      bottom: '1.5vh',
      transform: 'translateX(-50%)',
    };
  }

  if (lyricVisualizer.value && lyricPlaceholderVisible.value) {
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
const shouldShowVisualizer = computed(() => shouldShowVisualizerInLyrics.value || shouldShowVisualizerInPlaceholder.value);

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
  }
};

const ensureVisualizerLevels = (size) => {
  if (!Number.isFinite(size) || size <= 0) {
    visualizerBarLevels = null;
    return visualizerBarLevels;
  }
  if (!visualizerBarLevels || visualizerBarLevels.length !== size) {
    visualizerBarLevels = new Float32Array(size);
  }
  return visualizerBarLevels;
};

const resetVisualizerLevels = () => {
  if (visualizerBarLevels) visualizerBarLevels.fill(0);
};

const ensureAudioAnalyser = async () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return false;

  if (!audioEnv.audioContext) {
    audioEnv.audioContext = new AudioContextClass();
  }
  const audioContext = audioEnv.audioContext;
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  if (!audioEnv.analyser) {
    audioEnv.analyser = audioContext.createAnalyser();
  }
  const analyser = audioEnv.analyser;
  syncAnalyserConfig();

  const audioNode = playerStore.currentMusic && playerStore.currentMusic._sounds && playerStore.currentMusic._sounds[0]?._node;
  if (!audioNode) return false;

  let source = audioEnv.audioSourceCache.get(audioNode);
  if (!source) {
    source = audioContext.createMediaElementSource(audioNode);
    audioEnv.audioSourceCache.set(audioNode, source);
  }
  if (!audioEnv.analyserConnected) {
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    audioEnv.analyserConnected = true;
  }
  return true;
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
  for (let index = 0; index < size; index += 1) {
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

const renderVisualizerFrame = () => {
  if (!shouldShowVisualizer.value || !lyricVisualizerCanvas.value) return;
  const analyser = audioEnv.analyser;
  if (!analyser || !canvasCtx) return;

  const barCount = Math.max(1, visualizerBarCountValue.value);
  const smoothing = visualizerSmoothing.value;
  analyser.smoothingTimeConstant = smoothing;

  if (!analyserDataArray || analyserDataArray.length !== analyser.frequencyBinCount) {
    analyserDataArray = new Uint8Array(analyser.frequencyBinCount);
  }
  analyser.getByteFrequencyData(analyserDataArray);

  const minFreq = Math.max(0, Math.min(visualizerFrequencyMinValue.value, analyser.context.sampleRate / 2));
  const maxFreq = Math.max(minFreq + 10, Math.min(visualizerFrequencyMaxValue.value, analyser.context.sampleRate / 2));
  const freqRange = maxFreq - minFreq;
  const freqBinSize = analyser.context.sampleRate / analyser.fftSize;

  const resolveTarget = (index) => {
    const startFreq = minFreq + (freqRange * index) / barCount;
    const endFreq = minFreq + (freqRange * (index + 1)) / barCount;
    const startIndex = Math.max(0, Math.floor(startFreq / freqBinSize));
    const endIndex = Math.min(analyserDataArray.length - 1, Math.ceil(endFreq / freqBinSize));
    let peak = 0;
    for (let i = startIndex; i <= endIndex; i += 1) {
      const value = analyserDataArray[i] / 255;
      if (value > peak) peak = value;
    }
    return peak;
  };

  const paused = !playing.value || visualizerPauseState;
  updateVisualizerLevels(barCount, resolveTarget, { paused });

  const canvas = lyricVisualizerCanvas.value;
  const width = canvas.width;
  const height = canvas.height;
  if (!width || !height) return;

  canvasCtx.clearRect(0, 0, width, height);
  const { r, g, b } = visualizerColorRGB.value;
  const opacity = visualizerOpacityRatio.value;
  canvasCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;

  if (visualizerStyleValue.value === 'radial') {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const maxRadius = Math.min(halfWidth, halfHeight) * Math.max(visualizerRadialSizeRatio.value, 0.05);
    const offsetX = (visualizerRadialOffsetXValue.value / 100) * halfWidth;
    const offsetY = (visualizerRadialOffsetYValue.value / 100) * halfHeight;
    const coreRadius = maxRadius * Math.min(Math.max(visualizerRadialCoreSizeRatio.value, 0.1), 0.95);
    const barWidth = (Math.PI * 2) / barCount;

    for (let i = 0; i < barCount; i += 1) {
      const magnitude = visualizerBarLevels[i] ?? 0;
      const startAngle = i * barWidth;
      const endAngle = startAngle + barWidth * Math.min(Math.max(visualizerBarWidthRatio.value, 0.01), 1);
      const radius = coreRadius + magnitude * (maxRadius - coreRadius);
      canvasCtx.beginPath();
      canvasCtx.arc(halfWidth + offsetX, halfHeight + offsetY, radius, startAngle, endAngle);
      canvasCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      canvasCtx.lineWidth = Math.max(1, radius * 0.0125);
      canvasCtx.stroke();
    }
  } else {
    const barWidth = width / barCount;
    const innerWidth = barWidth * Math.min(Math.max(visualizerBarWidthRatio.value, 0.01), 1);
    for (let i = 0; i < barCount; i += 1) {
      const magnitude = visualizerBarLevels[i] ?? 0;
      const x = i * barWidth + (barWidth - innerWidth) / 2;
      const barHeight = magnitude * height;
      const y = height - barHeight;
      canvasCtx.fillRect(x, y, innerWidth, barHeight);
    }
  }

  animationFrameId = requestAnimationFrame(renderVisualizerFrame);
};

const renderVisualizerPreview = () => {
  if (!shouldShowVisualizer.value || !lyricVisualizerCanvas.value) return;
  if (!animationFrameId) {
    renderVisualizerFrame();
  }
};

const syncVisualizerContainerMetrics = (element) => {
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

  const hostElement = canvas.parentElement || canvas;
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
  const target = lyricVisualizerCanvas.value?.parentElement || lyricVisualizerCanvas.value || null;
  if (typeof ResizeObserver !== 'undefined') {
    if (!target) return;
    if (!resizeObserver) {
      resizeObserver = new ResizeObserver((entries) => {
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
    if (resizeTarget && resizeTarget !== target) resizeObserver.unobserve(resizeTarget);
    resizeTarget = target;
    if (resizeTarget) resizeObserver.observe(resizeTarget);
  } else if (typeof window !== 'undefined') {
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    resizeHandler = () => {
      updateVisualizerCanvasSize();
    };
    window.addEventListener('resize', resizeHandler);
  }
};

const detachVisualizerSizeTracking = () => {
  if (resizeObserver && resizeTarget) {
    try {
      resizeObserver.unobserve(resizeTarget);
    } catch (error) {
      // ignore
    }
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (typeof window !== 'undefined' && resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  resizeTarget = null;
};

const startVisualizerLoop = ({ force = false } = {}) => {
  if (!shouldShowVisualizer.value || !lyricVisualizerCanvas.value) return;
  if (!canvasCtx || force) {
    canvasCtx = lyricVisualizerCanvas.value.getContext('2d');
    if (!canvasCtx) return;
  }
  ensureVisualizerSizeTracking();
  animationFrameId = requestAnimationFrame(renderVisualizerFrame);
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
  new Promise((resolve) => {
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

const setVisualizerActiveState = (isActive) => {
  visualizerPauseState = !isActive;
  if (visualizerPauseState) {
    stopVisualizerLoop({ clear: true });
  } else if (shouldShowVisualizer.value) {
    renderVisualizerPreview();
  }
};

const scheduleVisualizerRefresh = async () => {
  if (!shouldShowVisualizer.value) return;
  await waitForLayoutCommit();
  updateVisualizerCanvasSize();
  renderVisualizerPreview();
};

const scheduleVisualizerReset = async () => {
  stopVisualizerLoop({ clear: true });
  await waitForLayoutCommit();
  if (shouldShowVisualizer.value) {
    startVisualizerLoop({ force: true });
  }
};

watch(shouldShowVisualizer, (active) => {
  if (active) {
    startVisualizerLoop({ force: true });
  } else {
    stopVisualizerLoop({ clear: true, teardown: true });
  }
});

watch(videoIsPlaying, (isPlaying) => {
  visualizerPauseState = !isPlaying;
});

watch(playing, (isPlaying) => {
  if (!shouldShowVisualizer.value) return;
  visualizerPauseState = !isPlaying;
  if (!isPlaying) {
    stopVisualizerLoop({ clear: false });
  } else {
    renderVisualizerPreview();
  }
});

watch([
  lyricVisualizerFrequencyMinValue,
  lyricVisualizerFrequencyMaxValue,
], () => {
  scheduleVisualizerReset();
});

watch(visualizerHeightPx, () => {
  scheduleVisualizerRefresh();
});

watch([
  visualizerBarCountValue,
  visualizerBarWidthRatio,
  visualizerSmoothing,
  visualizerStyleValue,
  visualizerRadialSizeValue,
  visualizerRadialOffsetXValue,
  visualizerRadialOffsetYValue,
  visualizerRadialCoreSizeValue,
  visualizerOpacityValue,
  () => visualizerColorRGB.value,
], () => {
  scheduleVisualizerRefresh();
});

watch(lyricsObjArr, () => {
  if (shouldShowVisualizer.value) {
    scheduleVisualizerRefresh();
  }
});

watch(lyricShow, () => {
  if (shouldShowVisualizer.value) {
    scheduleVisualizerRefresh();
  }
});

watch(lyricType, () => {
  if (shouldShowVisualizer.value) {
    scheduleVisualizerRefresh();
  }
});

onMounted(async () => {
  if (!shouldShowVisualizer.value) return;
  const ready = await ensureAudioAnalyser();
  if (!ready) return;
  await waitForLayoutCommit();
  startVisualizerLoop({ force: true });
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
  top: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
  mix-blend-mode: screen;
  transition: opacity 0.6s ease;
  opacity: 0.95;
}

.dark .lyric-visualizer {
  mix-blend-mode: lighten;
  opacity: 0.9;
}
</style>
