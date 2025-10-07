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
            <div class="btn" @click="preview">试听当前音效</div>
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
        window.windowApi?.playEffect?.({
            waveform: config.value.waveform,
            duration: config.value.duration,
            volume: config.value.volume / 100,
        });
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
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 16px 0;
}

.section h3 {
    margin: 0;
    font-family: SourceHanSansCN-Bold;
    font-size: 18px;
    color: black;
}

.section-desc {
    margin: 0;
    font: 13px SourceHanSansCN-Bold;
    color: rgba(0, 0, 0, 0.65);
}

.option {
    margin-bottom: 24px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
}

.option:last-child {
    margin-bottom: 0;
}

.option-name {
    font-family: SourceHanSansCN-Bold;
    font-size: 16px;
    color: black;
}

.option-operation {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12px;
}

.option-operation--selector {
    width: 200px;
    justify-content: flex-end;
}

.toggle {
    margin-right: 1px;
    height: 34px;
    width: 200px;
    position: relative;
    overflow: hidden;
    background-color: transparent;
    cursor: pointer;
}

.toggle-on,
.toggle-off {
    padding: 5px 10px;
    width: 100%;
    height: 100%;
    font: 13px SourceHanSansCN-Bold;
    transition: 0.2s;
    line-height: 24px;
}

.toggle-off {
    background-color: rgba(255, 255, 255, 0.35);
    color: black;
}

.toggle-on {
    background-color: black;
    position: absolute;
    top: 0;
    left: 0;
    z-index: -1;
}

.toggle-on-in {
    color: white;
    background-color: transparent;
}

.slider {
    align-items: flex-start;
}

.slider input {
    width: 200px;
}

.slider-value {
    font: 13px SourceHanSansCN-Bold;
    color: rgba(0, 0, 0, 0.6);
}

.section--footer {
    display: flex;
    justify-content: flex-end;
}

.btn {
    padding: 5px 12px;
    font: 13px SourceHanSansCN-Bold;
    color: black;
    background-color: rgba(255, 255, 255, 0.35);
    transition: 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 34px;
    box-sizing: border-box;
    cursor: pointer;
}

.btn:hover {
    opacity: 0.8;
    box-shadow: 0 0 0 1px black;
}
</style>
