import { defineStore } from 'pinia'
import PluginManager from '../utils/pluginManager'

export const usePluginStore = defineStore('pluginStore', {
    state: () => ({
        initialized: false,
        initializing: false,
        enabled: false,
        acknowledged: false,
        directory: '',
        defaultDirectory: '',
        pluginStates: {},
        plugins: [],
        loading: false,
        manager: null,
        settingsCache: {},
    }),
    getters: {
        pluginList(state) {
            return state.plugins.map(item => ({
                ...item,
                enabled: !!state.pluginStates[item.id],
            }))
        },
    },
    actions: {
        async initialize(app, router, pinia) {
            if (this.initialized || this.initializing) return
            this.initializing = true
            this.manager = new PluginManager({ app, router, pinia, store: this })
            await this.refreshPlugins()
            this.initialized = true
            this.initializing = false
        },
        async applyOverview(overview, { syncRuntime = true } = {}) {
            if (!overview) return
            this.enabled = !!overview.enabled
            this.acknowledged = !!overview.acknowledged
            this.directory = overview.directory || this.directory
            this.defaultDirectory = overview.defaultDirectory || this.defaultDirectory
            this.pluginStates = overview.pluginStates || {}
            this.plugins = overview.plugins || []
            if (this.manager) {
                this.manager.pruneCaches(this.plugins.map(item => item.id))
                if (syncRuntime) {
                    await this.manager.syncWithState(this.plugins, this.pluginStates, this.enabled)
                }
            }
        },
        async refreshPlugins() {
            this.loading = true
            try {
                const overview = await windowApi.refreshPlugins()
                await this.applyOverview(overview)
            } catch (error) {
                console.error('[Plugin] 刷新插件列表失败:', error)
            } finally {
                this.loading = false
            }
        },
        async setEnabled(value) {
            try {
                const overview = await windowApi.setPluginFeatureEnabled(!!value)
                await this.applyOverview(overview)
            } catch (error) {
                console.error('[Plugin] 更新插件功能开关失败:', error)
            }
        },
        async acknowledgeWarning() {
            try {
                const overview = await windowApi.acknowledgePluginWarning()
                await this.applyOverview(overview, { syncRuntime: false })
            } catch (error) {
                console.error('[Plugin] 更新插件提示状态失败:', error)
            }
        },
        async setDirectory(path) {
            if (!path) return
            try {
                const overview = await windowApi.setPluginDirectory(path)
                this.settingsCache = {}
                await this.applyOverview(overview)
            } catch (error) {
                console.error('[Plugin] 设置插件目录失败:', error)
            }
        },
        async resetDirectory() {
            try {
                const overview = await windowApi.resetPluginDirectory()
                this.settingsCache = {}
                await this.applyOverview(overview)
            } catch (error) {
                console.error('[Plugin] 重置插件目录失败:', error)
            }
        },
        async setPluginState(id, enabled) {
            if (!id) return
            try {
                const overview = await windowApi.setPluginState(id, !!enabled)
                await this.applyOverview(overview)
            } catch (error) {
                console.error(`[Plugin] 更新插件 ${id} 状态失败:`, error)
            }
        },
        async deletePlugin(id) {
            if (!id) return
            try {
                const overview = await windowApi.deletePlugin(id)
                if (this.settingsCache[id]) delete this.settingsCache[id]
                await this.applyOverview(overview)
            } catch (error) {
                console.error(`[Plugin] 删除插件 ${id} 失败:`, error)
            }
        },
        async reloadRenderer() {
            try {
                await windowApi.reloadApp()
            } catch (error) {
                console.error('[Plugin] 重载播放器失败:', error)
            }
        },
        getPluginMeta(id) {
            if (!id) return null
            return this.plugins.find(item => item.id === id) || null
        },
        async loadPluginSettingsComponent(id) {
            if (!id || !this.manager) return null
            if (this.settingsCache[id]) return this.settingsCache[id]
            const meta = this.getPluginMeta(id)
            if (!meta) return null
            const component = await this.manager.loadSettingsComponent(meta)
            if (component) {
                this.settingsCache = { ...this.settingsCache, [id]: component }
            }
            return component
        },
    },
})
