import { Howler } from 'howler'
import { reactive } from 'vue'

const ROUTE_NAME = 'plugin-audio-effects-settings'
const BASS_MIN = -12
const BASS_MAX = 12
const TREBLE_MIN = -12
const TREBLE_MAX = 12
const PRESENCE_MIN = -12
const PRESENCE_MAX = 12
const AMBIENCE_MIN = 0
const AMBIENCE_MAX = 1
const WIDTH_MIN = 0
const WIDTH_MAX = 2
const OUTPUT_GAIN_MIN = -12
const OUTPUT_GAIN_MAX = 6

const DEFAULTS = Object.freeze({
  bypass: false,
  bass: 4,
  treble: 2,
  presence: 1,
  ambience: 0.2,
  stereoWidth: 1.1,
  outputGain: 0
})

export const audioEffectsState = reactive({
  available: typeof Howler !== 'undefined' ? Howler.usingWebAudio : false,
  bypass: DEFAULTS.bypass,
  bass: DEFAULTS.bass,
  treble: DEFAULTS.treble,
  presence: DEFAULTS.presence,
  ambience: DEFAULTS.ambience,
  stereoWidth: DEFAULTS.stereoWidth,
  outputGain: DEFAULTS.outputGain,
  active: false
})

let managerRef = null
let chain = null
let connected = false

function createImpulseResponse(context) {
  const length = context.sampleRate * 0.2
  const impulse = context.createBuffer(2, length, context.sampleRate)
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel)
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3)
    }
  }
  return impulse
}

function dbToGain(db) {
  const value = clamp(db, OUTPUT_GAIN_MIN, OUTPUT_GAIN_MAX)
  return Math.pow(10, value / 20)
}

function ensureChain() {
  if (!audioEffectsState.available) return null
  if (!Howler.masterGain || !Howler.ctx) return null
  if (chain) return chain

  const context = Howler.ctx
  const input = context.createGain()

  const bassFilter = context.createBiquadFilter()
  bassFilter.type = 'lowshelf'
  bassFilter.frequency.value = 200

  const presenceFilter = context.createBiquadFilter()
  presenceFilter.type = 'peaking'
  presenceFilter.frequency.value = 1250
  presenceFilter.Q.value = 1.25
  presenceFilter.gain.value = audioEffectsState.presence

  const trebleFilter = context.createBiquadFilter()
  trebleFilter.type = 'highshelf'
  trebleFilter.frequency.value = 3500

  const compressor = context.createDynamicsCompressor()
  compressor.threshold.value = -18
  compressor.knee.value = 18
  compressor.ratio.value = 3
  compressor.attack.value = 0.005
  compressor.release.value = 0.25

  const widthSplitter = context.createChannelSplitter(2)
  const widthLeftDirect = context.createGain()
  const widthLeftCross = context.createGain()
  const widthRightDirect = context.createGain()
  const widthRightCross = context.createGain()
  const widthMerger = context.createChannelMerger(2)

  const outputGain = context.createGain()
  outputGain.gain.value = dbToGain(audioEffectsState.outputGain)

  const dryGain = context.createGain()
  dryGain.gain.value = 1

  const ambienceSend = context.createGain()
  ambienceSend.gain.value = 1

  const wetGain = context.createGain()
  wetGain.gain.value = audioEffectsState.ambience

  const delay = context.createDelay(0.35)
  delay.delayTime.value = 0.03

  const feedback = context.createGain()
  feedback.gain.value = 0.2

  const convolver = context.createConvolver()
  try {
    convolver.buffer = createImpulseResponse(context)
  } catch (error) {
    console.warn('[AudioEffectsPlugin] Failed to generate impulse response:', error)
  }

  const output = context.createGain()

  input.connect(bassFilter)
  bassFilter.connect(presenceFilter)
  presenceFilter.connect(trebleFilter)
  trebleFilter.connect(compressor)
  compressor.connect(widthSplitter)

  widthSplitter.connect(widthLeftDirect, 0)
  widthSplitter.connect(widthRightCross, 0)
  widthSplitter.connect(widthRightDirect, 1)
  widthSplitter.connect(widthLeftCross, 1)

  widthLeftDirect.connect(widthMerger, 0, 0)
  widthLeftCross.connect(widthMerger, 0, 0)
  widthRightDirect.connect(widthMerger, 0, 1)
  widthRightCross.connect(widthMerger, 0, 1)

  widthMerger.connect(outputGain)
  outputGain.connect(dryGain)
  dryGain.connect(output)

  widthMerger.connect(ambienceSend)
  ambienceSend.connect(delay)
  delay.connect(feedback)
  feedback.connect(delay)
  delay.connect(convolver)
  convolver.connect(wetGain)
  wetGain.connect(output)

  chain = {
    input,
    bassFilter,
    presenceFilter,
    trebleFilter,
    compressor,
    width: {
      splitter: widthSplitter,
      leftDirect: widthLeftDirect,
      leftCross: widthLeftCross,
      rightDirect: widthRightDirect,
      rightCross: widthRightCross,
      merger: widthMerger
    },
    outputGain,
    dryGain,
    ambienceSend,
    wetGain,
    delay,
    feedback,
    convolver,
    output
  }

  return chain
}

