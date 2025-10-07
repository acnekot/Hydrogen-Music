<template>
    <div class="seamless-settings">
        <div class="section">
            <h3>无缝衔接</h3>
            <p class="section-desc">在歌曲切换时自动淡入淡出，减少突兀的停顿。</p>
            <div class="option">
                <div class="option-name">启用无缝衔接</div>
                <div class="option-operation">
                    <div class="toggle" @click="toggle('enabled')">
                        <div class="toggle-off" :class="{ 'toggle-on-in': config.enabled }">
                            {{ config.enabled ? '已开启' : '已关闭' }}
                        </div>
                        <Transition name="toggle">
                            <div class="toggle-on" v-show="config.enabled"></div>
                        </Transition>
                    </div>
                </div>
            </div>
            <div class="option">
                <div class="option-name">提前预加载下一首</div>
                <div class="option-operation">
                    <div class="toggle" @click="toggle('preloadNext')">
                        <div class="toggle-off" :class="{ 'toggle-on-in': config.preloadNext }">
                            {{ config.preloadNext ? '已开启' : '已关闭' }}
                        </div>
                        <Transition name="toggle">
                            <div class="toggle-on" v-show="config.preloadNext"></div>
                        </Transition>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="config.enabled" class="section">
            <h3>淡入淡出参数</h3>
            <div class="option slider">
                <div class="option-name">淡出时长</div>
                <div class="option-operation">
                    <input type="range" min="0" max="8000" step="100" v-model.number="config.fadeOut" @change="persist" />
                    <span class="slider-value">{{ (config.fadeOut / 1000).toFixed(2) }} s</span>
                </div>
            </div>
            <div class="option slider">
                <div class="option-name">淡入时长</div>
                <div class="option-operation">
                    <input type="range" min="0" max="8000" step="100" v-model.number="config.fadeIn" @change="persist" />
                    <span class="slider-value">{{ (config.fadeIn / 1000).toFixed(2) }} s</span>
                </div>
            </div>
            <div class="option">
                <div class="option-name">淡入曲线</div>
                <div class="option-operation option-operation--selector">
                    <Selector v-model="config.fadeCurve" :options="fadeCurveOptions" @change="persist" />
                </div>
            </div>
        </div>

        <div class="section section--footer">
            <p class="tips">提示：过长的淡入淡出会影响播放模式切换速度，建议保持在 0.8 秒以内。</p>
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

const fadeCurveOptions = [
    { label: '线性', value: 'linear' },
    { label: '平滑 (S 曲线)', value: 'sCurve' },
    { label: '指数', value: 'exponential' },
];

const config = computed({
    get() {
        let value = pluginStore.pluginConfig(props.pluginId);
        if (!value) {
            value = {
                enabled: true,
                preloadNext: true,
                fadeIn: 800,
                fadeOut: 800,
                fadeCurve: 'sCurve',
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
</script>

<style scoped lang="scss">
.seamless-settings {
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
    padding-top: 8px;
}

.tips {
    margin: 0;
    font: 12px SourceHanSansCN-Bold;
    color: rgba(0, 0, 0, 0.6);
}
</style>
