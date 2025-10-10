<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/store/playerStore'
import { getLyricVisualizerAudioEnv } from '@/utils/lyricVisualizerAudio'

const props = defineProps({
  slotProps: {
    type: Object,
    default: () => ({})
  }
})

const playerStore = usePlayerStore()
const {
  playing,
  progress,
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
  lyricVisualizerRadialCoreSize
} = storeToRefs(playerStore)

const lyricVisualizerCanvas = ref(null)
const visualizerContainerSize = reactive({ width: 0, height: 0 })
const audioEnv = getLyricVisualizerAudioEnv()

const lyricAreaVisible = computed(() => !!props.slotProps?.lyricAreaVisible)
const lyricPlaceholderVisible = computed(() => !!props.slotProps?.lyricPlaceholderVisible)
const lyricScrollElement = computed(() => props.slotProps?.lyricScrollRef?.value || null)
const lyricContainerElement = computed(() => props.slotProps?.lyricContainerRef?.value || null)

const clampNumber = (value, min, max, fallback = min) => {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return fallback
  return Math.min(Math.max(numeric, min), max)
}

const parseColorToRGB = color => {
  if (!color || typeof color !== 'string') return { r: 0, g: 0, b: 0 }
  const value = color.trim()
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
    let hex = value.substring(1)
    if (hex.length === 3) hex = hex.split('').map(ch => ch + ch).join('')
    const intVal = parseInt(hex, 16)
    return {
      r: (intVal >> 16) & 255,
      g: (intVal >> 8) & 255,
      b: intVal & 255
    }
  }
  const rgbMatch = value.match(/^rgba?\(([^)]+)\)$/i)
  if (rgbMatch) {
    const parts = rgbMatch[1]
      .split(',')
      .map(part => Number.parseFloat(part.trim()))
      .filter((_, index) => index < 3)
    if (parts.length === 3 && parts.every(part => Number.isFinite(part))) {
      return {
        r: clampNumber(parts[0], 0, 255, 0),
        g: clampNumber(parts[1], 0, 255, 0),
        b: clampNumber(parts[2], 0, 255, 0)
      }
    }
  }
  return { r: 0, g: 0, b: 0 }
}

const fallbackNumber = (value, fallback) => {
  const numeric = Number(value)
  if (Number.isFinite(numeric)) return numeric
  return fallback
}

const DEFAULT_FREQ_MIN = 20
const DEFAULT_FREQ_MAX = 8000
const VISUALIZER_HEIGHT_OFFSET = 3
const VISUALIZER_REFERENCE_CONTAINER_HEIGHT = 720

const visualizerBaseHeightPx = computed(() => Math.max(0, fallbackNumber(lyricVisualizerHeight.value ?? 220, 220)))
const visualizerHeightPx = computed(() => {
  const baseHeight = visualizerBaseHeightPx.value
  const containerHeight =
    visualizerContainerSize.height ||
    lyricScrollElement.value?.clientHeight ||
    lyricVisualizerCanvas.value?.parentElement?.clientHeight ||
    0
  if (!containerHeight) return baseHeight
  if (containerHeight <= baseHeight) return containerHeight
  const scaleFactor = containerHeight / VISUALIZER_REFERENCE_CONTAINER_HEIGHT
  const scaled = baseHeight * scaleFactor
  const target = Math.min(containerHeight, Math.max(baseHeight, scaled))
  return Math.round(clampNumber(target, baseHeight, containerHeight, baseHeight))
})

const visualizerCanvasHeightPx = computed(() => Math.max(0, visualizerHeightPx.value + VISUALIZER_HEIGHT_OFFSET))

const normalizeFrequencyRange = (minValue, maxValue) => {
  let min = fallbackNumber(minValue ?? DEFAULT_FREQ_MIN, DEFAULT_FREQ_MIN)
  let max = fallbackNumber(maxValue ?? DEFAULT_FREQ_MAX, DEFAULT_FREQ_MAX)
  min = clampNumber(Math.round(min), 20, 20000, DEFAULT_FREQ_MIN)
  max = clampNumber(Math.round(max), 20, 20000, DEFAULT_FREQ_MAX)
  if (min >= max) {
    if (min >= 19990) {
      min = 19990
      max = 20000
    } else {
      max = Math.min(20000, min + 10)
    }
  }
  if (max - min < 10) {
    if (min >= 19990) {
      min = 19990
      max = 20000
    } else {
      max = Math.min(20000, min + 10)
    }
  }
  return { min, max }
}

