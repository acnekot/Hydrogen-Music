# Hydrogen Music 插件系统开发指南（阶段一草案）

> 本文档描述了新引入的插件系统基础结构、目录布局与配置清单规范，供后续扩展与二次开发参考。当前版本聚焦于插件管理框架与示例清单，功能仍在逐步迁移中。

## 1. 目录结构

默认情况下，应用会在启动时于 `plugins/` 目录下查找可用插件：

```
Hydrogen-Music/
├── plugins/
│   ├── desktop-lyric/
│   │   └── plugin.json
│   ├── lyric-visualizer/
│   │   └── plugin.json
│   ├── sound-effects/
│   │   └── plugin.json
│   ├── seamless-playback/
│   │   └── plugin.json
│   └── theme-styler/
│       └── plugin.json
└── src/
    └── store/
        └── pluginStore.js
```

首启会检测 `plugins` 是否为空，若为空则将上述示例插件复制到运行时插件目录。示例插件主要用于展示系统能力（主题、声音、无缝衔接等），第三方开发者可在同级目录新增自定义插件文件夹。

## 2. 插件清单（`plugin.json`）

每个插件文件夹内必须包含一个 `plugin.json`，最小结构如下：

```json
{
  "id": "desktop-lyric",
  "name": "桌面歌词插件",
  "version": "0.1.0",
  "description": "为播放器提供桌面歌词窗口入口与状态管理。",
  "author": "Hydrogen Labs",
  "capabilities": ["desktop-lyric"],
  "features": ["桌面歌词窗口控制"],
  "settings": {
    "sections": [
      {
        "title": "基础配置",
        "fields": [
          {
            "type": "toggle",
            "label": "显示桌面歌词入口",
            "key": "entryEnabled",
            "default": true
          }
        ]
      }
    ]
  }
}
```

### 字段说明

| 字段            | 说明                                                                 |
|-----------------|----------------------------------------------------------------------|
| `id`            | 插件唯一标识（推荐使用短横线命名）。                                |
| `name`          | 展示名称。                                                           |
| `version`       | 语义化版本号。                                                       |
| `description`   | 简要介绍，将显示在插件详情页。                                       |
| `author`        | 作者名称，可选。                                                     |
| `capabilities`  | 声明插件支持的能力标识，供宿主进行特性匹配。                        |
| `features`      | 功能亮点描述，将以列表形式展示给用户。                               |
| `settings`      | 插件设置表单定义，详见下文。                                         |

### 设置字段（`settings.sections[].fields[]`）

目前支持以下字段类型：

| 类型        | 说明                                        | 额外属性示例                                  |
|-------------|---------------------------------------------|-----------------------------------------------|
| `toggle`    | 布尔开关。                                   | `default`, `description`                      |
| `select`    | 下拉选择。                                   | `options`（`[{ "label": "xxx", "value": "xxx" }]`） |
| `text`      | 单行文本输入。                               | `placeholder`                                 |
| `textarea`  | 多行文本输入。                               | `rows`, `placeholder`                         |
| `number`    | 数值输入。                                   | `min`, `max`, `step`                          |
| `button`    | 触发一次性操作（需指定 `action` 标识）。      | `action`                                      |

宿主会将字段与 `pluginStore` 中的状态持久化，并在插件设置面板中渲染对应控件。按钮类型会通过 `plugins/runtime.js` 中的动作映射到具体行为（当前实现提供 `reload` 示例动作）。

## 3. 运行时 API 概览

渲染进程通过 `window.pluginApi` 获得插件管理能力：

| 方法                    | 说明                                   |
|-------------------------|----------------------------------------|
| `getConfig()`           | 获取当前插件全局配置。                 |
| `listPlugins()`         | 扫描插件目录并返回解析后的清单。       |
| `updateConfig(config)`  | 覆盖插件配置（启用状态、表单值等）。   |
| `chooseDirectory(path)` | 弹出目录选择器并更新插件目录。         |
| `importPlugin()`        | 导入本地插件文件夹。                   |
| `deletePlugin(id)`      | 删除指定插件目录。                     |
| `reloadPlayer()`        | 触发渲染进程软重载。                   |

这些接口在 `src/store/pluginStore.js` 中被统一封装，供 Vue 组件调用。

## 4. 设置页交互

- 设置页新增了“插件”分类，提供启用总开关、目录指定、导入/刷新/重载操作。
- 插件列表支持快速进入“插件设置”面板，查看描述、功能要点并调整字段值。
- 首次开启插件功能会触发确认对话框，提示当前功能仍在完善中。

## 5. 后续工作

本次提交仅完成插件系统基础设施：

1. Electron 主进程提供插件目录管理、导入/删除 API，并支持默认示例插件复制。
2. 渲染端引入 `pluginStore` 管理状态与持久化，设置页完成 UI 框架搭建。
3. 添加示例清单与开发者文档，方便后续迁移歌词可视化、桌面歌词等功能。

下一阶段将把歌词可视化、自定义主题、桌面歌词逻辑迁移到插件驱动，并补充声音效果、无缝衔接等扩展的实际实现。

