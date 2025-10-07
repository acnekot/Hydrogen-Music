<template>
  <div class="lv-wrapper">
    <header class="lv-header">
      <button class="lv-back" type="button" @click="goBack">
        <span>返回</span>
      </button>
      <div class="lv-header-text">
        <h1 class="lv-title">歌词音频可视化</h1>
        <p class="lv-description">
          启用后将在歌词区域绘制实时频谱，可自定义柱状或圆环样式及相关参数。
        </p>
      </div>
    </header>
    <section class="lv-section">
      <div class="lv-option">
        <div class="lv-option-label">开启可视化</div>
        <div class="lv-option-control">
          <div class="lv-toggle" @click="toggleLyricVisualizer">
            <div class="lv-toggle-off" :class="{ 'lv-toggle-on-in': playerStore.lyricVisualizer }">
              {{ playerStore.lyricVisualizer ? '已开启' : '已关闭' }}
            </div>
            <Transition name="lv-toggle">
              <div class="lv-toggle-on" v-show="playerStore.lyricVisualizer"></div>
            </Transition>
          </div>
        </div>
      </div>

      <Transition name="lv-collapse">
        <div v-if="playerStore.lyricVisualizer" class="lv-options-group">
          <div class="lv-option">
            <div class="lv-option-label">可视化样式</div>
            <div class="lv-option-control lv-option-control--with-reset">
              <div class="lv-selector-wrapper">
                <Selector v-model="playerStore.lyricVisualizerStyle" :options="lyricVisualizerStyleOptions" />
              </div>
              <button class="lv-reset" type="button" @click="resetLyricVisualizerStyle">重置</button>
            </div>
          </div>

          <div
            class="lv-option"
            v-if="playerStore.lyricVisualizerStyle === 'radial'"
          >
            <div class="lv-option-label">圆环大小</div>
            <div class="lv-option-control lv-option-control--with-input">
              <div class="lv-selector-wrapper">
                <Selector
                  v-model="playerStore.lyricVisualizerRadialSize"
                  :options="lyricVisualizerRadialSizeOptions"
                />
              </div>
              <div class="lv-add-group">
                <input
                  type="number"
                  min="10"
                  v-model="lyricVisualizerRadialSizeCustom"
                  @keyup.enter="addLyricVisualizerRadialSizeOption"
                />
                <button
                  type="button"
                  class="lv-add"
                  :class="{ 'lv-add--remove': lyricVisualizerRadialSizeAction.mode === 'remove' }"
                  @click="addLyricVisualizerRadialSizeOption"
                >
                  {{ lyricVisualizerRadialSizeAction.mode === 'remove' ? '删除' : '添加' }}
                </button>
              </div>
              <button class="lv-reset" type="button" @click="resetLyricVisualizerRadialSize">重置</button>
            </div>
          </div>

          <div
            class="lv-option"
            v-if="playerStore.lyricVisualizerStyle === 'radial'"
          >
            <div class="lv-option-label">X 轴偏移</div>
            <div class="lv-option-control lv-option-control--with-input">
              <div class="lv-selector-wrapper">
                <Selector
                  v-model="playerStore.lyricVisualizerRadialOffsetX"
                  :options="lyricVisualizerRadialOffsetXOptions"
                />
              </div>
              <div class="lv-add-group">
                <input
                  type="number"
                  v-model="lyricVisualizerRadialOffsetXCustom"
                  @keyup.enter="addLyricVisualizerRadialOffsetXOption"
                />
                <button
                  type="button"
                  class="lv-add"
                  :class="{ 'lv-add--remove': lyricVisualizerRadialOffsetXAction.mode === 'remove' }"
                  @click="addLyricVisualizerRadialOffsetXOption"
                >
                  {{ lyricVisualizerRadialOffsetXAction.mode === 'remove' ? '删除' : '添加' }}
                </button>
              </div>
              <button class="lv-reset" type="button" @click="resetLyricVisualizerRadialOffsetX">重置</button>
            </div>
          </div>

          <div
            class="lv-option"
            v-if="playerStore.lyricVisualizerStyle === 'radial'"
          >
            <div class="lv-option-label">Y 轴偏移</div>
            <div class="lv-option-control lv-option-control--with-input">
              <div class="lv-selector-wrapper">
                <Selector
                  v-model="playerStore.lyricVisualizerRadialOffsetY"
                  :options="lyricVisualizerRadialOffsetYOptions"
                />
              </div>
              <div class="lv-add-group">
                <input
                  type="number"
                  v-model="lyricVisualizerRadialOffsetYCustom"
                  @keyup.enter="addLyricVisualizerRadialOffsetYOption"
                />
                <button
                  type="button"
                  class="lv-add"
                  :class="{ 'lv-add--remove': lyricVisualizerRadialOffsetYAction.mode === 'remove' }"
                  @click="addLyricVisualizerRadialOffsetYOption"
                >
                  {{ lyricVisualizerRadialOffsetYAction.mode === 'remove' ? '删除' : '添加' }}
                </button>
              </div>
              <button class="lv-reset" type="button" @click="resetLyricVisualizerRadialOffsetY">重置</button>
            </div>
          </div>

          <div class="lv-option">
            <div class="lv-option-label">可视化高度</div>
            <div class="lv-option-control lv-option-control--with-input">
              <div class="lv-selector-wrapper">
                <Selector v-model="playerStore.lyricVisualizerHeight" :options="lyricVisualizerHeightOptions" />
              </div>
              <div class="lv-add-group">
                <input
                  type="number"
                  min="1"
                  v-model="lyricVisualizerHeightCustom"
                  @keyup.enter="addLyricVisualizerHeightOption"
                />
                <button
                  type="button"
                  class="lv-add"
                  :class="{ 'lv-add--remove': lyricVisualizerHeightAction.mode === 'remove' }"
                  @click="addLyricVisualizerHeightOption"
                >
                  {{ lyricVisualizerHeightAction.mode === 'remove' ? '删除' : '添加' }}
                </button>
              </div>
              <button class="lv-reset" type="button" @click="resetLyricVisualizerHeight">重置</button>
            </div>
          </div>

          <div class="lv-option">
            <div class="lv-option-label">柱体数量</div>
            <div class="lv-option-control lv-option-control--with-input">
              <div class="lv-selector-wrapper">
                <Selector v-model="playerStore.lyricVisualizerBarCount" :options="lyricVisualizerBarCountOptions" />
              </div>
              <div class="lv-add-group">
                <input
                  type="number"
                  min="1"
                  v-model="lyricVisualizerBarCountCustom"
                  @keyup.enter="addLyricVisualizerBarCountOption"
                />
                <button
                  type="button"
                  class="lv-add"
                  :class="{ 'lv-add--remove': lyricVisualizerBarCountAction.mode === 'remove' }"
                  @click="addLyricVisualizerBarCountOption"
                >
                  {{ lyricVisualizerBarCountAction.mode === 'remove' ? '删除' : '添加' }}
                </button>
              </div>
              <button class="lv-reset" type="button" @click="resetLyricVisualizerBarCount">重置</button>
            </div>
          </div>

          <div class="lv-option">
            <div class="lv-option-label">柱体宽度</div>
            <div class="lv-option-control lv-option-control--with-input">
              <div class="lv-selector-wrapper">
                <Selector v-model="playerStore.lyricVisualizerBarWidth" :options="lyricVisualizerBarWidthOptions" />
              </div>
              <div class="lv-add-group">
                <input
                  type="number"
                  min="1"
                  v-model="lyricVisualizerBarWidthCustom"
                  @keyup.enter="addLyricVisualizerBarWidthOption"
                />
                <button
                  type="button"
                  class="lv-add"
                  :class="{ 'lv-add--remove': lyricVisualizerBarWidthAction.mode === 'remove' }"
                  @click="addLyricVisualizerBarWidthOption"
                >
                  {{ lyricVisualizerBarWidthAction.mode === 'remove' ? '删除' : '添加' }}
                </button>
              </div>
              <button class="lv-reset" type="button" @click="resetLyricVisualizerBarWidth">重置</button>
            </div>
          </div>

          <div class="lv-option">
            <div class="lv-option-label">频率范围</div>
            <div class="lv-option-control lv-option-control--range">
              <div class="lv-option-subgroup">
                <span class="lv-option-subgroup-label">最低</span>
                <div class="lv-selector-wrapper">
                  <Selector
                    v-model="playerStore.lyricVisualizerFrequencyMin"
                    :options="lyricVisualizerFrequencyMinOptions"
                  />
                </div>
                <div class="lv-add-group">
                  <input
                    type="number"
                    min="20"
                    v-model="lyricVisualizerFrequencyMinCustom"
                    @keyup.enter="addLyricVisualizerFrequencyMinOption"
                  />
                  <button
                    type="button"
                    class="lv-add"
                    :class="{ 'lv-add--remove': lyricVisualizerFrequencyMinAction.mode === 'remove' }"
                    @click="addLyricVisualizerFrequencyMinOption"
                  >
                    {{ lyricVisualizerFrequencyMinAction.mode === 'remove' ? '删除' : '添加' }}
                  </button>
                </div>
                <button class="lv-reset" type="button" @click="resetLyricVisualizerFrequencyMin">重置</button>
              </div>
              <div class="lv-option-subgroup">
                <span class="lv-option-subgroup-label">最高</span>
                <div class="lv-selector-wrapper">
                  <Selector
                    v-model="playerStore.lyricVisualizerFrequencyMax"
                    :options="lyricVisualizerFrequencyMaxOptions"
                  />
                </div>
                <div class="lv-add-group">
                  <input
                    type="number"
                    min="20"
                    v-model="lyricVisualizerFrequencyMaxCustom"
                    @keyup.enter="addLyricVisualizerFrequencyMaxOption"
                  />
                  <button
                    type="button"
                    class="lv-add"
                    :class="{ 'lv-add--remove': lyricVisualizerFrequencyMaxAction.mode === 'remove' }"
                    @click="addLyricVisualizerFrequencyMaxOption"
                  >
                    {{ lyricVisualizerFrequencyMaxAction.mode === 'remove' ? '删除' : '添加' }}
                  </button>
                </div>
                <button class="lv-reset" type="button" @click="resetLyricVisualizerFrequencyMax">重置</button>
              </div>
            </div>
          </div>

          <div class="lv-option">
            <div class="lv-option-label">可视化透明度</div>
            <div class="lv-option-control lv-option-control--with-input">
              <div class="lv-selector-wrapper">
                <Selector
                  v-model="playerStore.lyricVisualizerOpacity"
                  :options="lyricVisualizerOpacityOptions"
                />
              </div>
              <div class="lv-add-group">
                <input
                  type="number"
                  min="0"
                  max="100"
                  v-model="lyricVisualizerOpacityCustom"
                  @keyup.enter="addLyricVisualizerOpacityOption"
                />
                <button
                  type="button"
                  class="lv-add"
                  :class="{ 'lv-add--remove': lyricVisualizerOpacityAction.mode === 'remove' }"
                  @click="addLyricVisualizerOpacityOption"
                >
                  {{ lyricVisualizerOpacityAction.mode === 'remove' ? '删除' : '添加' }}
                </button>
              </div>
              <button class="lv-reset" type="button" @click="resetLyricVisualizerOpacity">重置</button>
            </div>
          </div>

          <div class="lv-option">
            <div class="lv-option-label">可视化颜色</div>
            <div class="lv-option-control">
              <div class="lv-selector-wrapper">
                <Selector v-model="playerStore.lyricVisualizerColor" :options="lyricVisualizerColorOptions" />
              </div>
            </div>
          </div>

          <div class="lv-option">
            <div class="lv-option-label">过渡延迟</div>
            <div class="lv-option-control lv-option-control--with-input">
              <div class="lv-selector-wrapper">
                <Selector
                  v-model="playerStore.lyricVisualizerTransitionDelay"
                  :options="lyricVisualizerTransitionDelayOptions"
                />
              </div>
              <div class="lv-add-group">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="0.95"
                  v-model="lyricVisualizerTransitionDelayCustom"
                  @keyup.enter="addLyricVisualizerTransitionDelayOption"
                />
                <button
                  type="button"
                  class="lv-add"
                  :class="{ 'lv-add--remove': lyricVisualizerTransitionDelayAction.mode === 'remove' }"
                  @click="addLyricVisualizerTransitionDelayOption"
                >
                  {{ lyricVisualizerTransitionDelayAction.mode === 'remove' ? '删除' : '添加' }}
                </button>
              </div>
              <button class="lv-reset" type="button" @click="resetLyricVisualizerTransitionDelay">重置</button>
            </div>
          </div>
        </div>
      </Transition>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Selector from '../../components/Selector.vue'
