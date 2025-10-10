# @hydrogen/plugins-core

Hydrogen 插件核心库，适用于任意基于 Electron + Vue 3 + Pinia 的桌面应用。提供统一的插件注册、生命周期管理、API 调用、UI 注入、热加载、权限控制与沙箱隔离能力。

## 安装

```bash
npm install @hydrogen/plugins-core
```

## 快速开始

```ts
import { PluginManager } from '@hydrogen/plugins-core';

const manager = new PluginManager({
  appId: 'com.example.app',
  apiInvoker: new PluginApiRegistry(),
  rendererBridge: myRendererBridge,
  hotReload: true,
});

await manager.scanAndLoad();
```

详细文档参见仓库中的《开发者指南》。
