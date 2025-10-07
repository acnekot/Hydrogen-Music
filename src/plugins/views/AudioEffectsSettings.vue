<template>
  <div class="ae-wrapper">
    <header class="ae-header">
      <h1 class="ae-title">音效增强</h1>
      <p class="ae-description">
        通过 Web Audio 为播放器提供低音、高音与空间混响增强效果。
      </p>
    </header>

    <section class="ae-card" v-if="state.available">
      <div class="ae-row">
        <div class="ae-label">启用音效增强</div>
        <div class="ae-control">
          <button class="ae-toggle" type="button" @click="toggleBypass">
            <span>{{ state.bypass ? '已关闭' : '已开启' }}</span>
          </button>
        </div>
      </div>

      <div class="ae-slider-group" :class="{ 'ae-slider-group--disabled': state.bypass }">
        <div class="ae-row">
          <div class="ae-label">低音增强</div>
          <div class="ae-control">
            <input
              class="ae-slider"
              type="range"
              min="-12"
              max="12"
              step="1"
              :disabled="state.bypass"
              :value="state.bass"
              @input="onBassChange($event.target.value)"
            />
            <span class="ae-value">{{ displayDb(state.bass) }}</span>
          </div>
        </div>

        <div class="ae-row">
          <div class="ae-label">高音增强</div>
          <div class="ae-control">
            <input
              class="ae-slider"
              type="range"
              min="-12"
              max="12"
              step="1"
              :disabled="state.bypass"
              :value="state.treble"
              @input="onTrebleChange($event.target.value)"
            />
            <span class="ae-value">{{ displayDb(state.treble) }}</span>
          </div>
        </div>

        <div class="ae-row">
          <div class="ae-label">空间混响</div>
          <div class="ae-control">
            <input
              class="ae-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              :disabled="state.bypass"
              :value="state.ambience"
              @input="onAmbienceChange($event.target.value)"
            />
            <span class="ae-value">{{ displayPercent(state.ambience) }}</span>
          </div>
        </div>
      </div>

      <div class="ae-actions">
        <button class="ae-reset" type="button" @click="reset">恢复默认</button>
        <span class="ae-hint">默认增强值可提供轻微的现场感。</span>
      </div>
    </section>

    <section class="ae-card ae-card--unavailable" v-else>
      <h2>当前环境暂不支持</h2>
      <p>当前浏览器或运行环境未启用 Web Audio，无法应用音效增强。</p>
    </section>
  </div>
</template>

<script setup>
import {
  audioEffectsState,
  setAudioEffectsAmbience,
  setAudioEffectsBass,
  setAudioEffectsBypass,
  setAudioEffectsTreble,
  resetAudioEffects
} from '../modules/audioEffectsPlugin'

const state = audioEffectsState

const toggleBypass = () => {
  setAudioEffectsBypass(!state.bypass)
}

const onBassChange = (value) => {
  setAudioEffectsBass(Number(value))
}

const onTrebleChange = (value) => {
  setAudioEffectsTreble(Number(value))
}

const onAmbienceChange = (value) => {
  setAudioEffectsAmbience(Number(value))
}

const reset = () => {
  resetAudioEffects()
}

const displayDb = (value) => {
  if (!Number.isFinite(value)) return '0 dB'
  const rounded = Math.round(Number(value))
  return `${rounded > 0 ? '+' : ''}${rounded} dB`
}

const displayPercent = (value) => {
  if (!Number.isFinite(value)) return '0%'
  return `${Math.round(Number(value) * 100)}%`
}
</script>

<style scoped>
.ae-wrapper {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.ae-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ae-title {
  font-size: 24px;
  font-family: SourceHanSansCN-Bold;
  color: #000;
}

.ae-description {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.65);
}

.ae-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.55);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.04);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.ae-card--unavailable {
  align-items: flex-start;
  gap: 12px;
}

.ae-card--unavailable h2 {
  font-size: 18px;
  font-family: SourceHanSansCN-Bold;
  margin: 0;
}

.ae-card--unavailable p {
  margin: 0;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.6;
}

.ae-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.ae-label {
  min-width: 120px;
  font-size: 15px;
  font-family: SourceHanSansCN-Bold;
  color: #000;
}

.ae-control {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: flex-end;
}

.ae-toggle {
  min-width: 120px;
  height: 36px;
  border-radius: 18px;
  border: none;
  background: rgba(0, 0, 0, 0.12);
  color: #000;
  font-size: 14px;
  font-family: SourceHanSansCN-Bold;
  cursor: pointer;
  transition: 0.2s;
}

.ae-toggle:hover {
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
}

.ae-slider-group {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.ae-slider-group--disabled {
  opacity: 0.45;
  pointer-events: none;
}

.ae-slider {
  width: 220px;
}

.ae-value {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  min-width: 56px;
  text-align: right;
}

.ae-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ae-reset {
  height: 36px;
  padding: 0 18px;
  border: none;
  border-radius: 18px;
  background: rgba(0, 0, 0, 0.08);
  color: #000;
  font-size: 13px;
  font-family: SourceHanSansCN-Bold;
  cursor: pointer;
  transition: 0.2s;
}

.ae-reset:hover {
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
  opacity: 0.85;
}

.ae-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.55);
}

@media (max-width: 768px) {
  .ae-wrapper {
    padding: 16px;
  }

  .ae-control {
    justify-content: flex-start;
  }

  .ae-slider {
    width: 160px;
  }
}
</style>
