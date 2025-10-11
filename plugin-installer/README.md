# 插件系统安装指南

本目录提供将 Hydrogen Music 的插件运行时抽取到其它 Electron + Vue 应用中的完整指引与工具，帮助你快速把现有的音频可视化插件等扩展移植到新的宿主项目中。

> ⚠️ 迁移前请确认目标项目具备 Vue 3、Pinia、Electron 以及 `windowApi/electronAPI` 的插件读写接口。如果技术栈不同，需要自行改写适配层。

## 目录结构

```text
plugin-installer/
├─ README.md                  # 本说明文档
├─ install-plugin-system.js   # 安装器脚本（复制运行时与示例插件）
└─ templates/
   ├─ PluginSettingsInjection.vue # Settings.vue 插件选项示例片段
   └─ playerStore.extension.js    # Pinia 播放器 store 扩展示例
```

## 快速开始：使用安装器脚本

1. 在 Hydrogen Music 仓库根目录执行：

   ```bash
   node plugin-installer/install-plugin-system.js <目标项目根目录>
   ```

   参数说明：

   - `<目标项目根目录>`：尚未集成插件系统的 Vue/Electron 应用的根路径。
   - `--force`：若目标路径下已存在同名文件或目录，可附加该参数强制覆盖。

2. 脚本将完成以下操作：

   - 复制 `plugins/` 目录（含 `audio-visualizer` 示例插件）至目标项目；
   - 在目标项目下生成 `src/plugins/pluginManager.js`；
   - 复制 `src/views/PluginSettings.vue`，用于渲染插件设置页；
   - 将 `templates/` 模板同步到目标项目的 `plugin-installer/templates/`，便于后续对照；
   - 在控制台输出后续需要手动完成的集成步骤清单。

3. 根据脚本提示，完成剩余的宿主应用改造（详见下方“手动集成步骤”）。

## 手动集成步骤

安装器脚本仅负责复制运行时代码，以下改造需要在目标项目中手动完成：

### 1. 初始化插件系统

在目标应用的入口（通常是 `src/main.js` 或 `src/renderer/main.js`）中引入并初始化插件系统：

```js
import { initPluginSystem } from './plugins/pluginManager'

async function bootstrap() {
    const app = createApp(App)
    app.use(router)
    app.use(pinia)
    app.mount('#app')

    await initPluginSystem({ app, router, pinia })
}
```

若项目使用的是自定义上下文，请确保 `app`、`router`、`pinia` 在调用时已就绪。

### 2. 扩展播放器 Store

模板 `templates/playerStore.extension.js` 提供了 Hydrogen Music 中 `playerStore` 里与插件系统相关的状态字段与方法。你可以将其中的 `lyricVisualizer*` 字段、持久化白名单及初始化逻辑合并到目标项目的播放器 Store 中。

关键点：

- 在 `state` 内新增可视化配置字段（高度、频率范围、透明度、样式、颜色等）；
- 在 `persist` 或自定义序列化逻辑中记得保存这些字段；
- 若使用了自动初始化（如自动开启歌词可视化），请同步相关的 `actions`/`getters`。

### 3. 在 Settings.vue 中注入插件入口

模板 `templates/PluginSettingsInjection.vue` 展示了一个插件管理区块的写法，涵盖：

- 插件列表展示与启用/禁用按钮；
- 插件目录选择；
- “进入插件设置”导航；
- 插件导入/删除等操作。

将模板中的 `<script setup>` 和 `<template>` 中与插件相关的部分合并到目标项目的 `Settings.vue` 或对应的设置页面组件，即可获得与 Hydrogen Music 相同的插件管理体验。

> ✅ 建议先比对目标项目现有的设置页结构，再按需复制模板中的 computed/ref/方法，避免重复定义变量。

### 4. 添加插件设置路由（可选）

如果希望支持插件自定义的设置页面，请在路由表中加入 `PluginSettings.vue` 对应的路由，并在插件管理列表中跳转过去。例如：

```js
{
    path: '/settings/plugins/:pluginId?',
    name: 'plugin-settings',
    component: () => import('../views/PluginSettings.vue'),
}
```

### 5. Electron 侧 API 对接

插件系统依赖以下 `windowApi/electronAPI` 方法访问插件文件系统与配置：

- `listPlugins()` / `enablePlugin(id)` / `disablePlugin(id)` / `removePlugin(id)`
- `importPlugin()`、`getPluginDirectory()`、`setPluginDirectory()`、`choosePluginDirectory()`
- `readPluginFile(pluginId, relativePath, encoding)`

请在目标应用的 preload/主进程中提供相应的 IPC 通道，确保插件可以读取自身资源并在设置界面中完成启用、导入等操作。

### 6. 验证示例插件

完成以上步骤后，重新启动目标应用，并在设置页中启用 “歌词音频可视化” 插件。播放任意歌曲验证可视化是否正常显示、配置项是否生效。

## 常见问题

- **脚本提示目标目录不存在**：请确认已传入正确的绝对/相对路径，且目录已创建。
- **文件已存在导致失败**：可添加 `--force` 覆盖，或手动合并差异后再次执行。
- **插件启用后没有反应**：检查是否调用了 `initPluginSystem`，以及 Pinia store/Settings 注入是否完成。
- **Electron API 报错**：确保 preload 中暴露的 API 名称与插件运行时使用的名称一致。

如需进一步定制，可参考本仓库内现有实现，或在 `plugin-installer/templates/` 中扩展更多模板文件。
