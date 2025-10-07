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
                    <div class="btn" @click="resetColor">重置</div>
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

.color-option input[type='color'] {
    width: 48px;
    height: 34px;
    border: none;
    background: transparent;
    padding: 0;
}

.preview {
    width: 100%;
    height: 140px;
    border: 1px solid rgba(0, 0, 0, 0.25);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 16px;
    box-sizing: border-box;
    color: white;
}

.preview-title {
    font-family: SourceHanSansCN-Bold;
    font-size: 18px;
}

.preview-bar {
    width: 100%;
    height: 10px;
    background-color: rgba(255, 255, 255, 0.2);
    position: relative;
}

.preview-progress {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 60%;
}

.preview-actions {
    display: flex;
    gap: 8px;
}

.preview-actions span {
    width: 12px;
    height: 12px;
    background-color: rgba(255, 255, 255, 0.4);
    border-radius: 50%;
}
</style>
