<script setup>
import { computed, onMounted, ref } from 'vue'
import { usePluginStore } from '../../store/pluginStore'
import { dialogOpen } from '../../utils/dialog'

const pluginStore = usePluginStore()
const installing = ref(false)

const plugins = computed(() => pluginStore.plugins)
const loading = computed(() => pluginStore.loading && !pluginStore.plugins.length)
const busy = computed(() => pluginStore.loading || installing.value)
const directory = computed(() => pluginStore.directory)
const defaultDirectory = computed(() => pluginStore.defaultDirectory)
const directoryBusy = ref(false)
const directoryActionsDisabled = computed(() => busy.value || directoryBusy.value)

const handleInstall = async () => {
    const api = window?.windowApi?.plugins
    if (!api || installing.value) return
    installing.value = true
    try {
        const sourcePath = await api.selectPackage()
        if (!sourcePath) return
        await pluginStore.installPluginFromPath(sourcePath)
    } finally {
        installing.value = false
    }
}

const handleRefresh = async () => {
    await pluginStore.refresh()
}

const handleChooseDirectory = async () => {
    if (directoryBusy.value) return
    directoryBusy.value = true
    try {
        await pluginStore.chooseDirectory()
    } finally {
        directoryBusy.value = false
    }
}

const handleResetDirectory = async () => {
    if (directoryBusy.value || directory.value === defaultDirectory.value) return
    directoryBusy.value = true
    try {
        await pluginStore.useDefaultDirectory()
    } finally {
        directoryBusy.value = false
    }
}

const handleToggle = async (plugin) => {
    if (plugin.isLoading || plugin.broken) return
    if (plugin.enabled) {
        await pluginStore.disablePlugin(plugin.id)
    } else {
        await pluginStore.enablePlugin(plugin.id)
    }
}

const handleUninstall = (plugin) => {
    dialogOpen(
        '卸载插件',
        `确定要卸载插件 “${plugin.name}” 吗？`,
        async (confirm) => {
            if (!confirm) return
            await pluginStore.uninstallPlugin(plugin.id)
        },
    )
}

const handleRetry = async (plugin) => {
    if (plugin.isLoading || plugin.broken) return
    await pluginStore.enablePlugin(plugin.id, { forceReload: true })
}

onMounted(() => {
    pluginStore.initialize()
})
</script>

<template>
    <div class="plugin-manager">
        <div class="plugin-manager__header">
            <div class="plugin-manager__headline">
                <h3>插件管理</h3>
                <p>加载第三方插件扩展 Hydrogen Music 的能力。插件在启用后将即时生效，可随时停用或卸载。</p>
            </div>
            <div class="plugin-manager__actions">
                <button class="pm-btn pm-btn--ghost" :disabled="busy" @click="handleRefresh">刷新列表</button>
                <button class="pm-btn" :disabled="busy" @click="handleInstall">{{ installing ? '正在导入…' : '安装插件' }}</button>
            </div>
        </div>
        <div class="plugin-manager__directory">
            <div class="plugin-manager__directory-info">
                <span class="plugin-manager__directory-label">插件目录</span>
                <code class="plugin-manager__directory-path" :title="directory || defaultDirectory">
                    {{ directory || defaultDirectory || '未设置' }}
                </code>
                <span
                    v-if="defaultDirectory && defaultDirectory !== (directory || '')"
                    class="plugin-manager__directory-default"
                >
                    默认：<code>{{ defaultDirectory }}</code>
                </span>
            </div>
            <div class="plugin-manager__directory-actions">
                <button
                    class="pm-btn pm-btn--ghost"
                    :disabled="directoryActionsDisabled"
                    @click="handleChooseDirectory"
                >
                    {{ directoryBusy ? '请稍候…' : '更改目录' }}
                </button>
                <button
                    class="pm-btn pm-btn--ghost"
                    :disabled="directoryActionsDisabled || !defaultDirectory || directory === defaultDirectory"
                    @click="handleResetDirectory"
                >
                    恢复默认
                </button>
            </div>
        </div>
        <div class="plugin-manager__body" :class="{ 'plugin-manager__body--loading': loading }">
            <div v-if="loading" class="plugin-manager__loader">
                <span class="loader"></span>
                <span class="loader-text">正在加载插件…</span>
            </div>
            <div v-else-if="plugins.length" class="plugin-manager__grid">
                <div
                    v-for="plugin in plugins"
                    :key="plugin.id"
                    class="plugin-card"
                    :class="{
                        'plugin-card--enabled': plugin.enabled,
                        'plugin-card--broken': plugin.broken,
                        'plugin-card--busy': plugin.isLoading,
                    }"
                >
                    <div class="plugin-card__header">
                        <div class="plugin-card__title">
                            <div class="plugin-card__name">{{ plugin.name }}</div>
                            <div class="plugin-card__meta">
                                <span>v{{ plugin.version }}</span>
                                <span v-if="plugin.author">作者 {{ plugin.author }}</span>
                            </div>
                        </div>
                        <label class="plugin-toggle" :class="{ 'plugin-toggle--on': plugin.enabled }">
                            <input
                                type="checkbox"
                                :checked="plugin.enabled"
                                :disabled="plugin.isLoading || plugin.broken"
                                @change="handleToggle(plugin)"
                            />
                            <span class="plugin-toggle__track"></span>
                            <span class="plugin-toggle__thumb"></span>
                        </label>
                    </div>
                    <p class="plugin-card__description">
                        {{ plugin.description || '该插件未提供描述。' }}
                    </p>
                    <div class="plugin-card__footer">
                        <div class="plugin-card__status">
                            <template v-if="plugin.broken">
                                <span class="status-pill status-pill--error">损坏</span>
                                <span class="plugin-card__error">{{ plugin.error }}</span>
                            </template>
                            <template v-else-if="plugin.error">
                                <span class="status-pill status-pill--warning">异常</span>
                                <span class="plugin-card__error">{{ plugin.error }}</span>
                            </template>
                            <template v-else>
                                <span
                                    class="status-pill"
                                    :class="plugin.enabled ? 'status-pill--success' : 'status-pill--muted'"
                                >
                                    {{ plugin.enabled ? '已启用' : '已停用' }}
                                </span>
                            </template>
                        </div>
                        <div class="plugin-card__actions">
                            <button class="pm-btn pm-btn--ghost" :disabled="plugin.isLoading" @click="handleUninstall(plugin)">
                                卸载
                            </button>
                            <button
                                v-if="plugin.error && !plugin.broken"
                                class="pm-btn pm-btn--ghost"
                                :disabled="plugin.isLoading"
                                @click="handleRetry(plugin)"
                            >
                                重试加载
                            </button>
                        </div>
                    </div>
                    <div v-if="plugin.isLoading" class="plugin-card__overlay">
                        <span class="loader loader--inline"></span>
                    </div>
                </div>
            </div>
            <div v-else class="plugin-manager__empty">
                <div class="empty-card">
                    <h4>暂未安装插件</h4>
                    <p>点击“安装插件”选择包含 <code>plugin.json</code> 的插件目录，即可扩展播放器功能。</p>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.plugin-manager {
    display: flex;
    flex-direction: column;
    gap: 28px;
    padding: 32px 36px;
    border-radius: 20px;
    background-color: rgba(255, 255, 255, 0.45);
    border: 1px solid rgba(255, 255, 255, 0.6);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.18);
    color: #0b0d12;
}