const visualizerFrequencyRange = computed(() =>
  normalizeFrequencyRange(lyricVisualizerFrequencyMin.value, lyricVisualizerFrequencyMax.value)
)
const visualizerFrequencyMinValue = computed(() => visualizerFrequencyRange.value.min)
const visualizerFrequencyMaxValue = computed(() => visualizerFrequencyRange.value.max)
const visualizerSmoothing = computed(() => {
  const value = Number(lyricVisualizerTransitionDelay.value)
  if (Number.isFinite(value)) return Math.min(Math.max(value, 0), 0.95)
  return 0.75
})
const visualizerBarCountValue = computed(() => {
  const value = Number(lyricVisualizerBarCount.value)
  if (!Number.isFinite(value) || value <= 0) return 1
  return Math.round(value)
})
const visualizerBarWidthRatio = computed(() => {
  const value = Number(lyricVisualizerBarWidth.value)
  if (!Number.isFinite(value) || value <= 0) return 0.55
  return Math.min(value, 100) / 100
})
const visualizerColorRGB = computed(() => {
  if (lyricVisualizerColor.value === 'white') return { r: 255, g: 255, b: 255 }
  if (lyricVisualizerColor.value === 'black') return { r: 0, g: 0, b: 0 }
  return parseColorToRGB(lyricVisualizerColor.value)
})
const visualizerOpacityValue = computed(() => {
  const value = Number(lyricVisualizerOpacity.value)
  if (!Number.isFinite(value)) return 100
  return Math.min(Math.max(Math.round(value), 0), 100)
})
const visualizerOpacityRatio = computed(() => {
  const ratio = visualizerOpacityValue.value / 100
  return clampNumber(ratio, 0, 1, 1)
})
const visualizerStyleValue = computed(() => (lyricVisualizerStyle.value === 'radial' ? 'radial' : 'bars'))
const visualizerRadialSizeValue = computed(() => {
  const value = Number(lyricVisualizerRadialSize.value)
  if (!Number.isFinite(value)) return 100
  return Math.min(Math.max(Math.round(value), 10), 400)
})
const visualizerRadialSizeRatio = computed(() => visualizerRadialSizeValue.value / 100)
const visualizerRadialOffsetXValue = computed(() => {
  const value = Number(lyricVisualizerRadialOffsetX.value)
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(Math.round(value), -100), 100)
})
const visualizerRadialOffsetYValue = computed(() => {
  const value = Number(lyricVisualizerRadialOffsetY.value)
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(Math.round(value), -100), 100)
})
const visualizerRadialCoreSizeValue = computed(() => {
  const value = Number(lyricVisualizerRadialCoreSize.value)
  if (!Number.isFinite(value)) return 62
  return Math.min(Math.max(Math.round(value), 10), 100)
})
const visualizerRadialCoreSizeRatio = computed(() => visualizerRadialCoreSizeValue.value / 100)

const visualizerCanvasStyle = computed(() => {
  const isRadial = visualizerStyleValue.value === 'radial'
  if (isRadial) {
    return {
      width: 'calc(100% - 3vh)',
      height: 'calc(100% - 3vh)',
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      transform: 'translate(-50%, -50%)'
    }
  }

  const height = `${visualizerCanvasHeightPx.value}px`
  const base = {
    height,
    top: 'auto'
  }

  if (lyricAreaVisible.value || lyricPlaceholderVisible.value) {
    return {
      ...base,
      width: 'calc(100% - 3vh)',
      left: '50%',
      right: 'auto',
      bottom: '1.5vh',
      transform: 'translateX(-50%)'
    }
  }

  return {
    ...base,
    width: '100%',
    left: '0',
    right: '0',
    bottom: '1.5vh',
    transform: 'none'
  }
})

