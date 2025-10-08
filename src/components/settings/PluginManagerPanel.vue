<script setup>
import { computed, ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { usePluginStore } from '../../store/pluginStore'
import { dialogOpen, noticeOpen } from '../../utils/dialog'

const pluginStore = usePluginStore()
const { enabled, acknowledged, directory, defaultDirectory } = storeToRefs(pluginStore)
const plugins = computed(() => pluginStore.pluginList)

const selectedPluginId = ref(null)
const settingsComponent = ref(null)
const settingsLoading = ref(false)
const togglingGlobal = ref(false)

const selectedPlugin = computed(() => plugins.value.find(item => item.id === selectedPluginId.value) || null)

const refreshPlugins = async () => {
    await pluginStore.refreshPlugins()
}

const chooseDirectory = async () => {
    const path = await windowApi.openFile()
    if (path) {
        await pluginStore.setDirectory(path)
    }
}

const resetDirectory = async () => {
    await pluginStore.resetDirectory()
}

const reloadPlayer = async () => {
    noticeOpen('正在重载播放器…', 2)
    await pluginStore.reloadRenderer()
}

const closeSettings = () => {
    selectedPluginId.value = null
    settingsComponent.value = null
}

const openSettings = async (plugin) => {
    if (!plugin || !plugin.enabled || !enabled.value) return
    selectedPluginId.value = plugin.id
    settingsLoading.value = true
    settingsComponent.value = await pluginStore.loadPluginSettingsComponent(plugin.id)
    settingsLoading.value = false
}

const toggleGlobal = () => {
    if (togglingGlobal.value) return
    if (enabled.value) {
        togglingGlobal.value = true
        pluginStore.setEnabled(false).finally(() => {
            togglingGlobal.value = false
            closeSettings()
        })
        return
    }
    const proceed = () => {
        togglingGlobal.value = true
        pluginStore.setEnabled(true).finally(() => {
            togglingGlobal.value = false
        })
    }
    if (!acknowledged.value) {
        dialogOpen('插件功能暂不完善', '插件功能暂不完善，确定要启用吗？', async (confirm) => {
            if (!confirm) return
            await pluginStore.acknowledgeWarning()
            proceed()
        })
    } else {
        proceed()
    }
}

const togglePlugin = async (plugin) => {
    if (!enabled.value || !plugin) return
    await pluginStore.setPluginState(plugin.id, !plugin.enabled)
    if (!plugin.enabled) {
        closeSettings()
    }
}

const deletePlugin = (plugin) => {
    if (!plugin) return
    dialogOpen('删除插件', `确定要删除插件“${plugin.name}”吗？`, async (confirm) => {
        if (!confirm) return
        await pluginStore.deletePlugin(plugin.id)
        if (selectedPluginId.value === plugin.id) {
            closeSettings()
        }
    })
}

onMounted(async () => {
    if (!pluginStore.initialized && !pluginStore.initializing) {
        await pluginStore.refreshPlugins()
    }
})
</script>

<template>
    <div class="settings-item plugin-manager">
        <h2 class="item-title">插件</h2>
        <div class="line"></div>
        <div class="item-options">
            <div class="option">
                <div class="option-name">插件功能</div>
                <div class="option-operation">
                    <div class="toggle" :class="{ 'toggle--disabled': togglingGlobal }" @click="toggleGlobal">
                        <div class="toggle-off" :class="{ 'toggle-on-in': enabled }">{{ enabled ? '已开启' : '已关闭' }}</div>
                        <Transition name="toggle">
                            <div class="toggle-on" v-show="enabled"></div>
                        </Transition>
                    </div>
                </div>
            </div>
            <div class="option">
                <div class="option-name">插件目录</div>
                <div class="option-operation option-operation--file">
                    <div class="option-file-path" :title="directory">
                        {{ directory || '未指定目录' }}
                    </div>
                    <div class="option-add" @click="chooseDirectory">选择</div>
                    <div class="option-reset" v-if="directory && defaultDirectory && directory !== defaultDirectory" @click="resetDirectory">恢复默认</div>
                </div>
            </div>
            <div class="option">
                <div class="option-name">操作</div>
                <div class="option-operation option-operation--actions">
                    <div class="option-add" @click="refreshPlugins">刷新</div>
                    <div class="option-add" @click="reloadPlayer">重载播放器</div>
                </div>
            </div>
            <div class="plugin-list" :class="{ 'plugin-list--disabled': !enabled }">
                <div class="plugin-list-header">
                    <div class="plugin-cell plugin-title">标题</div>
                    <div class="plugin-cell plugin-settings">插件设置</div>
                    <div class="plugin-cell plugin-toggle">启用/关闭</div>
                    <div class="plugin-cell plugin-delete">删除</div>
                </div>
                <div v-if="plugins.length === 0" class="plugin-empty">没有安装插件</div>
                <div v-else class="plugin-rows">
                    <div class="plugin-row" v-for="plugin in plugins" :key="plugin.id">
                        <div class="plugin-cell plugin-title">
                            <div class="plugin-name">{{ plugin.name }}</div>
                            <div class="plugin-meta">
                                <span class="plugin-version">v{{ plugin.version }}</span>
                                <span v-if="plugin.author" class="plugin-author">{{ plugin.author }}</span>
                            </div>
                        </div>
                        <div class="plugin-cell plugin-settings">
                            <div
                                class="option-add option-add--ghost"
                                :class="{ 'option-add--disabled': !enabled || !plugin.enabled }"
                                @click="openSettings(plugin)"
                            >
                                插件设置
                            </div>
                        </div>
                        <div class="plugin-cell plugin-toggle">
                            <div
                                class="toggle toggle--compact"
                                :class="{ 'toggle--disabled': !enabled }"
                                @click="togglePlugin(plugin)"
                            >
                                <div class="toggle-off" :class="{ 'toggle-on-in': plugin.enabled }">
                                    {{ plugin.enabled ? '已开启' : '已关闭' }}
                                </div>
                                <Transition name="toggle">
                                    <div class="toggle-on" v-show="plugin.enabled"></div>
                                </Transition>
                            </div>
                        </div>
                        <div class="plugin-cell plugin-delete">
                            <div
                                class="option-add option-add--danger"
                                :class="{ 'option-add--disabled': !enabled }"
                                @click="deletePlugin(plugin)"
                            >
                                删除
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <Transition name="plugin-settings">
            <div class="plugin-settings-panel" v-if="selectedPlugin">
                <div class="plugin-settings-header">
                    <svg
                        class="plugin-settings-back"
                        viewBox="0 0 1024 1024"
                        xmlns="http://www.w3.org/2000/svg"
                        @click="closeSettings"
                    >
                        <path d="M716.608 1010.112L218.88 512.384 717.376 13.888l45.248 45.248-453.248 453.248 452.48 452.48z" />
                    </svg>
                    <div class="plugin-settings-title">{{ selectedPlugin.name }}</div>
                </div>
                <div class="plugin-settings-body">
                    <p class="plugin-settings-description">
                        {{ selectedPlugin.description || '插件未提供介绍。' }}
                    </p>
                    <div class="plugin-settings-meta">
                        <span>版本 {{ selectedPlugin.version }}</span>
                        <span v-if="selectedPlugin.author">作者 {{ selectedPlugin.author }}</span>
                    </div>
                    <div class="plugin-settings-content">
                        <component v-if="settingsComponent" :is="settingsComponent" />
                        <div v-else-if="settingsLoading" class="plugin-settings-placeholder">正在载入插件设置…</div>
                        <div v-else class="plugin-settings-placeholder">插件未提供额外的设置功能。</div>
                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style scoped lang="scss">
.plugin-manager {
    position: relative;
    overflow: hidden;
    .option-operation--actions {
        display: flex;
        flex-direction: row;
        gap: 10px;
    }
    .plugin-list {
        margin-top: 25px;
        border: 1px solid rgba(0, 0, 0, 0.1);
        background: rgba(255, 255, 255, 0.2);
        padding: 10px 0;
        transition: 0.2s;
    }
    .plugin-list--disabled {
        opacity: 0.6;
    }
    .plugin-list-header {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr;
        padding: 0 24px 12px;
        font: 13px SourceHanSansCN-Bold;
        color: black;
    }
    .plugin-rows {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .plugin-row {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr;
        align-items: center;
        padding: 10px 24px;
        background: rgba(255, 255, 255, 0.35);
        color: black;
    }
    .plugin-cell {
        display: flex;
        align-items: center;
        justify-content: flex-start;
    }
    .plugin-title {
        flex-direction: column;
        align-items: flex-start;
        .plugin-name {
            font: 15px SourceHanSansCN-Bold;
            margin-bottom: 4px;
        }
        .plugin-meta {
            display: flex;
            gap: 12px;
            font: 12px SourceHanSansCN-Regular;
        }
    }
    .plugin-settings,
    .plugin-toggle,
    .plugin-delete {
        justify-content: center;
    }
    .plugin-empty {
        padding: 36px 0;
        text-align: center;
        font: 14px SourceHanSansCN-Regular;
        color: rgba(0, 0, 0, 0.6);
    }
    .option-add--ghost {
        background: rgba(255, 255, 255, 0.35);
    }
    .option-add--danger {
        background: rgba(208, 72, 72, 0.75);
        color: white;
    }
    .option-add--disabled {
        opacity: 0.5;
        pointer-events: none;
    }
    .toggle--disabled {
        pointer-events: none;
        opacity: 0.6;
    }
    .toggle--compact {
        transform: scale(0.9);
    }
    .plugin-settings-panel {
        position: absolute;
        inset: 0;
        background: rgba(255, 255, 255, 0.96);
        padding: 24px;
        display: flex;
        flex-direction: column;
        color: black;
    }
    .plugin-settings-header {
        display: flex;
        align-items: center;
        margin-bottom: 18px;
        .plugin-settings-back {
            width: 20px;
            height: 20px;
            cursor: pointer;
            margin-right: 12px;
            fill: black;
        }
        .plugin-settings-title {
            font: 16px SourceHanSansCN-Bold;
        }
    }
    .plugin-settings-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        .plugin-settings-description {
            font: 13px SourceHanSansCN-Regular;
            margin-bottom: 12px;
        }
        .plugin-settings-meta {
            font: 12px SourceHanSansCN-Regular;
            display: flex;
            gap: 18px;
            margin-bottom: 16px;
        }
        .plugin-settings-content {
            flex: 1;
            overflow: auto;
            padding: 12px;
            background: rgba(255, 255, 255, 0.35);
        }
        .plugin-settings-placeholder {
            text-align: center;
            font: 13px SourceHanSansCN-Regular;
            color: rgba(0, 0, 0, 0.65);
        }
    }
}

.plugin-settings-enter-active,
.plugin-settings-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.plugin-settings-enter-from,
.plugin-settings-leave-to {
    opacity: 0;
    transform: translateX(20px);
}
</style>
