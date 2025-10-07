# 插件系统开发指南

本指南描述 Hydrogen Music 的插件系统结构、生命周期与最佳实践。插件以独立文件夹形式放在应用根目录下的 `plugins/` 目录中，每个插件包含 `plugin.json` 清单以及入口脚本 `index.js`。

## 插件目录结构

```
plugins/
  ├─ your-plugin/
  │   ├─ plugin.json      # 元信息，包含 id/name/version 等
  │   ├─ index.js         # 入口脚本（CommonJS）
  │   └─ assets...        # 可选资源，如 CSS、配置文件
```

### plugin.json 字段

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | string | 插件唯一标识，同目录名，建议使用短横线风格 |
| `name` | string | 展示名称 |
| `version` | string | 语义化版本号 |
| `description` | string | 功能简介 |
| `author` | string | 作者信息 |
| `entry` | string | 入口脚本路径，默认 `index.js` |
| `categories` | string[] | 插件类型，例如 `theme`、`sound`、`integration` |
| `keywords` | string[] | 检索关键字 |

## 入口脚本

入口文件运行于渲染进程，通过 CommonJS 导出函数：

```js
module.exports = async (context) => {
  // context 提供插件 API
};
```

### context API 摘要

| 方法 | 说明 |
| ---- | ---- |
| `context.importModule(id)` | 异步加载内置运行时代码，例如 `desktop-lyric/runtime` |
| `context.registerDesktopLyric(options)` | 注册桌面歌词功能，`options` 支持 `init`/`toggle`/`destroy` |
| `context.registerLyricRenderer(options)` | 注册歌词面板组件，`options.component` 可为 Vue 组件 |
| `context.registerThemeStyle(cssText)` | 注入主题 CSS，卸载时自动清理 |
| `context.registerSoundEffect(hook)` | 声音插件接口，支持 `onSongChange`、`dispose` |
| `context.registerIntegrationHook(hook)` | 注册无缝衔接钩子，可操作路由或状态 |
| `context.registerSettingsPanel(loader)` | 提供插件设置面板，`loader` 返回 Vue 组件 |
| `context.setSetting(key, value)` / `context.getSetting(key, fallback)` | 读取/写入插件配置（持久化） |
| `context.onSongChange(handler)` | 订阅歌曲切换事件 |
| `context.readText(path)` / `context.readBinary(path)` | 读取插件目录文件 |
| `context.updateData(patch)` | 将任意 JSON 数据写入插件存储 |

更多细节请参考 `src/plugins/pluginContext.js`。

## 插件生命周期

1. 应用启动后会扫描 `plugins/` 目录并解析 `plugin.json`。
2. 用户在设置面板中启用插件后，入口脚本被执行。
3. 插件可通过 `context.register*` 接口向应用注入功能。
4. 关闭或删除插件时，注册的资源会被自动清理。

## 示例

仓库默认提供以下示例插件：

- `desktop-lyric`：将桌面歌词功能解耦为插件。
- `lyric-visualizer`：提供歌词面板频谱可视化设置。
- `skyline-theme`：注入自定义主题样式。
- `sfx-click`：播放歌曲切换提示音。
- `seamless-focus`：新歌播放时自动回到歌词界面。

参照这些示例可以快速创建新的扩展。

## 开发提示

- 插件入口代码运行在浏览器环境，不支持直接使用 Node.js `require`。如需访问应用内部模块，请通过 `context.importModule` 使用内置运行时代码。
- 插件配置使用 `context.setSetting`/`context.getSetting` 持久化，或通过 `context.updateData` 储存自定义结构。
- 主题、声音等分类可在设置中独立关闭，插件应根据 `context.isCategoryEnabled(category)` 判断是否执行关键逻辑。
- 若插件需要大量前端逻辑，可将 Vue 组件放在 `src/plugins/runtime/` 下并通过 `context.importModule` 引入。

## 发布与分发

1. 将插件目录打包为 zip 或直接分发文件夹。
2. 用户可在设置 → 插件系统中选择导入目录，实时刷新后即可启用。
3. 删除插件时会清理对应配置，同时移除注册的资源。

祝开发愉快！
