import settingsComponent from './settings.js'

export default {
    id: 'sample-plugin',
    name: '示例插件',
    version: '0.1.0',
    description: '演示 Hydrogen Music 插件系统基础能力的示例插件。',
    author: 'Hydrogen Team',
    settingsComponent,
    activate(context) {
        const service = {
            getWelcomeMessage() {
                return '感谢体验 Hydrogen Music 插件系统！'
            },
        }
        context.provideService(service)
        context.registerCleanup(() => context.removeService())
        console.info('[SamplePlugin] 插件已启用')
    },
    deactivate(context) {
        context.removeService()
        console.info('[SamplePlugin] 插件已停用')
    },
}
