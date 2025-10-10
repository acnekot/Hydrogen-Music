import { ref } from 'vue'

import { usePlayerStore } from '../store/playerStore'
import { useUserStore } from '../store/userStore'
import { useLibraryStore } from '../store/libraryStore'
import { useLocalStore } from '../store/localStore'
import { useOtherStore } from '../store/otherStore'
import { useCloudStore } from '../store/cloudStore'
import { noticeOpen } from '../utils/dialog'

const activePlugins = new Map()
let baseContext = null

const pluginSettingsRegistry = new Map()
const pluginSettingsVersion = ref(0)

const notifyPluginSettingsChange = () => {
    pluginSettingsVersion.value += 1
}

const clearPluginSettings = (pluginId) => {
    if (!pluginId) return
    if (pluginSettingsRegistry.delete(pluginId)) {
        notifyPluginSettingsChange()
    }
}

const getWindowApi = () => {
    if (typeof window === 'undefined') return null
    return window.windowApi || null
}

const getElectronApi = () => {
    if (typeof window === 'undefined') return null
    return window.electronAPI || null
}

const buildStores = (pinia) => ({
    player: usePlayerStore(pinia),
    user: useUserStore(pinia),
    library: useLibraryStore(pinia),
    local: useLocalStore(pinia),
    other: useOtherStore(pinia),
    cloud: useCloudStore(pinia),
})

const ensureBaseStores = () => {
    if (!baseContext || !baseContext.pinia) return null
    if (!baseContext.stores || !baseContext.stores.player) {
        try {
            baseContext.stores = buildStores(baseContext.pinia)
        } catch (error) {
            console.error('[Plugin] 初始化 Pinia store 失败:', error)
            baseContext.stores = null
        }
    }
    return baseContext.stores || null
}

const createPluginUtilities = () => ({
    notice: (message, duration = 2) => {
        try {
            noticeOpen(message, duration)
        } catch (error) {
            console.error('[Plugin] 调用通知失败:', error)
        }
    },
})

const createPluginContext = (metadata) => {
    if (!baseContext) {
        throw new Error('插件系统尚未初始化')
    }
    const cleanupHandlers = []
    const windowApi = getWindowApi()
    const electronAPI = getElectronApi()

    const normalizeSettingsPage = (page) => {
        if (!page || (typeof page.mount !== 'function' && typeof page.render !== 'function')) {
            throw new Error('插件设置页面必须提供 mount(container) 方法')
        }
        const mount = typeof page.mount === 'function' ? page.mount : page.render
        const unmount = typeof page.unmount === 'function' ? page.unmount : (typeof page.dispose === 'function' ? page.dispose : null)
        const order = Number.isFinite(page.order) ? Number(page.order) : 0
        return {
            pluginId: metadata.id,
            id: page.id || metadata.id,
            title: page.title || metadata.name || metadata.id,
            subtitle: page.subtitle || page.description || metadata.description || '',
            description: page.description || '',
            icon: page.icon || null,
            order,
            mount,
            unmount,
        }
    }

    const registerSettingsPage = (page) => {
        const normalized = normalizeSettingsPage(page)
        pluginSettingsRegistry.set(metadata.id, normalized)
        notifyPluginSettingsChange()
        return () => {
            if (pluginSettingsRegistry.get(metadata.id) === normalized) {
                pluginSettingsRegistry.delete(metadata.id)
                notifyPluginSettingsChange()
            }
        }
    }

    const pluginBridge = {
        id: metadata.id,
        async readText(relativePath) {
            if (!windowApi?.readPluginFile) throw new Error('插件文件读取 API 不可用')
            const result = await windowApi.readPluginFile(metadata.id, relativePath, 'utf-8')
            if (!result?.success) {
                throw new Error(result?.message || '读取插件文件失败')
            }
            return result.data
        },
        async readBase64(relativePath) {
            if (!windowApi?.readPluginFile) throw new Error('插件文件读取 API 不可用')
            const result = await windowApi.readPluginFile(metadata.id, relativePath, 'base64')
            if (!result?.success) {
                throw new Error(result?.message || '读取插件文件失败')
            }
            return result.data
        },
    }

    const stores = ensureBaseStores()

    const context = {
        app: baseContext.app,
        router: baseContext.router,
        pinia: baseContext.pinia,
        stores,
        metadata: {
            id: metadata.id,
            name: metadata.name,
            version: metadata.version,
            description: metadata.description,
            author: metadata.author,
            homepage: metadata.homepage,
        },
        plugin: pluginBridge,
        windowApi,
        electronAPI,
        utils: createPluginUtilities(),
        settings: {
            register(page) {
                const unregister = registerSettingsPage(page)
                cleanupHandlers.push(() => unregister())
                return unregister
            },
            unregister() {
                clearPluginSettings(metadata.id)
            },
            get() {
                return pluginSettingsRegistry.get(metadata.id) || null
            },
        },
        onCleanup(handler) {
            if (typeof handler === 'function') cleanupHandlers.push(handler)
        },
    }

    Object.defineProperty(context, '__cleanupHandlers', {
        value: cleanupHandlers,
        enumerable: false,
    })

    return context
}

