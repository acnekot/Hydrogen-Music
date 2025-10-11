<!--
将本文件中的内容合并至目标项目的 Settings 页面。
可以将 <script setup> 中的依赖与响应式状态按需拆分至现有脚本，
再将 <template> 段落插入到设置页的合适位置。
-->

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

// 根据目标项目的路径别名调整以下导入
import { noticeOpen, dialogOpen } from '@/utils/dialog'
import { reloadPluginSystem, pluginSettingsVersionSignal, hasPluginSettingsPage } from '@/plugins/pluginManager'

const router = useRouter()

const plugins = ref([])
const pluginLoading = ref(false)
const pluginImporting = ref(false)
const appReloading = ref(false)
const pluginProcessing = reactive({})

const pluginApiAvailable = computed(() => typeof windowApi !== 'undefined' && typeof windowApi.listPlugins === 'function')
const pluginDirectoryApiAvailable = computed(() =>
    typeof windowApi !== 'undefined' &&
    typeof windowApi.getPluginDirectory === 'function' &&
    typeof windowApi.setPluginDirectory === 'function' &&
    typeof windowApi.choosePluginDirectory === 'function'
)

const pluginList = computed(() =>
    [...plugins.value].sort((a, b) => (b.importTime || 0) - (a.importTime || 0))
)

const pluginDirectory = ref('')
const pluginDirectoryDefault = ref('')
const pluginDirectoryLoading = ref(false)

const pluginDirectoryDisplay = computed(() => pluginDirectory.value || pluginDirectoryDefault.value || '未配置')

const isPluginDirectoryCustomized = computed(() => {
    const current = pluginDirectory.value?.trim?.() || ''
    const fallback = pluginDirectoryDefault.value?.trim?.() || ''
    if (!fallback) return Boolean(current)
    if (!current) return false
    return current !== fallback
})

const pluginSettingsVersion = pluginSettingsVersionSignal
const pluginSettingsAvailability = computed(() => {
    pluginSettingsVersion.value
    const availability = Object.create(null)
    for (const plugin of plugins.value || []) {
        if (!plugin || !plugin.id) continue
        availability[plugin.id] = hasPluginSettingsPage(plugin.id)
    }
    return availability
})

const isPluginBusy = (id) => Boolean(id && pluginProcessing[id])
const setPluginProcessing = (id, value) => {
    if (!id) return
    if (value) {
        pluginProcessing[id] = true
    } else {
        delete pluginProcessing[id]
    }
}

const loadPlugins = async () => {
    if (!pluginApiAvailable.value) {
        plugins.value = []
        pluginLoading.value = false
        return
    }
    pluginLoading.value = true
    try {
        const result = await windowApi.listPlugins()
        if (result?.success && Array.isArray(result.plugins)) {
            plugins.value = result.plugins
        } else {
            plugins.value = []
        }
    } finally {
        pluginLoading.value = false
    }
}

const loadPluginDirectory = async () => {
    if (!pluginDirectoryApiAvailable.value) {
        pluginDirectory.value = ''
        pluginDirectoryDefault.value = ''
        pluginDirectoryLoading.value = false
        return
    }
    pluginDirectoryLoading.value = true
    try {
        const result = await windowApi.getPluginDirectory()
        if (result?.success) {
            pluginDirectory.value = result.directory || ''
            pluginDirectoryDefault.value = result.defaultDirectory || ''
        } else {
            pluginDirectory.value = ''
            pluginDirectoryDefault.value = ''
        }
    } finally {
        pluginDirectoryLoading.value = false
    }
}

const choosePluginDirectory = async () => {
    if (!pluginDirectoryApiAvailable.value) {
        noticeOpen('当前环境不支持修改插件目录', 2)
        return
    }
    if (pluginDirectoryLoading.value) return

    const current = pluginDirectory.value || pluginDirectoryDefault.value || ''
    const result = await windowApi.choosePluginDirectory(current)
    if (result?.canceled) return
    pluginDirectory.value = result.directory || ''
    pluginDirectoryDefault.value = result.defaultDirectory || pluginDirectoryDefault.value
}

const resetPluginDirectory = async () => {
    if (!pluginDirectoryApiAvailable.value) return
    if (!pluginDirectoryDefault.value) return
    if (pluginDirectoryLoading.value || !isPluginDirectoryCustomized.value) return

    pluginDirectoryLoading.value = true
    try {
        const result = await windowApi.setPluginDirectory(pluginDirectoryDefault.value, true)
        pluginDirectory.value = result.directory || pluginDirectoryDefault.value
        pluginDirectoryDefault.value = result.defaultDirectory || pluginDirectoryDefault.value
        noticeOpen('已恢复插件目录', 2)
    } finally {
        pluginDirectoryLoading.value = false
    }
}

const importPlugin = async () => {
    if (!pluginApiAvailable.value) {
        noticeOpen('当前环境不支持导入插件', 2)
        return
    }
    if (pluginImporting.value) return

    pluginImporting.value = true
    try {
        const result = await windowApi.importPlugin()
        if (result?.success) {
            noticeOpen(`已导入插件 ${result.plugin?.name || result.plugin?.id || ''}`, 2)
            await loadPlugins()
        }
    } finally {
        pluginImporting.value = false
    }
}

