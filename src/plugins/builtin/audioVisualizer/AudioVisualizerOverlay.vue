<script setup>
import { computed, inject, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { usePlayerStore } from '../../../store/playerStore';
import { getLyricVisualizerAudioEnv } from '../../../utils/lyricVisualizerAudio';
import { LyricPluginContextSymbol } from '../../pluginManager';

const lyricContext = inject(LyricPluginContextSymbol, {});
const lyricScroll = lyricContext?.lyricScroll ?? ref(null);
const lyricScrollArea = lyricContext?.lyricScrollArea ?? ref(null);
const lyricAreaVisible = lyricContext?.lyricAreaVisible ?? computed(() => true);
const lyricPlaceholderVisible = lyricContext?.lyricPlaceholderVisible ?? computed(() => false);

const playerStore = usePlayerStore();
const {
  playing,
  progress,
  currentMusic,
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
  videoIsPlaying,
  lyricShow,
  widgetState,
  playerShow,
} = storeToRefs(playerStore);

const audioEnv = getLyricVisualizerAudioEnv();
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
  if (Number.isFinite(ratio)) return Math.min(Math.max(ratio, 0), 1);
  return 1;
});

const visualizerStyleValue = computed(() => (lyricVisualizerStyle.value === 'radial' ? 'radial' : 'bars'));
const visualizerRadialSizeValue = computed(() => {
  const value = Number(lyricVisualizerRadialSize.value);
  if (!Number.isFinite(value) || value <= 0) return 50;
  return Math.min(Math.max(value, 5), 200);
});
const visualizerRadialSizeRatio = computed(() => visualizerRadialSizeValue.value / 100);
const visualizerRadialOffsetXValue = computed(() => {
  const value = Number(lyricVisualizerRadialOffsetX.value);
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, -100), 100);
});
const visualizerRadialOffsetYValue = computed(() => {
  const value = Number(lyricVisualizerRadialOffsetY.value);
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, -100), 100);
});
const visualizerRadialCoreSizeValue = computed(() => {
  const value = Number(lyricVisualizerRadialCoreSize.value);
  if (!Number.isFinite(value)) return 30;
  return Math.min(Math.max(value, 5), 95);
});
const visualizerRadialCoreSizeRatio = computed(() => visualizerRadialCoreSizeValue.value / 100);

const shouldShowVisualizerInLyrics = computed(() => lyricVisualizer.value && lyricAreaVisible.value);
const shouldShowVisualizerInPlaceholder = computed(() => lyricVisualizer.value && lyricPlaceholderVisible.value);
const shouldShowVisualizer = computed(() => shouldShowVisualizerInLyrics.value || shouldShowVisualizerInPlaceholder.value);
const shouldUseLyricContainerHeight = computed(() => shouldShowVisualizerInLyrics.value);

let visualizerBarLevels = null;
let visualizerPauseState = false;
let canvasCtx = null;
let analyserDataArray = null;
let animationFrameId = null;
let resizeObserver = null;
let detachHostMutationObserver = null;

function resetVisualizerLevels() {
  visualizerBarLevels = null;
  analyserDataArray = null;
}

function updateVisualizerSize(canvas) {
  if (!canvas) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (visualizerContainerSize.width !== width || visualizerContainerSize.height !== height) {
    visualizerContainerSize.width = width;
    visualizerContainerSize.height = height;
  }
}

function updateCanvasPixelRatio(canvas) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = Math.max(canvas.clientWidth, visualizerContainerSize.width);
  const displayHeight = Math.max(canvas.clientHeight, visualizerContainerSize.height);
  if (canvas.width !== Math.floor(displayWidth * dpr) || canvas.height !== Math.floor(displayHeight * dpr)) {
    canvas.width = Math.floor(displayWidth * dpr);
    canvas.height = Math.floor(displayHeight * dpr);
    const context = canvas.getContext('2d');
    if (context) {
      context.scale(dpr, dpr);
    }
  }
}

function getVisualizerHostElement(canvas) {
  if (shouldUseLyricContainerHeight.value && lyricScroll.value) return lyricScroll.value;
  return canvas?.parentElement || null;
}

function attachVisualizerSizeTracking(canvas) {
  const hostElement = getVisualizerHostElement(canvas);
  if (!hostElement) return;

  updateVisualizerSize(canvas);
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      updateVisualizerSize(canvas);
      updateCanvasPixelRatio(canvas);
    });
    resizeObserver.observe(hostElement);
  }

  const observerTarget = hostElement === canvas.parentElement ? hostElement : canvas.parentElement;
  if (observerTarget && typeof MutationObserver !== 'undefined') {
    detachHostMutationObserver = new MutationObserver(() => {
      updateVisualizerSize(canvas);
      updateCanvasPixelRatio(canvas);
    });
    detachHostMutationObserver.observe(observerTarget, { attributes: true, childList: true, subtree: true });
  }
}

