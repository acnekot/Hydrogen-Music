<template>
    <div class="theme-plugin-settings">
        <div class="section">
            <h3>主题色调</h3>
            <p class="section-desc">调整播放器的强调色与主题策略。</p>
            <div class="option">
                <div class="option-name">主题模式</div>
                <div class="option-operation option-operation--selector">
                    <Selector v-model="config.themeMode" :options="themeModeOptions" @change="persist" />
                </div>
            </div>
            <div class="option color-option">
                <div class="option-name">强调色</div>
                <div class="option-operation">
                    <input type="color" v-model="config.accentColor" @change="persist" />
                    <button class="btn" @click="resetColor">重置</button>
                </div>
            </div>
            <div class="option">
                <div class="option-name">动态背景</div>
                <div class="option-operation">
                    <div class="toggle" @click="toggleDynamic">
                        <div class="toggle-off" :class="{ 'toggle-on-in': config.dynamicBackground }">
                            {{ config.dynamicBackground ? '已开启' : '已关闭' }}
                        </div>
                        <Transition name="toggle">
                            <div class="toggle-on" v-show="config.dynamicBackground"></div>
                        </Transition>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h3>实时预览</h3>
            <div class="preview" :style="previewStyle">
                <div class="preview-title">Hydrogen Music</div>
                <div class="preview-bar">
                    <div class="preview-progress" :style="progressStyle"></div>
                </div>
                <div class="preview-actions">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
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

const themeModeOptions = [
    { label: '跟随系统', value: 'system' },
    { label: '浅色', value: 'light' },
    { label: '深色', value: 'dark' },
];

const config = computed({
    get() {
        let value = pluginStore.pluginConfig(props.pluginId);
        if (!value) {
            value = {
                themeMode: 'system',
                accentColor: '#4ad5ff',
                dynamicBackground: false,
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
    pluginStore.replacePluginConfig(props.pluginId, {
        ...config.value,
    });
};

const toggleDynamic = () => {
    pluginStore.mergePluginConfig(props.pluginId, {
        dynamicBackground: !config.value.dynamicBackground,
    });
};

const resetColor = () => {
    pluginStore.mergePluginConfig(props.pluginId, { accentColor: '#4ad5ff' });
};

const previewStyle = computed(() => {
    const accent = config.value.accentColor || '#4ad5ff';
    const gradient = config.value.dynamicBackground
        ? `linear-gradient(135deg, ${accent}, #1a1f39)`
        : 'linear-gradient(135deg, #1a1f39, #15182a)';
    return {
        '--accent': accent,
        background: gradient,
    };
});

const progressStyle = computed(() => ({
    background: config.value.accentColor || '#4ad5ff',
}));
</script>

<style scoped lang="scss">
.theme-plugin-settings {
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

.color-option input[type='color'] {
    width: 40px;
    height: 24px;
    border: none;
    background: transparent;
    cursor: pointer;
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

.preview {
    border-radius: 14px;
    padding: 20px;
    min-height: 160px;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.preview-title {
    font-size: 18px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
}

.preview-bar {
    height: 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.15);
    overflow: hidden;
}

.preview-progress {
    width: 60%;
    height: 100%;
    border-radius: 999px;
}

.preview-actions {
    display: flex;
    gap: 10px;
}

.preview-actions span {
    flex: 1;
    height: 32px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.12);
}
</style>
