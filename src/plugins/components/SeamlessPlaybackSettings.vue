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
    width: 210px;
}

.slider-value {
    min-width: 60px;
    text-align: right;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.75);
}

.section--footer {
    display: flex;
    justify-content: flex-start;
}

.tips {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.65);
    margin: 0;
}
</style>
