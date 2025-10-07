<template>
    <div class="lyric-visualizer-settings">
        <h2 class="title">歌词可视化</h2>
        <p class="description">
            通过频谱与辐射两种模式，让歌词面板呈现音乐动态。所有参数均实时作用于正在播放的歌曲。
        </p>

        <section class="section">
            <label class="toggle">
                <input type="checkbox" v-model="playerStore.lyricVisualizer" />
                <span>启用歌词可视化</span>
            </label>
            <label class="toggle">
                <input type="checkbox" v-model="autoEnable" @change="persistPluginSetting('autoEnable', autoEnable)" />
                <span>插件加载时自动开启</span>
            </label>
            <label class="toggle">
                <input
                    type="checkbox"
                    v-model="disableOnUnload"
                    @change="persistPluginSetting('disableOnUnload', disableOnUnload)"
                />
                <span>禁用插件时关闭歌词可视化</span>
            </label>
        </section>

        <section class="section" :class="{ disabled: !playerStore.lyricVisualizer }">
            <div class="option">
                <span class="label">样式</span>
                <select v-model="playerStore.lyricVisualizerStyle">
                    <option value="bars">频谱柱状</option>
                    <option value="radial">光晕辐射</option>
                </select>
            </div>
            <div class="option">
                <span class="label">高度 (px)</span>
                <input type="number" v-model.number="playerStore.lyricVisualizerHeight" min="120" max="420" />
            </div>
            <div class="option">
                <span class="label">柱体数量</span>
                <input type="number" v-model.number="playerStore.lyricVisualizerBarCount" min="8" max="128" />
            </div>
            <div class="option">
                <span class="label">柱体宽度 %</span>
                <input type="number" v-model.number="playerStore.lyricVisualizerBarWidth" min="10" max="90" />
            </div>
            <div class="option">
                <span class="label">透明度 %</span>
                <input type="number" v-model.number="playerStore.lyricVisualizerOpacity" min="10" max="100" />
            </div>
            <div class="option">
                <span class="label">主色调</span>
                <select v-model="playerStore.lyricVisualizerColor">
                    <option value="black">黑色</option>
                    <option value="white">白色</option>
                    <option value="#00e0ff">蓝青</option>
                    <option value="#f760ff">粉紫</option>
                    <option value="#ffaa33">暖橙</option>
                </select>
            </div>
            <transition name="fade">
                <div v-if="playerStore.lyricVisualizerStyle === 'radial'" class="radial-grid">
                    <div class="option">
                        <span class="label">辐射尺寸 %</span>
                        <input type="number" v-model.number="playerStore.lyricVisualizerRadialSize" min="10" max="300" />
                    </div>
                    <div class="option">
                        <span class="label">中心圆 %</span>
                        <input type="number" v-model.number="playerStore.lyricVisualizerRadialCoreSize" min="10" max="90" />
                    </div>
                    <div class="option">
                        <span class="label">横向偏移 %</span>
                        <input type="number" v-model.number="playerStore.lyricVisualizerRadialOffsetX" min="-100" max="100" />
                    </div>
                    <div class="option">
                        <span class="label">纵向偏移 %</span>
                        <input type="number" v-model.number="playerStore.lyricVisualizerRadialOffsetY" min="-100" max="100" />
                    </div>
                </div>
            </transition>
            <button class="reset" type="button" @click="resetVisualizer" :disabled="!playerStore.lyricVisualizer">
                恢复默认参数
            </button>
        </section>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { usePluginStore } from '@/store/pluginStore';
import { usePlayerStore } from '@/store/playerStore';

const props = defineProps({
    plugin: {
        type: Object,
        default: () => ({}),
    },
    pluginSettings: {
        type: Object,
        default: () => ({}),
    },
});

const pluginStore = usePluginStore();
const playerStore = usePlayerStore();

const defaults = Object.freeze({
    style: 'bars',
    height: 220,
    barCount: 48,
    barWidth: 55,
    opacity: 100,
    color: 'black',
    radialSize: 100,
    radialCoreSize: 62,
    radialOffsetX: 0,
    radialOffsetY: 0,
});

const autoEnable = ref(true);
const disableOnUnload = ref(false);

watch(
    () => props.pluginSettings,
    (value) => {
        autoEnable.value = value?.autoEnable ?? true;
        disableOnUnload.value = !!value?.disableOnUnload;
    },
    { immediate: true }
);

const persistPluginSetting = (key, value) => {
    const settings = { ...(props.pluginSettings || {}), [key]: value };
    pluginStore.setPluginSettings(props.plugin.id, settings);
    windowApi.plugins.updateData(props.plugin.id, settings);
};

const resetVisualizer = () => {
    playerStore.lyricVisualizerStyle = defaults.style;
    playerStore.lyricVisualizerHeight = defaults.height;
    playerStore.lyricVisualizerBarCount = defaults.barCount;
    playerStore.lyricVisualizerBarWidth = defaults.barWidth;
    playerStore.lyricVisualizerOpacity = defaults.opacity;
    playerStore.lyricVisualizerColor = defaults.color;
    playerStore.lyricVisualizerRadialSize = defaults.radialSize;
    playerStore.lyricVisualizerRadialCoreSize = defaults.radialCoreSize;
    playerStore.lyricVisualizerRadialOffsetX = defaults.radialOffsetX;
    playerStore.lyricVisualizerRadialOffsetY = defaults.radialOffsetY;
};
</script>

<style scoped lang="scss">
.lyric-visualizer-settings {
    display: flex;
    flex-direction: column;
    gap: 20px;
    .title {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
    }
    .description {
        margin: 0;
        color: rgba(0, 0, 0, 0.55);
        font-size: 14px;
        line-height: 1.6;
    }
    .section {
        padding: 16px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.65);
        box-shadow: 0 10px 30px rgba(15, 63, 118, 0.05);
        display: grid;
        gap: 16px;
        &.disabled {
            opacity: 0.5;
            pointer-events: none;
        }
    }
    .toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        input {
            width: 16px;
            height: 16px;
        }
    }
    .option {
        display: grid;
        grid-template-columns: 140px 1fr;
        align-items: center;
        gap: 12px;
        .label {
            font-size: 13px;
            color: rgba(0, 0, 0, 0.65);
        }
        input,
        select {
            padding: 6px 10px;
            border-radius: 6px;
            border: 1px solid rgba(0, 0, 0, 0.15);
            font-size: 14px;
        }
    }
    .radial-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
    }
    .reset {
        justify-self: flex-start;
        border: none;
        background: linear-gradient(135deg, #fea27b, #f65aad);
        color: #fff;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        &:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 6px 14px rgba(246, 90, 173, 0.18);
        }
        &:disabled {
            background: #d8d8d8;
            color: rgba(0, 0, 0, 0.4);
            cursor: not-allowed;
        }
    }
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
