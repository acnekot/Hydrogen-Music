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
| `plugin` | `PluginMeta` | 当前插件的运行时元信息（包含 `name`、`origin`、`enabled` 等字段） |
| `assets` | `{ list(): string[]; has(path): boolean; read(path, options?) }` | 便捷访问插件包内的静态资源 |

`setup` 可以是同步或异步函数；若返回一个函数，该函数会在插件被卸载时执行用于清理资源。

当插件以 `.hym` 包的形式安装时，可通过 `context.assets` 读取打包内的文件。例如：

```js
const text = await context.assets.read('templates/help.md')
const config = await context.assets.read('config/options.json', { type: 'json' })
```

`assets.read` 默认返回字符串内容，`options.type` 支持 `text`、`json`、`arrayBuffer` 与 `base64`。`assets.list()` 可以查看所有可用的文件路径。

## 插件包（`.hym`）规范

Hydrogen Music 支持将插件打包成自定义的 `.hym` 文件，便于分发与导入。该格式本质上是一个 ZIP 压缩包，需要满足以下约定：

| 项目 | 说明 |
| --- | --- |
| 文件扩展名 | 固定为 `.hym` |
| 必备文件 | `manifest.json`（插件元数据）与入口文件 `index.js`，也可在 manifest 中通过 `main` 指向其他 JS/JSON 入口 |
| manifest 字段 | 建议提供 `name`、`displayName`、`version`、`description`、`author` 等信息，`name` 会作为插件唯一标识 |
| 资源文件 | 可按需附带任意静态资源，运行时可通过 `context.assets` 访问 |

导入 `.hym` 文件时，渲染进程会解析并校验 manifest，然后将全部文件交由 Electron 主进程解压。默认情况下，解压后的内容会写入
`app.getPath('userData')/plugins/installed/<插件名>-<时间戳>`；如果用户在设置页或运行时代码中指定了自定义的插件存储目录，则会保存到该路径
下的唯一子文件夹中。插件入口脚本会被动态导入，运行时上下文可以立即访问随包提供的资源。卸载插件或彻底移除时，对应目录也会被删除；重启
应用后会从该目录重新加载插件，无需再次手动导入。

> ℹ️ 入口脚本需要导出标准的插件对象。可以直接使用编译后的 `.js`/`.mjs` 模块或 JSON 配置；若希望提供 `.vue` 组件，请提前通过构建流程
> 输出可直接运行的 JavaScript。

设置页的“导入插件”区块提供统一的按钮以选择 `.hym` 文件。导入成功后会展示插件来源标签（内置插件 / 插件包），并可继续打开插件声明的二级设置入口。

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
- `removePlugin(name, options?)`：移除可删除的插件。默认仅在设置中标记为已删除，传入 `{ forgetState: true }` 会同时删除插件存档目录与设置，彻底清除相关记录。
  所有内置插件（例如歌词可视化与音效增强）同样标记为可删除，方便调试或替换。
- `restorePlugin(name)`：在插件被标记删除后重新恢复，便于调试临时停用的插件。
- `exportSettings()` / `importSettings(payload, options?)`：导出或导入插件启用/删除等状态。`importSettings` 默认会同步激活状态，可通过 `options.syncActivation = false` 延迟处理。
- `openPluginSettings(name)`：触发插件声明的二级设置入口。当插件提供设置描述时，设置页会自动渲染对应按钮。
- `importPluginPackage(file, options?)`：从 `.hym` 插件包安装或更新插件模块，默认会立即启用并在设置存储中记录解压目录与 manifest 信息；
  插件文件会解压到当前生效的插件存储目录，后续重启会自动从磁盘恢复。
- `listPluginAssets(name)` / `readPluginAsset(name, path, options?)`：访问插件包随附的文件资源，`options.type` 支持 `text`、`json`、`arrayBuffer` 与 `base64`，便于在运行时加载额外的配置或模板。
- `ensurePackagesRestored()`：返回一个 Promise，在所有持久化的插件包被重新加载后 resolve，适合在界面初始化时等待插件就绪。
- `getPackageRootDirectory(options?)`：获取当前插件包存储目录的绝对路径，便于在调试日志或界面上显示。
- `setPackageRootDirectory(directory)`：调整插件包的存储位置，Electron 主进程会在保持既有插件的情况下迁移文件夹；若提供的路径与当前相同，则不会重复移动。

设置页在首次启用任意插件时都会弹出“目前该功能正在测试中，可能出现 BUG，确认开启？”提示，用户确认后会在插件状态中记录 `experimentalAck`
字段，后续无需重复提醒。

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

`exportSettings()` 会返回如下结构的普通对象，可序列化为 JSON 文件以便备份或迁移。设置界面默认仅提供插件包导入按钮，如需恢复启用状态，可以在调试控制台或业务代码中调用 `importSettings()`：