import { usePlayerStore } from '../../store/playerStore'
import { lyricVisualizerDefaults } from '../modules/lyricVisualizerPlugin'

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
</script>

<style scoped>
.lv-wrapper {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
}

.lv-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.lv-back {
  border: none;
  background: rgba(0, 0, 0, 0.08);
  color: #000;
  font-family: SourceHanSansCN-Bold;
  font-size: 14px;
  padding: 8px 18px;
  border-radius: 999px;
  cursor: pointer;
  transition: 0.2s;
}

.lv-back:hover {
  opacity: 0.85;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
}

.lv-header-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lv-title {
  font-size: 24px;
  font-family: SourceHanSansCN-Bold;
  color: #000;
}

.lv-description {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.65);
}

.lv-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.lv-option {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.55);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.04);
}

.lv-option-label {
  font-size: 15px;
  font-family: SourceHanSansCN-Bold;
  color: #000;
  min-width: 120px;
}

.lv-option-control {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: flex-end;
}

.lv-option-control--with-reset {
  flex-wrap: wrap;
}

.lv-option-control--with-input {
  flex-wrap: wrap;
}

.lv-option-control--range {
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}

.lv-option-subgroup {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.lv-option-subgroup-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  min-width: 36px;
}

.lv-selector-wrapper {
  min-width: 160px;
  max-width: 220px;
}

