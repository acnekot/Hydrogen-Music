<template>
    <div class="plugin-lyric-visualizer">
        <div class="section">
            <h3>歌词可视化</h3>
            <p class="section-desc">在歌词区域展示动态频谱或辐射波形。</p>
            <div class="option">
                <div class="option-name">启用歌词可视化</div>
                <div class="option-operation">
                    <div class="toggle" @click="toggleVisualizer">
                        <div class="toggle-off" :class="{ 'toggle-on-in': playerStore.lyricVisualizer }">
                            {{ playerStore.lyricVisualizer ? '已开启' : '已关闭' }}
                        </div>
                        <Transition name="toggle">
                            <div class="toggle-on" v-show="playerStore.lyricVisualizer"></div>
                        </Transition>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="playerStore.lyricVisualizer" class="section">
            <h3>显示样式</h3>
            <div class="option">
                <div class="option-name">样式</div>
                <div class="option-operation option-operation--selector">
                    <Selector v-model="playerStore.lyricVisualizerStyle" :options="styleOptions" />
                </div>
            </div>
            <div class="option">
                <div class="option-name">主颜色</div>
                <div class="option-operation option-operation--selector">
                    <Selector v-model="playerStore.lyricVisualizerColor" :options="colorOptions" />
                </div>
            </div>
            <div class="option">
                <div class="option-name">透明度</div>
                <div class="option-operation option-operation--selector">
                    <Selector v-model="playerStore.lyricVisualizerOpacity" :options="opacityOptions" />
                </div>
            </div>
            <div class="option">
                <div class="option-name">过渡延迟</div>
                <div class="option-operation option-operation--selector">
                    <Selector v-model="playerStore.lyricVisualizerTransitionDelay" :options="transitionDelayOptions" />
                </div>
            </div>
        </div>

        <div v-if="playerStore.lyricVisualizer" class="section">
            <h3>频谱参数</h3>
            <div class="option">
                <div class="option-name">可视化高度</div>
                <div class="option-operation option-operation--selector">
                    <Selector v-model="playerStore.lyricVisualizerHeight" :options="heightOptions" />
                </div>
            </div>
            <div class="option">
                <div class="option-name">最低频率</div>
                <div class="option-operation option-operation--selector">
                    <Selector v-model="playerStore.lyricVisualizerFrequencyMin" :options="frequencyMinOptions" />
                </div>
            </div>
            <div class="option">
                <div class="option-name">最高频率</div>
                <div class="option-operation option-operation--selector">
                    <Selector v-model="playerStore.lyricVisualizerFrequencyMax" :options="frequencyMaxOptions" />
                </div>
            </div>
            <div class="option">
                <div class="option-name">柱体数量</div>
                <div class="option-operation option-operation--selector">
                    <Selector v-model="playerStore.lyricVisualizerBarCount" :options="barCountOptions" />
                </div>
            </div>
            <div class="option">
                <div class="option-name">柱体宽度</div>
                <div class="option-operation option-operation--selector">
                    <Selector v-model="playerStore.lyricVisualizerBarWidth" :options="barWidthOptions" />
                </div>
            </div>
        </div>

        <div v-if="playerStore.lyricVisualizer && playerStore.lyricVisualizerStyle === 'radial'" class="section">
            <h3>辐射样式</h3>
            <div class="option">
                <div class="option-name">尺寸</div>
                <div class="option-operation option-operation--selector">
                    <Selector v-model="playerStore.lyricVisualizerRadialSize" :options="radialSizeOptions" />
                </div>
            </div>
            <div class="option">
                <div class="option-name">X 轴偏移</div>
                <div class="option-operation option-operation--selector">
                    <Selector v-model="playerStore.lyricVisualizerRadialOffsetX" :options="radialOffsetOptions" />
                </div>
            </div>
            <div class="option">
                <div class="option-name">Y 轴偏移</div>
                <div class="option-operation option-operation--selector">
                    <Selector v-model="playerStore.lyricVisualizerRadialOffsetY" :options="radialOffsetOptions" />
                </div>
            </div>
            <div class="option">
                <div class="option-name">中心圆比例</div>
                <div class="option-operation option-operation--selector">
                    <Selector v-model="playerStore.lyricVisualizerRadialCoreSize" :options="radialCoreSizeOptions" />
                </div>
            </div>
        </div>

        <div v-if="playerStore.lyricVisualizer" class="section section--footer">
            <div class="reset" @click="resetVisualizer">恢复默认设置</div>
        </div>
    </div>
</template>

<script setup>
import { watch } from 'vue';
import Selector from '../../components/Selector.vue';
import { usePlayerStore } from '../../store/playerStore';
import { dialogOpen, noticeOpen } from '../../utils/dialog';

defineProps({
    pluginId: {
        type: String,
        required: false,
    },
});

const playerStore = usePlayerStore();

const defaults = Object.freeze({
    height: 220,
    frequencyMin: 20,
    frequencyMax: 8000,
    transitionDelay: 0.75,
    barCount: 48,
    barWidth: 55,
    color: 'black',
    opacity: 100,
    style: 'bars',
    radialSize: 100,
    radialOffsetX: 0,
    radialOffsetY: 0,
    radialCoreSize: 62,
});