```json
{
  "plugins": {
    "audio-effects": { "enabled": true, "removed": false, "experimentalAck": true },
    "lyric-visualizer": { "enabled": true, "removed": false },
    "my-package-plugin": {
      "enabled": true,
      "removed": false,
      "package": {
        "directory": "C:/Users/<you>/AppData/Roaming/Hydrogen Music/plugins/installed/my-package-plugin-nf42r8",
        "directoryName": "my-package-plugin-nf42r8",
        "entry": "index.js",
        "files": ["manifest.json", "index.js", "assets/config.json"],
        "manifest": { "name": "my-package-plugin", "displayName": "示例插件", "version": "1.0.0" }
      }
    }
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

若某个插件来源于 `.hym` 包，导出的 JSON 会在对应条目下包含 `package` 字段。Electron 环境下会记录解压后的 `directory`、`directoryName`、`entry`、`files`
等信息；其中 `directoryName` 表示插件在存储目录中的文件夹名称，便于在用户调整存储路径时重写绝对地址。如果当前平台不支持磁盘持久化，则会退化为 `archive`（Base64）形式。`importSettings` 会优先尝试使用目录恢复，若不存在则回退至归档数据，确保插件在新环境中可以重新加载。

在 Vue 组件中可以通过 `this.$plugins` 访问这些能力。

## 插件包（.hym）格式

除了在源码中维护插件模块，也可以通过“插件包”在运行时动态安装。Hydrogen Music 约定使用 `.hym` 扩展名的 Zip 压缩文件，内部结构如下：

```
my-plugin.hym
├─ manifest.json      # 插件清单，描述名称、版本、入口文件等
├─ index.js           # 插件入口，可以是 ES Module（推荐）或 JSON
└─ assets/...         # 其他资源文件，运行时可通过 context.assets 访问
```

### manifest.json 字段

```json
{
  "name": "my-plugin",
  "displayName": "示例插件",
  "version": "1.0.0",
  "description": "演示如何通过 .hym 安装插件",
  "author": "Hydrogen", 
  "main": "index.js"    // 可省略，默认 index.js；也支持 .json 入口
}
```

- `name` 必填且全局唯一。
- `main` 指向插件入口文件，支持 `.js` 或 `.mjs` 模块；若指向 `.json`，系统会自动解析为插件对象。
- 其余字段会被同步到插件元信息中，显示在设置界面。

### 入口文件示例

```js
export default {
  name: 'my-plugin',
  description: '通过 .hym 导入的插件',
  setup({ hooks }) {
    hooks.emit('example:ready')
    return () => {
      console.log('my-plugin disabled')
    }
  }
}
```

### 打包与导入

1. 将清单、入口文件及附属资源打包为 Zip，推荐使用“存储”模式（不压缩）以获得最佳兼容性；若使用 Deflate，运行环境需要支持 `DecompressionStream`。
2. 将扩展名改为 `.hym`。
3. 在设置页的“导入插件”区块中选择 `.hym` 文件，或在代码里调用 `pluginManager.importPluginPackage(file)`。

仓库根目录下的 `plugins/` 文件夹现在直接保存了默认歌词可视化与音效增强插件解包后的文件夹结构（包含 `manifest.json`、`index.js` 以及编译后的设置视图脚本）。执行 `node scripts/build-plugin-packages.js` 会重新生成这些文本文件，便于审阅或按需调整；如需在其他环境中分发，可在对应文件夹中执行 `zip -r <name>.hym .` 手动生成压缩包，再通过设置页导入。

导入成功后，插件会出现在设置页面，可像内置插件一样启用、禁用或删除。通过 `context.assets` 可以读取包内的其他文件，例如 Vue 组件模板或国际化文本。插件包会被解压到 `plugins/installed` 目录，后续重启会自动加载。

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

- **功能**：基于 Howler 的 Web Audio 管线，为播放器提供低音、高音、存在感、立体声宽度、空间混响及输出增益等多项音色调节。默认启用并提供 `audio-effects` 插件设置路由 `/plugins/audio-effects`，界面位于 `src/plugins/views/AudioEffectsSettings.vue`，已更新为与设置页统一的视觉风格并新增返回按钮。
- **技术要点**：插件在 `setup` 中构建一套 `Gain`、`BiquadFilter`、`Delay`、`Convolver`、`ChannelSplitter`/`ChannelMerger` 节点链路，同时通过响应式状态向设置页面暴露调节参数；所有数值会持久化到插件设置存储中。
- **参考价值**：展示了如何安全地接入 Howler 提供的音频上下文、封装共享状态、保存自定义偏好，并扩展现有插件以提供更丰富的音效体验。

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