function disconnectChain() {
  if (!connected) return
  try {
    Howler.masterGain.disconnect()
  } catch (_) {
    // ignore
  }
  try {
    if (chain?.input) {
      chain.input.disconnect()
    }
    if (chain?.output) {
      chain.output.disconnect()
    }
  } catch (_) {
    // ignore
  }
  try {
    if (Howler.ctx) {
      Howler.masterGain.connect(Howler.ctx.destination)
    }
  } catch (_) {
    // ignore
  }
  connected = false
  audioEffectsState.active = false
}

function applyChainSettings() {
  if (!chain) return
  chain.bassFilter.gain.value = audioEffectsState.bass
  chain.presenceFilter.gain.value = audioEffectsState.presence
  chain.trebleFilter.gain.value = audioEffectsState.treble
  chain.wetGain.gain.value = audioEffectsState.ambience
  chain.outputGain.gain.value = dbToGain(audioEffectsState.outputGain)
  applyStereoWidth()
}

function applyStereoWidth() {
  if (!chain?.width) return
  const width = clamp(audioEffectsState.stereoWidth, WIDTH_MIN, WIDTH_MAX)
  const direct = 0.5 * (1 + width)
  const cross = 0.5 * (1 - width)
  chain.width.leftDirect.gain.value = direct
  chain.width.rightDirect.gain.value = direct
  chain.width.leftCross.gain.value = cross
  chain.width.rightCross.gain.value = cross
}

function connectChain() {
  if (!audioEffectsState.available || audioEffectsState.bypass) {
    disconnectChain()
    return
  }
  const nodes = ensureChain()
  if (!nodes) {
    audioEffectsState.active = false
    return
  }
  if (!connected) {
    try {
      Howler.masterGain.disconnect()
    } catch (_) {
      // ignore
    }
    try {
      nodes.output.disconnect()
    } catch (_) {
      // ignore
    }
    try {
      Howler.masterGain.connect(nodes.input)
      nodes.output.connect(Howler.ctx.destination)
      connected = true
      audioEffectsState.active = true
    } catch (error) {
      console.warn('[AudioEffectsPlugin] Failed to connect effect chain:', error)
      connected = false
      audioEffectsState.active = false
    }
  }
  applyChainSettings()
}

function clamp(value, min, max) {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return min
  return Math.min(max, Math.max(min, numeric))
}

function persistState() {
  if (!managerRef?.settingsStore) return
  try {
    managerRef.settingsStore.setState('audio-effects', {
      data: {
        bypass: audioEffectsState.bypass,
        bass: audioEffectsState.bass,
        treble: audioEffectsState.treble,
        presence: audioEffectsState.presence,
        ambience: audioEffectsState.ambience,
        stereoWidth: audioEffectsState.stereoWidth,
        outputGain: audioEffectsState.outputGain
      }
    })
  } catch (error) {
    console.warn('[AudioEffectsPlugin] Failed to persist state:', error)
  }
}

