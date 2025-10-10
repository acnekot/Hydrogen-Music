# 插件系统开发指南

Hydrogen Music 现在提供内置的插件系统，用于扩展播放器的能力。本指南介绍插件结构、运行时 API 以及示例场景，帮助你快速构建插件。

## 插件加载流程

插件位于 `src/plugins` 目录。`src/plugins/index.js` 会注册所有内置插件，并在应用启动时由 `initializePlugins` 统一初始化。初始化时提供以下上下文：

- `app`：Vue 应用实例，可用于注册全局组件或指令。
- `router` 与 `pinia`：可通过它们访问路由和状态管理。
- `stores`：常用的 Pinia store 工厂，例如 `usePlayerStore`、`useOtherStore` 等。
- `audio`：常用的播放控制方法（播放、暂停、上一首、下一首、Seek）。
- `theme`：主题读写方法，包含 `setTheme`、`getTheme`、`initTheme`。
- `http`：指向浏览器原生 `fetch`，方便访问第三方 API。
- `events`：简单的事件总线，支持 `emit`、`on`、`off`。
- `ui`：用于向界面注入控件或视图。当前提供 `registerPlayerControl`（播放器按钮）和 `registerLyricOverlay`（歌词页覆盖层）。

插件的 `setup` 函数可返回一个清理函数，用于在插件卸载时回收资源。所有通过 `ui` 注册的控件会自动绑定到插件的清理流程。

## 播放器控件扩展

调用 `context.ui.registerPlayerControl` 可以向底部播放器新增按钮。按钮以组件形式渲染，因此可以在组件内部访问 Pinia store、`electronAPI`、或任何自定义逻辑。例如桌面歌词插件注册了一个切换按钮，并在其内部调用插件服务暴露的 `toggleDesktopLyric`。

```js
context.ui.registerPlayerControl({
  id: 'example-control',
  order: 80,
  component: ExampleControlButton,
});
```

`order` 用于定义按钮排序，数字越小越靠近原生控件。

## 歌词覆盖层扩展

通过 `context.ui.registerLyricOverlay` 可以在歌词页正文上方渲染自定义组件。组件会注入歌词上下文（滚动容器、歌词显示状态等），适合实现可视化、提示框、工具栏等功能。音频可视化插件就通过该接口实现。

```js
context.ui.registerLyricOverlay({
  id: 'lyrics-overlay-example',
  target: 'before-lyrics',
  component: ExampleOverlay,
});
```

> 组件内部可以使用 `inject(LyricPluginContextSymbol)` 获取歌词滚动容器等引用。

## 桌面歌词与音频可视化

- 桌面歌词插件位于 `src/plugins/builtin/desktopLyric`，负责维护与主进程的通信，并通过播放器控件暴露开关。原有的桌面歌词窗口入口也迁移到插件目录下。
- 音频可视化插件位于 `src/plugins/builtin/audioVisualizer`，通过歌词覆盖层渲染可视化画布。原先在 `Lyric.vue` 中的可视化逻辑已全部迁移到该插件。

## 创建自定义插件

1. 在 `src/plugins` 下创建新的目录与入口文件，导出 `{ id, name, version, setup }` 对象。
2. 在 `src/plugins/index.js` 中调用 `registerPlugin` 注册插件。
3. 使用 `context` 提供的 API 完成所需功能：
   - 使用 `stores` 访问 Pinia 数据。
   - 使用 `audio` 触发播放控制。
   - 使用 `theme` 同步 UI 主题。
   - 使用 `http` 调用第三方 API。
   - 使用 `ui` 将组件插入界面。

插件默认随应用一同构建，如需按需加载，可在 `setup` 中结合路由或 store 状态自行判断是否执行。

## 注意事项

- 避免直接修改全局样式或 DOM，优先通过组件渲染完成 UI。
- 需要与 Electron 主进程通信时，请复用现有的 `window.electronAPI` 通道。
- 插件产生的定时器或事件监听需要在返回的清理函数中释放。

欢迎根据业务需求扩展更多插件，例如第三方歌词源、主题切换器、快捷面板等。