const shouldShowVisualizer = computed(() => lyricVisualizer.value && (lyricAreaVisible.value || lyricPlaceholderVisible.value))

let analyserDataArray = null
let canvasCtx = null
let animationFrameId = null
let resizeObserver = null
let resizeHandler = null
let resizeTarget = null
let visualizerBarLevels = null
let visualizerPauseState = false

const syncAnalyserConfig = () => {
  const analyser = audioEnv.analyser
  if (!analyser) return
  const fftSize = 2048
  if (analyser.fftSize !== fftSize) {
    analyser.fftSize = fftSize
    analyserDataArray = new Uint8Array(analyser.frequencyBinCount)
  } else if (!analyserDataArray || analyserDataArray.length !== analyser.frequencyBinCount) {
    analyserDataArray = new Uint8Array(analyser.frequencyBinCount)
  }
  analyser.smoothingTimeConstant = visualizerSmoothing.value
}

const ensureVisualizerLevels = size => {
  if (size <= 0) {
    visualizerBarLevels = null
    return visualizerBarLevels
  }
  if (!visualizerBarLevels || visualizerBarLevels.length !== size) {
    visualizerBarLevels = new Float32Array(size)
  }
  return visualizerBarLevels
}

const resetVisualizerLevels = () => {
  visualizerBarLevels = null
}

const updateVisualizerLevels = (size, resolveTarget, { paused = false } = {}) => {
  const levels = ensureVisualizerLevels(size)
  if (!levels) return 0
  const smoothing = visualizerSmoothing.value
  const attackBase = Math.min(0.85, Math.max(0.25, 0.55 + (1 - smoothing) * 0.35))
  const attack = paused ? Math.max(0.12, attackBase * 0.5) : attackBase
  const releaseBase = 0.02 + smoothing * 0.045
  const release = paused ? releaseBase * 0.35 : releaseBase
  let peak = 0
  for (let index = 0; index < size; index++) {
    const target = Math.max(0, Math.min(1, resolveTarget(index) ?? 0))
    const current = levels[index] ?? 0
    let nextValue
    if (target >= current) {
      nextValue = current + (target - current) * attack
    } else {
      const drop = release + current * 0.04
      nextValue = current - Math.min(current - target, drop)
    }
    if (paused && target === 0 && nextValue < current) {
      nextValue = Math.max(0, nextValue)
    }
    if (!Number.isFinite(nextValue)) nextValue = 0
    nextValue = Math.max(0, Math.min(1, nextValue))
    levels[index] = nextValue
    if (nextValue > peak) peak = nextValue
  }
  return peak
}

const renderVisualizerPreview = () => {
  if (!shouldShowVisualizer.value || !lyricVisualizerCanvas.value) return
  if (!animationFrameId) {
    renderVisualizerFrame()
  }
}

const syncVisualizerContainerMetrics = element => {
  if (!element) return
  const rect = element.getBoundingClientRect?.()
  if (!rect) return
  const width = Math.max(0, Math.round(rect.width))
  const height = Math.max(0, Math.round(rect.height))
  if (visualizerContainerSize.width !== width || visualizerContainerSize.height !== height) {
    visualizerContainerSize.width = width
    visualizerContainerSize.height = height
  }
}

const resetVisualizerContainerMetrics = () => {
  if (visualizerContainerSize.width !== 0 || visualizerContainerSize.height !== 0) {
    visualizerContainerSize.width = 0
    visualizerContainerSize.height = 0
  }
}

const updateVisualizerCanvasSize = () => {
  const canvas = lyricVisualizerCanvas.value
  if (!canvas) {
    resetVisualizerContainerMetrics()
    return
  }

  const hostElement = lyricScrollElement.value || lyricContainerElement.value || canvas.parentElement || canvas
  syncVisualizerContainerMetrics(hostElement)

  const displayWidth = Math.max(canvas.clientWidth, visualizerContainerSize.width)
  const isRadial = visualizerStyleValue.value === 'radial'
  const displayHeight = isRadial
    ? Math.max(canvas.clientHeight || 0, visualizerContainerSize.height)
    : Math.max(visualizerCanvasHeightPx.value, canvas.clientHeight || 0)
  if (!displayWidth || !displayHeight) return
  if (!canvasCtx) return
  const dpr = window.devicePixelRatio || 1
  const targetWidth = Math.round(displayWidth * dpr)
  const targetHeight = Math.round(displayHeight * dpr)
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth
    canvas.height = targetHeight
  }
  if (typeof canvasCtx.resetTransform === 'function') canvasCtx.resetTransform()
  else canvasCtx.setTransform(1, 0, 0, 1, 0, 0)
  canvasCtx.scale(dpr, dpr)
}

