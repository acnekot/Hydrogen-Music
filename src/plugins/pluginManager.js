import { usePluginStore } from '../store/pluginStore';
import { noticeOpen } from '../utils/dialog';

const pluginModules = import.meta.glob('./modules/**/index.js', { eager: true });
const pluginManifests = import.meta.glob('./modules/**/manifest.json', { eager: true, import: 'default' });

const registry = new Map();
const runtimeState = new Map();
let sharedContext = null;
let hasLoadedPlugins = false;

const toManifestPath = (modulePath) => modulePath.replace(/index\.js$/, 'manifest.json');

const normalizeManifest = (manifest = {}, fallbackId) => {
  const entryValue = typeof manifest.entry === 'object' && manifest.entry !== null
    ? manifest.entry.name || manifest.entry.route || null
    : manifest.entry ?? null;

  return {
    id: manifest.id || fallbackId,
    name: manifest.name || fallbackId,
    version: manifest.version || '0.0.0',
    description: manifest.description || '',
    author: manifest.author || '未知作者',
    enabledByDefault: manifest.enabledByDefault !== false,
    entryRouteName: entryValue,
    homepage: manifest.homepage || manifest.repository || null,
    keywords: Array.isArray(manifest.keywords) ? manifest.keywords : []
  };
};

const createLogger = (manifest) => {
  const prefix = `[Plugin:${manifest.id}]`;
  return {
    info: (...args) => console.info(prefix, ...args),
    warn: (...args) => console.warn(prefix, ...args),
    error: (...args) => console.error(prefix, ...args)
  };
};

const withPluginContext = (manifest, runtime) => ({
  app: sharedContext.app,
  router: sharedContext.router,
  pinia: sharedContext.pinia,
  registerRoute: (routeDefinition) => {
    if (!routeDefinition) return;
    const definition = { ...routeDefinition };
    const targetName = definition.name || definition.path;
    if (!targetName) {
      console.warn(`[Plugin:${manifest.id}] route 需要一个 name 或 path 字段`);
      return;
    }

    if (definition.parent) {
      const parent = definition.parent;
      const childRoute = { ...definition };
      delete childRoute.parent;
      sharedContext.router.addRoute(parent, childRoute);
    } else {
      sharedContext.router.addRoute(definition);
    }

    runtime.routes.push(targetName);
  },
  registerCleanup: (cleanup) => {
    if (typeof cleanup === 'function') {
      runtime.cleanups.push(cleanup);
    }
  },
  logger: createLogger(manifest)
});

const activatePluginInternal = (pluginId) => {
  if (!sharedContext) return false;
  const record = registry.get(pluginId);
  if (!record) return false;
  if (runtimeState.has(pluginId)) return true;

  const runtime = {
    routes: [],
    cleanups: []
  };
  const context = withPluginContext(record.manifest, runtime);

  try {
    if (Array.isArray(record.module.routes)) {
      record.module.routes.forEach(route => context.registerRoute(route));
    }

    const dispose = typeof record.module.activate === 'function'
      ? record.module.activate(context)
      : null;

    if (typeof dispose === 'function') {
      runtime.cleanups.push(dispose);
    }

    runtimeState.set(pluginId, runtime);
    return true;
  } catch (error) {
    console.error(`[Plugin:${pluginId}] 激活失败`, error);
    noticeOpen(`加载插件 ${record.manifest.name} 失败`, 2);
    return false;
  }
};

const deactivatePluginInternal = (pluginId) => {
  if (!sharedContext) return;
  const record = registry.get(pluginId);
  const runtime = runtimeState.get(pluginId);
  if (!record || !runtime) return;

  try {
    runtime.cleanups.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error(`[Plugin:${pluginId}] 执行清理函数失败`, error);
      }
    });

    runtime.routes.forEach(routeName => {
      if (routeName) {
        try {
          sharedContext.router.removeRoute(routeName);
        } catch (error) {
          console.warn(`[Plugin:${pluginId}] 移除路由 ${routeName} 失败`, error);
        }
      }
    });

    if (typeof record.module.deactivate === 'function') {
      try {
        record.module.deactivate({
          app: sharedContext.app,
          router: sharedContext.router,
          pinia: sharedContext.pinia,
          logger: createLogger(record.manifest)
        });
      } catch (error) {
        console.error(`[Plugin:${pluginId}] 自定义卸载函数执行失败`, error);
      }
    }
  } finally {
    runtimeState.delete(pluginId);
  }
};

export const loadPlugins = (app, { router, pinia }) => {
  if (hasLoadedPlugins) return;
  hasLoadedPlugins = true;

  sharedContext = { app, router, pinia };
  const pluginStore = usePluginStore();
  const manifestList = [];

  Object.entries(pluginModules).forEach(([path, module]) => {
    const manifestPath = toManifestPath(path);
    const manifestRaw = pluginManifests[manifestPath];

    if (!manifestRaw) {
      console.warn(`未找到插件 ${path} 的 manifest.json`);
      return;
    }

    const normalizedManifest = normalizeManifest(manifestRaw, manifestRaw.id || path);
    const pluginDefinition = module.default ?? module;

    if (!pluginDefinition) {
      console.warn(`插件 ${normalizedManifest.id} 未导出任何内容`);
      return;
    }

    registry.set(normalizedManifest.id, {
      manifest: normalizedManifest,
      module: pluginDefinition
    });

    manifestList.push(normalizedManifest);
  });

  pluginStore.registerPlugins(manifestList);

  manifestList.forEach((manifest) => {
    if (pluginStore.isEnabled(manifest.id)) {
      const success = activatePluginInternal(manifest.id);
      if (!success) {
        pluginStore.setEnabledState(manifest.id, false);
      }
    }
  });
};

export const enablePlugin = (pluginId) => {
  const pluginStore = usePluginStore();
  const success = activatePluginInternal(pluginId);
  pluginStore.setEnabledState(pluginId, success);
};

export const disablePlugin = (pluginId) => {
  deactivatePluginInternal(pluginId);
  const pluginStore = usePluginStore();
  pluginStore.setEnabledState(pluginId, false);
};

export const reloadPlugin = (pluginId) => {
  deactivatePluginInternal(pluginId);
  activatePluginInternal(pluginId);
};

export const getPluginManifest = (pluginId) => {
  return registry.get(pluginId)?.manifest ?? null;
};
