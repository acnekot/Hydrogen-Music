# 插件系统开发文档

本篇文档介绍 Hydrogen Music 新增的前端插件系统，包括目录结构、插件生命周期、上下文能力以及调试方式。所有内容均基于 Vue 3 + Vite 构建环境。

## 目录结构

```
src/
└── plugins/
    ├── pluginManager.js   # 插件运行时与生命周期管理
    └── modules/           # 每个插件一个文件，按需继续划分子目录
        ├── audioEffectsPlugin.js
        └── lyricVisualizerPlugin.js
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
- `enablePlugin(name)` / `disablePlugin(name)`：更新插件启用状态，并自动触发激活/卸载流程，同时持久化到插件设置存储中；如插件此前被删除，这两个方法会先自动恢复模块再执行后续操作。
- `removePlugin(name, options?)`：移除可删除的插件。默认仅在设置中标记为已删除，传入 `{ forgetState: true }` 将彻底清除相关记录。所有内置
  插件（例如歌词可视化与音效增强）同样标记为可删除，方便调试或替换。
- `restorePlugin(name)`：在插件被标记删除后重新恢复，便于调试临时停用的插件。
- `exportSettings()` / `importSettings(payload, options?)`：导出或导入插件启用/删除等状态。`importSettings` 默认会同步激活状态，可通过 `options.syncActivation = false` 延迟处理。
- `openPluginSettings(name)`：触发插件声明的二级设置入口。当插件提供设置描述时，设置页会自动渲染对应按钮。

### 插件二级设置入口

若插件需要在设置页中提供额外配置，可在定义对象中声明 `settings` 属性：

```js
export default {
  name: 'example',
  settings: {
    label: '打开高级配置',
    route: { name: 'plugin-example-settings' }
  }
}
```

支持的写法：

- `settings.route`：传入 `router.push` 所需的对象或返回该对象的函数。
- `settings.path`：直接指定路由路径（或返回路径的函数）。
- `settings.open(context)`：完全自定义打开行为，`context` 与 `setup` 一致。
- `settings.href`：指定一个链接地址（或返回地址的函数），会在新窗口中打开。

也可以直接提供顶层 `openSettings(context)` 函数，等价于 `settings.open`。按钮文案默认为“插件设置”，可通过 `settings.label` 或 `settingsLabel` 字段覆盖。


### 导入插件设置

`exportSettings()` 会返回如下结构的普通对象，可序列化为 JSON 文件以便备份或迁移：

```json
{
  "plugins": {
    "audio-effects": { "enabled": true, "removed": false },
    "lyric-visualizer": { "enabled": true, "removed": false }
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

## 默认插件示例

Hydrogen Music 默认提供两个可以直接参考的插件模块：

### 歌词音频可视化（`lyricVisualizerPlugin.js`）

- **功能**：在歌词界面绘制实时频谱动画，并提供柱状/圆环样式、采样频段、透明度等十余项视觉参数。插件会在设置页内注册“歌词音频可视化”二级入口（路由：`/plugins/lyric-visualizer`），相关配置逻辑全部封装在 `src/plugins/views/LyricVisualizerSettings.vue` 中。
- **生命周期**：启用后会保持歌词可视化状态；停用或删除时会重置 `playerStore` 内的相关字段，避免残留配置影响其他功能。
- **参考价值**：演示了插件如何注册独立路由、在设置页声明按钮，并与 Pinia store 协同维护大量 UI 交互。

### 音效增强（`audioEffectsPlugin.js`）

- **功能**：基于 Howler 的 Web Audio 管线，为播放器附加低频提升、高频增强与短混响效果。默认启用并提供 `audio-effects` 插件设置路由 `/plugins/audio-effects`，界面位于 `src/plugins/views/AudioEffectsSettings.vue`，包含可开关的滑杆和重置操作。
- **技术要点**：插件在 `setup` 中维护一套自定义的 `Gain`、`BiquadFilter`、`Delay`、`Convolver` 节点，并通过导出的响应式状态向设置页面暴露参数；同时利用插件设置存储持久化用户的增益值。
- **参考价值**：展示了如何安全地接入 Howler 提供的音频上下文、封装共享状态以及保存自定义偏好。

两个示例都设置了 `removable: true`，用户可以在插件管理界面删除或重新导入它们。开发者也可以复制这些文件作为脚手架，快速搭建具备路由、设置和持久化能力的高级插件。

## 调试建议

1. 开发期间保持 `npm run dev` 运行，Vite 会热重载插件文件。
2. 在浏览器控制台或 Electron 调试工具内查看日志，确认插件加载、钩子触发是否符合预期。
3. 如需在运行时动态控制插件，可以在控制台访问 `window.__HYDROGEN_APP__.plugins`（或通过组件内的 `this.$plugins`）。

## 可以实现哪些类型的插件？

插件的能力由 `setup(context)` 提供的上下文决定：你可以直接访问 Vue 应用、路由、Pinia Store 以及钩子系统。借助这些入口，常见的扩展类型包括：

- **第三方 API 集成**：在 `setup` 中发起网络请求、监听钩子并将返回的数据写入 Pinia 或触发自定义事件，从而为应用增加歌词、榜单、推荐算法等服务。
- **主题/样式扩展**：利用 `context.app` 注册全局组件或指令，或者直接注入自定义样式表，以实现暗色主题、季节皮肤等 UI 定制。也可以在钩子中监听应用主题切换，动态调整外观。
- **音频处理与混音辅助**：插件可与现有音频播放逻辑通过钩子交互，在播放事件上挂载处理器、收集电平数据并渲染自定义面板，或调用 Web Audio API 追加混音与效果链。
- **工作流自动化**：结合 `hooks.emit` 与 `hooks.on` 建立跨插件通信，编排定时任务、批量下载、播放列表同步等高级功能。

总之，只要逻辑可以在浏览器/Electron 环境运行，就能封装成插件。若遇到需要持久化的状态，可通过 `PluginSettingsStore` 存储启用信息或自行写入其他后端服务。

祝开发愉快！
