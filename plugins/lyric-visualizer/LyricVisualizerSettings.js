import { createElementVNode as _createElementVNode, unref as _unref, toDisplayString as _toDisplayString, normalizeClass as _normalizeClass, vShow as _vShow, withDirectives as _withDirectives, Transition as _Transition, withCtx as _withCtx, createVNode as _createVNode, vModelText as _vModelText, withKeys as _withKeys, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, pushScopeId as _pushScopeId, popScopeId as _popScopeId } from "vue"

const _withScopeId = n => (_pushScopeId("data-v-lyric-visualizer-settings"),n=n(),_popScopeId(),n)
const _hoisted_1 = { class: "lv-wrapper" }
const _hoisted_2 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("span", null, "返回", -1 /* HOISTED */))
const _hoisted_3 = [
  _hoisted_2
]
const _hoisted_4 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "lv-header-text" }, [
  /*#__PURE__*/_createElementVNode("h1", { class: "lv-title" }, "歌词音频可视化"),
  /*#__PURE__*/_createElementVNode("p", { class: "lv-description" }, " 启用后将在歌词区域绘制实时频谱，可自定义柱状或圆环样式及相关参数。 ")
], -1 /* HOISTED */))
const _hoisted_5 = { class: "lv-section" }
const _hoisted_6 = { class: "lv-option" }
const _hoisted_7 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "lv-option-label" }, "开启可视化", -1 /* HOISTED */))
const _hoisted_8 = { class: "lv-option-control" }
const _hoisted_9 = { class: "lv-toggle-on" }
const _hoisted_10 = {
  key: 0,
  class: "lv-options-group"
}
const _hoisted_11 = { class: "lv-option" }
const _hoisted_12 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "lv-option-label" }, "可视化样式", -1 /* HOISTED */))
const _hoisted_13 = { class: "lv-option-control lv-option-control--with-reset" }
const _hoisted_14 = { class: "lv-selector-wrapper" }
const _hoisted_15 = {
  key: 0,
  class: "lv-option"
}
const _hoisted_16 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "lv-option-label" }, "圆环大小", -1 /* HOISTED */))
const _hoisted_17 = { class: "lv-option-control lv-option-control--with-input" }
const _hoisted_18 = { class: "lv-selector-wrapper" }
const _hoisted_19 = { class: "lv-add-group" }
const _hoisted_20 = ["onKeyup"]
const _hoisted_21 = {
  key: 1,
  class: "lv-option"
}
const _hoisted_22 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "lv-option-label" }, "X 轴偏移", -1 /* HOISTED */))
const _hoisted_23 = { class: "lv-option-control lv-option-control--with-input" }
const _hoisted_24 = { class: "lv-selector-wrapper" }
const _hoisted_25 = { class: "lv-add-group" }
const _hoisted_26 = ["onKeyup"]
const _hoisted_27 = {
  key: 2,
  class: "lv-option"
}
const _hoisted_28 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "lv-option-label" }, "Y 轴偏移", -1 /* HOISTED */))
const _hoisted_29 = { class: "lv-option-control lv-option-control--with-input" }
const _hoisted_30 = { class: "lv-selector-wrapper" }
const _hoisted_31 = { class: "lv-add-group" }
const _hoisted_32 = ["onKeyup"]
const _hoisted_33 = { class: "lv-option" }
const _hoisted_34 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "lv-option-label" }, "可视化高度", -1 /* HOISTED */))
const _hoisted_35 = { class: "lv-option-control lv-option-control--with-input" }
const _hoisted_36 = { class: "lv-selector-wrapper" }
const _hoisted_37 = { class: "lv-add-group" }
const _hoisted_38 = ["onKeyup"]
const _hoisted_39 = { class: "lv-option" }
const _hoisted_40 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "lv-option-label" }, "柱体数量", -1 /* HOISTED */))
const _hoisted_41 = { class: "lv-option-control lv-option-control--with-input" }
const _hoisted_42 = { class: "lv-selector-wrapper" }
const _hoisted_43 = { class: "lv-add-group" }
const _hoisted_44 = ["onKeyup"]
const _hoisted_45 = { class: "lv-option" }
const _hoisted_46 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "lv-option-label" }, "柱体宽度", -1 /* HOISTED */))
const _hoisted_47 = { class: "lv-option-control lv-option-control--with-input" }
const _hoisted_48 = { class: "lv-selector-wrapper" }
const _hoisted_49 = { class: "lv-add-group" }
const _hoisted_50 = ["onKeyup"]
const _hoisted_51 = { class: "lv-option" }
const _hoisted_52 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "lv-option-label" }, "频率范围", -1 /* HOISTED */))
const _hoisted_53 = { class: "lv-option-control lv-option-control--range" }
const _hoisted_54 = { class: "lv-option-subgroup" }
const _hoisted_55 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("span", { class: "lv-option-subgroup-label" }, "最低", -1 /* HOISTED */))
const _hoisted_56 = { class: "lv-selector-wrapper" }
const _hoisted_57 = { class: "lv-add-group" }
const _hoisted_58 = ["onKeyup"]
const _hoisted_59 = { class: "lv-option-subgroup" }
const _hoisted_60 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("span", { class: "lv-option-subgroup-label" }, "最高", -1 /* HOISTED */))
const _hoisted_61 = { class: "lv-selector-wrapper" }
const _hoisted_62 = { class: "lv-add-group" }
const _hoisted_63 = ["onKeyup"]
const _hoisted_64 = { class: "lv-option" }
const _hoisted_65 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "lv-option-label" }, "可视化透明度", -1 /* HOISTED */))
const _hoisted_66 = { class: "lv-option-control lv-option-control--with-input" }
const _hoisted_67 = { class: "lv-selector-wrapper" }
const _hoisted_68 = { class: "lv-add-group" }
const _hoisted_69 = ["onKeyup"]
const _hoisted_70 = { class: "lv-option" }
const _hoisted_71 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "lv-option-label" }, "可视化颜色", -1 /* HOISTED */))
const _hoisted_72 = { class: "lv-option-control" }
const _hoisted_73 = { class: "lv-selector-wrapper" }
const _hoisted_74 = { class: "lv-option" }
const _hoisted_75 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "lv-option-label" }, "过渡延迟", -1 /* HOISTED */))
const _hoisted_76 = { class: "lv-option-control lv-option-control--with-input" }
const _hoisted_77 = { class: "lv-selector-wrapper" }
const _hoisted_78 = { class: "lv-add-group" }
const _hoisted_79 = ["onKeyup"]

import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Selector from './runtime/Selector.js'
import { usePlayerStore } from './runtime/playerStore.js'
import { lyricVisualizerDefaults } from './index.js'


const __sfc__ = {
  __name: 'LyricVisualizerSettings',
  setup(__props) {

const playerStore = usePlayerStore()
const router = useRouter()

const goBack = () => {
  router.push('/settings')
}

const clampNumber = (value, min, max, fallback = min) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  if (numeric < min) return min
  if (numeric > max) return max
  return numeric
}

const toDisplayNumber = (value, fractionDigits = 0) => {
  if (!Number.isFinite(value)) return ''
  if (fractionDigits <= 0) return String(Math.round(value))
  return Number(value)
    .toFixed(fractionDigits)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1')
}

const formatOptionLabel = (value, unit, defaultValue, fractionDigits = 0) => {
  const numberText = toDisplayNumber(value, fractionDigits)
  return `${numberText}${unit}${value === defaultValue ? '（默认）' : ''}`
}

const addChoiceValue = (listRef, value) => {
  if (!Number.isFinite(value)) return
  if (!listRef.value.includes(value)) {
    listRef.value = [...listRef.value, value].sort((a, b) => a - b)
  }
}

const removeChoiceValue = (listRef, value) => {
  if (!Number.isFinite(value)) return
  listRef.value = listRef.value.filter((item) => item !== value)
}

const createCustomActionState = (inputRef, sanitizeFn, valuesRef) =>
  computed(() => {
    const raw = String(inputRef.value ?? '').trim()
    if (!raw) {
      return { mode: 'add', value: null, exists: false }
    }
    const safe = sanitizeFn(raw)
    if (!Number.isFinite(safe)) {
      return { mode: 'add', value: null, exists: false }
    }
    const exists = valuesRef.value.includes(safe)
    return { mode: exists ? 'remove' : 'add', value: safe, exists }
  })

const sanitizeHeight = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return lyricVisualizerDefaults.height
  return Math.max(1, Math.round(numeric))
}

