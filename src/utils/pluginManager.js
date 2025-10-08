import { usePlayerStore } from '../store/playerStore'
import { useOtherStore } from '../store/otherStore'
import { useUserStore } from '../store/userStore'
import { providePluginService, removePluginService, getPluginService } from '../plugins/serviceRegistry'
import { noticeOpen, dialogOpen } from './dialog'

const noop = () => {}

class PluginManager {
    constructor({ app, router, pinia, store }) {
        this.app = app
        this.router = router
        this.pinia = pinia
        this.store = store
        this.loadedPlugins = new Map()
        this.moduleCache = new Map()
    }

    async importPlugin(meta, { bustCache = false } = {}) {
        if (!meta || !meta.entry) {
            throw new Error('无效的插件信息')
        }
        if (!bustCache && this.moduleCache.has(meta.id)) {
            return this.moduleCache.get(meta.id)
        }
        const entryUrl = bustCache ? `${meta.entry}?v=${Date.now()}` : meta.entry
        const pluginModule = await import(/* @vite-ignore */ entryUrl)
        const plugin = pluginModule?.default ?? pluginModule
        if (!plugin || typeof plugin !== 'object') {
            throw new Error(`插件 ${meta.id} 未导出有效对象`)
        }
        const record = { module: pluginModule, plugin }
        this.moduleCache.set(meta.id, record)
        return record
    }

    createContext(meta) {
        const cleanupCallbacks = []
        const registerCleanup = (callback) => {
            if (typeof callback === 'function') {
                cleanupCallbacks.push(callback)
            }
        }

        const context = {
            id: meta.id,
            meta,
            app: this.app,
            router: this.router,
            pinia: this.pinia,
            windowApi: typeof window !== 'undefined' ? window.windowApi : null,
            electronAPI: typeof window !== 'undefined' ? window.electronAPI : null,
            stores: {
                player: () => usePlayerStore(this.pinia),
                other: () => useOtherStore(this.pinia),
                user: () => useUserStore(this.pinia),
            },
            provideService: (service) => providePluginService(meta.id, service),
            removeService: () => removePluginService(meta.id),
            getService: (id) => getPluginService(id),
            notice: (text, duration = 2) => noticeOpen(text, duration),
            dialog: dialogOpen,
            registerCleanup,
        }

        context.cleanup = async () => {
            while (cleanupCallbacks.length) {
                const callback = cleanupCallbacks.shift()
                try {
                    await callback()
                } catch (error) {
                    console.error(`[Plugin] 清理插件 ${meta.id} 失败:`, error)
                }
            }
            removePluginService(meta.id)
        }

        return context
    }

    async loadPlugin(meta, { bustCache = true } = {}) {
        const { plugin } = await this.importPlugin(meta, { bustCache })
        const context = this.createContext(meta)
        let cleanupFromActivate = noop
        try {
            if (typeof plugin.activate === 'function') {
                const result = await plugin.activate(context)
                if (typeof result === 'function') {
                    context.registerCleanup(result)
                    cleanupFromActivate = result
                }
            }
            this.loadedPlugins.set(meta.id, { meta, plugin, context })
        } catch (error) {
            console.error(`[Plugin] 激活插件 ${meta.id} 失败:`, error)
            try {
                await cleanupFromActivate?.()
            } catch (_) {
                /* ignore */
            }
            await context.cleanup()
            throw error
        }
        return this.loadedPlugins.get(meta.id)
    }

    async unloadPlugin(id) {
        const record = this.loadedPlugins.get(id)
        if (!record) return
        const { plugin, context } = record
        try {
            if (typeof plugin.deactivate === 'function') {
                await plugin.deactivate(context)
            }
        } catch (error) {
            console.error(`[Plugin] 停用插件 ${id} 时发生错误:`, error)
        }
        await context.cleanup()
        this.loadedPlugins.delete(id)
    }

    async disableAll() {
        const ids = Array.from(this.loadedPlugins.keys())
        for (const id of ids) {
            await this.unloadPlugin(id)
        }
    }

    async syncWithState(plugins, pluginStates, enabled) {
        if (!enabled) {
            await this.disableAll()
            return
        }

        const desired = new Set()
        for (const meta of plugins) {
            if (pluginStates[meta.id]) desired.add(meta.id)
        }

        for (const id of Array.from(this.loadedPlugins.keys())) {
            if (!desired.has(id)) {
                await this.unloadPlugin(id)
            }
        }

        for (const meta of plugins) {
            if (!desired.has(meta.id)) continue
            if (this.loadedPlugins.has(meta.id)) continue
            try {
                await this.loadPlugin(meta)
            } catch (error) {
                console.error(`[Plugin] 同步插件 ${meta.id} 失败:`, error)
            }
        }
    }

    pruneCaches(validIds = []) {
        const validSet = new Set(validIds)
        for (const id of Array.from(this.moduleCache.keys())) {
            if (!validSet.has(id)) {
                this.moduleCache.delete(id)
            }
        }
    }

    invalidate(id) {
        if (this.moduleCache.has(id)) {
            this.moduleCache.delete(id)
        }
    }

    async loadSettingsComponent(meta) {
        try {
            const { plugin } = await this.importPlugin(meta, { bustCache: false })
            if (!plugin) return null
            const settingsFactory = plugin.settingsComponent || plugin.settings || plugin.getSettingsComponent
            if (!settingsFactory) return null
            if (typeof settingsFactory === 'function') {
                const resolved = await settingsFactory({
                    meta,
                    app: this.app,
                    router: this.router,
                    pinia: this.pinia,
                    store: this.store,
                })
                if (resolved && resolved.default) return resolved.default
                return resolved
            }
            return settingsFactory
        } catch (error) {
            console.error(`[Plugin] 加载插件 ${meta.id} 设置面板失败:`, error)
            return null
        }
    }
}

export default PluginManager
