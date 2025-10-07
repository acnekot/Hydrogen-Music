<template>
  <div class="mixer-console">
    <header class="mixer-header">
      <h1>混音台</h1>
      <p>
        在此调节预设声道的音量、声像和均衡，可用于快速创建直播或演出用的混音方案。
      </p>
    </header>
    <section class="mixer-channels">
      <article
        v-for="channel in channels"
        :key="channel.id"
        class="mixer-channel"
        :class="{
          'mixer-channel--muted': channel.mute,
          'mixer-channel--solo': channel.solo
        }"
      >
        <h2>{{ channel.name }}</h2>
        <div class="meter" :style="{ '--meter-value': formatMeter(channelLevel(channel)) }"></div>
        <label class="control">
          <span>音量 {{ formatVolume(channel.volume) }}</span>
          <input type="range" min="0" max="1" step="0.01" v-model.number="channel.volume" />
        </label>
        <label class="control">
          <span>声像 {{ formatPan(channel.pan) }}</span>
          <input type="range" min="-1" max="1" step="0.01" v-model.number="channel.pan" />
        </label>
        <div class="eq">
          <h3>均衡</h3>
          <label class="control">
            <span>低频 {{ formatEq(channel.eq.low) }}</span>
            <input type="range" min="-12" max="12" step="0.5" v-model.number="channel.eq.low" />
          </label>
          <label class="control">
            <span>中频 {{ formatEq(channel.eq.mid) }}</span>
            <input type="range" min="-12" max="12" step="0.5" v-model.number="channel.eq.mid" />
          </label>
          <label class="control">
            <span>高频 {{ formatEq(channel.eq.high) }}</span>
            <input type="range" min="-12" max="12" step="0.5" v-model.number="channel.eq.high" />
          </label>
        </div>
        <div class="channel-actions">
          <button type="button" @click="toggleSolo(channel)" :class="{ active: channel.solo }">SOLO</button>
          <button type="button" @click="toggleMute(channel)" :class="{ active: channel.mute }">MUTE</button>
        </div>
      </article>
    </section>
    <section class="mixer-master">
      <h2>主控通道</h2>
      <div class="master-meter" :style="{ '--meter-value': formatMeter(masterLevel) }"></div>
      <label class="control">
        <span>总音量 {{ formatVolume(master.volume) }}</span>
        <input type="range" min="0" max="1" step="0.01" v-model.number="master.volume" />
      </label>
      <div class="summary">
        <div>激活声道：{{ activeChannelCount }}</div>
        <div>平均电平：{{ formatDb(masterLevelDb) }}</div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'

const state = reactive({
  channels: [
    { id: 'vocals', name: '主唱', volume: 0.78, pan: 0, mute: false, solo: false, eq: { low: 1, mid: 0, high: 1.5 } },
    { id: 'backing', name: '和声', volume: 0.62, pan: -0.15, mute: false, solo: false, eq: { low: -1, mid: -0.5, high: 0.5 } },
    { id: 'guitar', name: '吉他', volume: 0.58, pan: 0.25, mute: false, solo: false, eq: { low: -0.5, mid: 1.5, high: 2 } },
    { id: 'keys', name: '键盘', volume: 0.54, pan: -0.25, mute: false, solo: false, eq: { low: 0.5, mid: 0.5, high: 0.5 } },
    { id: 'bass', name: '贝斯', volume: 0.7, pan: 0, mute: false, solo: false, eq: { low: 3, mid: -1, high: -2 } },
    { id: 'drums', name: '鼓组', volume: 0.82, pan: 0, mute: false, solo: false, eq: { low: 2, mid: 1, high: 1 } }
  ],
  master: {
    volume: 0.82
  }
})

const soloActive = computed(() => state.channels.some((channel) => channel.solo))

const activeChannelCount = computed(() =>
  state.channels.filter((channel) => (soloActive.value ? channel.solo : !channel.mute)).length
)