const ensureVisualizerSizeTracking = () => {
  updateVisualizerCanvasSize()
  const target = lyricScrollElement.value || lyricContainerElement.value || lyricVisualizerCanvas.value?.parentElement || null
  if (typeof ResizeObserver !== 'undefined') {
    if (!target) return
    if (!resizeObserver) {
      resizeObserver = new ResizeObserver(entries => {
        let handled = false
        for (const entry of entries) {
          if (!entry) continue
          const { contentRect, target: entryTarget } = entry
          if (contentRect) {
            const width = Math.max(0, Math.round(contentRect.width))
            const height = Math.max(0, Math.round(contentRect.height))
            if (visualizerContainerSize.width !== width || visualizerContainerSize.height !== height) {
              visualizerContainerSize.width = width
              visualizerContainerSize.height = height
            }
            handled = true
          } else if (entryTarget) {
            syncVisualizerContainerMetrics(entryTarget)
            handled = true
          }
        }
        if (!handled && target) syncVisualizerContainerMetrics(target)
        updateVisualizerCanvasSize()
      })
    }
    if (resizeTarget && resizeTarget !== target) {
      resizeObserver.unobserve(resizeTarget)
      resizeTarget = null
    }
    if (!resizeTarget) {
      resizeObserver.observe(target)
      resizeTarget = target
    }
  } else if (typeof window !== 'undefined' && !resizeHandler) {
    resizeHandler = () => updateVisualizerCanvasSize()
    window.addEventListener('resize', resizeHandler)
  }
}

const detachVisualizerSizeTracking = () => {
  if (resizeObserver && resizeTarget) {
    resizeObserver.unobserve(resizeTarget)
    resizeTarget = null
  }
  if (resizeObserver && !resizeTarget && typeof resizeObserver.disconnect === 'function') {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (resizeHandler && typeof window !== 'undefined') {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }
  resetVisualizerContainerMetrics()
}

const setupVisualizer = async () => {
  if (!shouldShowVisualizer.value || !lyricVisualizerCanvas.value) return
  if (!currentMusic.value || !currentMusic.value._sounds || !currentMusic.value._sounds.length) return
  const audioNode = currentMusic.value._sounds[0]?._node
  if (!audioNode) return

  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return

  if (!audioEnv.audioContext) {
    try {
      audioEnv.audioContext = new AudioContextClass()
    } catch (error) {
      console.warn('创建音频上下文失败:', error)
      return
    }
  }

  const audioContext = audioEnv.audioContext

  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume()
    } catch (error) {
      console.warn('恢复音频上下文失败:', error)
    }
  }

  if (!audioEnv.analyser) {
    audioEnv.analyser = audioContext.createAnalyser()
  }
  syncAnalyserConfig()

  const analyser = audioEnv.analyser

  let source = audioEnv.audioSourceCache.get(audioNode)
  try {
    if (!source) {
      source = audioContext.createMediaElementSource(audioNode)
      audioEnv.audioSourceCache.set(audioNode, source)
    }
  } catch (error) {
    console.warn('创建音频源失败:', error)
    return
  }

  try {
    source.disconnect()
  } catch (_) {}
  source.connect(analyser)
  if (!audioEnv.analyserConnected) {
    analyser.connect(audioContext.destination)
    audioEnv.analyserConnected = true
  }

  canvasCtx = lyricVisualizerCanvas.value?.getContext('2d') || null
  if (!canvasCtx) return
  updateVisualizerCanvasSize()
  startVisualizerLoop({ force: true })
}

