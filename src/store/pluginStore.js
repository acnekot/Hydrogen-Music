import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { noticeOpen } from '../utils/dialog'
import { createPluginContext } from '../plugins/pluginContext'

const ensurePluginApi = () => {
    if (typeof window === 'undefined') return null
    const api = window?.windowApi?.plugins
    if (!api) {
        console.warn('[PluginStore] 插件 API 未注入，插件系统不可用')
    }
    return api
}

const normalizeError = (error) => {
    if (!error) return '未知错误'
    if (typeof error === 'string') return error
    if (error?.message) return error.message
    try {
        return JSON.stringify(error)
    } catch (_) {
        return String(error)
    }
}

export const usePluginStore = defineStore('pluginStore', {
    state: () => ({
        plugins: [],
        loading: false,
        initialized: false,
    }),
    actions: {
        async initialize() {
            if (this.initialized) return
            this.initialized = true
            const api = ensurePluginApi()
            if (!api) return
            await this.refresh()
            for (const plugin of this.plugins) {
                if (plugin.enabled && !plugin.broken) {
                    await this.enablePlugin(plugin.id, { silent: true, persist: false })
                }
            }
        },
        async refresh() {
            const api = ensurePluginApi()
            if (!api) return
            this.loading = true
            try {
                const response = await api.list()
                const previous = new Map(this.plugins.map((item) => [item.id, item]))
                this.plugins = response.map((item) => {
                    const prev = previous.get(item.id)
                    const runtime = item.broken ? null : prev?.runtime ?? null
                    const enabled = !!item.enabled
                    return reactive({
                        id: item.id,
                        name: item.name || item.id,
                        version: item.version || '0.0.0',
                        description: item.description || '',
                        author: item.author || '',
                        entry: item.entry,
                        entryUrl: item.entryUrl,
                        path: item.path,
                        enabled,
                        broken: !!item.broken,
                        error: item.error || null,
                        runtime,
                        isLoading: false,
                    })
                })
            } catch (error) {
                console.error('[PluginStore] 获取插件列表失败', error)
                noticeOpen(`加载插件失败：${normalizeError(error)}`, 3)
            } finally {
                this.loading = false
            }
        },
        async installPluginFromPath(sourcePath) {
            const api = ensurePluginApi()
            if (!api || !sourcePath) return
            try {
                const manifest = await api.install(sourcePath)
                await this.refresh()
                const installed = this.plugins.find((item) => item.id === manifest.id)
                const wasEnabled = installed?.enabled
                if (wasEnabled) {
                    await this.enablePlugin(manifest.id, { silent: true, forceReload: true })
                }
                noticeOpen(`插件 ${manifest.name || manifest.id} 安装成功`, 2)
            } catch (error) {
                console.error('[PluginStore] 安装插件失败', error)
                noticeOpen(`安装插件失败：${normalizeError(error)}`, 3)
            }
        },
        async uninstallPlugin(pluginId) {
            const api = ensurePluginApi()
            if (!api) return
            const target = this.plugins.find((item) => item.id === pluginId)
            if (!target) return
            if (target.runtime) {
                await this.disablePlugin(pluginId, { silent: true })
            }
            try {
                await api.uninstall(pluginId)
                this.plugins = this.plugins.filter((item) => item.id !== pluginId)
                noticeOpen(`插件 ${target.name} 已卸载`, 2)
            } catch (error) {
                console.error('[PluginStore] 卸载插件失败', error)
                noticeOpen(`卸载插件失败：${normalizeError(error)}`, 3)
            }
        },
        async enablePlugin(pluginId, options = {}) {
            const api = ensurePluginApi()
            if (!api) return
            const { silent = false, persist = true, forceReload = false } = options
            const plugin = this.plugins.find((item) => item.id === pluginId)
            if (!plugin || plugin.broken) {
                if (!silent) noticeOpen(`插件 ${plugin?.name || pluginId} 无法启用`, 3)
                return
            }
            if (plugin.isLoading) return
            if (plugin.runtime && !forceReload) return

            if (plugin.runtime && forceReload) {
                await this.disablePlugin(pluginId, { silent: true, persist: false })
            }

            plugin.isLoading = true
            plugin.error = null
            try {
                let entryUrl = plugin.entryUrl
                if (!entryUrl) {
                    const { entryUrl: latestUrl } = await api.getEntry(pluginId)
                    entryUrl = latestUrl
                    plugin.entryUrl = entryUrl
                }
                const module = await import(/* @vite-ignore */ `${entryUrl}?t=${Date.now()}`)
                const pluginModule = module?.default || module
                if (!pluginModule || typeof pluginModule.activate !== 'function') {
                    throw new Error('插件缺少 activate 方法')
                }
                const context = createPluginContext(plugin)
                const disposer = await pluginModule.activate(context)
                plugin.runtime = {
                    module: pluginModule,
                    context,
                    dispose: typeof disposer === 'function' ? disposer : null,
                }
                plugin.enabled = true
                plugin.error = null
                if (persist) await api.setEnabled(pluginId, true)
                if (!silent) noticeOpen(`插件 ${plugin.name} 已启用`, 2)
            } catch (error) {
                console.error(`[PluginStore] 启用插件 ${pluginId} 失败`, error)
                plugin.error = normalizeError(error)
                plugin.enabled = false
                plugin.runtime = null
                if (persist) await api.setEnabled(pluginId, false)
                if (!silent) noticeOpen(`启用插件失败：${plugin.error}`, 3)
            } finally {
                plugin.isLoading = false
            }
        },
        async disablePlugin(pluginId, options = {}) {
            const api = ensurePluginApi()
            if (!api) return
            const { silent = false, persist = true } = options
            const plugin = this.plugins.find((item) => item.id === pluginId)
            if (!plugin) return
            if (plugin.isLoading) return

            plugin.isLoading = true
            try {
                if (plugin.runtime) {
                    const { module, context, dispose } = plugin.runtime
                    if (typeof dispose === 'function') {
                        await dispose()
                    } else if (module && typeof module.deactivate === 'function') {
                        await module.deactivate(context)
                    }
                }
                plugin.runtime = null
                plugin.enabled = false
                if (persist) await api.setEnabled(pluginId, false)
                if (!silent) noticeOpen(`插件 ${plugin.name} 已停用`, 2)
            } catch (error) {
                console.error(`[PluginStore] 停用插件 ${pluginId} 失败`, error)
                plugin.error = normalizeError(error)
                if (!silent) noticeOpen(`停用插件失败：${plugin.error}`, 3)
            } finally {
                plugin.isLoading = false
            }
        },
    },
})
