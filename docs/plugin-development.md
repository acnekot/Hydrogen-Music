# 插件开发指南

Hydrogen Music 从 v0.5.5 起支持在桌面端加载自定义插件。插件可以扩展路由、注册组件或在应用启动时执行自定义逻辑。
本文档将介绍目录结构、清单（manifest）规范以及在插件中可以使用的上下文 API。

## 目录结构

所有内置插件位于 `src/plugins/modules` 目录。每个插件都使用独立的文件夹，最少包含以下两个文件：

```
src/plugins/modules/<your-plugin>/
├── manifest.json    # 插件的基础信息
└── index.js         # 插件入口脚本
```

可选地，你可以在插件目录下继续创建 `views/`、`components/` 等子目录，存放自己的 Vue 组件或其他资源。

## manifest.json 字段说明

`manifest.json` 用于描述插件的基础信息以及默认行为。支持的字段如下：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 插件的唯一 ID，建议使用反向域名风格，例如 `com.example.lyrics`。 |
| `name` | `string` | 是 | 插件在界面中显示的名称。 |
| `version` | `string` | 否 | 语义化版本号，默认值为 `0.0.0`。 |
| `description` | `string` | 否 | 插件简介，会在设置页显示。 |
| `author` | `string` | 否 | 作者或团队名称。 |
| `homepage` | `string` | 否 | 插件主页或仓库地址，将显示为“访问主页”链接。 |
| `enabledByDefault` | `boolean` | 否 | 是否默认启用，默认为 `true`。 |
| `entry` | `string` | 否 | 插件的默认路由名称，设置后在设置页会出现“打开插件”按钮。 |

> **提示**：`entry` 只需要填写路由名称；路由在插件入口脚本中声明。

## 插件入口脚本（index.js）

入口脚本需要导出一个默认对象。该对象可以包含以下属性：

- `routes`: 可选数组，用于声明插件要注入的路由。语法与 Vue Router 的 `RouteRecordRaw` 基本一致，额外支持一个可选字段 `parent` 指定父路由名称。
- `activate(context)`: 可选函数。当插件启用时执行，接收的 `context` 提供以下能力：
  - `app`: 当前的 Vue 应用实例。
  - `router`: 应用的路由实例，可用于编程式导航或手动注册路由。
  - `pinia`: Pinia 实例，可直接调用项目现有的 store。
  - `registerRoute(route)`: 手动注册路由的辅助方法，等价于调用 `router.addRoute`。
  - `registerCleanup(fn)`: 注册卸载回调，在插件被禁用或热重载时触发。
  - `logger`: 一个带有 `info`、`warn`、`error` 的日志对象，输出时会自动带上插件前缀。
- `deactivate(context)`: 可选函数。当插件被禁用时调用，可在此释放资源。

如果 `activate` 返回一个函数，该函数同样会在卸载时执行，用来做清理工作（与 `registerCleanup` 一致）。

### 示例

参考仓库中预置的示例插件 `src/plugins/modules/example`：

```jsonc
// manifest.json
{
  "id": "hydrogen.example.hello",
  "name": "示例插件：你好世界",
  "version": "1.0.0",
  "description": "展示如何通过插件系统向 Hydrogen Music 增加一个简单的页面。",
  "author": "Hydrogen Music Team",
  "enabledByDefault": true,
  "entry": "plugin-example-hello"
}
```

```js
// index.js
export default {
  routes: [
    {
      path: '/plugins/example/hello',
      name: 'plugin-example-hello',
      component: () => import('./views/HelloPluginView.vue')
    }
  ],
  activate({ logger, registerCleanup }) {
    logger.info('插件已启用');
    registerCleanup(() => logger.info('插件已卸载'));
  }
};
```

```vue
<!-- views/HelloPluginView.vue -->
<template>
  <div class="hello-plugin">
    <h1>欢迎来到插件示例页</h1>
    <p>这是一个由插件提供的页面。</p>
  </div>
</template>
```

启用后，应用会自动为该插件注入一个路由 `/plugins/example/hello`，并在设置页显示“打开插件”按钮。

## 调试与热更新

- 插件文件与主工程共用同一套 Vite 构建配置，`npm run dev` 时支持热更新。
- 插件启用或禁用状态会保存在本地，路径为 `localStorage.pluginStore.enabled`。
- 如果需要在开发时重载插件逻辑，可以在设置页关闭后重新开启，或在代码中调用 `reloadPlugin(pluginId)`。

## 常见问题

### 如何访问已有的 Pinia Store？

在 `activate` 函数或组件中直接导入并调用，例如：

```js
import { usePlayerStore } from '../../store/playerStore';

export default {
  activate() {
    const playerStore = usePlayerStore();
    playerStore.updatePlayState(true);
  }
};
```

### 是否可以调用 Electron 提供的 `windowApi`？

可以。插件运行在与主应用相同的环境下，因此可以直接访问 `windowApi`、`noticeOpen` 等工具函数。

### 插件能否扩展设置页 UI？

目前插件主要用于扩展业务功能与路由。如果需要自定义配置界面，可以在自己的路由页面中实现，或者提交 PR 讨论更深入的扩展点。

---

如果在开发过程中遇到问题，欢迎提交 Issue 或 PR 讨论改进插件系统。
