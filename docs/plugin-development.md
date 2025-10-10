# Hydrogen Music 插件开发指南

本文档介绍 Hydrogen Music 桌面版的插件系统，包括插件目录结构、开发流程以及在设置页面中导入 / 启用 / 禁用 / 删除插件的方法。

## 插件打包与目录结构

Hydrogen Music 目前支持**目录形式**的插件包。每个插件目录需要包含以下文件：

```
my-awesome-plugin/
├─ manifest.json   # 插件元数据
└─ main.js         # 插件入口脚本，可根据需要拆分更多文件
```

> 📦 发布插件时可以将整个目录压缩分发，但在应用中导入时必须先解压，再选择插件根目录。

### manifest.json

`manifest.json` 用于描述插件的基础信息，必填字段如下：

| 字段名    | 类型   | 说明 |
|----------|--------|------|
| `id`     | string | 插件唯一 ID，仅允许字母、数字、`.`、`_`、`-`，导入时同 ID 会覆盖旧版本 |
| `name`   | string | 展示名称 |
| `version`| string | 插件版本号 |
| `main`   | string | 入口脚本（相对于插件根目录的路径，禁止使用绝对路径或 `..`） |

可选字段：

- `description`：插件简介。
- `author`：作者名称。
- `homepage`：项目主页或仓库链接。

示例：

```json
{
  "id": "example.hello-world",
  "name": "Hello World",
  "version": "1.0.0",
  "author": "Hydrogen Labs",
  "description": "示例插件，演示插件生命周期 API。",
  "homepage": "https://github.com/acnekot/Hydrogen-Music",
  "main": "main.js"
}
```

## 插件入口脚本

插件入口脚本采用 CommonJS 语法。入口需要导出一个带有 `activate`（必需）和 `deactivate`（可选）的对象，或直接导出一个函数（等价于 `activate`）：

```js
// main.js
module.exports = {
  activate(context) {
    context.utils.notice('Hello, Hydrogen!');

    const route = context.router.addRoute({
      path: '/hello-plugin',
      name: 'HelloPlugin',
      component: {
        template: '<div style="padding:24px">来自插件的页面 ✨</div>'
      }
    });

    context.onCleanup(() => {
      context.router.removeRoute(route.name);
    });
  },

  deactivate(context) {
    context.utils.notice('插件已禁用');
  }
};
```

### `activate(context)`

启用插件时调用，`context` 提供以下能力：

| 属性 | 说明 |
|------|------|
| `app` | Vue 应用实例，可用于注册全局组件、指令等 |
| `router` | Vue Router 实例，可动态添加路由 |
| `pinia` | Pinia 根实例 |
| `stores` | 常用 Pinia store 实例 `{ player, user, library, local, other, cloud }` |
| `metadata` | 插件的 manifest 信息（`id/name/version/...`） |
| `plugin` | 插件相关工具，如 `plugin.readText(path)`、`plugin.readBase64(path)` 读取插件内文件 |
| `windowApi` / `electronAPI` | 预加载脚本暴露的原生能力，与应用内部调用一致 |
| `utils.notice(message, duration)` | 调用应用内的消息提示（单位：秒） |
| `onCleanup(callback)` | 注册清理逻辑，在禁用或卸载时自动调用 |

### `deactivate(context)`

插件被禁用或卸载前调用，用于手动回收资源（如移除事件监听、清理 DOM 等）。若在 `activate` 中通过 `onCleanup` 注册了清理函数，可不再实现 `deactivate`。

## 读取插件内的文件

使用 `context.plugin.readText('data/config.json')` 读取文本文件，返回 Promise<string>。如需获取二进制 / 图片，可使用 `readBase64` 并手动转换：

```js
const coverBase64 = await context.plugin.readBase64('assets/cover.png');
const imgSrc = `data:image/png;base64,${coverBase64}`;
```

## 在应用中管理插件

1. 打开 **设置 → 插件**。
2. 点击 **导入插件**，选择包含 `manifest.json` 的插件目录。
3. 插件导入后默认启用，可随时点击 **禁用 / 启用** 按钮切换状态。
4. 点击 **删除** 可移除插件并清理插件文件。
5. 使用 **刷新列表** 重新读取插件信息（例如手动修改插件文件后）。

> 默认情况下，插件会被复制到应用根目录下的 `plugins/<插件ID>`（打包版位于可执行文件同级目录，开发环境位于项目根目录）。
> 可以在 **设置 → 插件** 中修改插件存储位置或点击旁边的“重置”恢复默认目录，修改时应用会提示是否迁移现有插件文件。
> 重复导入同 ID 插件会覆盖旧版本并保留启用状态。需要重新加载所有插件时，可使用工具栏的“重载”按钮刷新整个应用。

## 示例插件

Hydrogen Music 默认会附带一个 **歌词音频可视化** 插件，负责在歌词界面渲染频谱动画并提供独立的二级设置页面。它与其他插件拥有同样的生命周期，可以在设置中启用 / 禁用、修改参数，甚至直接删除或移动到自定义的插件目录，方便你参考其实现方式并编写自己的扩展。

## 开发建议

- 避免直接访问 Node.js 内置模块，渲染进程默认禁用 `require`。
- 通过 `windowApi` 调用 Electron 主进程提供的 API，与应用内部保持一致。
- 插件逻辑应考虑异常捕获，防止影响主应用稳定性。
- 建议在 `deactivate` 中撤销注册的路由、事件监听和全局副作用。

祝你开发愉快！
