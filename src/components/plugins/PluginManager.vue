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

<style scoped>
.plugin-manager {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 24px;
    border-radius: 20px;
    background: linear-gradient(135deg, rgba(40, 46, 54, 0.92), rgba(32, 37, 44, 0.92));
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.04);
}

.plugin-manager__header {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
}

.plugin-manager__headline {
    flex: 1;
    min-width: 260px;
}

.plugin-manager__headline h3 {
    font-size: 20px;
    margin: 0 0 8px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.plugin-manager__headline p {
    margin: 0;
    color: rgba(255, 255, 255, 0.7) !important;
    line-height: 1.6;
    font-size: 14px;
}

.plugin-manager__actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.plugin-manager__directory {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    padding: 16px 20px;
    border-radius: 16px;
    background: rgba(17, 19, 26, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.plugin-manager__directory-info {
    flex: 1;
    min-width: 220px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.plugin-manager__directory-label {
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
}

.plugin-manager__directory-path {
    font-family: 'Fira Code', 'JetBrains Mono', Consolas, monospace;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.9);
    background: rgba(0, 0, 0, 0.25);
    border-radius: 8px;
    padding: 6px 10px;
    display: inline-block;
    word-break: break-all;
}

.plugin-manager__directory-default {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.55);
}

.plugin-manager__directory-default code {
    font-family: inherit;
    background: none;
    padding: 0;
    color: rgba(255, 255, 255, 0.7);
}

.plugin-manager__directory-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.pm-btn {
    position: relative;
    padding: 10px 20px;
    border-radius: 999px;
    border: none;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s ease;
    background: linear-gradient(135deg, #62d5ff, #766bff);
    color: #0d1016 !important;
    box-shadow: 0 12px 25px rgba(118, 107, 255, 0.25);
}

.pm-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 18px 35px rgba(118, 107, 255, 0.28);
}

.pm-btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
    box-shadow: none;
}

.pm-btn--ghost {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.92) !important;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.pm-btn--ghost:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.16);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.24);
}

.plugin-manager__body {
    position: relative;
}

.plugin-manager__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 18px;
}

.plugin-card {
    position: relative;
    padding: 18px;
    border-radius: 18px;
    background: rgba(23, 26, 32, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow: hidden;
}

.plugin-card--enabled {
    background: linear-gradient(145deg, rgba(60, 185, 137, 0.2), rgba(23, 26, 32, 0.75));
    border-color: rgba(75, 230, 171, 0.35);
}

.plugin-card--broken {
    border-color: rgba(255, 102, 102, 0.4);
    background: linear-gradient(145deg, rgba(112, 22, 34, 0.35), rgba(23, 26, 32, 0.75));
}

.plugin-card__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

.plugin-card__name {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 4px;
}

.plugin-card__meta {
    display: flex;
    gap: 10px;
    color: rgba(255, 255, 255, 0.55) !important;
    font-size: 12px;
    letter-spacing: 0.04em;
}

.plugin-card__description {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.76) !important;
    min-height: 48px;
}

.plugin-card__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.plugin-card__status {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 60%;
}

.plugin-card__actions {
    display: flex;
    gap: 8px;
}

.plugin-card__error {
    font-size: 12px;
    color: rgba(255, 186, 120, 0.9) !important;
    line-height: 1.4;
}

.plugin-card--broken .plugin-card__error {
    color: rgba(255, 132, 132, 0.95) !important;
}

.status-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.8) !important;
}

.status-pill--success {
    background: rgba(75, 230, 171, 0.18);
    color: rgba(188, 255, 223, 0.96) !important;
}

.status-pill--muted {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.6) !important;
}

.status-pill--warning {
    background: rgba(255, 186, 120, 0.2);
    color: rgba(255, 214, 164, 0.96) !important;
}

.status-pill--error {
    background: rgba(255, 120, 120, 0.2);
    color: rgba(255, 176, 176, 0.98) !important;
}

.plugin-toggle {
    position: relative;
    width: 52px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
}

.plugin-toggle input {
    display: none;
}

.plugin-toggle__track {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
    transition: all 0.2s ease;
}

.plugin-toggle__thumb {
    position: absolute;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #f5f7fa;
    left: 4px;
    transition: all 0.2s ease;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35);
}

.plugin-toggle--on .plugin-toggle__track {
    background: linear-gradient(135deg, #53f3c3, #4f9aff);
    box-shadow: 0 0 12px rgba(83, 243, 195, 0.4);
}

.plugin-toggle--on .plugin-toggle__thumb {
    transform: translateX(24px);
    background: #0d1117;
    box-shadow: 0 8px 16px rgba(47, 204, 173, 0.45);
}

.plugin-card__overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
    background: rgba(14, 16, 20, 0.45);
}

.plugin-manager__loader {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 40px 20px;
    flex-direction: column;
    color: rgba(255, 255, 255, 0.75);
}

.loader {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(255, 255, 255, 0.15);
    border-top-color: rgba(118, 107, 255, 0.9);
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
}

.loader--inline {
    width: 26px;
    height: 26px;
    border-width: 3px;
}

.loader-text {
    font-size: 13px;
    letter-spacing: 0.05em;
}

.plugin-manager__empty {
    padding: 28px 0;
}

.empty-card {
    padding: 32px;
    border-radius: 16px;
    background: rgba(17, 19, 24, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    text-align: center;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
}

.empty-card h4 {
    margin: 0 0 12px;
    font-size: 18px;
}

.empty-card p {
    margin: 0;
    color: rgba(255, 255, 255, 0.7) !important;
    line-height: 1.6;
    font-size: 14px;
}

.empty-card code {
    background: rgba(255, 255, 255, 0.12);
    padding: 2px 6px;
    border-radius: 6px;
    font-size: 13px;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

@media (max-width: 720px) {
    .plugin-manager {
        padding: 18px;
    }

    .plugin-manager__actions {
        width: 100%;
        justify-content: flex-start;
    }

    .plugin-manager__grid {
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    }
}
</style>