const sanitizeFrequencyMin = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return lyricVisualizerDefaults.frequencyMin
  return clampNumber(Math.round(numeric), 20, 20000, lyricVisualizerDefaults.frequencyMin)
}

const sanitizeFrequencyMax = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return lyricVisualizerDefaults.frequencyMax
  return clampNumber(Math.round(numeric), 20, 20000, lyricVisualizerDefaults.frequencyMax)
}

const sanitizeFrequencyRange = (min, max) => {
  let safeMin = sanitizeFrequencyMin(min)
  let safeMax = sanitizeFrequencyMax(max)
  if (safeMin >= safeMax) {
    if (safeMin >= 19990) {
      safeMin = 19990
      safeMax = 20000
    } else {
      safeMax = Math.min(20000, safeMin + 10)
    }
  }
  if (safeMax - safeMin < 10) {
    if (safeMin >= 19990) {
      safeMin = 19990
      safeMax = 20000
    } else {
      safeMax = Math.min(20000, safeMin + 10)
    }
  }
  return { min: safeMin, max: safeMax }
}

const sanitizeBarCount = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return lyricVisualizerDefaults.barCount
  return Math.max(1, Math.round(numeric))
}

const sanitizeBarWidth = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return lyricVisualizerDefaults.barWidth
  return Math.max(1, Math.round(numeric))
}

const sanitizeVisualizerStyle = (value) => {
  if (value === 'radial') return 'radial'
  return lyricVisualizerDefaults.style
}

const sanitizeOpacity = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return lyricVisualizerDefaults.opacity
  return clampNumber(Math.round(numeric), 0, 100, lyricVisualizerDefaults.opacity)
}

const sanitizeTransitionDelay = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return lyricVisualizerDefaults.transitionDelay
  return Math.round(clampNumber(numeric, 0, 0.95, lyricVisualizerDefaults.transitionDelay) * 100) / 100
}

const sanitizeRadialSize = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return lyricVisualizerDefaults.radialSize
  return clampNumber(Math.round(numeric), 10, 400, lyricVisualizerDefaults.radialSize)
}

const sanitizeRadialOffset = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return clampNumber(Math.round(numeric), -100, 100, 0)
}

const lyricVisualizerHeightBaseValues = Object.freeze([160, 180, 200, 220, 260, 320])
const lyricVisualizerBarCountBaseValues = Object.freeze([24, 32, 48, 64, 96])
const lyricVisualizerBarWidthBaseValues = Object.freeze([35, 45, 55, 65, 75])
const lyricVisualizerFrequencyMinBaseValues = Object.freeze([20, 40, 80, 120, 200])
const lyricVisualizerFrequencyMaxBaseValues = Object.freeze([4000, 6000, 8000, 12000, 16000])
const lyricVisualizerTransitionDelayBaseValues = Object.freeze([0, 0.25, 0.5, 0.75, 0.9])
const lyricVisualizerOpacityBaseValues = Object.freeze([20, 40, 60, 80, 100])
const lyricVisualizerRadialSizeBaseValues = Object.freeze([60, 80, 100, 120, 160])
const lyricVisualizerRadialOffsetBaseValues = Object.freeze([-50, -25, 0, 25, 50])

const lyricVisualizerHeightValues = ref([...lyricVisualizerHeightBaseValues])
const lyricVisualizerBarCountValues = ref([...lyricVisualizerBarCountBaseValues])
const lyricVisualizerBarWidthValues = ref([...lyricVisualizerBarWidthBaseValues])
const lyricVisualizerFrequencyMinValues = ref([...lyricVisualizerFrequencyMinBaseValues])
const lyricVisualizerFrequencyMaxValues = ref([...lyricVisualizerFrequencyMaxBaseValues])
const lyricVisualizerTransitionDelayValues = ref([...lyricVisualizerTransitionDelayBaseValues])
const lyricVisualizerOpacityValues = ref([...lyricVisualizerOpacityBaseValues])
const lyricVisualizerRadialSizeValues = ref([...lyricVisualizerRadialSizeBaseValues])
const lyricVisualizerRadialOffsetXValues = ref([...lyricVisualizerRadialOffsetBaseValues])
const lyricVisualizerRadialOffsetYValues = ref([...lyricVisualizerRadialOffsetBaseValues])

const lyricVisualizerStyleOptions = [
  { label: '柱状条形（默认）', value: 'bars' },
  { label: '辐射圆环', value: 'radial' }
]

const lyricVisualizerHeightOptions = computed(() =>
  lyricVisualizerHeightValues.value.map((value) => ({
    label: formatOptionLabel(value, 'px', lyricVisualizerDefaults.height),
    value
  }))
)

const lyricVisualizerBarCountOptions = computed(() =>
  lyricVisualizerBarCountValues.value.map((value) => ({
    label: formatOptionLabel(value, ' 个', lyricVisualizerDefaults.barCount),
    value
  }))
)

const lyricVisualizerBarWidthOptions = computed(() =>
  lyricVisualizerBarWidthValues.value.map((value) => ({
    label: formatOptionLabel(value, '', lyricVisualizerDefaults.barWidth),
    value
  }))
)

const lyricVisualizerFrequencyMinOptions = computed(() =>
  lyricVisualizerFrequencyMinValues.value.map((value) => ({
    label: formatOptionLabel(value, 'Hz', lyricVisualizerDefaults.frequencyMin),
    value
  }))
)

const lyricVisualizerFrequencyMaxOptions = computed(() =>
  lyricVisualizerFrequencyMaxValues.value.map((value) => ({
    label: formatOptionLabel(value, 'Hz', lyricVisualizerDefaults.frequencyMax),
    value
  }))
)

const lyricVisualizerTransitionDelayOptions = computed(() =>
  lyricVisualizerTransitionDelayValues.value.map((value) => ({
    label: formatOptionLabel(value, ' 秒', lyricVisualizerDefaults.transitionDelay, 2),
    value
  }))
)

const lyricVisualizerOpacityOptions = computed(() =>
  lyricVisualizerOpacityValues.value.map((value) => ({
    label: formatOptionLabel(value, '%', lyricVisualizerDefaults.opacity),
    value
  }))
)

const lyricVisualizerRadialSizeOptions = computed(() =>
  lyricVisualizerRadialSizeValues.value.map((value) => ({
    label: formatOptionLabel(value, '%', lyricVisualizerDefaults.radialSize),
    value
  }))
)

const lyricVisualizerRadialOffsetXOptions = computed(() =>
  lyricVisualizerRadialOffsetXValues.value.map((value) => ({
    label: formatOptionLabel(value, '%', lyricVisualizerDefaults.radialOffsetX),
    value
  }))
)

const lyricVisualizerRadialOffsetYOptions = computed(() =>
  lyricVisualizerRadialOffsetYValues.value.map((value) => ({
    label: formatOptionLabel(value, '%', lyricVisualizerDefaults.radialOffsetY),
    value
  }))
)

