<template>
  <div class="plugin-settings-page">
    <header class="plugin-settings-header">
      <button class="back-button" type="button" @click="goBack">
        <span>返回</span>
      </button>
      <div class="header-meta">
        <h1>音效增强</h1>
        <p>通过提升低频、高频、存在感与空间混响，为播放带来更具层次感的声音表现。</p>
      </div>
    </header>

    <section class="plugin-card" v-if="state.available">
      <div class="plugin-option">
        <div class="plugin-option-name">启用音效增强</div>
        <div class="plugin-option-control">
          <button class="button button--toggle" type="button" @click="toggleBypass">
            {{ state.bypass ? '已关闭' : '已开启' }}
          </button>
        </div>
      </div>

      <div class="plugin-divider"></div>

      <div class="plugin-option-list" :class="{ 'is-disabled': state.bypass }">
        <div class="plugin-option">
          <div class="plugin-option-name">低音增强</div>
          <div class="plugin-option-control">
            <input
              class="slider"
              type="range"
              min="-12"
              max="12"
              step="1"
              :value="state.bass"
              @input="onBassChange($event.target.value)"
            />
            <span class="option-value">{{ displayDb(state.bass) }}</span>
          </div>
        </div>

        <div class="plugin-option">
          <div class="plugin-option-name">存在感增强</div>
          <div class="plugin-option-control">
            <input
              class="slider"
              type="range"
              min="-12"
              max="12"
              step="1"
              :value="state.presence"
              @input="onPresenceChange($event.target.value)"
            />
            <span class="option-value">{{ displayDb(state.presence) }}</span>
          </div>
        </div>

        <div class="plugin-option">
          <div class="plugin-option-name">高音增强</div>
          <div class="plugin-option-control">
            <input
              class="slider"
              type="range"
              min="-12"
              max="12"
              step="1"
              :value="state.treble"
              @input="onTrebleChange($event.target.value)"
            />
            <span class="option-value">{{ displayDb(state.treble) }}</span>
          </div>
        </div>

        <div class="plugin-option">
          <div class="plugin-option-name">立体声宽度</div>
          <div class="plugin-option-control">
            <input
              class="slider"
              type="range"
              min="0"
              max="2"
              step="0.05"
              :value="state.stereoWidth"
              @input="onWidthChange($event.target.value)"
            />
            <span class="option-value">{{ displayWidth(state.stereoWidth) }}</span>
          </div>
        </div>

        <div class="plugin-option">
          <div class="plugin-option-name">空间混响</div>
          <div class="plugin-option-control">
            <input
              class="slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              :value="state.ambience"
              @input="onAmbienceChange($event.target.value)"
            />
            <span class="option-value">{{ displayPercent(state.ambience) }}</span>
          </div>
        </div>

        <div class="plugin-option">
          <div class="plugin-option-name">输出增益</div>
          <div class="plugin-option-control">
            <input
              class="slider"
              type="range"
              min="-12"
              max="6"
              step="0.5"
              :value="state.outputGain"
              @input="onOutputGainChange($event.target.value)"
            />
            <span class="option-value">{{ displayDb(state.outputGain) }}</span>
          </div>
        </div>
      </div>

      <div class="plugin-divider"></div>

      <div class="reset-row">
        <button class="button" type="button" @click="reset">恢复默认</button>
        <span class="hint">默认设置提供轻微的现场感，可在此基础上微调至喜好的音色。</span>
      </div>
    </section>

    <section class="plugin-card plugin-card--unavailable" v-else>
      <h2>当前环境暂不支持</h2>
      <p>检测到当前浏览器或运行环境未启用 Web Audio，暂无法使用音效增强功能。</p>
    </section>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import {
  audioEffectsState,
  resetAudioEffects,
  setAudioEffectsAmbience,
  setAudioEffectsBass,
  setAudioEffectsBypass,
  setAudioEffectsOutputGain,
  setAudioEffectsPresence,
  setAudioEffectsStereoWidth,
  setAudioEffectsTreble
} from '../modules/audioEffectsPlugin'

const state = audioEffectsState
const router = useRouter()

const goBack = () => {
  router.push('/settings')
}

const toggleBypass = () => {
  setAudioEffectsBypass(!state.bypass)
}

const onBassChange = (value) => {
  setAudioEffectsBass(Number(value))
}

const onPresenceChange = (value) => {
  setAudioEffectsPresence(Number(value))
}

const onTrebleChange = (value) => {
  setAudioEffectsTreble(Number(value))
}

const onWidthChange = (value) => {
  setAudioEffectsStereoWidth(Number(value))
}

const onAmbienceChange = (value) => {
  setAudioEffectsAmbience(Number(value))
}

const onOutputGainChange = (value) => {
  setAudioEffectsOutputGain(Number(value))
}

const reset = () => {
  resetAudioEffects()
}

const displayDb = (value) => {
  if (!Number.isFinite(Number(value))) return '0 dB'
  const numeric = Math.round(Number(value) * 10) / 10
  const prefix = numeric > 0 ? '+' : ''
  return `${prefix}${numeric} dB`
}

const displayPercent = (value) => {
  if (!Number.isFinite(Number(value))) return '0%'
  return `${Math.round(Number(value) * 100)}%`
}

const displayWidth = (value) => {
  if (!Number.isFinite(Number(value))) return '100%'
  return `${Math.round(Number(value) * 100)}%`
}
</script>

<style scoped>
.plugin-settings-page {
  padding: 32px 28px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: #000;
}

.plugin-settings-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.back-button {
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

.back-button:hover {
  opacity: 0.85;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
}

.header-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header-meta h1 {
  margin: 0;
  font-size: 28px;
  font-family: SourceHanSansCN-Bold;
}

.header-meta p {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: rgba(0, 0, 0, 0.65);
}

.plugin-card {
  background: rgba(255, 255, 255, 0.6);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.04);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.plugin-option-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.plugin-option {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.plugin-option-name {
  font-size: 16px;
  font-family: SourceHanSansCN-Bold;
  min-width: 140px;
}

.plugin-option-control {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: flex-end;
}

.slider {
  width: 260px;
}

.option-value {
  min-width: 68px;
  text-align: right;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.6);
}

.button {
  border: none;
  background: rgba(0, 0, 0, 0.08);
  color: #000;
  font-family: SourceHanSansCN-Bold;
  font-size: 14px;
  padding: 8px 20px;
  border-radius: 999px;
  cursor: pointer;
  transition: 0.2s;
}

.button:hover {
  opacity: 0.85;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
}

.button--toggle {
  min-width: 148px;
}

.plugin-divider {
  height: 1px;
  width: 100%;
  background: rgba(0, 0, 0, 0.08);
}

.reset-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.55);
}

.plugin-card--unavailable {
  align-items: flex-start;
  gap: 12px;
}

.plugin-card--unavailable h2 {
  margin: 0;
  font-size: 18px;
  font-family: SourceHanSansCN-Bold;
}

.plugin-card--unavailable p {
  margin: 0;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.6;
}

.is-disabled {
  opacity: 0.45;
  pointer-events: none;
}

@media (max-width: 768px) {
  .plugin-settings-page {
    padding: 24px 16px;
  }

  .plugin-option-control {
    justify-content: flex-start;
  }

  .slider {
    width: 200px;
  }
}
</style>