const togglePluginState = async (plugin) => {
    if (!pluginApiAvailable.value || !plugin?.id) return
    if (isPluginBusy(plugin.id)) return

    setPluginProcessing(plugin.id, true)
    try {
        const result = await windowApi.setPluginEnabled(plugin.id, !plugin.enabled)
        if (result?.success) {
            noticeOpen(`${!plugin.enabled ? '已启用' : '已禁用'}插件 ${plugin.name}`, 2)
            await loadPlugins()
        }
    } finally {
        setPluginProcessing(plugin.id, false)
    }
}

const requestDeletePlugin = (plugin) => {
    if (!pluginApiAvailable.value || !plugin?.id) return
    const builtin = plugin.builtin === true
    const message = builtin
        ? `确定要删除内置插件“${plugin.name}”吗？删除后需要重新导入才能恢复。`
        : `确定删除插件“${plugin.name}”吗？`

    dialogOpen({
        title: builtin ? '删除内置插件' : '删除插件',
        content: message,
        confirmText: '删除',
        cancelText: '取消',
        async onConfirm() {
            if (isPluginBusy(plugin.id)) return
            setPluginProcessing(plugin.id, true)
            try {
                const result = await windowApi.deletePlugin(plugin.id)
                if (result?.success) {
                    noticeOpen(`${builtin ? '已移除内置插件' : '已删除插件'} ${plugin.name}`, 2)
                    await loadPlugins()
                }
            } finally {
                setPluginProcessing(plugin.id, false)
            }
        },
    })
}

const reloadPlugins = async () => {
    if (!pluginApiAvailable.value) {
        noticeOpen('当前环境不支持重新加载插件', 2)
        return
    }
    if (appReloading.value) return

    appReloading.value = true
    try {
        await reloadPluginSystem()
        await loadPlugins()
        noticeOpen('插件系统已重载', 2)
    } finally {
        appReloading.value = false
    }
}

const pluginHasSettings = (pluginId) => {
    if (!pluginId) return false
    const availability = pluginSettingsAvailability.value
    return Boolean(availability && availability[pluginId])
}

const openPluginSettings = (plugin) => {
    if (!plugin || !plugin.id) return
    router.push({ name: 'pluginSettings', params: { pluginId: plugin.id } })
}

