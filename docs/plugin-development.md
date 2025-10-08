# Hydrogen Music 插件开发指南

本文档介绍全新的插件系统、目录结构与开发规范，帮助开发者为 Hydrogen Music 扩展新能力。

## 1. 插件系统概览

- 默认插件目录：应用根目录下的 `plugins/`，可在「设置 → 插件」中修改并随时刷新。
- 插件生命周期由前端运行时托管：根据用户的启用状态自动调用 `activate` / `deactivate`。
- 插件设置集中在「插件设置面板」，统一展示标题、介绍与功能配置。
- 插件可以注册全局服务，供核心应用或其它插件通过服务表访问。

## 2. 目录与清单

每个插件建议使用独立文件夹，结构如下：

```
plugins/
  your-plugin/
    plugin.json        # 插件清单
    index.js           # 入口模块
    settings.js        # （可选）设置界面组件
    assets/...         # （可选）其它资源
```

`plugin.json` 必填字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 插件唯一标识，建议使用短横线风格（如 `desktop-lyric`）。|
| `name` | 显示名称。|
| `version` | 语义化版本号。|
| `description` | 简要介绍。|
| `author` | 作者信息，可选。|
| `main` | 入口模块相对路径，默认 `index.js`。|
| `settings` | 可选，指向设置界面的模块（例如 `settings.js`）。|
| `enabledByDefault` | 可选，设为 `true` 时首次安装即启用。|

> 也可在 `package.json` 中提供 `hydrogenPlugin` 字段作为清单。

## 3. 入口模块规范

入口模块需默认导出一个对象：

```js
export default {
  id: 'sample-plugin',
  name: '示例插件',
  version: '0.1.0',
  description: '说明',
  author: '作者',
  settingsComponent,      // 或 settings / getSettingsComponent
  async activate(context) {
    // 初始化逻辑
  },
  async deactivate(context) {
    // 清理逻辑
  },
}
```

### `context` 对象

`activate` / `deactivate` 收到的 `context` 包含：

| 属性 | 说明 |
| --- | --- |
| `id` / `meta` | 插件元信息。|
| `app` | Vue 应用实例。|
| `router` | Vue Router 实例。|
| `pinia` | Pinia 实例，可配合 `context.stores` 访问状态。|
| `stores.player()` / `stores.other()` / `stores.user()` | 快速获取常用 Store。|
| `windowApi` / `electronAPI` | 预加载层暴露的 Electron API。|
| `provideService(service)` | 注册服务对象，供其它模块通过服务表获取。|
| `removeService()` | 取消当前插件注册的服务。|
| `getService(id)` | 读取其它插件暴露的服务。|
| `notice(text, duration)` | 调用全局轻提示。|
| `dialog` | 触发全局确认弹窗。|
| `registerCleanup(fn)` | 注册清理函数，卸载时自动执行。|

`activate` 可返回一个函数，等价于 `registerCleanup(fn)`。

## 4. 设置界面

若插件提供可配置项，可通过以下方式之一：

1. 在入口模块中导出 `settingsComponent`：
   ```js
   import settingsComponent from './settings.js'
   export default { settingsComponent, ... }
   ```
2. 导出 `settings`（直接为组件对象）。
3. 导出 `getSettingsComponent`（返回组件或异步组件）。

设置模块需返回 Vue 组件（可使用 `defineComponent` 或渲染函数）。渲染内容会显示在插件面板中，可复用内置样式类（如 `option-add`）。

## 5. 插件服务

插件可通过 `context.provideService(service)` 暴露 API，例如：

```js
context.provideService({
  toggle() {
    // ...
  }
})
```

其它模块可使用 `import { usePluginService } from '@/plugins/serviceRegistry'` 或 `context.getService(id)` 访问服务，实现插件间通信。

## 6. 插件管理面板

- 入口：设置 → 插件。
- 功能：全局开关、目录选择、刷新、软重载、插件启用/删除、插件设置面板。
- 首次开启会提示「插件功能暂不完善」，确认后不再弹出。
- 「重载播放器」会刷新渲染进程，重新加载所有插件。

## 7. 开发流程

1. 在 `plugins/` 创建插件目录和清单。
2. 编写入口模块与设置组件。
3. 打开应用 → 设置 → 插件。
4. 点击「刷新」即时检测新插件，勾选启用后即会加载。
5. 如需重新执行插件代码，可点击「重载播放器」。

## 8. 示例插件

仓库提供 `plugins/sample-plugin`，展示：

- 如何注册服务与清理资源。
- 如何提供简单的设置界面。
- 如何在 `plugin.json` 中声明基础信息。

## 9. 注意事项

- 插件运行于渲染进程，默认拥有与前端同等的访问权限，请注意安全性。
- 插件目录可移动至外部路径，但需保证对 Electron 有读写权限。
- 如需依赖第三方库，建议使用原生 ES 模块（Node 环境支持的语法）。
- 目前仍处于早期阶段，接口可能随后续版本调整，建议关注更新日志。

