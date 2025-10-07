<template>
    <div class="plugin-desktop-lyric-settings">
        <h2 class="plugin-name">{{ plugin?.name || '桌面歌词' }}</h2>
        <p class="plugin-description">
            将 Hydrogen Music 的桌面歌词功能解耦为插件，提供更灵活的窗口控制能力。
        </p>
        <div class="status-line">
            <span>当前状态：</span>
            <span class="status-value" :class="{ active: isOpen }">{{ isOpen ? '正在显示' : '未开启' }}</span>
        </div>
        <div class="actions">
            <button class="action" @click="toggleLyric" :disabled="!available">
                {{ isOpen ? '关闭桌面歌词' : '打开桌面歌词' }}
            </button>
            <button class="action" @click="resetPosition" :disabled="!available">
                重新同步歌词状态
            </button>
        </div>
        <div class="option">
            <label>
                <input type="checkbox" v-model="autoLaunch" @change="updateAutoLaunch" />
                播放音乐时自动开启桌面歌词
            </label>
        </div>
        <div class="hint">插件 ID：{{ plugin?.id }}</div>
    </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
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

const desktopLyricContribution = computed(() => pluginStore.desktopLyricContribution);
const available = computed(() => !!desktopLyricContribution.value);
const isOpen = computed(() => !!playerStore.isDesktopLyricOpen);

const autoLaunch = ref(!!props.pluginSettings?.autoLaunch);

watch(
    () => props.pluginSettings,
    value => {
        autoLaunch.value = !!value?.autoLaunch;
    },
    { immediate: true }
);

const toggleLyric = () => {
    if (!available.value) return;
    desktopLyricContribution.value?.toggle?.();
};

const resetPosition = () => {
    if (!available.value) return;
    desktopLyricContribution.value?.init?.();
};

const updateAutoLaunch = () => {
    const settings = { ...(props.pluginSettings || {}), autoLaunch: autoLaunch.value };
    pluginStore.setPluginSettings(props.plugin.id, settings);
    windowApi.plugins.updateData(props.plugin.id, settings);
};
</script>

<style scoped lang="scss">
.plugin-desktop-lyric-settings {
    display: flex;
    flex-direction: column;
    gap: 16px;
    line-height: 1.6;
    .plugin-name {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
    }
    .plugin-description {
        margin: 0;
        color: rgba(0, 0, 0, 0.6);
        font-size: 14px;
    }
    .status-line {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        .status-value {
            font-weight: 600;
            color: rgba(0, 0, 0, 0.4);
            &.active {
                color: #2ea043;
            }
        }
    }
    .actions {
        display: flex;
        gap: 12px;
        .action {
            border: none;
            background: linear-gradient(135deg, #46a0ff, #5cd4ff);
            color: #fff;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            &:hover:not(:disabled) {
                transform: translateY(-1px);
                box-shadow: 0 6px 12px rgba(70, 160, 255, 0.2);
            }
            &:disabled {
                cursor: not-allowed;
                background: #d0d4da;
                color: rgba(0, 0, 0, 0.4);
            }
        }
    }
    .option {
        font-size: 14px;
        label {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
        }
    }
    .hint {
        font-size: 12px;
        color: rgba(0, 0, 0, 0.45);
        margin-top: 8px;
    }
}
</style>
