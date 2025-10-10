# Hydrogen 插件开发者文档

本文档介绍如何基于 `@hydrogen/plugins-core` 为 Hydrogen 系列桌面应用构建插件。核心目标是实现跨 Electron + Vue 3 + Pinia 应用的插件共享、热加载、权限控制与 UI 注入能力。

## 架构概览

插件系统核心由三部分组成：

1. **插件管理器 (`PluginManager`)**：负责插件扫描、依赖排序、生命周期调度、热更新、权限校验与上下文构建。
2. **沙箱执行环境 (`NodeVmSandbox`)**：基于 Node.js `vm` 模块隔离全局上下文，为每个插件提供独立的 `globalThis` 与模块加载器。
3. **渲染层桥接 (`RendererBridge`)**：主进程与 Vue 渲染进程之间的通信协议，实现组件、Pinia Store 与菜单等 UI 注入。

开发者通过在主应用内初始化 `PluginManager`，并提供 `RendererBridge` 实现，即可加载来自 npm、zip 或本地开发目录 (`~/.hydrogen/plugins`) 的插件包。

```
┌──────────────────────────────────────────────┐
│              Electron 主进程                │
│                                              │
│   PluginManager  ────────────── RendererBridge
│        │                                   │
│        ▼                                   ▼
│   NodeVmSandbox                     Vue + Pinia 应用
│        │                                   │
│        └── 插件生命周期回调 + API 调用 ─────┘
└──────────────────────────────────────────────┘
```

## 快速上手

### 安装插件核心包

```bash
npm install @hydrogen/plugins-core
```

### 在主程序中初始化插件管理器

```ts
import { app } from 'electron';
import { PluginManager, PluginApiRegistry } from '@hydrogen/plugins-core';

const apiRegistry = new PluginApiRegistry();

const rendererBridge = {
  async registerComponents(components, pluginId) {
    // 将组件元数据转发给渲染进程，由 Vue 动态注册
  },
  async registerPiniaStores(stores, pluginId) {
    // 注入插件 Store
  },
  async registerMenus(menus, pluginId) {
    // 调整 Electron Menu
  },
  async unregisterPlugin(pluginId) {
    // 撤销插件相关 UI
  },
};

const manager = new PluginManager({
  appId: 'com.hydrogen.music',
  apiInvoker: apiRegistry,
  rendererBridge,
  pluginsDir: app.getPath('userData') + '/plugins',
  extraSearchPaths: [app.getAppPath() + '/plugins'],
  hotReload: true,
});

await manager.scanAndLoad();
```

### 提供主程序 API

```ts
apiRegistry.register({
  id: 'player.playSong',
  permission: 'ipc:invoke',
  async handler(payload, context) {
    const { songId } = payload as { songId: string };
    await playSong(songId);
    context.logger.info('Song played', { songId });
    return { success: true };
  },
});
```

## 插件包结构

插件可以以 npm 包或 zip 形式发布。核心要求：

```
my-plugin/
├─ package.json
├─ dist/
│  └─ index.js
└─ README.md
```

`package.json` 需包含 `hydrogenPlugin` 字段：

```json
{
  "name": "@example/my-plugin",
  "version": "1.0.0",
  "main": "dist/index.js",
  "hydrogenPlugin": {
    "id": "example.my-plugin",
    "entry": "dist/index.js",
    "permissions": ["ui:inject", "ipc:invoke"],
    "dependencies": [{ "name": "example.base-plugin" }],
    "ui": {
      "components": [{
        "id": "playlist-widget",
        "mountPoint": "sidebar",
        "component": "./components/PlaylistWidget.vue"
      }]
    }
  }
}
```

### 插件入口文件

```ts
import type { PluginContext } from '@hydrogen/plugins-core';

export async function activate(context: PluginContext) {
  context.logger.info('Plugin activated');
  await context.ui.register({
    components: [
      {
        id: 'playlist-widget',
        mountPoint: 'sidebar',
        component: 'PlaylistWidget',
      },
    ],
  });
}

export async function deactivate() {
  // 清理资源
}
```

或使用默认导出：

