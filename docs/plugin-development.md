# 插件系统开发文档

本篇文档介绍 Hydrogen Music 新增的前端插件系统，包括目录结构、插件生命周期、上下文能力以及调试方式。所有内容均基于 Vue 3 + Vite 构建环境。

## 目录结构

```
src/
└── plugins/
    ├── pluginManager.js   # 插件运行时与生命周期管理
    └── modules/           # 每个插件一个文件，按需继续划分子目录
        └── loggerPlugin.js
```

- `pluginManager.js`：提供 `PluginManager` 类和 `createPluginManager` 工厂方法，负责加载插件、管理生命周期、分发钩子事件。
- `modules/`：放置所有插件定义。新插件只需在该目录（或子目录）内创建一个 `*.js` 文件并导出插件对象即可。

## 插件定义

每个插件文件需要默认导出一个对象，推荐结构如下：

```js
export default {
  name: 'unique-name',        // 必填，全局唯一的插件名
  version: '1.0.0',           // 可选，语义化版本号
  description: '描述信息',    // 可选，插件说明
  author: '作者',             // 可选
  enabled: true,              // 可选，默认 true；设为 false 则不会自动加载
  async setup(context) {
    // 在这里编写插件逻辑
    return () => { /* 可选的卸载清理函数 */ }
  }
}
```

### setup(context)

`setup` 会在应用启动时由插件管理器调用，并接收一个 `context` 对象，包含以下能力：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `app` | `App` | Vue 应用实例，可用于注册全局组件、指令等 |
| `router` | `Router \| null` | Vue Router 实例（如有需要可进行路由扩展） |
| `pinia` | `Pinia \| null` | Pinia 根实例，可用于注册 store 或访问全局状态 |
| `manager` | `PluginManager` | 插件管理器本体，可进一步调用 `activatePlugin` 等方法 |
| `hooks` | `PluginHooks` | 钩子系统，包含 `on`、`off`、`emit` 三个方法 |

`setup` 可以是同步或异步函数；若返回一个函数，该函数会在插件被卸载时执行用于清理资源。

## 钩子（Hook）系统

插件可以通过 `context.hooks` 订阅或触发自定义事件，实现插件间通信或监听应用生命周期。

- `hooks.on(name, handler)`：订阅钩子事件，返回取消订阅函数。
- `hooks.off(name, handler)`：取消订阅。
- `hooks.emit(name, payload)`：主动触发钩子事件，支持异步处理，返回 `Promise`。

应用内置的生命周期钩子：

| 钩子名 | 触发时机 |
| ------ | -------- |
| `app:created` | 所有插件加载完毕后触发（可能是异步过程）。 |
| `app:mounted` | Vue 应用完成挂载后触发。 |
| `app:ready` | 应用完成初始化流程（`init()` 执行）后触发。 |

插件也可以自定义其他钩子，约定名称即可。

## 插件管理 API

`createPluginManager` 会在 `src/main.js` 中初始化，并通过 `app.config.globalProperties.$plugins` 暴露给 Vue 实例与组件。

可用方法：

- `listPlugins()`：返回当前已注册插件的元信息数组。
- `activatePlugin(name)`：手动激活指定插件。
- `deactivatePlugin(name)`：停用指定插件，并调用其卸载函数。
- `emitHook(name, payload)`：从应用层触发钩子事件。

在 Vue 组件中可以通过 `this.$plugins` 访问这些能力。

## 示例插件

`src/plugins/modules/loggerPlugin.js` 展示了最小可运行示例：

```js
export default {
  name: 'logger',
  version: '1.0.0',
  description: '示例插件：在应用生命周期中输出调试信息。',
  async setup({ app, hooks }) {
    console.info('[LoggerPlugin] Vue version:', app.version)

    const offMounted = hooks.on('app:mounted', () => {
      console.info('[LoggerPlugin] 应用已经挂载。')
    })

    return () => {
      offMounted()
      console.info('[LoggerPlugin] 已卸载。')
    }
  }
}
```

开发者可以基于此示例快速创建新插件并验证钩子系统。

## 调试建议

1. 开发期间保持 `npm run dev` 运行，Vite 会热重载插件文件。
2. 在浏览器控制台或 Electron 调试工具内查看日志，确认插件加载、钩子触发是否符合预期。
3. 如需在运行时动态控制插件，可以在控制台访问 `window.__HYDROGEN_APP__.plugins`（或通过组件内的 `this.$plugins`）。

祝开发愉快！
