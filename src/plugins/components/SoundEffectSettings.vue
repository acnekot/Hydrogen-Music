<template>
    <div class="sound-effect-settings">
        <div class="section">
            <h3>播放控制音效</h3>
            <p class="section-desc">在播放、暂停、切歌时播放提示音效。</p>
            <div class="option">
                <div class="option-name">播放/暂停提示音</div>
                <div class="option-operation">
                    <div class="toggle" @click="toggle('playbackCue')">
                        <div class="toggle-off" :class="{ 'toggle-on-in': config.playbackCue }">
                            {{ config.playbackCue ? '已开启' : '已关闭' }}
                        </div>
                        <Transition name="toggle">
                            <div class="toggle-on" v-show="config.playbackCue"></div>
                        </Transition>
                    </div>
                </div>
            </div>
            <div class="option">
                <div class="option-name">切换曲目提示音</div>
                <div class="option-operation">
                    <div class="toggle" @click="toggle('switchCue')">
                        <div class="toggle-off" :class="{ 'toggle-on-in': config.switchCue }">
                            {{ config.switchCue ? '已开启' : '已关闭' }}
                        </div>
                        <Transition name="toggle">
                            <div class="toggle-on" v-show="config.switchCue"></div>
                        </Transition>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h3>音量与效果</h3>
            <div class="option slider">
                <div class="option-name">音量</div>
                <div class="option-operation">
                    <input type="range" min="0" max="100" v-model.number="config.volume" @change="persist" />
                    <span class="slider-value">{{ config.volume }}%</span>
                </div>
            </div>
            <div class="option">
                <div class="option-name">音色</div>
                <div class="option-operation option-operation--selector">
                    <Selector v-model="config.waveform" :options="waveformOptions" @change="persist" />
                </div>
            </div>
            <div class="option">
                <div class="option-name">持续时长</div>
                <div class="option-operation option-operation--selector">
                    <Selector v-model="config.duration" :options="durationOptions" @change="persist" />
                </div>
            </div>
        </div>

        <div class="section section--footer">
            <button class="btn" @click="preview">试听当前音效</button>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import Selector from '../../components/Selector.vue';
import { usePluginStore } from '../../store/pluginStore';

const props = defineProps({
    pluginId: {
        type: String,
        required: true,
    },
});

const pluginStore = usePluginStore();

const waveformOptions = [
    { label: '正弦波', value: 'sine' },
    { label: '方波', value: 'square' },
    { label: '三角波', value: 'triangle' },
    { label: '锯齿波', value: 'sawtooth' },
];

const durationOptions = [
    { label: '快速 (80ms)', value: 0.08 },
    { label: '标准 (140ms)', value: 0.14 },
    { label: '悠长 (240ms)', value: 0.24 },
];

const config = computed({
    get() {
        let value = pluginStore.pluginConfig(props.pluginId);
        if (!value) {
            value = {
                playbackCue: true,
                switchCue: true,
                volume: 60,
                waveform: 'sine',
                duration: 0.14,
            };
            pluginStore.replacePluginConfig(props.pluginId, value);
            return pluginStore.pluginConfig(props.pluginId) || value;
        }
        return value;
    },
    set(value) {
        pluginStore.replacePluginConfig(props.pluginId, value);
    },
});

const persist = () => {
    pluginStore.replacePluginConfig(props.pluginId, { ...config.value });
};

const toggle = (key) => {
    pluginStore.mergePluginConfig(props.pluginId, { [key]: !config.value[key] });
};

const preview = () => {
    if (typeof window !== 'undefined') {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = config.value.waveform;
        osc.frequency.value = 660;
        gain.gain.value = (config.value.volume || 0) / 100 * 0.2;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + (config.value.duration || 0.14));
        osc.onended = () => ctx.close();
    }
};
</script>

<style scoped lang="scss">
.sound-effect-settings {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.section {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 18px 20px;
}

.section h3 {
    margin: 0 0 12px;
    font-size: 16px;
    font-weight: 600;
}

.section-desc {
    margin-top: -4px;
    margin-bottom: 16px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.65);
}

.option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.option:last-child {
    border-bottom: none;
}

.option-name {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.85);
}

.option-operation {
    display: flex;
    align-items: center;
    gap: 12px;
}

.option-operation--selector {
    width: 210px;
    justify-content: flex-end;
}

.toggle {
    position: relative;
    width: 86px;
    height: 28px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    padding: 0 6px;
    cursor: pointer;
    user-select: none;
}

.toggle-off {
    flex: 1;
    text-align: center;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.65);
    transition: color 0.2s ease;
}

.toggle-on-in {
    color: #0ad5ff;
}

.toggle-on {
    position: absolute;
    left: 4px;
    top: 4px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, #4ad5ff, #1a7bff);
}

.slider input[type='range'] {
    width: 180px;
}

.slider-value {
    min-width: 48px;
    text-align: right;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.75);
}

.section--footer {
    display: flex;
    justify-content: flex-end;
}

.btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.85);
    border-radius: 6px;
    padding: 6px 16px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn:hover {
    border-color: #4ad5ff;
    color: #4ad5ff;
}
</style>
