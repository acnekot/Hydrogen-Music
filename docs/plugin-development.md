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

> 💡 **自动导入机制**：`createPluginManager` 内部使用 `import.meta.glob('./modules/**/*.js', { eager: true })` 扫描 `modules` 目录并在构建阶段自动导入所有插件文件。新增插件只要放入该目录，Vite 即会在下一次热更新或重新构建时将其打包并交给插件管理器注册，无需手动改动入口代码。

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
- `enablePlugin(name)` / `disablePlugin(name)`：更新插件启用状态，并自动触发激活/卸载流程，同时持久化到插件设置存储中。
- `removePlugin(name, options?)`：移除可删除的插件。默认仅在设置中标记为已删除，传入 `{ forgetState: true }` 将彻底清除相关记录。
- `restorePlugin(name)`：在插件被标记删除后重新恢复，便于调试临时停用的插件。
- `exportSettings()` / `importSettings(payload, options?)`：导出或导入插件启用/删除等状态。`importSettings` 默认会同步激活状态，可通过 `options.syncActivation = false` 延迟处理。

### 导入插件设置

`exportSettings()` 会返回如下结构的普通对象，可序列化为 JSON 文件以便备份或迁移：

```json
{
  "plugins": {
    "logger": { "enabled": true, "removed": false }
  }
}
```

在另一环境恢复时，先读取该 JSON，再传入 `importSettings`：

```js
import settings from './plugin-settings.json'

await pluginManager.importSettings(settings)
```

若是通过文件选择器或网络请求获取到字符串内容，则需要先 `JSON.parse`：

```js
const fileContent = await file.text()
const payload = JSON.parse(fileContent)
await pluginManager.importSettings(payload)
```

如暂不希望立即激活或停用插件，可调用 `pluginManager.importSettings(payload, { syncActivation: false })`，稍后再按需执行 `enablePlugin` / `disablePlugin`。

在 Vue 组件中可以通过 `this.$plugins` 访问这些能力。

### 插件设置存储

插件管理器会通过 `PluginSettingsStore` 自动记住插件的启用、禁用和删除状态，默认使用浏览器的 `localStorage`（Electron 版本也适用）。

- 自定义存储：可以在创建插件管理器时通过 `createPluginManager(app, { storage, settingsKey })` 传入实现了 `getItem` / `setItem` 的存储适配器或自定义 key。
- 导入/导出：借助上文的 `exportSettings` 与 `importSettings`，可以轻松备份或迁移插件设置。
- 删除策略：`removePlugin(name)` 会停止插件并在设置中打上删除标记；若想彻底移除并遗忘该插件，传入 `{ forgetState: true }`。

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