const styleOptions = [
    { label: '频谱柱', value: 'bars' },
    { label: '辐射波', value: 'radial' },
];

const colorOptions = [
    { label: '暗色', value: 'black' },
    { label: '亮色', value: 'white' },
    { label: '主题色', value: '#ff5f5f' },
    { label: '星空蓝', value: '#3e5df5' },
];

const opacityOptions = [20, 40, 60, 80, 100].map(value => ({ label: `${value}%`, value }));
const transitionDelayOptions = [0, 0.25, 0.5, 0.75, 0.9].map(value => ({ label: `${value}s`, value }));
const heightOptions = [160, 180, 200, 220, 260, 320].map(value => ({ label: `${value}px`, value }));
const frequencyMinOptions = [20, 40, 80, 120, 200].map(value => ({ label: `${value}Hz`, value }));
const frequencyMaxOptions = [4000, 6000, 8000, 12000, 16000].map(value => ({ label: `${value}Hz`, value }));
const barCountOptions = [24, 32, 48, 64, 96].map(value => ({ label: `${value} 个`, value }));
const barWidthOptions = [35, 45, 55, 65, 75].map(value => ({ label: `${value}%`, value }));
const radialSizeOptions = [60, 80, 100, 120, 160].map(value => ({ label: `${value}%`, value }));
const radialOffsetOptions = [-50, -25, 0, 25, 50].map(value => ({ label: `${value}%`, value }));
const radialCoreSizeOptions = [40, 52, 62, 72, 84].map(value => ({ label: `${value}%`, value }));

const clamp = (value, min, max, fallback) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    if (numeric < min) return min;
    if (numeric > max) return max;
    return numeric;
};

watch(
    () => playerStore.lyricVisualizerFrequencyMin,
    value => {
        const min = clamp(value, 20, 20000, defaults.frequencyMin);
        if (min !== playerStore.lyricVisualizerFrequencyMin) {
            playerStore.lyricVisualizerFrequencyMin = min;
        }
        if (min >= playerStore.lyricVisualizerFrequencyMax) {
            playerStore.lyricVisualizerFrequencyMax = Math.min(20000, min + 2000);
        }
    }
);

watch(
    () => playerStore.lyricVisualizerFrequencyMax,
    value => {
        const max = clamp(value, 20, 20000, defaults.frequencyMax);
        if (max !== playerStore.lyricVisualizerFrequencyMax) {
            playerStore.lyricVisualizerFrequencyMax = max;
        }
        if (max <= playerStore.lyricVisualizerFrequencyMin) {
            playerStore.lyricVisualizerFrequencyMin = Math.max(20, max - 2000);
        }
    }
);

watch(
    () => playerStore.lyricVisualizerTransitionDelay,
    value => {
        const safe = Math.round(clamp(value, 0, 0.95, defaults.transitionDelay) * 100) / 100;
        if (safe !== playerStore.lyricVisualizerTransitionDelay) {
            playerStore.lyricVisualizerTransitionDelay = safe;
        }
    }
);

watch(
    () => playerStore.lyricVisualizerOpacity,
    value => {
        const safe = clamp(value, 0, 100, defaults.opacity);
        if (safe !== playerStore.lyricVisualizerOpacity) {
            playerStore.lyricVisualizerOpacity = safe;
        }
    }
);

watch(
    () => playerStore.lyricVisualizerStyle,
    value => {
        if (value !== 'bars' && value !== 'radial') {
            playerStore.lyricVisualizerStyle = defaults.style;
        }
    }
);

const toggleVisualizer = () => {
    if (playerStore.lyricVisualizer) {
        playerStore.lyricVisualizer = false;
        return;
    }
    dialogOpen('确定开启', '开启后此功能会消耗一定性能且可能造成卡顿，确定开启吗？', confirm => {
        if (confirm) {
            playerStore.lyricVisualizer = true;
        }
    });
};

const resetVisualizer = () => {
    playerStore.lyricVisualizerHeight = defaults.height;
    playerStore.lyricVisualizerFrequencyMin = defaults.frequencyMin;
    playerStore.lyricVisualizerFrequencyMax = defaults.frequencyMax;
    playerStore.lyricVisualizerTransitionDelay = defaults.transitionDelay;
    playerStore.lyricVisualizerBarCount = defaults.barCount;
    playerStore.lyricVisualizerBarWidth = defaults.barWidth;
    playerStore.lyricVisualizerColor = defaults.color;
    playerStore.lyricVisualizerOpacity = defaults.opacity;
    playerStore.lyricVisualizerStyle = defaults.style;
    playerStore.lyricVisualizerRadialSize = defaults.radialSize;
    playerStore.lyricVisualizerRadialOffsetX = defaults.radialOffsetX;
    playerStore.lyricVisualizerRadialOffsetY = defaults.radialOffsetY;
    playerStore.lyricVisualizerRadialCoreSize = defaults.radialCoreSize;
    noticeOpen('已恢复默认设置', 2);
};
</script>

<style scoped lang="scss">
.plugin-lyric-visualizer {
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

.section--footer {
    display: flex;
    justify-content: flex-end;
}

.reset {
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

.reset:hover {
    opacity: 0.8;
    box-shadow: 0 0 0 1px black;
}
</style>
