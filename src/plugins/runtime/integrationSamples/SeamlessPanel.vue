<template>
    <div class="seamless-panel">
        <h2>播放器聚焦插件</h2>
        <p>新歌开始播放时自动聚焦至播放器歌词视图，展示了对应用路由与状态的联动能力。</p>
        <label class="toggle">
            <input type="checkbox" v-model="autoFocus" @change="save" />
            <span>自动切换到歌词视图</span>
        </label>
        <p class="hint">插件会在每次歌曲切换时将主界面切换至播放器并展示歌词。</p>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';
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

const autoFocus = ref(props.pluginSettings?.autoFocusLyric ?? true);

watch(
    () => props.pluginSettings,
    value => {
        autoFocus.value = value?.autoFocusLyric ?? true;
    }
);

const save = () => {
    windowApi.plugins.updateData(props.plugin.id, {
        ...props.pluginSettings,
        autoFocusLyric: autoFocus.value,
    });
};
</script>

<style scoped lang="scss">
.seamless-panel {
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
    .toggle {
        display: flex;
        align-items: center;
        gap: 10px;
        input {
            width: 16px;
            height: 16px;
        }
    }
    .hint {
        font-size: 13px;
        color: #5c6cff;
    }
}
</style>