const teardownVisualizer = () => {
  stopVisualizerLoop({ clear: true })
  if (resizeObserver && resizeTarget) {
    resizeObserver.unobserve(resizeTarget)
    resizeTarget = null
  }
  if (resizeObserver && typeof resizeObserver.disconnect === 'function') {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (resizeHandler && typeof window !== 'undefined') {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }
  resetVisualizerContainerMetrics()
  canvasCtx = null
  analyserDataArray = null
}

const waitForNextFrame = () =>
  new Promise(resolve => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
    } else {
      setTimeout(resolve, 16)
    }
  })

const waitForLayoutCommit = async () => {
  await nextTick()
  await waitForNextFrame()
}

const renderVisualizerFrame = () => {
  if (!shouldShowVisualizer.value || !canvasCtx || !lyricVisualizerCanvas.value) return
  const analyser = audioEnv.analyser
  if (!analyser || !analyser.frequencyBinCount) return

  const canvas = lyricVisualizerCanvas.value
  const width = canvas.width || canvas.clientWidth
  const height = canvas.height || canvas.clientHeight
  if (!width || !height) return

  if (!analyserDataArray || analyserDataArray.length !== analyser.frequencyBinCount) {
    analyserDataArray = new Uint8Array(analyser.frequencyBinCount)
  }

  analyser.getByteFrequencyData(analyserDataArray)
  const nyquist = audioEnv.audioContext ? audioEnv.audioContext.sampleRate / 2 : 22050
  const freqMin = Math.max(0, Math.min(visualizerFrequencyMinValue.value, nyquist))
  const freqMax = Math.max(freqMin + 10, Math.min(visualizerFrequencyMaxValue.value, nyquist))
  const bucketSize = Math.max(1, Math.floor((analyserDataArray.length * (freqMax - freqMin)) / nyquist))
  const bucketStart = Math.max(0, Math.floor((analyserDataArray.length * freqMin) / nyquist))

  const barCount = Math.max(1, visualizerBarCountValue.value)
  const maxIndex = bucketStart + bucketSize

  const resolveTarget = (index) => {
    const bucketIndex = bucketStart + Math.floor((index / barCount) * (maxIndex - bucketStart))
    if (bucketIndex < bucketStart || bucketIndex >= analyserDataArray.length) return 0
    return analyserDataArray[bucketIndex] / 255
  }

  const paused = !playing.value || visualizerPauseState
  const peak = updateVisualizerLevels(barCount, resolveTarget, { paused })
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height)

  const { r, g, b } = visualizerColorRGB.value
  const opacityRatio = visualizerOpacityRatio.value
  const styleMode = visualizerStyleValue.value

  if (styleMode === 'radial') {
    renderRadialVisualizer(canvasCtx, { width, height, r, g, b, opacityRatio, peak, barCount })
  } else {
    renderBarVisualizer(canvasCtx, { width, height, r, g, b, opacityRatio, barCount })
  }

  animationFrameId = requestAnimationFrame(renderVisualizerFrame)
}

const renderBarVisualizer = (ctx, { width, height, r, g, b, opacityRatio, barCount }) => {
  const barWidth = width / barCount
  const effectiveWidth = barWidth * Math.min(Math.max(visualizerBarWidthRatio.value, 0.01), 1)
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacityRatio})`)
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${opacityRatio * 0.25})`)
  for (let i = 0; i < barCount; i++) {
    const barHeight = (visualizerBarLevels?.[i] ?? 0) * height
    const x = i * barWidth + (barWidth - effectiveWidth) / 2
    const y = height - barHeight
    ctx.fillStyle = gradient
    ctx.fillRect(x, y, effectiveWidth, barHeight)
  }
}

