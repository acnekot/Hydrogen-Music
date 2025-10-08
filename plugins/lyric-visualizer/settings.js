import { defineComponent, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { usePlayerStore } from '../../src/store/playerStore.js';
import { dialogOpen } from '../../src/utils/dialog.js';

const clampNumber = (value, min, max, fallback) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(Math.max(numeric, min), max);
};

export default defineComponent({
    name: 'LyricVisualizerSettingsPanel',
    setup() {
        const playerStore = usePlayerStore();
        const {
            lyricVisualizer,
            lyricVisualizerStyle,
            lyricVisualizerHeight,
            lyricVisualizerBarCount,
            lyricVisualizerBarWidth,
            lyricVisualizerFrequencyMin,
            lyricVisualizerFrequencyMax,
            lyricVisualizerOpacity,
            lyricVisualizerTransitionDelay,
            lyricVisualizerColor,
            lyricVisualizerRadialSize,
            lyricVisualizerRadialOffsetX,
            lyricVisualizerRadialOffsetY,
            lyricVisualizerRadialCoreSize,
        } = storeToRefs(playerStore);

        const styleOptions = [
            { label: '柱状', value: 'bars' },
            { label: '环形', value: 'radial' },
        ];

        const toggleVisualizer = () => {
            if (!lyricVisualizer.value) {
                dialogOpen('确定开启', '开启后此功能会消耗一定性能且可能造成卡顿，确定开启吗？', (flag) => {
                    if (flag) lyricVisualizer.value = true;
                });
            } else {
                lyricVisualizer.value = false;
            }
        };

        const isRadial = computed(() => lyricVisualizerStyle.value === 'radial');

        watch(
            lyricVisualizerHeight,
            value => {
                lyricVisualizerHeight.value = clampNumber(value, 80, 720, 220);
            },
            { immediate: true }
        );

        watch(
            lyricVisualizerBarCount,
            value => {
                lyricVisualizerBarCount.value = Math.round(clampNumber(value, 8, 160, 48));
            },
            { immediate: true }
        );

        watch(
            lyricVisualizerBarWidth,
            value => {
                lyricVisualizerBarWidth.value = clampNumber(value, 10, 100, 55);
            },
            { immediate: true }
        );

        watch(
            lyricVisualizerOpacity,
            value => {
                lyricVisualizerOpacity.value = Math.round(clampNumber(value, 0, 100, 100));
            },
            { immediate: true }
        );

        watch(
            lyricVisualizerTransitionDelay,
            value => {
                lyricVisualizerTransitionDelay.value = Math.round(clampNumber(value, 0, 0.95, 0.75) * 100) / 100;
            },
            { immediate: true }
        );

        watch(
            lyricVisualizerRadialSize,
            value => {
                lyricVisualizerRadialSize.value = Math.round(clampNumber(value, 10, 400, 100));
            },
            { immediate: true }
        );

        watch(
            lyricVisualizerRadialOffsetX,
            value => {
                lyricVisualizerRadialOffsetX.value = Math.round(clampNumber(value, -200, 200, 0));
            },
            { immediate: true }
        );

        watch(
            lyricVisualizerRadialOffsetY,
            value => {
                lyricVisualizerRadialOffsetY.value = Math.round(clampNumber(value, -200, 200, 0));
            },
            { immediate: true }
        );

        watch(
            lyricVisualizerRadialCoreSize,
            value => {
                lyricVisualizerRadialCoreSize.value = Math.round(clampNumber(value, 10, 95, 62));
            },
            { immediate: true }
        );

        watch(
            [lyricVisualizerFrequencyMin, lyricVisualizerFrequencyMax],
            ([minValue, maxValue]) => {
                let min = clampNumber(minValue, 20, 20000, 20);
                let max = clampNumber(maxValue, 20, 20000, 8000);
                if (min >= max) {
                    max = Math.min(20000, min + 10);
                }
                if (max - min < 10) {
                    min = Math.max(20, max - 10);
                }
                lyricVisualizerFrequencyMin.value = min;
                lyricVisualizerFrequencyMax.value = max;
            },
            { immediate: true }
        );

        return {
            lyricVisualizer,
            lyricVisualizerStyle,
            lyricVisualizerHeight,
            lyricVisualizerBarCount,
            lyricVisualizerBarWidth,
            lyricVisualizerFrequencyMin,
            lyricVisualizerFrequencyMax,
            lyricVisualizerOpacity,
            lyricVisualizerTransitionDelay,
            lyricVisualizerColor,
            lyricVisualizerRadialSize,
            lyricVisualizerRadialOffsetX,
            lyricVisualizerRadialOffsetY,
            lyricVisualizerRadialCoreSize,
            styleOptions,
            isRadial,
            toggleVisualizer,
        };
    },
    template: `
        <div class="plugin-settings-sections">
            <div class="option">
                <div class="option-name">开启歌词音频可视化</div>
                <div class="option-operation option-operation--actions">
                    <div class="toggle" @click="toggleVisualizer">
                        <div class="toggle-off" :class="{ 'toggle-on-in': lyricVisualizer }">{{ lyricVisualizer ? '已开启' : '已关闭' }}</div>
                        <Transition name="toggle">
                            <div class="toggle-on" v-show="lyricVisualizer"></div>
                        </Transition>
                    </div>
                </div>
            </div>
            <template v-if="lyricVisualizer">
                <div class="option option--list">
                    <div class="option-name">基础设置</div>
                    <div class="option-operation option-operation--block">
                        <label class="option-field">
                            <span>可视化样式</span>
                            <select v-model="lyricVisualizerStyle">
                                <option v-for="item in styleOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
                            </select>
                        </label>
                        <label class="option-field">
                            <span>可视化高度 (px)</span>
                            <input type="number" min="80" max="720" v-model.number="lyricVisualizerHeight" />
                        </label>
                        <label class="option-field">
                            <span>柱体数量</span>
                            <input type="number" min="8" max="160" v-model.number="lyricVisualizerBarCount" />
                        </label>
                        <label class="option-field">
                            <span>柱体宽度 (%)</span>
                            <input type="number" min="10" max="100" v-model.number="lyricVisualizerBarWidth" />
                        </label>
                        <label class="option-field">
                            <span>最低频率 (Hz)</span>
                            <input type="number" min="20" max="20000" v-model.number="lyricVisualizerFrequencyMin" />
                        </label>
                        <label class="option-field">
                            <span>最高频率 (Hz)</span>
                            <input type="number" min="20" max="20000" v-model.number="lyricVisualizerFrequencyMax" />
                        </label>
                        <label class="option-field">
                            <span>透明度 (%)</span>
                            <input type="number" min="0" max="100" v-model.number="lyricVisualizerOpacity" />
                        </label>
                        <label class="option-field">
                            <span>过渡延迟 (0-0.95)</span>
                            <input type="number" step="0.01" min="0" max="0.95" v-model.number="lyricVisualizerTransitionDelay" />
                        </label>
                        <label class="option-field">
                            <span>颜色 (支持HEX/RGB)</span>
                            <input type="text" v-model="lyricVisualizerColor" placeholder="#000000 或 rgb(0,0,0)" />
                        </label>
                    </div>
                </div>
                <div class="option option--list" v-if="isRadial">
                    <div class="option-name">环形样式</div>
                    <div class="option-operation option-operation--block">
                        <label class="option-field">
                            <span>圆环尺寸 (%)</span>
                            <input type="number" min="10" max="400" v-model.number="lyricVisualizerRadialSize" />
                        </label>
                        <label class="option-field">
                            <span>中心圆尺寸 (%)</span>
                            <input type="number" min="10" max="95" v-model.number="lyricVisualizerRadialCoreSize" />
                        </label>
                        <label class="option-field">
                            <span>X轴偏移 (%)</span>
                            <input type="number" min="-200" max="200" v-model.number="lyricVisualizerRadialOffsetX" />
                        </label>
                        <label class="option-field">
                            <span>Y轴偏移 (%)</span>
                            <input type="number" min="-200" max="200" v-model.number="lyricVisualizerRadialOffsetY" />
                        </label>
                    </div>
                </div>
            </template>
        </div>
    `,
});