.plugin-manager__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    flex-wrap: wrap;
}

.plugin-manager__headline {
    flex: 1;
    min-width: 260px;
}

.plugin-manager__headline h3 {
    margin: 0;
    font: 24px SourceHanSansCN-Bold;
    color: #0b0d12;
}

.plugin-manager__headline p {
    margin: 6px 0 0;
    font: 14px SourceHanSansCN-Regular;
    line-height: 1.6;
    color: rgba(11, 13, 18, 0.65);
}

.plugin-manager__actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.pm-btn {
    min-width: 128px;
    height: 36px;
    padding: 0 24px;
    border-radius: 999px;
    border: none;
    font: 13px SourceHanSansCN-Bold;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: 0.2s ease;
    background-color: #0b0d12;
    color: #fff;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
}

.pm-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 16px 34px rgba(0, 0, 0, 0.28);
}

.pm-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
}

.pm-btn--ghost {
    background-color: rgba(255, 255, 255, 0.75);
    color: #0b0d12;
    box-shadow: 0 0 0 1px rgba(11, 13, 18, 0.12);
}

.pm-btn--ghost:hover:not(:disabled) {
    box-shadow: 0 0 0 1px rgba(11, 13, 18, 0.3), 0 8px 24px rgba(0, 0, 0, 0.15);
}

.plugin-manager__directory {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 18px;
    padding: 20px 24px;
    border-radius: 16px;
    background-color: rgba(255, 255, 255, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.65);
    box-shadow: inset 0 0 0 1px rgba(11, 13, 18, 0.05);
}

.plugin-manager__directory-info {
    flex: 1;
    min-width: 240px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.plugin-manager__directory-label {
    font: 12px SourceHanSansCN-Bold;
    color: rgba(11, 13, 18, 0.55);
    letter-spacing: 0.12em;
    text-transform: uppercase;
}

.plugin-manager__directory-path {
    font: 13px SourceHanSansCN-Regular;
    color: #0b0d12;
    background-color: rgba(255, 255, 255, 0.75);
    border-radius: 10px;
    padding: 8px 12px;
    display: inline-block;
    word-break: break-all;
    box-shadow: inset 0 0 0 1px rgba(11, 13, 18, 0.08);
}

.plugin-manager__directory-default {
    font: 12px SourceHanSansCN-Regular;
    color: rgba(11, 13, 18, 0.55);
}

.plugin-manager__directory-default code {
    font-family: inherit;
    padding: 0 4px;
    background-color: rgba(0, 0, 0, 0.08);
    border-radius: 6px;
}

.plugin-manager__directory-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.plugin-manager__body {
    position: relative;
}

.plugin-manager__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
}