```ts
import type { PluginContext, PluginLifecycle } from '@hydrogen/plugins-core';

export default (context: PluginContext): PluginLifecycle => ({
  async activate() {
    context.logger.info('Activated with default export');
  },
  async deactivate() {
    context.logger.info('Deactivated');
  },
});
```

## 生命周期

`PluginLifecycle` 定义如下：

- `activate(context)`：插件加载后调用，可进行初始化、订阅事件、注册 UI。
- `deactivate()`：插件被禁用或应用关闭时调用。
- `dispose()`：插件被卸载时调用，需释放所有资源。
- `onMessage(message)`：可选，用于主程序或其他插件的消息通信。

管理器会按依赖拓扑顺序激活插件。若依赖未满足，将抛出错误并阻止加载。

## 权限与沙箱

- 插件在 `NodeVmSandbox` 中执行，拥有隔离的 `globalThis`。
- 插件声明的权限通过 `hydrogenPlugin.permissions` 指定。主程序可自定义 `PermissionResolver` 进行动态授权（如弹出确认弹窗）。
- 插件调用主程序 API 时会自动校验权限。未授权的调用会被拒绝并在日志中记录。

## 热加载

`PluginManager` 内置 `FilesystemHotReloadController`，可在扫描后自动监听插件目录：

```ts
import { FilesystemHotReloadController } from '@hydrogen/plugins-core';

const hotReload = new FilesystemHotReloadController({
  watchPaths: ['~/.hydrogen/plugins'],
  async onInvalidate(pluginId) {
    await manager.reload(pluginId);
  },
  logger: console,
});

hotReload.start();
```

若需自定义策略，可实现 `PluginHotReloadController` 接口，在文件变化时调用 `manager.reload`。

## 插件打包与加载

1. **npm 发布**：按照常规 npm 包发布流程，在应用中通过 `PluginInstaller` 下载后交给 `PluginManager`。
2. **zip 包**：将构建产物压缩为 zip，应用解压到插件目录后即可被扫描。
3. **本地开发**：开发者将插件目录放入 `~/.hydrogen/plugins/<plugin-name>` 并运行 `npm run dev`，管理器可在启用热加载后实时刷新。

## TypeScript 支持

`@hydrogen/plugins-core` 提供完备的类型定义，包括：

- `PluginContext`：插件上下文，可获取 `api`、`logger`、`events`、`ui` 等。
- `PluginApiRegistry`：主程序注册 API。
- `RendererBridge`：主程序实现 UI 注入的桥。

插件可以直接从核心包中导入类型：

```ts
import type { PluginContext, PluginPermission } from '@hydrogen/plugins-core';
```

## 开发工具建议

- 使用 `ts-node` 或 `tsx` 快速迭代插件逻辑。
- 结合 `npm link` 或 `yalc` 将插件包链接到本地应用。
- 在 Electron 主进程中集成 `electron-reload` 或 `nodemon`，实现主进程热重载。

## 最佳实践

1. **最小权限原则**：仅声明插件实际需要的权限，避免潜在安全风险。
2. **UI 注入命名空间**：组件、Store、菜单等应采用前缀避免冲突（例如 `pluginId/componentName`）。
3. **日志与错误处理**：通过 `context.logger` 输出结构化日志，便于主程序统一收集。
4. **资源释放**：在 `deactivate`/`dispose` 中移除事件监听、关闭文件句柄、销毁定时器。
5. **依赖声明**：在 `hydrogenPlugin.dependencies` 中声明依赖插件，以保证加载顺序。

## 常见问题

### 如何与 Vue 渲染进程通信？

通过 `context.api.invoke` 调用主程序注册的 API，或利用 Electron `ipcRenderer` 在渲染进程中订阅主进程事件。

### 插件崩溃如何处理？

`PluginManager` 会捕获加载错误并标记状态为 `failed`，主程序可在 UI 中提示用户，并提供重新加载按钮。

### 如何支持多应用共享插件？

通过在 `PluginManager` 构造时传入唯一的 `appId`，插件可根据 `context.appId` 自适应不同宿主应用的功能差异。

---

如需进一步扩展（例如更复杂的沙箱、权限审核流程），可基于 `PluginManager` 与 `NodeVmSandbox` 自行继承或组合实现。