.lv-add-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lv-add-group input {
  width: 88px;
  height: 34px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.75);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
  padding: 0 12px;
  font-family: SourceHanSansCN-Bold;
  font-size: 13px;
  color: #000;
  outline: none;
}

.lv-add {
  height: 34px;
  padding: 0 16px;
  border-radius: 8px;
  border: none;
  background: rgba(0, 0, 0, 0.08);
  color: #000;
  font-size: 13px;
  font-family: SourceHanSansCN-Bold;
  cursor: pointer;
  transition: 0.2s;
}

.lv-add:hover {
  opacity: 0.85;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4);
}

.lv-add--remove {
  background: rgba(220, 53, 69, 0.12);
  color: #d9253b;
}

.lv-add--remove:hover {
  box-shadow: 0 0 0 1px rgba(217, 37, 59, 0.5);
}

.lv-reset {
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  border: none;
  background: rgba(0, 0, 0, 0.08);
  color: #000;
  font-size: 13px;
  font-family: SourceHanSansCN-Bold;
  cursor: pointer;
  transition: 0.2s;
}

.lv-reset:hover {
  opacity: 0.85;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4);
}

.lv-toggle {
  position: relative;
  width: 160px;
  height: 34px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  padding: 4px;
  box-sizing: border-box;
  cursor: pointer;
  transition: 0.2s;
}