const instantiatePlugin = (pkg) => {
    const { code, id, entryPath } = pkg
    const module = { exports: {} }
    const exports = module.exports
    const require = (request) => {
        throw new Error(`插件 ${id} 不支持 require('${request}')，请将依赖打包到插件中或使用 Hydrogen API`)
    }
    try {
        const wrapped = new Function('module', 'exports', 'require', `${code}\n//# sourceURL=${entryPath}`)
        wrapped(module, exports, require)
    } catch (error) {
        console.error(`执行插件代码失败: ${id}`, error)
        throw error
    }
    const exported = module.exports?.default ?? module.exports
    if (typeof exported === 'function') {
        return { activate: exported }
    }
    return exported
}

const cleanupPlugin = (record) => {
    if (!record) return
    try {
        if (typeof record.instance?.deactivate === 'function') {
            record.instance.deactivate(record.context)
        }
    } catch (error) {
        console.error(`执行插件停用逻辑失败: ${record.metadata?.id}`, error)
    }
    if (Array.isArray(record.cleanups)) {
        for (const handler of record.cleanups) {
            try {
                handler?.()
            } catch (error) {
                console.error('执行插件清理逻辑失败:', error)
            }
        }
    }
    clearPluginSettings(record.metadata?.id)
}

export async function initPluginSystem({ app, router, pinia }) {
    const windowApi = getWindowApi()
    if (!windowApi?.getEnabledPlugins) {
        console.warn('[Plugin] 插件系统不可用，缺少相关 API')
        return
    }

    baseContext = {
        app,
        router,
        pinia,
        stores: buildStores(pinia),
    }

    ensureBaseStores()

    await reloadPluginSystem()
}

export async function reloadPluginSystem() {
    if (!baseContext) return
    const windowApi = getWindowApi()
    if (!windowApi?.getEnabledPlugins) return

    for (const [id, record] of activePlugins.entries()) {
        cleanupPlugin(record)
        activePlugins.delete(id)
    }

    let response
    try {
        response = await windowApi.getEnabledPlugins()
    } catch (error) {
        console.error('[Plugin] 获取启用插件失败:', error)
        return
    }

    if (!response?.success || !Array.isArray(response.plugins)) {
        console.error('[Plugin] 启用插件列表格式错误', response)
        return
    }

    for (const pkg of response.plugins) {
        try {
            const instance = instantiatePlugin(pkg)
            if (!instance) continue
            const context = createPluginContext(pkg)
            const cleanups = context.__cleanupHandlers || []
            if (typeof instance.activate === 'function') {
                instance.activate(context)
            } else if (typeof instance === 'function') {
                instance(context)
            } else {
                console.warn(`插件 ${pkg.id} 未提供 activate 函数`)
                continue
            }
            activePlugins.set(pkg.id, {
                instance,
                context,
                metadata: pkg,
                cleanups,
            })
        } catch (error) {
            console.error(`加载插件失败: ${pkg?.id}`, error)
            try {
                createPluginUtilities().notice(`插件 ${pkg?.name || pkg?.id || ''} 加载失败`) // inform user
            } catch (_) {
                // ignore
            }
        }
    }
}

export function getActivePlugins() {
    return Array.from(activePlugins.values()).map((record) => ({
        id: record.metadata?.id,
        name: record.metadata?.name,
        version: record.metadata?.version,
        enabled: true,
    }))
}

export const pluginSettingsVersionSignal = pluginSettingsVersion

export function getPluginSettingsPage(pluginId) {
    return pluginSettingsRegistry.get(pluginId) || null
}

export function hasPluginSettingsPage(pluginId) {
    return pluginSettingsRegistry.has(pluginId)
}

export function listPluginSettingsPages() {
    return Array.from(pluginSettingsRegistry.values())
}
