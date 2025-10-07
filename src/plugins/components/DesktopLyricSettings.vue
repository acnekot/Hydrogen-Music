<template>
    <div class="desktop-lyric-settings">
        <div class="section">
            <h3>桌面歌词窗口</h3>
            <p class="section-desc">在桌面显示同步歌词，并支持拖拽与样式自定义。</p>
            <div class="option">
                <div class="option-name">当前状态</div>
                <div class="option-operation">
                    <span class="status" :class="{ active: playerStore.isDesktopLyricOpen }">
                        {{ playerStore.isDesktopLyricOpen ? '已打开' : '已关闭' }}
                    </span>
                    <button class="btn" @click="toggleDesktop">{{ playerStore.isDesktopLyricOpen ? '关闭' : '打开' }}</button>
                </div>
            </div>
        </div>

        <div class="section">
            <h3>启动与窗口行为</h3>
            <div class="option">
                <div class="option-name">启动时自动打开</div>
                <div class="option-operation">
                    <div class="toggle" @click="updateConfig({ autoStart: !config.autoStart })">
                        <div class="toggle-off" :class="{ 'toggle-on-in': config.autoStart }">
                            {{ config.autoStart ? '已开启' : '已关闭' }}
                        </div>
                        <Transition name="toggle">
                            <div class="toggle-on" v-show="config.autoStart"></div>
                        </Transition>
                    </div>
                </div>
            </div>
            <div class="option">
                <div class="option-name">窗口保持置顶</div>
                <div class="option-operation">
                    <div class="toggle" @click="updateConfig({ alwaysOnTop: !config.alwaysOnTop })">
                        <div class="toggle-off" :class="{ 'toggle-on-in': config.alwaysOnTop }">
                            {{ config.alwaysOnTop ? '已开启' : '已关闭' }}
                        </div>
                        <Transition name="toggle">
                            <div class="toggle-on" v-show="config.alwaysOnTop"></div>
                        </Transition>
                    </div>
                </div>
            </div>
            <div class="option">
                <div class="option-name">记住窗口位置与大小</div>
                <div class="option-operation">
                    <div class="toggle" @click="updateConfig({ rememberLayout: !config.rememberLayout })">
                        <div class="toggle-off" :class="{ 'toggle-on-in': config.rememberLayout }">
                            {{ config.rememberLayout ? '已开启' : '已关闭' }}
                        </div>
                        <Transition name="toggle">
                            <div class="toggle-on" v-show="config.rememberLayout"></div>
                        </Transition>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h3>实用操作</h3>
            <div class="utility">
                <button class="btn" @click="reloadLyrics">同步当前歌曲</button>
                <button class="btn" @click="resetLayout">重置窗口布局</button>
            </div>
            <p class="tips">如果歌词窗口被拖拽到不可见区域，可通过重置布局恢复默认位置。</p>
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
.desktop-lyric-settings {
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

.status {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
}

.status.active {
    color: #4ad5ff;
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

.utility {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 10px;
}

.tips {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
}
</style>