const lyricVisualizerColorOptions = [
  { label: '黑色（默认）', value: 'black' },
  { label: '白色', value: 'white' }
]

const lyricVisualizerHeightCustom = ref('')
const lyricVisualizerBarCountCustom = ref('')
const lyricVisualizerBarWidthCustom = ref('')
const lyricVisualizerFrequencyMinCustom = ref('')
const lyricVisualizerFrequencyMaxCustom = ref('')
const lyricVisualizerTransitionDelayCustom = ref('')
const lyricVisualizerOpacityCustom = ref('')
const lyricVisualizerRadialSizeCustom = ref('')
const lyricVisualizerRadialOffsetXCustom = ref('')
const lyricVisualizerRadialOffsetYCustom = ref('')

const lyricVisualizerHeightAction = createCustomActionState(
  lyricVisualizerHeightCustom,
  sanitizeHeight,
  lyricVisualizerHeightValues
)
const lyricVisualizerBarCountAction = createCustomActionState(
  lyricVisualizerBarCountCustom,
  sanitizeBarCount,
  lyricVisualizerBarCountValues
)
const lyricVisualizerBarWidthAction = createCustomActionState(
  lyricVisualizerBarWidthCustom,
  sanitizeBarWidth,
  lyricVisualizerBarWidthValues
)
const lyricVisualizerTransitionDelayAction = createCustomActionState(
  lyricVisualizerTransitionDelayCustom,
  sanitizeTransitionDelay,
  lyricVisualizerTransitionDelayValues
)
const lyricVisualizerOpacityAction = createCustomActionState(
  lyricVisualizerOpacityCustom,
  sanitizeOpacity,
  lyricVisualizerOpacityValues
)
const lyricVisualizerRadialSizeAction = createCustomActionState(
  lyricVisualizerRadialSizeCustom,
  sanitizeRadialSize,
  lyricVisualizerRadialSizeValues
)
const lyricVisualizerRadialOffsetXAction = createCustomActionState(
  lyricVisualizerRadialOffsetXCustom,
  sanitizeRadialOffset,
  lyricVisualizerRadialOffsetXValues
)
const lyricVisualizerRadialOffsetYAction = createCustomActionState(
  lyricVisualizerRadialOffsetYCustom,
  sanitizeRadialOffset,
  lyricVisualizerRadialOffsetYValues
)

const lyricVisualizerFrequencyMinAction = computed(() => {
  const raw = String(lyricVisualizerFrequencyMinCustom.value ?? '').trim()
  if (!raw) return { mode: 'add', value: null, exists: false, pairedMax: null }
  const { min, max } = sanitizeFrequencyRange(raw, playerStore.lyricVisualizerFrequencyMax)
  if (!Number.isFinite(min)) return { mode: 'add', value: null, exists: false, pairedMax: null }
  const exists = lyricVisualizerFrequencyMinValues.value.includes(min)
  return { mode: exists ? 'remove' : 'add', value: min, exists, pairedMax: max }
})

const lyricVisualizerFrequencyMaxAction = computed(() => {
  const raw = String(lyricVisualizerFrequencyMaxCustom.value ?? '').trim()
  if (!raw) return { mode: 'add', value: null, exists: false, pairedMin: null }
  const { min, max } = sanitizeFrequencyRange(playerStore.lyricVisualizerFrequencyMin, raw)
  if (!Number.isFinite(max)) return { mode: 'add', value: null, exists: false, pairedMin: null }
  const exists = lyricVisualizerFrequencyMaxValues.value.includes(max)
  return { mode: exists ? 'remove' : 'add', value: max, exists, pairedMin: min }
})

const addLyricVisualizerHeightOption = () => {
  const { mode, value } = lyricVisualizerHeightAction.value
  if (value === null) return
  if (mode === 'remove') {
    removeChoiceValue(lyricVisualizerHeightValues, value)
    if (playerStore.lyricVisualizerHeight === value) {
      playerStore.lyricVisualizerHeight = lyricVisualizerDefaults.height
    }
  } else {
    addChoiceValue(lyricVisualizerHeightValues, value)
    playerStore.lyricVisualizerHeight = value
  }
  lyricVisualizerHeightCustom.value = ''
}

const addLyricVisualizerBarCountOption = () => {
  const { mode, value } = lyricVisualizerBarCountAction.value
  if (value === null) return
  if (mode === 'remove') {
    removeChoiceValue(lyricVisualizerBarCountValues, value)
    if (playerStore.lyricVisualizerBarCount === value) {
      playerStore.lyricVisualizerBarCount = lyricVisualizerDefaults.barCount
    }
  } else {
    addChoiceValue(lyricVisualizerBarCountValues, value)
    playerStore.lyricVisualizerBarCount = value
  }
  lyricVisualizerBarCountCustom.value = ''
}

const addLyricVisualizerBarWidthOption = () => {
  const { mode, value } = lyricVisualizerBarWidthAction.value
  if (value === null) return
  if (mode === 'remove') {
    removeChoiceValue(lyricVisualizerBarWidthValues, value)
    if (playerStore.lyricVisualizerBarWidth === value) {
      playerStore.lyricVisualizerBarWidth = lyricVisualizerDefaults.barWidth
    }
  } else {
    addChoiceValue(lyricVisualizerBarWidthValues, value)
    playerStore.lyricVisualizerBarWidth = value
  }
  lyricVisualizerBarWidthCustom.value = ''
}

const addLyricVisualizerFrequencyMinOption = () => {
  const { mode, value, pairedMax } = lyricVisualizerFrequencyMinAction.value
  if (value === null) return
  if (mode === 'remove') {
    removeChoiceValue(lyricVisualizerFrequencyMinValues, value)
    if (playerStore.lyricVisualizerFrequencyMin === value) {
      playerStore.lyricVisualizerFrequencyMin = lyricVisualizerDefaults.frequencyMin
      playerStore.lyricVisualizerFrequencyMax = lyricVisualizerDefaults.frequencyMax
    }
  } else {
    addChoiceValue(lyricVisualizerFrequencyMinValues, value)
    if (Number.isFinite(pairedMax)) {
      addChoiceValue(lyricVisualizerFrequencyMaxValues, pairedMax)
      playerStore.lyricVisualizerFrequencyMax = pairedMax
    }
    playerStore.lyricVisualizerFrequencyMin = value
  }
  lyricVisualizerFrequencyMinCustom.value = ''
}

const addLyricVisualizerFrequencyMaxOption = () => {
  const { mode, value, pairedMin } = lyricVisualizerFrequencyMaxAction.value
  if (value === null) return
  if (mode === 'remove') {
    removeChoiceValue(lyricVisualizerFrequencyMaxValues, value)
    if (playerStore.lyricVisualizerFrequencyMax === value) {
      playerStore.lyricVisualizerFrequencyMin = lyricVisualizerDefaults.frequencyMin
      playerStore.lyricVisualizerFrequencyMax = lyricVisualizerDefaults.frequencyMax
    }
  } else {
    addChoiceValue(lyricVisualizerFrequencyMaxValues, value)
    if (Number.isFinite(pairedMin)) {
      addChoiceValue(lyricVisualizerFrequencyMinValues, pairedMin)
      playerStore.lyricVisualizerFrequencyMin = pairedMin
    }
    playerStore.lyricVisualizerFrequencyMax = value
  }
  lyricVisualizerFrequencyMaxCustom.value = ''
}

