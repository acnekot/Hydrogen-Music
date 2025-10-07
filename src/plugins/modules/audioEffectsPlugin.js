import { Howler } from 'howler'
import { reactive } from 'vue'

const ROUTE_NAME = 'plugin-audio-effects-settings'
const BASS_MIN = -12
const BASS_MAX = 12
const TREBLE_MIN = -12
const TREBLE_MAX = 12
const AMBIENCE_MIN = 0
const AMBIENCE_MAX = 1

export const audioEffectsState = reactive({
  available: typeof Howler !== 'undefined' ? Howler.usingWebAudio : false,
  bypass: false,
  bass: 4,
  treble: 2,
  ambience: 0.2,
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

function ensureChain() {
  if (!audioEffectsState.available) return null
  if (!Howler.masterGain || !Howler.ctx) return null
  if (chain) return chain

  const context = Howler.ctx
  const input = context.createGain()
  const bassFilter = context.createBiquadFilter()
  bassFilter.type = 'lowshelf'
  bassFilter.frequency.value = 200

  const trebleFilter = context.createBiquadFilter()
  trebleFilter.type = 'highshelf'
  trebleFilter.frequency.value = 3500

  const compressor = context.createDynamicsCompressor()
  compressor.threshold.value = -18
  compressor.knee.value = 18
  compressor.ratio.value = 3
  compressor.attack.value = 0.005
  compressor.release.value = 0.25

  const dryGain = context.createGain()
  dryGain.gain.value = 1

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
  bassFilter.connect(trebleFilter)
  trebleFilter.connect(compressor)
  compressor.connect(dryGain)
  dryGain.connect(output)

  trebleFilter.connect(delay)
  delay.connect(feedback)
  feedback.connect(delay)
  delay.connect(convolver)
  convolver.connect(wetGain)
  wetGain.connect(output)

  chain = {
    input,
    bassFilter,
    trebleFilter,
    compressor,
    dryGain,
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
  chain.trebleFilter.gain.value = audioEffectsState.treble
  chain.wetGain.gain.value = audioEffectsState.ambience
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
        ambience: audioEffectsState.ambience
      }
    })
  } catch (error) {
    console.warn('[AudioEffectsPlugin] Failed to persist state:', error)
  }
}

function loadState(manager) {
  const stored = manager?.settingsStore?.getState('audio-effects')
  if (!stored?.data) return
  const { bypass, bass, treble, ambience } = stored.data
  audioEffectsState.bypass = Boolean(bypass)
  audioEffectsState.bass = clamp(bass, BASS_MIN, BASS_MAX)
  audioEffectsState.treble = clamp(treble, TREBLE_MIN, TREBLE_MAX)
  audioEffectsState.ambience = clamp(ambience, AMBIENCE_MIN, AMBIENCE_MAX)
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

export function resetAudioEffects() {
  audioEffectsState.bypass = false
  audioEffectsState.bass = 4
  audioEffectsState.treble = 2
  audioEffectsState.ambience = 0.2
  connectChain()
  applyChainSettings()
  persistState()
}

export default {
  name: 'audio-effects',
  displayName: '音效增强',
  version: '1.0.0',
  description: '提供低音增强、高音增强与空间混响的音效调节。',
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
