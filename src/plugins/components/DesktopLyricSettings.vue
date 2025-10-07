<template>
    <div class="desktop-lyric-settings plugin-settings-root">
        <div class="plugin-section">
            <div class="plugin-section-title">桌面歌词窗口</div>
            <p class="plugin-section-description">在桌面显示同步歌词，并支持拖拽与样式自定义。</p>
            <div class="plugin-option">
                <div class="plugin-option-name">当前状态</div>
                <div class="plugin-option-operation">
                    <span class="desktop-lyric-status" :class="{ 'desktop-lyric-status--active': playerStore.isDesktopLyricOpen }">
                        {{ playerStore.isDesktopLyricOpen ? '已打开' : '已关闭' }}
                    </span>
                    <div class="plugin-button" @click="toggleDesktop">{{ playerStore.isDesktopLyricOpen ? '关闭' : '打开' }}</div>
                </div>
            </div>
        </div>

        <div class="plugin-section">
            <div class="plugin-section-title">启动与窗口行为</div>
            <div class="plugin-option">
                <div class="plugin-option-name">启动时自动打开</div>
                <div class="plugin-option-operation">
                    <div class="plugin-toggle" @click="updateConfig({ autoStart: !config.autoStart })">
                        <div class="plugin-toggle-inner" v-show="config.autoStart"></div>
                        <div
                            class="plugin-toggle-label"
                            :class="{ 'plugin-toggle-label--active': config.autoStart }"
                        >
                            {{ config.autoStart ? '已开启' : '已关闭' }}
                        </div>
                    </div>
                </div>
            </div>
            <div class="plugin-option">
                <div class="plugin-option-name">窗口保持置顶</div>
                <div class="plugin-option-operation">
                    <div class="plugin-toggle" @click="updateConfig({ alwaysOnTop: !config.alwaysOnTop })">
                        <div class="plugin-toggle-inner" v-show="config.alwaysOnTop"></div>
                        <div
                            class="plugin-toggle-label"
                            :class="{ 'plugin-toggle-label--active': config.alwaysOnTop }"
                        >
                            {{ config.alwaysOnTop ? '已开启' : '已关闭' }}
                        </div>
                    </div>
                </div>
            </div>
            <div class="plugin-option">
                <div class="plugin-option-name">记住窗口位置与大小</div>
                <div class="plugin-option-operation">
                    <div class="plugin-toggle" @click="updateConfig({ rememberLayout: !config.rememberLayout })">
                        <div class="plugin-toggle-inner" v-show="config.rememberLayout"></div>
                        <div
                            class="plugin-toggle-label"
                            :class="{ 'plugin-toggle-label--active': config.rememberLayout }"
                        >
                            {{ config.rememberLayout ? '已开启' : '已关闭' }}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="plugin-section">
            <div class="plugin-section-title">实用操作</div>
            <div class="plugin-option">
                <div class="plugin-option-name">同步歌词</div>
                <div class="plugin-option-operation">
                    <div class="plugin-button" @click="reloadLyrics">同步当前歌曲</div>
                    <div class="plugin-button" @click="resetLayout">重置窗口布局</div>
                </div>
            </div>
            <p class="plugin-note">如果歌词窗口被拖拽到不可见区域，可通过重置布局恢复默认位置。</p>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { usePlayerStore } from '../../store/playerStore';
import { usePluginStore } from '../../store/pluginStore';
import { toggleDesktopLyric } from '../../utils/desktopLyric';

const props = defineProps({
    pluginId: {
        type: String,
        required: true,
    },
});

const playerStore = usePlayerStore();
const pluginStore = usePluginStore();

const config = computed(() => {
    const value = pluginStore.pluginConfig(props.pluginId);
    if (!value) {
        pluginStore.replacePluginConfig(props.pluginId, {
            autoStart: false,
            alwaysOnTop: true,
            rememberLayout: true,
        });
        return pluginStore.pluginConfig(props.pluginId) || {};
    }
    return value;
});

const updateConfig = (patch) => {
    pluginStore.mergePluginConfig(props.pluginId, patch);
};

const toggleDesktop = () => {
    toggleDesktopLyric();
};

const reloadLyrics = () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
        window.electronAPI.requestLyricData?.();
    }
};

const resetLayout = () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
        try {
            window.electronAPI.moveLyricWindowContentTo?.(120, 120, 680, 220);
        } catch (_) {
            // ignore
        }
    }
};
</script>

<style scoped lang="scss">
@import '../../styles/pluginCommon.scss';

.desktop-lyric-settings {
    gap: 24px;
}

.desktop-lyric-status {
    font: 13px SourceHanSansCN-Bold;
    color: rgba(0, 0, 0, 0.6);
}

.desktop-lyric-status--active {
    color: black;
}
</style>
