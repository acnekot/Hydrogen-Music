# Hydrogen Music 插件系统开发指南

> 本文档面向希望为 Hydrogen Music++ 编写扩展功能的开发者，介绍插件系统的整体架构、生命周期、事件机制以及最佳实践。

## 插件系统概览

Hydrogen Music 通过内置的 `PluginManager` 在应用启动时统一加载插件。每个插件都是一个导出默认对象的模块，只要实现最基本的 `name`、`activate` 与 `deactivate` 字段，即可无侵入地扩展应用能力。

插件加载流程如下：

1. 在 `src/plugins/registry.js` 中登记插件信息（名称、描述、动态加载函数等）。
2. 应用启动后，`PluginManager` 会遍历注册表并加载已启用的插件。
3. 插件的 `activate` 钩子会收到上下文对象，可用于访问应用实例、路由、Pinia、事件总线等能力。
4. 当插件卸载或应用关闭时，会依次执行插件的 `deactivate` 钩子以及所有通过 `registerCleanup` 注册的清理函数。

## 创建你的第一个插件

下面以一个最小可运行的插件为例，展示基本目录结构与代码：

```text
src/
└─ plugins/
   ├─ registry.js          # 插件注册表
   └─ my-first-plugin/
      └─ index.js          # 插件实现
```

`src/plugins/my-first-plugin/index.js`：

```js
export default {
  name: 'my-first-plugin',
  version: '1.0.0',
  description: 'Hello Hydrogen!',
  async activate(context) {
    const { logger, eventBus } = context;

    logger.info('插件启动');
    eventBus.emit('my-first-plugin:ready');
  },
  async deactivate(context) {
    context.logger.info('插件停止');
  }
};
```

然后在 `src/plugins/registry.js` 中加入一条记录：

```js
const pluginRegistry = [
  // ...已有的插件
  {
    name: 'my-first-plugin',
    description: 'Hello Hydrogen!',
    entry: './my-first-plugin/index.js',
  },
];

export { pluginRegistry };
export default pluginRegistry;
```

> **提示**：通过设置 `enabled: false` 可以将插件保留在注册表中但暂时不加载，便于调试或灰度发布。

## 插件管理与设置

在客户端中打开 **设置 → 插件** 可以直接管理当前的插件注册表：

- 「导入插件」：通过文件选择器加载本地的 `*.js`/`*.mjs` 插件入口文件，系统会自动读取插件的 `name`、`description`、`version` 等元信息并写入注册表。
- 「启用 / 禁用」：切换某个插件的启用状态，启用时立即激活，禁用时自动调用 `deactivate` 并卸载资源。
- 「删除」：移除自定义插件（内置插件不可删除），同时从注册表与运行时卸载。
- 「刷新」：重新从本地注册表加载配置，便于在外部修改配置文件后同步。

所有插件配置都保存在 `electron-store` 的 `plugins` 命名空间中，会在应用启动时合并内置插件注册表并写回。若需要手动修改，可在开发者工具中通过
`window.pluginApi.getRegistry()` 和 `window.pluginApi.saveRegistry(registry)` 访问、更新原始 JSON 数据。

> 小提示：如果希望插件记录可以持久化存储，推荐在注册表条目中使用 `entry`（相对路径）或 `path`（绝对 `file://` 地址）字段描述模块位置，
> 这样在序列化时无需保存动态函数。

## 插件上下文（PluginContext）

`activate(context)` 与 `deactivate(context)` 接收到的 `context` 对象包含以下字段：

| 字段 | 说明 |
| ---- | ---- |
| `app` | 当前的 Vue `App` 实例，可用于注册全局组件或指令。 |
| `router` | 应用的 Vue Router 实例，可添加新路由或导航守卫。 |
| `pinia` | Pinia 根实例，可注册或访问 Store。 |
| `descriptor` | 插件在注册表中的原始描述信息。 |
| `options` | `descriptor.options` 的浅拷贝，可存放自定义配置。 |
| `eventBus` | 简单的事件总线，提供 `on/once/off/emit`。 |
| `registerCleanup(fn)` | 注册一个在插件卸载时自动执行的清理函数。 |
| `logger` | 已带有插件名前缀的日志对象，包含 `info/warn/error/debug`。 |

上下文对象是只读的（`Object.freeze`），因此不要尝试直接修改属性；如果需要持久化自定义状态，请使用 Pinia Store、Electron Store 或自行维护变量。

## 事件总线

插件之间可通过事件总线进行通信：

```js
const unsubscribe = context.eventBus.on('player:track-changed', (payload) => {
  context.logger.info('当前歌曲：', payload);
});

// 记得在卸载时移除监听
context.registerCleanup(unsubscribe);
```

内置事件列表：

- `plugin-manager:ready`：所有注册插件完成加载后触发。
- `plugin:activated`：某个插件激活后触发，payload 包含 `{ plugin, descriptor }`。
- `plugin:deactivated`：某个插件卸载后触发，payload 包含 `{ plugin, descriptor }`。

你也可以自由定义自有事件，约定命名空间（例如 `my-plugin:*`）可以减少冲突。

## 生命周期与清理

- `activate(context)`：插件被加载时调用，适合注册路由、监听事件、挂载全局组件等。
- `registerCleanup(fn)`：注册的回调会在 `deactivate` 之后执行，可释放事件监听、定时器等资源。
- `deactivate(context)`：卸载时调用，可以执行最后的持久化或日志上报。

`PluginManager` 会确保即使在 `deactivate` 阶段出现异常，也会继续尝试执行余下的清理函数，避免资源泄露。

## 调试技巧

- 在开发环境中可以通过 `window.__HYDROGEN_PLUGIN_MANAGER__` 访问运行时的插件管理器实例，直接调用 `list()`、`load(name)`、`unload(name)` 等方法调试插件。
- 调用 `context.logger.*` 输出的日志会自动带有 `[Plugin:xxx]` 前缀，便于在控制台中过滤。
- 如果插件初始化失败，错误会被捕获并输出在控制台中，同时不会影响其他插件的加载。

## 示例插件

仓库内置了一个 `hello-world` 示例插件（见 `src/plugins/samples/helloWorldPlugin.js`），默认处于禁用状态。你可以在注册表中将 `enabled` 改为 `true` 或者在控制台运行：

```js
window.__HYDROGEN_PLUGIN_MANAGER__.load('hello-world')
```

即可观察插件激活与事件分发的行为。

## 最佳实践

- 为插件提供唯一的 `name`，建议使用 `kebab-case` 格式。
- 使用 `descriptor.options` 暴露可配置项，配合设置页面实现插件配置化。
- 避免在插件中直接修改 DOM，优先通过 Vue 组件、路由或 Store 实现功能。
- 如需访问 Electron 主进程能力，可在插件中调用现有的 API 模块，保持代码复用。

祝你开发顺利，期待你的创意插件！