const addLyricVisualizerTransitionDelayOption = () => {
  const { mode, value } = lyricVisualizerTransitionDelayAction.value
  if (value === null) return
  if (mode === 'remove') {
    removeChoiceValue(lyricVisualizerTransitionDelayValues, value)
    if (playerStore.lyricVisualizerTransitionDelay === value) {
      playerStore.lyricVisualizerTransitionDelay = lyricVisualizerDefaults.transitionDelay
    }
  } else {
    addChoiceValue(lyricVisualizerTransitionDelayValues, value)
    playerStore.lyricVisualizerTransitionDelay = value
  }
  lyricVisualizerTransitionDelayCustom.value = ''
}

const addLyricVisualizerOpacityOption = () => {
  const { mode, value } = lyricVisualizerOpacityAction.value
  if (value === null) return
  if (mode === 'remove') {
    removeChoiceValue(lyricVisualizerOpacityValues, value)
    if (playerStore.lyricVisualizerOpacity === value) {
      playerStore.lyricVisualizerOpacity = lyricVisualizerDefaults.opacity
    }
  } else {
    addChoiceValue(lyricVisualizerOpacityValues, value)
    playerStore.lyricVisualizerOpacity = value
  }
  lyricVisualizerOpacityCustom.value = ''
}

const addLyricVisualizerRadialSizeOption = () => {
  const { mode, value } = lyricVisualizerRadialSizeAction.value
  if (value === null) return
  if (mode === 'remove') {
    removeChoiceValue(lyricVisualizerRadialSizeValues, value)
    if (playerStore.lyricVisualizerRadialSize === value) {
      playerStore.lyricVisualizerRadialSize = lyricVisualizerDefaults.radialSize
    }
  } else {
    addChoiceValue(lyricVisualizerRadialSizeValues, value)
    playerStore.lyricVisualizerRadialSize = value
  }
  lyricVisualizerRadialSizeCustom.value = ''
}

const addLyricVisualizerRadialOffsetXOption = () => {
  const { mode, value } = lyricVisualizerRadialOffsetXAction.value
  if (value === null) return
  if (mode === 'remove') {
    removeChoiceValue(lyricVisualizerRadialOffsetXValues, value)
    if (playerStore.lyricVisualizerRadialOffsetX === value) {
      playerStore.lyricVisualizerRadialOffsetX = lyricVisualizerDefaults.radialOffsetX
    }
  } else {
    addChoiceValue(lyricVisualizerRadialOffsetXValues, value)
    playerStore.lyricVisualizerRadialOffsetX = value
  }
  lyricVisualizerRadialOffsetXCustom.value = ''
}

const addLyricVisualizerRadialOffsetYOption = () => {
  const { mode, value } = lyricVisualizerRadialOffsetYAction.value
  if (value === null) return
  if (mode === 'remove') {
    removeChoiceValue(lyricVisualizerRadialOffsetYValues, value)
    if (playerStore.lyricVisualizerRadialOffsetY === value) {
      playerStore.lyricVisualizerRadialOffsetY = lyricVisualizerDefaults.radialOffsetY
    }
  } else {
    addChoiceValue(lyricVisualizerRadialOffsetYValues, value)
    playerStore.lyricVisualizerRadialOffsetY = value
  }
  lyricVisualizerRadialOffsetYCustom.value = ''
}

const resetLyricVisualizerStyle = () => {
  playerStore.lyricVisualizerStyle = lyricVisualizerDefaults.style
}

const resetLyricVisualizerHeight = () => {
  playerStore.lyricVisualizerHeight = lyricVisualizerDefaults.height
}

const resetLyricVisualizerBarCount = () => {
  playerStore.lyricVisualizerBarCount = lyricVisualizerDefaults.barCount
}

const resetLyricVisualizerBarWidth = () => {
  playerStore.lyricVisualizerBarWidth = lyricVisualizerDefaults.barWidth
}

const resetLyricVisualizerFrequencyMin = () => {
  playerStore.lyricVisualizerFrequencyMin = lyricVisualizerDefaults.frequencyMin
}

const resetLyricVisualizerFrequencyMax = () => {
  playerStore.lyricVisualizerFrequencyMax = lyricVisualizerDefaults.frequencyMax
}

const resetLyricVisualizerTransitionDelay = () => {
  playerStore.lyricVisualizerTransitionDelay = lyricVisualizerDefaults.transitionDelay
}

const resetLyricVisualizerOpacity = () => {
  playerStore.lyricVisualizerOpacity = lyricVisualizerDefaults.opacity
}

const resetLyricVisualizerRadialSize = () => {
  playerStore.lyricVisualizerRadialSize = lyricVisualizerDefaults.radialSize
}

const resetLyricVisualizerRadialOffsetX = () => {
  playerStore.lyricVisualizerRadialOffsetX = lyricVisualizerDefaults.radialOffsetX
}

const resetLyricVisualizerRadialOffsetY = () => {
  playerStore.lyricVisualizerRadialOffsetY = lyricVisualizerDefaults.radialOffsetY
}

const toggleLyricVisualizer = () => {
  playerStore.lyricVisualizer = !playerStore.lyricVisualizer
}

watch(
  () => playerStore.lyricVisualizerHeight,
  (value) => {
    const safe = sanitizeHeight(value)
    if (value !== safe) playerStore.lyricVisualizerHeight = safe
    addChoiceValue(lyricVisualizerHeightValues, safe)
  }
)

watch(
  [() => playerStore.lyricVisualizerFrequencyMin, () => playerStore.lyricVisualizerFrequencyMax],
  ([min, max]) => {
    const { min: safeMin, max: safeMax } = sanitizeFrequencyRange(min, max)
    if (min !== safeMin) playerStore.lyricVisualizerFrequencyMin = safeMin
    if (max !== safeMax) playerStore.lyricVisualizerFrequencyMax = safeMax
    addChoiceValue(lyricVisualizerFrequencyMinValues, safeMin)
    addChoiceValue(lyricVisualizerFrequencyMaxValues, safeMax)
  }
)

watch(
  () => playerStore.lyricVisualizerBarCount,
  (value) => {
    const safe = sanitizeBarCount(value)
    if (value !== safe) playerStore.lyricVisualizerBarCount = safe
    addChoiceValue(lyricVisualizerBarCountValues, safe)
  }
)

watch(
  () => playerStore.lyricVisualizerBarWidth,
  (value) => {
    const safe = sanitizeBarWidth(value)
    if (value !== safe) playerStore.lyricVisualizerBarWidth = safe
    addChoiceValue(lyricVisualizerBarWidthValues, safe)
  }
)

watch(
  () => playerStore.lyricVisualizerStyle,
  (value) => {
    const safe = sanitizeVisualizerStyle(value)
    if (value !== safe) playerStore.lyricVisualizerStyle = safe
  }
)

watch(
  () => playerStore.lyricVisualizerTransitionDelay,
  (value) => {
    const safe = sanitizeTransitionDelay(value)
    if (value !== safe) playerStore.lyricVisualizerTransitionDelay = safe
    addChoiceValue(lyricVisualizerTransitionDelayValues, safe)
  }
)

watch(
  () => playerStore.lyricVisualizerOpacity,
  (value) => {
    const safe = sanitizeOpacity(value)
    if (value !== safe) playerStore.lyricVisualizerOpacity = safe
    addChoiceValue(lyricVisualizerOpacityValues, safe)
  }
)

watch(
  () => playerStore.lyricVisualizerRadialSize,
  (value) => {
    const safe = sanitizeRadialSize(value)
    if (value !== safe) playerStore.lyricVisualizerRadialSize = safe
    addChoiceValue(lyricVisualizerRadialSizeValues, safe)
  }
)