.lv-toggle-off {
  flex: 1;
  text-align: center;
  font-size: 13px;
  font-family: SourceHanSansCN-Bold;
  color: rgba(0, 0, 0, 0.6);
  z-index: 1;
}

.lv-toggle-on {
  position: absolute;
  top: 4px;
  bottom: 4px;
  right: 4px;
  width: calc(50% - 4px);
  border-radius: 16px;
  background: #000;
}

.lv-toggle-on-in {
  color: #000;
}

.lv-toggle:hover {
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
}

.lv-options-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.lv-collapse-enter-active,
.lv-collapse-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.lv-collapse-enter-from,
.lv-collapse-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.lv-toggle-enter-active,
.lv-toggle-leave-active {
  transition: transform 0.2s ease;
}

.lv-toggle-enter-from,
.lv-toggle-leave-to {
  transform: translateX(-50%);
}

@media (max-width: 768px) {
  .lv-header {
    flex-direction: column;
    gap: 12px;
  }

  .lv-back {
    align-self: flex-start;
  }

  .lv-wrapper {
    padding: 16px;
  }

  .lv-option {
    align-items: flex-start;
  }

  .lv-option-control {
    justify-content: flex-start;
  }

  .lv-selector-wrapper {
    width: 100%;
  }
}
</style>
