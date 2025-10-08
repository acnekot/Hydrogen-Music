import { usePluginStore } from '../store/pluginStore'

export async function initPluginRuntime(app, router, pinia) {
    try {
        const pluginStore = usePluginStore(pinia)
        await pluginStore.initialize(app, router, pinia)
    } catch (error) {
        console.error('[Plugin] 初始化插件运行时失败:', error)
    }
}