const formatPluginTimestamp = (timestamp) => {
    if (!timestamp) return '未知时间'
    const date = new Date(Number(timestamp))
    if (Number.isNaN(date.getTime())) return '未知时间'
    return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

loadPlugins()
loadPluginDirectory()
</script>

<template>
    <section class="settings-block settings-block--plugins">
        <header class="settings-block__header">
            <div>
                <h2>插件管理</h2>
                <p>导入、启用或配置 Hydrogen 插件。</p>
            </div>
            <div class="plugin-toolbar" role="group">
                <button
                    type="button"
                    class="plugin-button"
                    :class="{ 'plugin-button--loading': pluginImporting, 'plugin-button--disabled': !pluginApiAvailable }"
                    @click="importPlugin"
                >
                    {{ pluginImporting ? '导入中…' : '导入插件' }}
                </button>
                <button
                    type="button"
                    class="plugin-button plugin-button--outline"
                    :class="{ 'plugin-button--disabled': pluginLoading || !pluginApiAvailable }"
                    @click="loadPlugins"
                >
                    {{ pluginLoading ? '刷新中…' : '刷新列表' }}
                </button>
                <button
                    type="button"
                    class="plugin-button plugin-button--outline"
                    :class="{ 'plugin-button--disabled': appReloading || !pluginApiAvailable }"
                    @click="reloadPlugins"
                >
                    {{ appReloading ? '重载中…' : '重载插件' }}
                </button>
            </div>
        </header>

        <div class="plugin-directory" v-if="pluginDirectoryApiAvailable">
            <div class="plugin-directory__info">
                <span class="plugin-directory__label">插件目录</span>
                <span class="plugin-directory__path" :title="pluginDirectoryDisplay">{{ pluginDirectoryDisplay }}</span>
            </div>
            <div class="plugin-directory__actions">
                <button
                    type="button"
                    class="plugin-button plugin-button--outline"
                    :class="{ 'plugin-button--disabled': pluginDirectoryLoading }"
                    @click="choosePluginDirectory"
                >
                    {{ pluginDirectoryLoading ? '处理中…' : '更改目录' }}
                </button>
                <button
                    type="button"
                    class="plugin-button plugin-button--outline"
                    :class="{ 'plugin-button--disabled': pluginDirectoryLoading || !isPluginDirectoryCustomized }"
                    @click="resetPluginDirectory"
                >
                    恢复默认
                </button>
            </div>
        </div>

        <div class="plugin-empty" v-if="!pluginApiAvailable">
            <p>当前运行环境未暴露插件管理 API，请在 Electron preload 中提供 windowApi。</p>
        </div>
        <div class="plugin-empty" v-else-if="!pluginLoading && pluginList.length === 0">
            <p>尚未导入任何插件，点击上方按钮导入一个插件包。</p>
        </div>
        <div class="plugin-list" v-else>
            <article class="plugin-card" v-for="plugin in pluginList" :key="plugin.id">
                <div class="plugin-card__header">
                    <div class="plugin-card__title" :title="plugin.name">{{ plugin.name || plugin.id }}</div>
                    <div class="plugin-card__meta">
                        <span class="plugin-card__badge" v-if="plugin.builtin">内置</span>
                        <span class="plugin-card__version" v-if="plugin.version">v{{ plugin.version }}</span>
                    </div>
                </div>
                <div class="plugin-card__submeta">
                    <span class="plugin-card__author" v-if="plugin.author" :title="plugin.author">{{ plugin.author }}</span>
                    <span class="plugin-card__id" :title="plugin.id">{{ plugin.id }}</span>
                </div>
                <p class="plugin-card__description" :title="plugin.description">
                    {{ plugin.description || '开发者尚未提供描述。' }}
                </p>
                <footer class="plugin-card__footer">
                    <time v-if="plugin.importTime">
                        导入时间：{{ formatPluginTimestamp(plugin.importTime) }}
                    </time>
                    <div class="plugin-card__actions">
                        <button
                            type="button"
                            class="plugin-button plugin-button--outline"
                            :class="{ 'plugin-button--disabled': !pluginApiAvailable || isPluginBusy(plugin.id) }"
                            @click="togglePluginState(plugin)"
                        >
                            {{ plugin.enabled ? '禁用' : '启用' }}
                        </button>
                        <button
                            type="button"
                            class="plugin-button plugin-button--outline"
                            v-if="plugin.enabled && pluginHasSettings(plugin.id)"
                            :class="{ 'plugin-button--disabled': !pluginApiAvailable || isPluginBusy(plugin.id) }"
                            @click="openPluginSettings(plugin)"
                        >
                            打开设置
                        </button>
                        <button
                            type="button"
                            class="plugin-button plugin-button--danger"
                            :class="{ 'plugin-button--disabled': !pluginApiAvailable || isPluginBusy(plugin.id) }"
                            @click="requestDeletePlugin(plugin)"
                        >
                            删除
                        </button>
                    </div>
                </footer>
            </article>
        </div>
    </section>
</template>

<style scoped>
.settings-block--plugins {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.settings-block__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
}

.settings-block__header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
}

.settings-block__header p {
    margin: 4px 0 0;
    color: rgba(17, 18, 19, 0.6);
}

.plugin-toolbar {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.plugin-button {
    min-width: 96px;
    padding: 8px 14px;
    border: 1px solid rgba(0, 0, 0, 0.18);
    background: rgba(255, 255, 255, 0.92);
    color: #111213;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.plugin-button--outline {
    background: transparent;
}

.plugin-button--danger {
    border-color: rgba(235, 87, 87, 0.35);
    color: #eb5757;
}

.plugin-button--loading,
.plugin-button--disabled {
    opacity: 0.55;
    pointer-events: none;
}

.plugin-directory {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 18px;
    border: 1px solid rgba(0, 0, 0, 0.14);
    background: rgba(255, 255, 255, 0.82);
}

.plugin-directory__info {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.plugin-directory__label {
    font-weight: 600;
    font-size: 13px;
    color: rgba(17, 18, 19, 0.7);
}

.plugin-directory__path {
    max-width: 520px;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 13px;
    color: rgba(17, 18, 19, 0.8);
    word-break: break-all;
}

.plugin-directory__actions {
    display: flex;
    gap: 12px;
}

.plugin-empty {
    padding: 48px 24px;
    text-align: center;
    color: rgba(17, 18, 19, 0.56);
    border: 1px dashed rgba(0, 0, 0, 0.2);
    background: rgba(255, 255, 255, 0.68);
}

.plugin-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
}

.plugin-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 18px 32px rgba(15, 23, 42, 0.08);
}

.plugin-card__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
}

.plugin-card__title {
    font-size: 16px;
    font-weight: 600;
}

.plugin-card__meta {
    display: flex;
    gap: 8px;
    font-size: 12px;
    color: rgba(17, 18, 19, 0.6);
}

.plugin-card__badge {
    padding: 2px 6px;
    border-radius: 8px;
    background: rgba(58, 104, 209, 0.12);
    color: rgba(58, 104, 209, 0.92);
}

.plugin-card__submeta {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: rgba(17, 18, 19, 0.52);
}

.plugin-card__id {
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}

.plugin-card__description {
    margin: 0;
    font-size: 13px;
    color: rgba(17, 18, 19, 0.76);
    min-height: 40px;
}

.plugin-card__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    font-size: 12px;
    color: rgba(17, 18, 19, 0.6);
}

.plugin-card__actions {
    display: flex;
    gap: 8px;
}
</style>