function loadState(manager) {
  const stored = manager?.settingsStore?.getState('audio-effects')
  if (!stored?.data) return
  const { bypass, bass, treble, ambience, presence, stereoWidth, outputGain } = stored.data
  audioEffectsState.bypass = Boolean(bypass)
  audioEffectsState.bass = clamp(bass ?? DEFAULTS.bass, BASS_MIN, BASS_MAX)
  audioEffectsState.treble = clamp(treble ?? DEFAULTS.treble, TREBLE_MIN, TREBLE_MAX)
  audioEffectsState.presence = clamp(presence ?? DEFAULTS.presence, PRESENCE_MIN, PRESENCE_MAX)
  audioEffectsState.ambience = clamp(ambience ?? DEFAULTS.ambience, AMBIENCE_MIN, AMBIENCE_MAX)
  audioEffectsState.stereoWidth = clamp(stereoWidth ?? DEFAULTS.stereoWidth, WIDTH_MIN, WIDTH_MAX)
  audioEffectsState.outputGain = clamp(outputGain ?? DEFAULTS.outputGain, OUTPUT_GAIN_MIN, OUTPUT_GAIN_MAX)
}

export function setAudioEffectsBypass(bypass) {
  audioEffectsState.bypass = Boolean(bypass)
  if (audioEffectsState.bypass) {
    disconnectChain()
  } else {
    connectChain()
  }
  persistState()
}

export function setAudioEffectsBass(value) {
  audioEffectsState.bass = clamp(value, BASS_MIN, BASS_MAX)
  connectChain()
  applyChainSettings()
  persistState()
}

export function setAudioEffectsTreble(value) {
  audioEffectsState.treble = clamp(value, TREBLE_MIN, TREBLE_MAX)
  connectChain()
  applyChainSettings()
  persistState()
}

export function setAudioEffectsAmbience(value) {
  audioEffectsState.ambience = clamp(value, AMBIENCE_MIN, AMBIENCE_MAX)
  connectChain()
  applyChainSettings()
  persistState()
}

export function setAudioEffectsPresence(value) {
  audioEffectsState.presence = clamp(value, PRESENCE_MIN, PRESENCE_MAX)
  connectChain()
  applyChainSettings()
  persistState()
}

export function setAudioEffectsStereoWidth(value) {
  audioEffectsState.stereoWidth = clamp(value, WIDTH_MIN, WIDTH_MAX)
  connectChain()
  applyChainSettings()
  persistState()
}

export function setAudioEffectsOutputGain(value) {
  audioEffectsState.outputGain = clamp(value, OUTPUT_GAIN_MIN, OUTPUT_GAIN_MAX)
  connectChain()
  applyChainSettings()
  persistState()
}

export function resetAudioEffects() {
  audioEffectsState.bypass = DEFAULTS.bypass
  audioEffectsState.bass = DEFAULTS.bass
  audioEffectsState.treble = DEFAULTS.treble
  audioEffectsState.presence = DEFAULTS.presence
  audioEffectsState.ambience = DEFAULTS.ambience
  audioEffectsState.stereoWidth = DEFAULTS.stereoWidth
  audioEffectsState.outputGain = DEFAULTS.outputGain
  connectChain()
  applyChainSettings()
  persistState()
}

export default {
  name: 'audio-effects',
  displayName: '音效增强',
  version: '1.1.0',
  description: '提供低音、高音、存在感、立体声宽度与空间混响的综合音效调节。',
  author: 'Hydrogen Music Team',
  enabled: true,
  removable: true,
  settings: {
    label: '打开音效设置',
    route: { name: ROUTE_NAME }
  },
  async setup({ router, manager }) {
    managerRef = manager ?? null
    audioEffectsState.available = typeof Howler !== 'undefined' ? Howler.usingWebAudio : false
    if (managerRef) {
      loadState(managerRef)
    }

    if (router && !router.hasRoute(ROUTE_NAME)) {
      router.addRoute({
        path: '/plugins/audio-effects',
        name: ROUTE_NAME,
        component: () => import('../views/AudioEffectsSettings.vue')
      })
    }

    connectChain()

    return async () => {
      disconnectChain()
      if (router && router.hasRoute(ROUTE_NAME)) {
        router.removeRoute(ROUTE_NAME)
      }
      managerRef = null
    }
  }
}