const masterLevel = computed(() => {
  if (state.channels.length === 0) return 0
  const total = state.channels.reduce((sum, channel) => {
    const level = channelLevel(channel)
    return sum + level
  }, 0)
  return Math.min(1, (total / state.channels.length) * state.master.volume)
})

const masterLevelDb = computed(() => {
  const level = masterLevel.value
  if (level <= 0) return -Infinity
  return Math.round(20 * Math.log10(level) * 10) / 10
})

const channels = computed(() => state.channels)
const master = computed(() => state.master)

function toggleMute(channel) {
  channel.mute = !channel.mute
  if (channel.mute) {
    channel.solo = false
  }
}

function toggleSolo(channel) {
  const nextState = !channel.solo
  channel.solo = nextState
  if (nextState) {
    channel.mute = false
  }
}

function channelLevel(channel) {
  const active = soloActive.value ? channel.solo : !channel.mute
  if (!active) return 0
  const eqBoost = (channel.eq.low + channel.eq.mid + channel.eq.high) / 36
  const panCompensation = 1 - Math.abs(channel.pan) * 0.2
  return Math.min(1, Math.max(0, channel.volume * panCompensation * (1 + eqBoost)))
}

function formatVolume(value) {
  return `${Math.round(value * 100)}%`
}

function formatPan(value) {
  if (Math.abs(value) < 0.01) return 'C'
  return value > 0 ? `R${Math.round(Math.abs(value) * 100)}` : `L${Math.round(Math.abs(value) * 100)}`
}

function formatEq(value) {
  if (value > 0) return `+${value.toFixed(1)} dB`
  if (value < 0) return `${value.toFixed(1)} dB`
  return '0 dB'
}

function formatDb(value) {
  if (!Number.isFinite(value)) return '-∞ dB'
  return `${value.toFixed(1)} dB`
}

function formatMeter(value) {
  return `${Math.round(Math.min(Math.max(value, 0), 1) * 100)}%`
}
</script>

<style scoped>
.mixer-console {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
  padding: 24px 32px;
  color: #0f0f0f;
}

.mixer-header h1 {
  font-size: 28px;
  margin-bottom: 8px;
}

.mixer-header p {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.6;
}

.mixer-channels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}

.mixer-channel {
  background: rgba(255, 255, 255, 0.45);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 20px rgba(15, 15, 15, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.mixer-channel:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(15, 15, 15, 0.12);
}

.mixer-channel--muted {
  opacity: 0.65;
}

.mixer-channel--solo {
  box-shadow: 0 0 0 2px #1677ff inset, 0 12px 32px rgba(22, 119, 255, 0.24);
}

.mixer-channel h2 {
  font-size: 18px;
  font-weight: 600;
}

.meter,
.master-meter {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    rgba(34, 197, 94, 0.6) 0%,
    rgba(250, 204, 21, 0.8) 60%,
    rgba(239, 68, 68, 0.9) 100%
  );
  position: relative;
  overflow: hidden;
}

.meter::after,
.master-meter::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--meter-value, 0%);
  background: rgba(0, 0, 0, 0.1);
  mix-blend-mode: multiply;
}

.control {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.72);
}

.control input[type='range'] {
  width: 100%;
  accent-color: #1677ff;
}

.eq {
  background: rgba(15, 15, 15, 0.04);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.eq h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.channel-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.channel-actions button {
  flex: 1;
  padding: 6px 10px;
  border-radius: 6px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  background: rgba(15, 15, 15, 0.08);
  transition: background 0.2s ease, color 0.2s ease;
}

.channel-actions button.active {
  background: #1677ff;
  color: #fff;
}

.mixer-master {
  background: rgba(255, 255, 255, 0.55);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 10px 28px rgba(15, 15, 15, 0.1);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mixer-master h2 {
  font-size: 20px;
  font-weight: 600;
}

.summary {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.7);
}

@media (max-width: 960px) {
  .mixer-console {
    padding: 16px;
  }

  .mixer-channels {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
}
</style>