const renderRadialVisualizer = (ctx, { width, height, r, g, b, opacityRatio, barCount }) => {
  const halfWidth = width / 2
  const halfHeight = height / 2
  const radius = Math.min(halfWidth, halfHeight) * Math.max(visualizerRadialSizeRatio.value, 0.05)
  const coreRadius = radius * Math.min(Math.max(visualizerRadialCoreSizeRatio.value, 0.1), 0.95)
  const offsetX = (visualizerRadialOffsetXValue.value / 100) * halfWidth
  const offsetY = (visualizerRadialOffsetYValue.value / 100) * halfHeight
  const cx = halfWidth + offsetX
  const cy = halfHeight + offsetY
  const barWidth = (Math.PI * 2) / barCount
  ctx.save()
  ctx.translate(cx, cy)
  for (let i = 0; i < barCount; i++) {
    const level = visualizerBarLevels?.[i] ?? 0
    const barLength = (radius - coreRadius) * level
    const angle = i * barWidth
    const x = Math.cos(angle)
    const y = Math.sin(angle)
    ctx.beginPath()
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacityRatio})`
    ctx.lineWidth = Math.min(Math.max(visualizerBarWidthRatio.value, 0.05), 1) * 4
    ctx.moveTo(x * coreRadius, y * coreRadius)
    ctx.lineTo(x * (coreRadius + barLength), y * (coreRadius + barLength))
    ctx.stroke()
  }
  ctx.restore()
}

const startVisualizerLoop = ({ force = false } = {}) => {
  if (!shouldShowVisualizer.value || !canvasCtx || (!force && animationFrameId)) return
  cancelAnimationFrame(animationFrameId)
  animationFrameId = requestAnimationFrame(renderVisualizerFrame)
}

const stopVisualizerLoop = ({ clear = false, teardown = false } = {}) => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  if (clear && canvasCtx && lyricVisualizerCanvas.value) {
    const canvas = lyricVisualizerCanvas.value
    canvasCtx.clearRect(0, 0, canvas.width || canvas.clientWidth || 0, canvas.height || canvas.clientHeight || 0)
  }
  if (teardown) {
    canvasCtx = null
    analyserDataArray = null
    resetVisualizerLevels()
  }
}

watch(shouldShowVisualizer, async active => {
  if (active) {
    await waitForLayoutCommit()
    await setupVisualizer()
    ensureVisualizerSizeTracking()
    startVisualizerLoop({ force: true })
  } else {
    stopVisualizerLoop({ clear: true })
    detachVisualizerSizeTracking()
  }
})

watch([visualizerFrequencyMinValue, visualizerFrequencyMaxValue], () => {
  renderVisualizerPreview()
})

watch(visualizerHeightPx, () => {
  renderVisualizerPreview()
})

watch(visualizerBarCountValue, () => {
  resetVisualizerLevels()
  renderVisualizerPreview()
})

watch(visualizerBarWidthRatio, () => {
  renderVisualizerPreview()
})

watch(visualizerSmoothing, () => {
  syncAnalyserConfig()
  renderVisualizerPreview()
})

watch(visualizerStyleValue, () => {
  renderVisualizerPreview()
})

watch(visualizerRadialSizeValue, () => {
  renderVisualizerPreview()
})

watch(visualizerRadialOffsetXValue, () => {
  renderVisualizerPreview()
})

watch(visualizerRadialOffsetYValue, () => {
  renderVisualizerPreview()
})

watch(visualizerRadialCoreSizeValue, () => {
  renderVisualizerPreview()
})

watch(visualizerOpacityValue, () => {
  renderVisualizerPreview()
})

watch(() => playing.value, (isPlaying) => {
  visualizerPauseState = !isPlaying
  if (isPlaying) {
    startVisualizerLoop()
  }
})

watch(() => progress.value, () => {
  renderVisualizerPreview()
})

const resumeAfterInterruption = () => {
  if (!shouldShowVisualizer.value) return
  startVisualizerLoop({ force: true })
}

onMounted(() => {
  visualizerPauseState = !playing.value
  if (shouldShowVisualizer.value) {
    nextTick(async () => {
      await setupVisualizer()
      visualizerPauseState = !playing.value
      startVisualizerLoop({ force: true })
      ensureVisualizerSizeTracking()
    })
  }
  window.addEventListener('focus', resumeAfterInterruption)
})

onUnmounted(() => {
  window.removeEventListener('focus', resumeAfterInterruption)
  teardownVisualizer()
})
</script>

<template>
  <canvas
    v-if="shouldShowVisualizer"
    ref="lyricVisualizerCanvas"
    class="lyric-visualizer"
    :style="visualizerCanvasStyle"
  ></canvas>
</template>