watch(
  () => playerStore.lyricVisualizerRadialOffsetX,
  (value) => {
    const safe = sanitizeRadialOffset(value)
    if (value !== safe) playerStore.lyricVisualizerRadialOffsetX = safe
    addChoiceValue(lyricVisualizerRadialOffsetXValues, safe)
  }
)

watch(
  () => playerStore.lyricVisualizerRadialOffsetY,
  (value) => {
    const safe = sanitizeRadialOffset(value)
    if (value !== safe) playerStore.lyricVisualizerRadialOffsetY = safe
    addChoiceValue(lyricVisualizerRadialOffsetYValues, safe)
  }
)

watch(
  () => playerStore.lyricVisualizerColor,
  (value) => {
    if (!lyricVisualizerColorOptions.some((option) => option.value === value)) {
      playerStore.lyricVisualizerColor = lyricVisualizerDefaults.color
    }
  }
)

return (_ctx, _cache) => {
  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createElementVNode("header", { class: "lv-header" }, [
      _createElementVNode("button", {
        class: "lv-back",
        type: "button",
        onClick: goBack
      }, _hoisted_3),
      _hoisted_4
    ]),
    _createElementVNode("section", _hoisted_5, [
      _createElementVNode("div", _hoisted_6, [
        _hoisted_7,
        _createElementVNode("div", _hoisted_8, [
          _createElementVNode("div", {
            class: "lv-toggle",
            onClick: toggleLyricVisualizer
          }, [
            _createElementVNode("div", {
              class: _normalizeClass(["lv-toggle-off", { 'lv-toggle-on-in': _unref(playerStore).lyricVisualizer }])
            }, _toDisplayString(_unref(playerStore).lyricVisualizer ? '已开启' : '已关闭'), 3 /* TEXT, CLASS */),
            _createVNode(_Transition, {
              name: "lv-toggle",
              persisted: ""
            }, {
              default: _withCtx(() => [
                _withDirectives(_createElementVNode("div", _hoisted_9, null, 512 /* NEED_PATCH */), [
                  [_vShow, _unref(playerStore).lyricVisualizer]
                ])
              ]),
              _: 1 /* STABLE */
            })
          ])
        ])
      ]),
      _createVNode(_Transition, { name: "lv-collapse" }, {
        default: _withCtx(() => [
          (_unref(playerStore).lyricVisualizer)
            ? (_openBlock(), _createElementBlock("div", _hoisted_10, [
                _createElementVNode("div", _hoisted_11, [
                  _hoisted_12,
                  _createElementVNode("div", _hoisted_13, [
                    _createElementVNode("div", _hoisted_14, [
                      _createVNode(_unref(Selector), {
                        modelValue: _unref(playerStore).lyricVisualizerStyle,
                        "onUpdate:modelValue": _cache[0] || (_cache[0] = $event => ((_unref(playerStore).lyricVisualizerStyle) = $event)),
                        options: lyricVisualizerStyleOptions
                      }, null, 8 /* PROPS */, ["modelValue"])
                    ]),
                    _createElementVNode("button", {
                      class: "lv-reset",
                      type: "button",
                      onClick: resetLyricVisualizerStyle
                    }, "重置")
                  ])
                ]),
                (_unref(playerStore).lyricVisualizerStyle === 'radial')
                  ? (_openBlock(), _createElementBlock("div", _hoisted_15, [
                      _hoisted_16,
                      _createElementVNode("div", _hoisted_17, [
                        _createElementVNode("div", _hoisted_18, [
                          _createVNode(_unref(Selector), {
                            modelValue: _unref(playerStore).lyricVisualizerRadialSize,
                            "onUpdate:modelValue": _cache[1] || (_cache[1] = $event => ((_unref(playerStore).lyricVisualizerRadialSize) = $event)),
                            options: _unref(lyricVisualizerRadialSizeOptions)
                          }, null, 8 /* PROPS */, ["modelValue", "options"])
                        ]),
                        _createElementVNode("div", _hoisted_19, [
                          _withDirectives(_createElementVNode("input", {
                            type: "number",
                            min: "10",
                            "onUpdate:modelValue": _cache[2] || (_cache[2] = $event => ((lyricVisualizerRadialSizeCustom).value = $event)),
                            onKeyup: _withKeys(addLyricVisualizerRadialSizeOption, ["enter"])
                          }, null, 40 /* PROPS, HYDRATE_EVENTS */, _hoisted_20), [
                            [_vModelText, lyricVisualizerRadialSizeCustom.value]
                          ]),
                          _createElementVNode("button", {
                            type: "button",
                            class: _normalizeClass(["lv-add", { 'lv-add--remove': _unref(lyricVisualizerRadialSizeAction).mode === 'remove' }]),
                            onClick: addLyricVisualizerRadialSizeOption
                          }, _toDisplayString(_unref(lyricVisualizerRadialSizeAction).mode === 'remove' ? '删除' : '添加'), 3 /* TEXT, CLASS */)
                        ]),
                        _createElementVNode("button", {
                          class: "lv-reset",
                          type: "button",
                          onClick: resetLyricVisualizerRadialSize
                        }, "重置")
                      ])
                    ]))
                  : _createCommentVNode("v-if", true),
                (_unref(playerStore).lyricVisualizerStyle === 'radial')
                  ? (_openBlock(), _createElementBlock("div", _hoisted_21, [
                      _hoisted_22,
                      _createElementVNode("div", _hoisted_23, [
                        _createElementVNode("div", _hoisted_24, [
                          _createVNode(_unref(Selector), {
                            modelValue: _unref(playerStore).lyricVisualizerRadialOffsetX,
                            "onUpdate:modelValue": _cache[3] || (_cache[3] = $event => ((_unref(playerStore).lyricVisualizerRadialOffsetX) = $event)),
                            options: _unref(lyricVisualizerRadialOffsetXOptions)
                          }, null, 8 /* PROPS */, ["modelValue", "options"])
                        ]),
                        _createElementVNode("div", _hoisted_25, [
                          _withDirectives(_createElementVNode("input", {
                            type: "number",
                            "onUpdate:modelValue": _cache[4] || (_cache[4] = $event => ((lyricVisualizerRadialOffsetXCustom).value = $event)),
                            onKeyup: _withKeys(addLyricVisualizerRadialOffsetXOption, ["enter"])
                          }, null, 40 /* PROPS, HYDRATE_EVENTS */, _hoisted_26), [
                            [_vModelText, lyricVisualizerRadialOffsetXCustom.value]
                          ]),
                          _createElementVNode("button", {
                            type: "button",
                            class: _normalizeClass(["lv-add", { 'lv-add--remove': _unref(lyricVisualizerRadialOffsetXAction).mode === 'remove' }]),
                            onClick: addLyricVisualizerRadialOffsetXOption
                          }, _toDisplayString(_unref(lyricVisualizerRadialOffsetXAction).mode === 'remove' ? '删除' : '添加'), 3 /* TEXT, CLASS */)
                        ]),
                        _createElementVNode("button", {
                          class: "lv-reset",
                          type: "button",
                          onClick: resetLyricVisualizerRadialOffsetX
                        }, "重置")
                      ])
                    ]))
                  : _createCommentVNode("v-if", true),
                (_unref(playerStore).lyricVisualizerStyle === 'radial')
                  ? (_openBlock(), _createElementBlock("div", _hoisted_27, [
                      _hoisted_28,
                      _createElementVNode("div", _hoisted_29, [
                        _createElementVNode("div", _hoisted_30, [
                          _createVNode(_unref(Selector), {
                            modelValue: _unref(playerStore).lyricVisualizerRadialOffsetY,
                            "onUpdate:modelValue": _cache[5] || (_cache[5] = $event => ((_unref(playerStore).lyricVisualizerRadialOffsetY) = $event)),
                            options: _unref(lyricVisualizerRadialOffsetYOptions)
                          }, null, 8 /* PROPS */, ["modelValue", "options"])
                        ]),
                        _createElementVNode("div", _hoisted_31, [
                          _withDirectives(_createElementVNode("input", {
                            type: "number",
                            "onUpdate:modelValue": _cache[6] || (_cache[6] = $event => ((lyricVisualizerRadialOffsetYCustom).value = $event)),
                            onKeyup: _withKeys(addLyricVisualizerRadialOffsetYOption, ["enter"])
                          }, null, 40 /* PROPS, HYDRATE_EVENTS */, _hoisted_32), [
                            [_vModelText, lyricVisualizerRadialOffsetYCustom.value]
                          ]),
                          _createElementVNode("button", {
                            type: "button",
                            class: _normalizeClass(["lv-add", { 'lv-add--remove': _unref(lyricVisualizerRadialOffsetYAction).mode === 'remove' }]),
                            onClick: addLyricVisualizerRadialOffsetYOption
                          }, _toDisplayString(_unref(lyricVisualizerRadialOffsetYAction).mode === 'remove' ? '删除' : '添加'), 3 /* TEXT, CLASS */)
                        ]),
                        _createElementVNode("button", {
                          class: "lv-reset",
                          type: "button",
                          onClick: resetLyricVisualizerRadialOffsetY
                        }, "重置")
                      ])
                    ]))
                  : _createCommentVNode("v-if", true),
                _createElementVNode("div", _hoisted_33, [
                  _hoisted_34,
                  _createElementVNode("div", _hoisted_35, [
                    _createElementVNode("div", _hoisted_36, [
                      _createVNode(_unref(Selector), {
                        modelValue: _unref(playerStore).lyricVisualizerHeight,
                        "onUpdate:modelValue": _cache[7] || (_cache[7] = $event => ((_unref(playerStore).lyricVisualizerHeight) = $event)),
                        options: _unref(lyricVisualizerHeightOptions)
                      }, null, 8 /* PROPS */, ["modelValue", "options"])
                    ]),
                    _createElementVNode("div", _hoisted_37, [
                      _withDirectives(_createElementVNode("input", {
                        type: "number",
                        min: "1",
                        "onUpdate:modelValue": _cache[8] || (_cache[8] = $event => ((lyricVisualizerHeightCustom).value = $event)),
                        onKeyup: _withKeys(addLyricVisualizerHeightOption, ["enter"])
                      }, null, 40 /* PROPS, HYDRATE_EVENTS */, _hoisted_38), [
                        [_vModelText, lyricVisualizerHeightCustom.value]
                      ]),
                      _createElementVNode("button", {
                        type: "button",
                        class: _normalizeClass(["lv-add", { 'lv-add--remove': _unref(lyricVisualizerHeightAction).mode === 'remove' }]),
                        onClick: addLyricVisualizerHeightOption
                      }, _toDisplayString(_unref(lyricVisualizerHeightAction).mode === 'remove' ? '删除' : '添加'), 3 /* TEXT, CLASS */)
                    ]),
                    _createElementVNode("button", {
                      class: "lv-reset",
                      type: "button",
                      onClick: resetLyricVisualizerHeight
                    }, "重置")
                  ])
                ]),
                _createElementVNode("div", _hoisted_39, [
                  _hoisted_40,
                  _createElementVNode("div", _hoisted_41, [
                    _createElementVNode("div", _hoisted_42, [
                      _createVNode(_unref(Selector), {
                        modelValue: _unref(playerStore).lyricVisualizerBarCount,
                        "onUpdate:modelValue": _cache[9] || (_cache[9] = $event => ((_unref(playerStore).lyricVisualizerBarCount) = $event)),
                        options: _unref(lyricVisualizerBarCountOptions)
                      }, null, 8 /* PROPS */, ["modelValue", "options"])
                    ]),
                    _createElementVNode("div", _hoisted_43, [
                      _withDirectives(_createElementVNode("input", {
                        type: "number",
                        min: "1",
                        "onUpdate:modelValue": _cache[10] || (_cache[10] = $event => ((lyricVisualizerBarCountCustom).value = $event)),
                        onKeyup: _withKeys(addLyricVisualizerBarCountOption, ["enter"])
                      }, null, 40 /* PROPS, HYDRATE_EVENTS */, _hoisted_44), [
                        [_vModelText, lyricVisualizerBarCountCustom.value]
                      ]),
                      _createElementVNode("button", {
                        type: "button",
                        class: _normalizeClass(["lv-add", { 'lv-add--remove': _unref(lyricVisualizerBarCountAction).mode === 'remove' }]),
                        onClick: addLyricVisualizerBarCountOption
                      }, _toDisplayString(_unref(lyricVisualizerBarCountAction).mode === 'remove' ? '删除' : '添加'), 3 /* TEXT, CLASS */)
                    ]),
                    _createElementVNode("button", {
                      class: "lv-reset",
                      type: "button",
                      onClick: resetLyricVisualizerBarCount
                    }, "重置")
                  ])
                ]),
                _createElementVNode("div", _hoisted_45, [
                  _hoisted_46,
                  _createElementVNode("div", _hoisted_47, [
                    _createElementVNode("div", _hoisted_48, [
                      _createVNode(_unref(Selector), {
                        modelValue: _unref(playerStore).lyricVisualizerBarWidth,
                        "onUpdate:modelValue": _cache[11] || (_cache[11] = $event => ((_unref(playerStore).lyricVisualizerBarWidth) = $event)),
                        options: _unref(lyricVisualizerBarWidthOptions)
                      }, null, 8 /* PROPS */, ["modelValue", "options"])
                    ]),
                    _createElementVNode("div", _hoisted_49, [
                      _withDirectives(_createElementVNode("input", {
                        type: "number",
                        min: "1",
                        "onUpdate:modelValue": _cache[12] || (_cache[12] = $event => ((lyricVisualizerBarWidthCustom).value = $event)),
                        onKeyup: _withKeys(addLyricVisualizerBarWidthOption, ["enter"])
                      }, null, 40 /* PROPS, HYDRATE_EVENTS */, _hoisted_50), [
                        [_vModelText, lyricVisualizerBarWidthCustom.value]
                      ]),
                      _createElementVNode("button", {
                        type: "button",
                        class: _normalizeClass(["lv-add", { 'lv-add--remove': _unref(lyricVisualizerBarWidthAction).mode === 'remove' }]),
                        onClick: addLyricVisualizerBarWidthOption
                      }, _toDisplayString(_unref(lyricVisualizerBarWidthAction).mode === 'remove' ? '删除' : '添加'), 3 /* TEXT, CLASS */)
                    ]),
                    _createElementVNode("button", {
                      class: "lv-reset",
                      type: "button",
                      onClick: resetLyricVisualizerBarWidth
                    }, "重置")
                  ])
                ]),
                _createElementVNode("div", _hoisted_51, [
                  _hoisted_52,
                  _createElementVNode("div", _hoisted_53, [
                    _createElementVNode("div", _hoisted_54, [
                      _hoisted_55,
                      _createElementVNode("div", _hoisted_56, [
                        _createVNode(_unref(Selector), {
                          modelValue: _unref(playerStore).lyricVisualizerFrequencyMin,
                          "onUpdate:modelValue": _cache[13] || (_cache[13] = $event => ((_unref(playerStore).lyricVisualizerFrequencyMin) = $event)),
                          options: _unref(lyricVisualizerFrequencyMinOptions)
                        }, null, 8 /* PROPS */, ["modelValue", "options"])
                      ]),
                      _createElementVNode("div", _hoisted_57, [
                        _withDirectives(_createElementVNode("input", {
                          type: "number",
                          min: "20",
                          "onUpdate:modelValue": _cache[14] || (_cache[14] = $event => ((lyricVisualizerFrequencyMinCustom).value = $event)),
                          onKeyup: _withKeys(addLyricVisualizerFrequencyMinOption, ["enter"])
                        }, null, 40 /* PROPS, HYDRATE_EVENTS */, _hoisted_58), [
                          [_vModelText, lyricVisualizerFrequencyMinCustom.value]
                        ]),
                        _createElementVNode("button", {
                          type: "button",
                          class: _normalizeClass(["lv-add", { 'lv-add--remove': _unref(lyricVisualizerFrequencyMinAction).mode === 'remove' }]),
                          onClick: addLyricVisualizerFrequencyMinOption
                        }, _toDisplayString(_unref(lyricVisualizerFrequencyMinAction).mode === 'remove' ? '删除' : '添加'), 3 /* TEXT, CLASS */)
                      ]),
                      _createElementVNode("button", {
                        class: "lv-reset",
                        type: "button",
                        onClick: resetLyricVisualizerFrequencyMin
                      }, "重置")
                    ]),
                    _createElementVNode("div", _hoisted_59, [
                      _hoisted_60,
                      _createElementVNode("div", _hoisted_61, [
                        _createVNode(_unref(Selector), {
                          modelValue: _unref(playerStore).lyricVisualizerFrequencyMax,
                          "onUpdate:modelValue": _cache[15] || (_cache[15] = $event => ((_unref(playerStore).lyricVisualizerFrequencyMax) = $event)),
                          options: _unref(lyricVisualizerFrequencyMaxOptions)
                        }, null, 8 /* PROPS */, ["modelValue", "options"])
                      ]),
                      _createElementVNode("div", _hoisted_62, [
                        _withDirectives(_createElementVNode("input", {
                          type: "number",
                          min: "20",
                          "onUpdate:modelValue": _cache[16] || (_cache[16] = $event => ((lyricVisualizerFrequencyMaxCustom).value = $event)),
                          onKeyup: _withKeys(addLyricVisualizerFrequencyMaxOption, ["enter"])
                        }, null, 40 /* PROPS, HYDRATE_EVENTS */, _hoisted_63), [
                          [_vModelText, lyricVisualizerFrequencyMaxCustom.value]
                        ]),
                        _createElementVNode("button", {
                          type: "button",
                          class: _normalizeClass(["lv-add", { 'lv-add--remove': _unref(lyricVisualizerFrequencyMaxAction).mode === 'remove' }]),
                          onClick: addLyricVisualizerFrequencyMaxOption
                        }, _toDisplayString(_unref(lyricVisualizerFrequencyMaxAction).mode === 'remove' ? '删除' : '添加'), 3 /* TEXT, CLASS */)
                      ]),
                      _createElementVNode("button", {
                        class: "lv-reset",
                        type: "button",
                        onClick: resetLyricVisualizerFrequencyMax
                      }, "重置")
                    ])
                  ])
                ]),
                _createElementVNode("div", _hoisted_64, [
                  _hoisted_65,
                  _createElementVNode("div", _hoisted_66, [
                    _createElementVNode("div", _hoisted_67, [
                      _createVNode(_unref(Selector), {
                        modelValue: _unref(playerStore).lyricVisualizerOpacity,
                        "onUpdate:modelValue": _cache[17] || (_cache[17] = $event => ((_unref(playerStore).lyricVisualizerOpacity) = $event)),
                        options: _unref(lyricVisualizerOpacityOptions)
                      }, null, 8 /* PROPS */, ["modelValue", "options"])
                    ]),
                    _createElementVNode("div", _hoisted_68, [
                      _withDirectives(_createElementVNode("input", {
                        type: "number",
                        min: "0",
                        max: "100",
                        "onUpdate:modelValue": _cache[18] || (_cache[18] = $event => ((lyricVisualizerOpacityCustom).value = $event)),
                        onKeyup: _withKeys(addLyricVisualizerOpacityOption, ["enter"])
                      }, null, 40 /* PROPS, HYDRATE_EVENTS */, _hoisted_69), [
                        [_vModelText, lyricVisualizerOpacityCustom.value]
                      ]),
                      _createElementVNode("button", {
                        type: "button",
                        class: _normalizeClass(["lv-add", { 'lv-add--remove': _unref(lyricVisualizerOpacityAction).mode === 'remove' }]),
                        onClick: addLyricVisualizerOpacityOption
                      }, _toDisplayString(_unref(lyricVisualizerOpacityAction).mode === 'remove' ? '删除' : '添加'), 3 /* TEXT, CLASS */)
                    ]),
                    _createElementVNode("button", {
                      class: "lv-reset",
                      type: "button",
                      onClick: resetLyricVisualizerOpacity
                    }, "重置")
                  ])
                ]),
                _createElementVNode("div", _hoisted_70, [
                  _hoisted_71,
                  _createElementVNode("div", _hoisted_72, [
                    _createElementVNode("div", _hoisted_73, [
                      _createVNode(_unref(Selector), {
                        modelValue: _unref(playerStore).lyricVisualizerColor,
                        "onUpdate:modelValue": _cache[19] || (_cache[19] = $event => ((_unref(playerStore).lyricVisualizerColor) = $event)),
                        options: lyricVisualizerColorOptions
                      }, null, 8 /* PROPS */, ["modelValue"])
                    ])
                  ])
                ]),
                _createElementVNode("div", _hoisted_74, [
                  _hoisted_75,
                  _createElementVNode("div", _hoisted_76, [
                    _createElementVNode("div", _hoisted_77, [
                      _createVNode(_unref(Selector), {
                        modelValue: _unref(playerStore).lyricVisualizerTransitionDelay,
                        "onUpdate:modelValue": _cache[20] || (_cache[20] = $event => ((_unref(playerStore).lyricVisualizerTransitionDelay) = $event)),
                        options: _unref(lyricVisualizerTransitionDelayOptions)
                      }, null, 8 /* PROPS */, ["modelValue", "options"])
                    ]),
                    _createElementVNode("div", _hoisted_78, [
                      _withDirectives(_createElementVNode("input", {
                        type: "number",
                        step: "0.01",
                        min: "0",
                        max: "0.95",
                        "onUpdate:modelValue": _cache[21] || (_cache[21] = $event => ((lyricVisualizerTransitionDelayCustom).value = $event)),
                        onKeyup: _withKeys(addLyricVisualizerTransitionDelayOption, ["enter"])
                      }, null, 40 /* PROPS, HYDRATE_EVENTS */, _hoisted_79), [
                        [_vModelText, lyricVisualizerTransitionDelayCustom.value]
                      ]),
                      _createElementVNode("button", {
                        type: "button",
                        class: _normalizeClass(["lv-add", { 'lv-add--remove': _unref(lyricVisualizerTransitionDelayAction).mode === 'remove' }]),
                        onClick: addLyricVisualizerTransitionDelayOption
                      }, _toDisplayString(_unref(lyricVisualizerTransitionDelayAction).mode === 'remove' ? '删除' : '添加'), 3 /* TEXT, CLASS */)
                    ]),
                    _createElementVNode("button", {
                      class: "lv-reset",
                      type: "button",
                      onClick: resetLyricVisualizerTransitionDelay
                    }, "重置")
                  ])
                ])
              ]))
            : _createCommentVNode("v-if", true)
        ]),
        _: 1 /* STABLE */
      })
    ])
  ]))
}
}

}