function detachVisualizerSizeTracking() {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (detachHostMutationObserver) {
    detachHostMutationObserver.disconnect();
    detachHostMutationObserver = null;
  }
}

async function ensureVisualizerContext({ forceRebuild = false } = {}) {
  if (!shouldShowVisualizer.value || !lyricVisualizerCanvas.value) return false;
  const canvas = lyricVisualizerCanvas.value;
  if (!canvasCtx || forceRebuild) {
    canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return false;
  }
  if (!audioEnv.ensureAnalyser({ forceRebuild })) {
    canvasCtx = null;
    return false;
  }
  const analyser = audioEnv.getAnalyser();
  if (!analyser) return false;
  const size = analyser.frequencyBinCount;
  if (!analyserDataArray || analyserDataArray.length !== size) {
    analyserDataArray = new Uint8Array(size);
  }
  return true;
}

function stopVisualizerLoop({ clear = false, teardown = false } = {}) {
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
}

const waitForNextFrame = () =>
  new Promise(resolve => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 16);
    }
  });

async function waitForLayoutCommit() {
  await nextTick();
  await waitForNextFrame();
}

const visualizerCanvasStyle = computed(() => {
  const isRadial = visualizerStyleValue.value === 'radial';
  const height = visualizerCanvasHeightPx.value + 'px';
  if (isRadial) {
    return {
      height,
      width: '100%',
      minHeight: height,
    };
  }
  return {
    height,
    width: '100%',
  };
});

function drawVisualizerFrame({ analyser, canvas, width, height, smoothingTimeConstant }) {
  if (!canvasCtx) return;
  analyser.smoothingTimeConstant = smoothingTimeConstant;
  analyser.getByteFrequencyData(analyserDataArray);

  const { r, g, b } = visualizerColorRGB.value;
  const opacityRatio = visualizerOpacityRatio.value;
  const styleMode = visualizerStyleValue.value;
  canvasCtx.clearRect(0, 0, width, height);
  canvasCtx.globalAlpha = opacityRatio;

  const nyquist = analyser.context.sampleRate / 2;
  const frequencyMin = Math.max(0, Math.min(visualizerFrequencyMinValue.value, nyquist));
  const frequencyMax = Math.max(frequencyMin + 10, Math.min(visualizerFrequencyMaxValue.value, nyquist));
  const barCount = Math.max(1, visualizerBarCountValue.value);
  const paused = !playing.value || visualizerPauseState;

  if (styleMode === 'radial') {
    const sizeRatio = Math.max(visualizerRadialSizeRatio.value, 0.05);
    const offsetX = (visualizerRadialOffsetXValue.value / 100) * (width / 2);
    const offsetY = (visualizerRadialOffsetYValue.value / 100) * (height / 2);
    const coreRatio = Math.min(Math.max(visualizerRadialCoreSizeRatio.value, 0.1), 0.95);
    const outerRadius = Math.min(width, height) * sizeRatio;
    const innerRadius = outerRadius * coreRatio;

    for (let i = 0; i < barCount; i++) {
      const index = Math.floor((i / barCount) * analyserDataArray.length);
      const magnitude = analyserDataArray[index] / 255;
      const angle = (i / barCount) * Math.PI * 2;
      const magnitudeRadius = innerRadius + (outerRadius - innerRadius) * (paused ? 0 : magnitude);
      const x = width / 2 + offsetX + Math.cos(angle) * magnitudeRadius;
      const y = height / 2 + offsetY + Math.sin(angle) * magnitudeRadius;
      canvasCtx.beginPath();
      canvasCtx.moveTo(width / 2 + offsetX + Math.cos(angle) * innerRadius, height / 2 + offsetY + Math.sin(angle) * innerRadius);
      canvasCtx.lineTo(x, y);
      canvasCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacityRatio})`;
      canvasCtx.lineWidth = Math.max(1, (outerRadius - innerRadius) / barCount * visualizerBarWidthRatio.value);
      canvasCtx.stroke();
    }
    return;
  }

  const usableBars = Math.max(1, Math.floor(width / 3));
  const step = (frequencyMax - frequencyMin) / usableBars;
  const barWidth = width / barCount;

  for (let i = 0; i < barCount; i++) {
    const frequency = frequencyMin + i * step;
    const index = Math.min(analyserDataArray.length - 1, Math.floor((frequency / nyquist) * analyserDataArray.length));
    const magnitude = analyserDataArray[index] / 255;
    const barHeight = (paused ? 0 : magnitude) * height;
    const barX = i * barWidth;
    const barInnerWidth = barWidth * Math.min(Math.max(visualizerBarWidthRatio.value, 0.01), 1);
    const x = barX + (barWidth - barInnerWidth) / 2;
    const y = height - barHeight;
    canvasCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacityRatio})`;
    canvasCtx.fillRect(x, y, barInnerWidth, barHeight);
  }
}

