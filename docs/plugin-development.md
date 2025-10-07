# 插件系统开发指南

Hydrogen Music 现已支持可扩展的插件系统，可用于扩展第三方 API、主题定制、声音提示、无缝衔接等功能。本文档将介绍插件目录结构、运行时 API 以及开发流程，帮助你快速构建自己的插件。

## 插件目录

* 默认插件目录位于应用根目录下的 `plugins/` 文件夹。用户可在设置面板中自定义插件目录，应用会在启动时自动创建目录。
* 每个插件需放置在独立的子目录中，例如 `plugins/example-plugin/`。
* 子目录内至少包含以下文件：
  * `manifest.json` —— 插件的元数据。
  * `index.js` —— 插件入口脚本，导出插件定义。
  * 其它资源（如 README、静态资源）可自由添加。

## manifest.json

示例：

```json
{
  "id": "my-plugin",
  "name": "示例插件",
  "version": "1.0.0",
  "description": "一个演示插件。",
  "author": "Your Name",
  "categories": ["theme"],
  "entry": "index.js"
}
```

字段说明：

| 字段        | 说明                                           |
| ----------- | ---------------------------------------------- |
| `id`        | 插件唯一标识（建议使用短横线小写格式）。      |
| `name`      | 插件显示名称。                                 |
| `version`   | 插件版本号，遵循 semver 规范。                 |
| `description` | 插件简介，会显示在插件列表中。             |
| `author`    | 作者信息。                                     |
| `categories`| 插件功能分类，支持 `api`、`theme`、`sound`、`integration` 等。|
| `entry`     | 插件入口脚本相对路径。                         |

## 插件入口脚本

入口文件需导出一个函数或对象。如果导出函数，会在插件加载时收到 `pluginApi`，可用来注册设置面板或访问运行时能力。

```js
module.exports = (pluginApi) => ({
  id: 'my-plugin',
  name: '示例插件',
  version: '1.0.0',
  description: '插件说明',
  categories: ['theme'],
  settingsComponent: pluginApi.useBuiltinComponent('theme-showcase'),
  defaultConfig: { /* 初始配置 */ },
  onActivate(context) {
    // 插件启用逻辑
  },
  onDeactivate(context) {
    // 插件停用逻辑
  },
  onConfigChange(context, newConfig) {
    // 配置更新回调
  },
});
```

### pluginApi

`pluginApi` 提供如下能力：

* `useBuiltinComponent(name)` —— 使用内置的设置面板组件，返回 `settingsComponent` 需要的标识。
  * 可选值：`lyric-visualizer`、`desktop-lyric`、`theme-showcase`、`sound-effects`、`seamless-playback`。
* `registerSettingsComponent(componentOptions)` —— 传入 Vue 组件配置，返回可在 `settingsComponent` 中使用的 ID。
* `desktopLyric` —— 桌面歌词工具集，包含 `init()`、`destroy()`、`toggle()` 三个方法。
* `stores` —— 访问 Pinia store 创建函数：`usePlayerStore`、`useOtherStore`、`usePluginStore`。
* `windowApi` —— 预加载脚本暴露的原生能力，如文件对话框、窗口操作等。
* `vue` —— Vue 运行时工具集合，可用于 `watch`、`ref` 等响应式操作。

### context 对象

`onActivate` / `onDeactivate` / `onConfigChange` 回调会收到 `context`：

* `id` / `manifest` —— 插件基本信息。
* `stores` —— 已实例化的 Pinia store，对播放器状态进行读写。
* `windowApi` / `vue` —— 与 `pluginApi` 相同。
* `config` / `getConfig()` —— 当前插件配置对象。
* `updateConfig(patch)` / `setConfig(next)` —— 更新配置并持久化。
* `onCleanup(fn)` —— 注册清理逻辑，插件停用时会自动执行。

## 设置面板

在设置页中点击“插件”即可管理插件。每个插件可提供自定义设置组件，布局遵循以下结构：

```
插件名字
介绍
相关功能（自定义组件输出）
```

内置设置组件可直接复用，也可以通过 `registerSettingsComponent` 自行注册 Vue 组件。

## 生命周期建议

* 在 `onActivate` 中注册监听、创建定时器或注入样式，并使用 `onCleanup` 释放资源。
* `onDeactivate` 应恢复对全局状态的修改，例如重置开关或移除样式。
* 通过 `context.getConfig()` 访问配置，`onConfigChange` 中根据最新配置即时调整行为。

## 调试技巧

* 设置面板中提供“刷新”按钮可重新扫描插件目录。
* “导入插件” 会将选定的插件目录复制到当前插件根目录。
* “重载播放器” 相当于对渲染进程执行一次软重启，可用于加载修改后的插件。

## 示例插件

仓库自带以下示例，位于 `plugins/` 目录：

| 插件 | 功能 | 分类 |
| ---- | ---- | ---- |
| `lyric-visualizer` | 将歌词音频可视化改造成插件配置。 | integration |
| `desktop-lyric` | 控制桌面歌词窗口与同步。 | integration |
| `theme-showcase` | 自定义强调色与动态背景。 | theme |
| `sound-effects` | 播放/切歌提示音效。 | sound |
| `seamless-playback` | 通过淡入淡出实现无缝衔接。 | integration |

建议以这些示例为基础创建自己的插件，或参考其结构了解如何与播放器状态交互。