const __css__ = ".lv-wrapper[data-v-lyric-visualizer-settings] {\n  display: flex;\n  flex-direction: column;\n  gap: 24px;\n  padding: 24px;\n}\n.lv-header[data-v-lyric-visualizer-settings] {\n  display: flex;\n  align-items: flex-start;\n  gap: 16px;\n}\n.lv-back[data-v-lyric-visualizer-settings] {\n  border: none;\n  background: rgba(0, 0, 0, 0.08);\n  color: #000;\n  font-family: SourceHanSansCN-Bold;\n  font-size: 14px;\n  padding: 8px 18px;\n  border-radius: 999px;\n  cursor: pointer;\n  transition: 0.2s;\n}\n.lv-back[data-v-lyric-visualizer-settings]:hover {\n  opacity: 0.85;\n  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);\n}\n.lv-header-text[data-v-lyric-visualizer-settings] {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n.lv-title[data-v-lyric-visualizer-settings] {\n  font-size: 24px;\n  font-family: SourceHanSansCN-Bold;\n  color: #000;\n}\n.lv-description[data-v-lyric-visualizer-settings] {\n  font-size: 14px;\n  line-height: 1.6;\n  color: rgba(0, 0, 0, 0.65);\n}\n.lv-section[data-v-lyric-visualizer-settings] {\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n}\n.lv-option[data-v-lyric-visualizer-settings] {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  justify-content: space-between;\n  gap: 16px;\n  padding: 16px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.55);\n  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.04);\n}\n.lv-option-label[data-v-lyric-visualizer-settings] {\n  font-size: 15px;\n  font-family: SourceHanSansCN-Bold;\n  color: #000;\n  min-width: 120px;\n}\n.lv-option-control[data-v-lyric-visualizer-settings] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  flex: 1;\n  justify-content: flex-end;\n}\n.lv-option-control--with-reset[data-v-lyric-visualizer-settings] {\n  flex-wrap: wrap;\n}\n.lv-option-control--with-input[data-v-lyric-visualizer-settings] {\n  flex-wrap: wrap;\n}\n.lv-option-control--range[data-v-lyric-visualizer-settings] {\n  flex-direction: column;\n  align-items: stretch;\n  gap: 12px;\n}\n.lv-option-subgroup[data-v-lyric-visualizer-settings] {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 12px;\n}\n.lv-option-subgroup-label[data-v-lyric-visualizer-settings] {\n  font-size: 13px;\n  color: rgba(0, 0, 0, 0.65);\n  min-width: 36px;\n}\n.lv-selector-wrapper[data-v-lyric-visualizer-settings] {\n  min-width: 160px;\n  max-width: 220px;\n}\n.lv-add-group[data-v-lyric-visualizer-settings] {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n.lv-add-group input[data-v-lyric-visualizer-settings] {\n  width: 88px;\n  height: 34px;\n  border-radius: 8px;\n  border: none;\n  background: rgba(255, 255, 255, 0.75);\n  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);\n  padding: 0 12px;\n  font-family: SourceHanSansCN-Bold;\n  font-size: 13px;\n  color: #000;\n  outline: none;\n}\n.lv-add[data-v-lyric-visualizer-settings] {\n  height: 34px;\n  padding: 0 16px;\n  border-radius: 8px;\n  border: none;\n  background: rgba(0, 0, 0, 0.08);\n  color: #000;\n  font-size: 13px;\n  font-family: SourceHanSansCN-Bold;\n  cursor: pointer;\n  transition: 0.2s;\n}\n.lv-add[data-v-lyric-visualizer-settings]:hover {\n  opacity: 0.85;\n  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4);\n}\n.lv-add--remove[data-v-lyric-visualizer-settings] {\n  background: rgba(220, 53, 69, 0.12);\n  color: #d9253b;\n}\n.lv-add--remove[data-v-lyric-visualizer-settings]:hover {\n  box-shadow: 0 0 0 1px rgba(217, 37, 59, 0.5);\n}\n.lv-reset[data-v-lyric-visualizer-settings] {\n  height: 34px;\n  padding: 0 14px;\n  border-radius: 8px;\n  border: none;\n  background: rgba(0, 0, 0, 0.08);\n  color: #000;\n  font-size: 13px;\n  font-family: SourceHanSansCN-Bold;\n  cursor: pointer;\n  transition: 0.2s;\n}\n.lv-reset[data-v-lyric-visualizer-settings]:hover {\n  opacity: 0.85;\n  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4);\n}\n.lv-toggle[data-v-lyric-visualizer-settings] {\n  position: relative;\n  width: 160px;\n  height: 34px;\n  border-radius: 20px;\n  background: rgba(0, 0, 0, 0.12);\n  display: flex;\n  align-items: center;\n  padding: 4px;\n  box-sizing: border-box;\n  cursor: pointer;\n  transition: 0.2s;\n}\n.lv-toggle-off[data-v-lyric-visualizer-settings] {\n  flex: 1;\n  text-align: center;\n  font-size: 13px;\n  font-family: SourceHanSansCN-Bold;\n  color: rgba(0, 0, 0, 0.6);\n  z-index: 1;\n}\n.lv-toggle-on[data-v-lyric-visualizer-settings] {\n  position: absolute;\n  top: 4px;\n  bottom: 4px;\n  right: 4px;\n  width: calc(50% - 4px);\n  border-radius: 16px;\n  background: #000;\n}\n.lv-toggle-on-in[data-v-lyric-visualizer-settings] {\n  color: #000;\n}\n.lv-toggle[data-v-lyric-visualizer-settings]:hover {\n  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);\n}\n.lv-options-group[data-v-lyric-visualizer-settings] {\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n}\n.lv-collapse-enter-active[data-v-lyric-visualizer-settings],\n.lv-collapse-leave-active[data-v-lyric-visualizer-settings] {\n  transition: opacity 0.2s ease, transform 0.2s ease;\n}\n.lv-collapse-enter-from[data-v-lyric-visualizer-settings],\n.lv-collapse-leave-to[data-v-lyric-visualizer-settings] {\n  opacity: 0;\n  transform: translateY(-6px);\n}\n.lv-toggle-enter-active[data-v-lyric-visualizer-settings],\n.lv-toggle-leave-active[data-v-lyric-visualizer-settings] {\n  transition: transform 0.2s ease;\n}\n.lv-toggle-enter-from[data-v-lyric-visualizer-settings],\n.lv-toggle-leave-to[data-v-lyric-visualizer-settings] {\n  transform: translateX(-50%);\n}\n@media (max-width: 768px) {\n.lv-header[data-v-lyric-visualizer-settings] {\n    flex-direction: column;\n    gap: 12px;\n}\n.lv-back[data-v-lyric-visualizer-settings] {\n    align-self: flex-start;\n}\n.lv-wrapper[data-v-lyric-visualizer-settings] {\n    padding: 16px;\n}\n.lv-option[data-v-lyric-visualizer-settings] {\n    align-items: flex-start;\n}\n.lv-option-control[data-v-lyric-visualizer-settings] {\n    justify-content: flex-start;\n}\n.lv-selector-wrapper[data-v-lyric-visualizer-settings] {\n    width: 100%;\n}\n}";

let __styleEl__ = null;

function __injectCSS__() {

  if (__styleEl__ || !__css__) return;

  if (typeof document === 'undefined') return;

  __styleEl__ = document.createElement('style');

  __styleEl__.setAttribute('type', 'text/css');

  __styleEl__.innerHTML = __css__;

  document.head.appendChild(__styleEl__);

}

__injectCSS__();

const __setup__ = __sfc__.setup;

__sfc__.setup = function(...args) {

  __injectCSS__();

  return __setup__ ? __setup__.apply(this, args) : undefined;

};

export default __sfc__;