.plugin-card {
    position: relative;
    padding: 20px;
    border-radius: 16px;
    background-color: rgba(255, 255, 255, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.75);
    box-shadow: 0 18px 36px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: #0b0d12;
}

.plugin-card--enabled {
    border-color: rgba(23, 160, 112, 0.55);
    box-shadow: 0 22px 40px rgba(27, 173, 123, 0.18);
}

.plugin-card--broken {
    border-color: rgba(214, 61, 61, 0.55);
    background-color: rgba(255, 245, 245, 0.85);
    box-shadow: 0 22px 40px rgba(214, 61, 61, 0.18);
}

.plugin-card__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

.plugin-card__name {
    font: 16px SourceHanSansCN-Bold;
    margin-bottom: 4px;
}

.plugin-card__meta {
    display: flex;
    gap: 10px;
    font: 12px SourceHanSansCN-Regular;
    color: rgba(11, 13, 18, 0.55);
    flex-wrap: wrap;
}

.plugin-card__description {
    margin: 0;
    font: 14px SourceHanSansCN-Regular;
    line-height: 1.6;
    color: rgba(11, 13, 18, 0.75);
}

.plugin-card__footer {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.plugin-card__status {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
}

.status-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px 12px;
    border-radius: 999px;
    font: 12px SourceHanSansCN-Bold;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background-color: rgba(11, 13, 18, 0.08);
    color: rgba(11, 13, 18, 0.6);
}

.status-pill--success {
    background-color: rgba(23, 160, 112, 0.15);
    color: rgba(23, 160, 112, 0.95);
}

.status-pill--muted {
    background-color: rgba(11, 13, 18, 0.06);
}

.status-pill--warning {
    background-color: rgba(255, 193, 7, 0.18);
    color: rgba(175, 131, 10, 0.95);
}

.status-pill--error {
    background-color: rgba(214, 61, 61, 0.18);
    color: rgba(214, 61, 61, 0.95);
}

.plugin-card__actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.plugin-card__error {
    font: 13px SourceHanSansCN-Regular;
    color: rgba(214, 61, 61, 0.9);
}

.plugin-card__overlay {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
}

.plugin-toggle {
    position: relative;
    width: 48px;
    height: 26px;
    border-radius: 999px;
    background-color: rgba(11, 13, 18, 0.2);
    display: inline-flex;
    align-items: center;
    padding: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.plugin-toggle input {
    display: none;
}

.plugin-toggle__track {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background-color: rgba(11, 13, 18, 0.2);
    transition: background-color 0.2s ease;
}

.plugin-toggle__thumb {
    position: relative;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background-color: #fff;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
    transform: translateX(0);
    transition: transform 0.2s ease;
}

.plugin-toggle--on .plugin-toggle__track {
    background-color: rgba(23, 160, 112, 0.85);
}

.plugin-toggle--on .plugin-toggle__thumb {
    transform: translateX(22px);
}

.plugin-manager__loader {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 40px 0;
    color: rgba(11, 13, 18, 0.6);
}

.loader {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 3px solid rgba(11, 13, 18, 0.15);
    border-top-color: rgba(11, 13, 18, 0.65);
    animation: spin 1s linear infinite;
}

.loader--inline {
    width: 18px;
    height: 18px;
    border-width: 2px;
}

.loader-text {
    font: 13px SourceHanSansCN-Regular;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(11, 13, 18, 0.55);
}

.plugin-manager__empty {
    padding: 60px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: rgba(11, 13, 18, 0.6);
}

.empty-card {
    width: 100%;
    max-width: 520px;
    padding: 28px 32px;
    border-radius: 16px;
    background-color: rgba(255, 255, 255, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.75);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.12);
    text-align: center;
}

.empty-card h4 {
    margin: 0 0 12px;
    font: 18px SourceHanSansCN-Bold;
    color: #0b0d12;
}

.empty-card p {
    margin: 0;
    font: 14px SourceHanSansCN-Regular;
    line-height: 1.6;
    color: rgba(11, 13, 18, 0.65);
}

.empty-card code {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 6px;
    background-color: rgba(0, 0, 0, 0.1);
    font: 13px SourceHanSansCN-Regular;
}

.plugin-manager__empty strong {
    font: 16px SourceHanSansCN-Bold;
}

.plugin-manager__empty span {
    font: 14px SourceHanSansCN-Regular;
    color: rgba(11, 13, 18, 0.5);
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

@media (max-width: 960px) {
    .plugin-manager {
        padding: 24px;
    }

    .plugin-manager__grid {
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    }
}

@media (max-width: 640px) {
    .plugin-manager {
        padding: 20px;
    }

    .plugin-manager__actions {
        width: 100%;
        justify-content: flex-start;
    }

    .plugin-manager__directory {
        padding: 18px;
    }

    .pm-btn,
    .pm-btn--ghost {
        width: 100%;
        justify-content: center;
    }
}
</style>
