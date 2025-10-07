<template>
    <div class="sfx-panel">
        <h2>节奏提示音插件</h2>
        <p>每次切换歌曲时播放短促的提示音，用于展示声音扩展能力。</p>
        <label class="volume">
            <span>提示音音量</span>
            <input type="range" min="0" max="1" step="0.05" v-model.number="volume" @change="save" />
            <span class="value">{{ volume.toFixed(2) }}</span>
        </label>
        <p class="hint">关闭声音分类后，该插件将自动静音。</p>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { usePluginStore } from '@/store/pluginStore';
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
const volume = ref(props.pluginSettings?.volume ?? 0.2);

watch(
    () => props.pluginSettings,
    value => {
        volume.value = value?.volume ?? 0.2;
    }
);

const save = () => {
    const settings = { ...(props.pluginSettings || {}), volume: volume.value };
    pluginStore.setPluginSettings(props.plugin.id, settings);
    windowApi.plugins.updateData(props.plugin.id, settings);
};
</script>

<style scoped lang="scss">
.sfx-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
    }
    p {
        margin: 0;
        color: rgba(0, 0, 0, 0.6);
        line-height: 1.6;
    }
    .volume {
        display: grid;
        grid-template-columns: 120px 1fr 50px;
        align-items: center;
        gap: 12px;
        input[type='range'] {
            width: 100%;
        }
        .value {
            font-weight: 600;
            text-align: right;
        }
    }
    .hint {
        font-size: 13px;
        color: #5c6cff;
    }
}
</style>
