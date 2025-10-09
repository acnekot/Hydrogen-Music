# 插件系统开发指南

Hydrogen Music 现已内置插件系统，可用于扩展播放器功能（例如：桌面歌词、歌词可视化等）。本文档介绍插件架构、可用 API、UI 插槽以及开发规范，帮助你快速编写官方或第三方插件。

## 架构概览

- **插件管理器**位于 `src/plugins/manager.js`，负责插件注册、生命周期管理、命令分发以及 UI 插槽渲染。
- 插件在 `src/plugins` 目录下以文件夹区分，每个插件导出一个默认对象：
  ```js
  export default {
    id: 'unique-id',
    name: 'Human readable name',
    setup(context, api) {
      // 初始化逻辑
      return () => {/* 可选：销毁清理 */}
    },
  }
  ```
- `src/plugins/index.js` 会注册所有内置插件，并在应用启动时通过 `installPlugins` 统一装载。
- 插件在渲染进程中运行，可访问 Pinia、路由、Electron `preload` 暴露的 API、DOM 等资源。

## 上下文 (`context`)

`setup(context, api)` 中的 `context` 由 `installPlugins` 传入，包含：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `app` | `App` | 当前 Vue 应用实例 |
| `router` | `VueRouter` | 路由实例，可用于注册自定义路由或导航 |
| `pinia` | `Pinia` | 全局 Pinia 容器 |
| `stores` | `Record<string, Function>` | 常用 store 的创建函数，例如 `usePlayerStore`、`useOtherStore` |
| `electronAPI` | `object \| null` | 来自 `window.electronAPI` 的桥接对象（Electron 环境下可用） |
| `window` / `document` | `Window` / `Document` | 原生浏览器对象 |

> 插件可自由导入其它 store 或工具模块；`context` 提供的是常用入口，方便第三方插件在不额外解析路径的情况下访问核心状态。

## 插件 API (`api`)

`api` 由插件管理器提供，包含以下方法：

### `api.registerUI(contribution)`

向指定 UI 插槽注入渲染内容。参数为：

```ts
interface UIContribution {
  slot: string;                // 插槽名称
  component: Component;        // 渲染的 Vue 组件
  order?: number;              // 插槽内排序，默认为 0
  props?: object | (slotCtx) => object; // 组件的 props，可为对象或根据插槽上下文生成
  key?: string;                // 可选唯一键，默认由插件 id + 序号组成
}
```

当前可用插槽：

| 插槽名 | 说明 | 插槽上下文 (`slotCtx`) |
| ------ | ---- | ---------------------- |
| `lyric:before-content` | 播放页歌词区域内部，正文滚动区域之前 | `{ refs: { lyricScroll } }`，其中 `lyricScroll` 为歌词容器的 DOM `ref` |

> 插件组件会按照 `order` 从小到大渲染，允许多个插件协同扩展同一位置。

### `api.registerCommand(commandId, handler)`

注册可供全局调用的命令，常用于功能入口按钮。命令通过 `getPluginManager().executeCommand(commandId)` 执行。若命令 id 已存在会在控制台给出警告。

### `api.onDispose(callback)`

为插件注册额外的清理逻辑。若 `setup` 返回函数，框架会优先执行返回的函数，再执行通过 `onDispose` 注册的回调。

## 开发示例

### 1. 注入桌面歌词功能

`src/plugins/desktop-lyric` 复用了原先的桌面歌词逻辑：

- `runtime.js` 负责与主播放器状态联动，通过命令 `desktop-lyric:toggle` 控制窗口创建与关闭。
- `main.js` / `index.html` 为 Electron 子窗口入口。
- 插件通过 `api.registerCommand` 暴露 `toggle` 命令，使得播放器按钮仍可调用 `toggleDesktopLyric()`。

### 2. 可视化插件

`src/plugins/lyric-visualizer` 将原先内嵌在 `Lyric.vue` 中的可视化代码提取为独立组件：

- 使用 `api.registerUI` 注入 `LyricVisualizerCanvas.vue` 到 `lyric:before-content` 插槽。
- 组件内部消费 Pinia 状态、Howler 音频节点，并负责 DOM 测量与动画循环。
- 保留了原有的设置项与主题联动，确保迁移后用户体验一致。

### 3. 接入第三方 API（示例伪代码）

```js
import MyPanel from './MyPanel.vue';

export default {
  id: 'my-plugin',
  name: 'Example Plugin',
  setup({ window }, api) {
    async function fetchSomething() {
      const res = await window.fetch('https://third-party.example/api');
      return res.json();
    }

    api.registerUI({
      slot: 'lyric:before-content',
      component: MyPanel,
      order: 20,
      props: () => ({ fetchSomething }),
    });
  },
};
```

### 4. 控制音频/主题

插件可直接导入 `usePlayerStore` 调整播放状态，也可利用 `context.electronAPI` 与主进程通信：

```js
import { usePlayerStore } from '@/store/playerStore';

export default {
  id: 'audio-controller',
  name: 'Audio Controller',
  setup({ stores }, api) {
    const playerStore = stores.usePlayerStore();

    api.registerCommand('audio:pause', () => {
      if (playerStore.playing) {
        playerStore.playing = false;
      }
    });
  },
};
```

主题相关的工具可复用 `src/utils/theme` 等现有模块，也可以通过插件在 UI 中提供用户自定义入口，再写入 Pinia 状态或本地存储。

## 编写插件的步骤

1. 在 `src/plugins` 新建目录并导出插件配置对象。
2. 根据需要创建 Vue 组件、资源文件等。
3. 使用 `api.registerUI`、`api.registerCommand` 等 API 挂载功能。
4. 若插件需要独立窗口，可仿照桌面歌词插件添加 `index.html` / `main.js` 并在 Electron 主进程中加载（通常复用现有命令即可）。
5. 更新 `src/plugins/index.js` 注册插件。
6. 如需开放给第三方，请在 `docs/plugins.md` 补充使用说明。

## 调试建议

- 开发模式下插件页面可通过 `http://localhost:5173/src/plugins/<plugin>/index.html` 访问。
- 使用 `console` 输出调试信息，Electron 环境下可在主窗口或插件窗口开发者工具查看。
- 插件异常不会阻塞主应用，错误会在控制台记录，请善用 try/catch。

## 已内置插件

| 插件 ID | 说明 |
| ------- | ---- |
| `desktop-lyric` | 桌面歌词窗口，保留原有 API 并通过命令 `desktop-lyric:toggle` 调用 |
| `lyric-visualizer` | 歌词页面音频可视化，使用 UI 插槽渲染，可与其它插件共存 |

欢迎贡献更多插件，实现如第三方 API 接入、快捷操作面板、主题扩展等功能。