async function startVisualizerLoop({ force = false } = {}) {
  if (!shouldShowVisualizer.value || !lyricVisualizerCanvas.value) return;
  const canvas = lyricVisualizerCanvas.value;
  if (!await ensureVisualizerContext({ forceRebuild: force })) return;
  updateVisualizerSize(canvas);
  updateCanvasPixelRatio(canvas);
  const analyser = audioEnv.getAnalyser();
  if (!analyser || !canvasCtx) return;
  const renderFrame = () => {
    animationFrameId = requestAnimationFrame(renderFrame);
    if (!canvasCtx) return;
    const width = canvas.clientWidth || canvas.width;
    const height = canvas.clientHeight || canvas.height;
    drawVisualizerFrame({ analyser, canvas, width, height, smoothingTimeConstant: visualizerSmoothing.value });
  };
  stopVisualizerLoop();
  renderFrame();
}

async function setupVisualizer({ force = false } = {}) {
  if (!shouldShowVisualizer.value || !lyricVisualizerCanvas.value) return;
  const canvas = lyricVisualizerCanvas.value;
  stopVisualizerLoop();
  await ensureVisualizerContext({ forceRebuild: force });
  updateVisualizerSize(canvas);
  updateCanvasPixelRatio(canvas);
  attachVisualizerSizeTracking(canvas);
  startVisualizerLoop({ force });
}

watch(() => lyricVisualizer.value, async (enabled) => {
  if (enabled) {
    await waitForLayoutCommit();
    await setupVisualizer({ force: true });
  } else {
    stopVisualizerLoop({ clear: true, teardown: true });
  }
});

watch([lyricAreaVisible, lyricPlaceholderVisible], async () => {
  if (lyricVisualizer.value) {
    await waitForLayoutCommit();
    await setupVisualizer({ force: true });
  }
});

watch([
  visualizerFrequencyMinValue,
  visualizerFrequencyMaxValue,
  visualizerBarCountValue,
  visualizerBarWidthRatio,
  visualizerStyleValue,
  visualizerRadialSizeRatio,
  visualizerRadialOffsetXValue,
  visualizerRadialOffsetYValue,
  visualizerRadialCoreSizeRatio,
  visualizerColorRGB,
  visualizerOpacityRatio,
], () => {
  if (!shouldShowVisualizer.value) return;
  if (visualizerStyleValue.value === 'radial') {
    stopVisualizerLoop();
    startVisualizerLoop();
  }
});

watch(playing, () => {
  visualizerPauseState = !playing.value;
});

watch(() => widgetState.value, async () => {
  if (!shouldShowVisualizer.value) return;
  await waitForLayoutCommit();
  await setupVisualizer({ force: true });
});

watch(() => playerShow.value, async () => {
  if (!shouldShowVisualizer.value) return;
  await waitForLayoutCommit();
  await setupVisualizer({ force: true });
});

watch(() => lyricShow.value, async () => {
  if (!shouldShowVisualizer.value) return;
  await waitForLayoutCommit();
  await setupVisualizer({ force: true });
});

watch(() => videoIsPlaying.value, async () => {
  if (!shouldShowVisualizer.value) return;
  await waitForLayoutCommit();
  await setupVisualizer({ force: true });
});

watch(() => progress.value, () => {
  if (!shouldShowVisualizer.value) return;
  if (visualizerPauseState && playing.value) {
    visualizerPauseState = false;
  }
});

onMounted(async () => {
  visualizerPauseState = !playing.value;
  if (shouldShowVisualizer.value) {
    await waitForLayoutCommit();
    await setupVisualizer({ force: true });
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
  position: relative;
  display: block;
  width: 100%;
  margin-bottom: 8px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.25);
  mix-blend-mode: screen;
}

.dark .lyric-visualizer {
  background: rgba(255, 255, 255, 0.08);
  mix-blend-mode: lighten;
}
</style>
