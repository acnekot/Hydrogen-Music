export default {
  name: 'logger',
  version: '1.0.0',
  description: '示例插件：在应用生命周期中输出调试信息。',
  author: 'Hydrogen Music Team',
  enabled: true,
  async setup({ app, hooks }) {
    console.info('[LoggerPlugin] 已加载，当前 Vue 版本：', app.version)

    const offMounted = hooks.on('app:mounted', () => {
      console.info('[LoggerPlugin] 应用已经挂载完成。')
    })

    return () => {
      offMounted()
      console.info('[LoggerPlugin] 已卸载。')
    }
  }
}
