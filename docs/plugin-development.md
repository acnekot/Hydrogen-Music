# Hydrogen Plugins Core 开发指南

Hydrogen Music 现在内置了一个独立的插件系统 **Hydrogen Plugins Core**。该系统可以脱离 Hydrogen Music 单独使用，为其它同类型的 Electron + Web 项目提供插件扩展能力。本指南将介绍核心概念、插件上下文以及如何编写和调试插件。

## 核心概念

- **HydrogenPluginManager**：插件运行时，负责注册插件、管理贡献点、派发事件。实现位于项目根目录的 `hydrogen_plugins_core/`。
- **贡献点 (Contribution Areas)**：插件可以向指定区域注册 UI 或服务，例如播放器控制按钮 (`ui:player-controls`)、歌词可视化 (`ui:lyric-visualizers`) 等。
- **插件上下文 (Plugin Context)**：每个插件的 `setup` 函数都会收到一个上下文对象，提供对应用实例、Pinia store、音频控制、IPC、事件系统等的访问能力。

## 运行时初始化

在 `src/main.js` 中调用 `setupPlugins(app)` 完成插件系统初始化，并注册内置插件：

```js
import { setupPlugins } from './plugins';

setupPlugins(app);
```

`setupPlugins` 会：

1. 创建 `HydrogenPluginManager` 实例并配置本地存储代理；
2. 建立插件上下文（注入 Pinia store、音频控制 API 等）；
3. 注册贡献点：播放器按钮、歌词可视化、设置面板、音频处理服务等；
4. 挂载内置插件（桌面歌词、歌词可视化）。

## 上下文能力

插件 `setup(context)` 时可以使用以下能力：

| 属性 | 说明 |
| ---- | ---- |
| `context.app` | Vue 应用实例 |
| `context.stores` | 包含 `player`、`other`、`user`、`library`、`cloud`、`local` 等 Pinia store 实例 |
| `context.audio` | 音频控制接口（播放、暂停、上一曲、下一曲、跳转、调节音量） |
| `context.windowApi` / `context.ipc` | 预加载脚本暴露的 Electron IPC API |
| `context.events` | 简易事件总线（`on` / `off` / `emit`）|
| `context.contributions` | 贡献点操作：`register(area, payload)`、`unregister(area, id)`、`list(area)` |
| `context.storage` | 带命名空间的持久化存储（localStorage 回退到内存）|
| `context.addCleanup(fn)` | 注册插件卸载时执行的清理函数 |
| `context.logger` | 带插件前缀的日志记录器 |

## UI 贡献

UI 贡献只需在 `payload` 中提供 Vue 组件和可选 `props`：

```js
context.contributions.register('ui:player-controls', {
  id: 'my-toggle',
  order: 50,
  component: MyToggleButton,
  props: { /* 组件 props */ },
});
```

组件会由宿主根据 `order` 排序后渲染。`Player.vue` 和 `Lyric.vue` 已经分别订阅 `ui:player-controls` 与 `ui:lyric-visualizers`，因此插件提供的组件会自动出现在 UI 中。

## 服务贡献

插件可以利用事件总线或 `context.audio` 与宿主交互，例如注册快捷键、监听歌曲切换等。可以通过 `context.events.emit('my-plugin:event', data)` 与其它插件通信。

## 桌面歌词插件

- 将原有桌面歌词逻辑迁移到 `src/plugins/builtin/desktopLyric/`。
- `service.js` 负责：
  - 监听 Pinia store，向 Electron 桌面歌词窗口同步歌词数据与状态；
  - 维护窗口开关、进度同步、歌词多轨解析。
- `DesktopLyricControl.vue` 通过贡献点注入到播放器控制区。
- 桌面歌词窗口入口迁移至 `src/plugins/builtin/desktopLyric/window/`，构建目标仍为 `desktop-lyric.html`。

## 歌词可视化插件

- 组件位于 `src/plugins/builtin/audioVisualizer/VisualizerCanvas.vue`；
- 复用原可视化绘制逻辑，独立于歌词组件渲染，自动响应可视化设置；
- 通过 `ui:lyric-visualizers` 贡献点注入歌词面板。

## 编写第三方插件

1. 在 `src/plugins/` 创建插件目录，例如 `src/plugins/community/my-plugin/`；
2. 导出符合接口的对象：

```js
export default {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  setup(context) {
    // 注册 UI、监听事件、调用 context.audio 等
  },
};
```

3. 在 `src/plugins/index.js` 中调用 `pluginManager.use(yourPlugin)` 即可加载。

> 提示：Hydrogen Plugins Core 独立于 Vue，可直接在其它项目中引入并结合任意框架使用。

## 调试建议

- 使用 `console`（上下文中的 logger 会自动添加插件名前缀）观察运行状态；
- 充分利用 `context.storage` 保存插件配置；
- 若需清理资源（事件监听、计时器等），记得调用 `context.addCleanup` 注册销毁逻辑。

