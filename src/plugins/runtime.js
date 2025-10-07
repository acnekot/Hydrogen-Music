import { reactive, markRaw } from 'vue';
import * as Vue from 'vue';
import { usePlayerStore } from '../store/playerStore';
import { useOtherStore } from '../store/otherStore';
import { initDesktopLyric, destroyDesktopLyric, toggleDesktopLyric } from '../utils/desktopLyric';

const safeWindow = typeof window !== 'undefined' ? window : undefined;
const safeWindowApi = safeWindow && safeWindow.windowApi ? safeWindow.windowApi : {};

const builtinComponents = {
    'lyric-visualizer': () => import('./components/LyricVisualizerSettings.vue'),
    'desktop-lyric': () => import('./components/DesktopLyricSettings.vue'),
    'theme-showcase': () => import('./components/ThemeShowcaseSettings.vue'),
    'sound-effects': () => import('./components/SoundEffectSettings.vue'),
    'seamless-playback': () => import('./components/SeamlessPlaybackSettings.vue'),
};

export const clone = (value) => JSON.parse(JSON.stringify(value ?? {}));

const evaluatePluginModule = async (source, api) => {
    const module = { exports: {} };
    const require = (id) => {
        if (id === 'vue') return Vue;
        throw new Error(`插件尝试加载不被允许的模块: ${id}`);
    };
    const wrapped = new Function('module', 'exports', 'require', 'pluginApi', source);
    wrapped(module, module.exports, require, api);
    let exported = module.exports && module.exports.default ? module.exports.default : module.exports;
    if (typeof exported === 'function') {
        exported = await exported(api);
    }
    if (!exported || typeof exported !== 'object') {
        throw new Error('插件未返回有效的定义');
    }
    return exported;
};

export const createPluginRuntime = (store) => {
    const definitions = new Map();
    const activeContexts = new Map();
    const dynamicComponents = new Map();
    let componentSeed = 0;

    const ensureManifest = (id) => store.manifests[id];

    const createPluginApi = (manifest) => ({
        id: manifest.id,
        manifest,
        vue: Vue,
        windowApi: safeWindowApi,
        useBuiltinComponent(name) {
            return `builtin:${name}`;
        },
        registerSettingsComponent(componentOptions) {
            const componentId = `runtime:${manifest.id}:${++componentSeed}`;
            dynamicComponents.set(componentId, markRaw(componentOptions));
            return componentId;
        },
        desktopLyric: {
            init: initDesktopLyric,
            destroy: destroyDesktopLyric,
            toggle: toggleDesktopLyric,
        },
        stores: {
            usePlayerStore,
            useOtherStore,
            usePluginStore: () => store,
        },
    });

    const ensureDefinition = async (id) => {
        if (definitions.has(id)) return definitions.get(id);
        const manifest = ensureManifest(id);
        if (!manifest) return null;
        if (!safeWindowApi || !safeWindowApi.loadPluginSource) return null;
        const source = await safeWindowApi.loadPluginSource(id);
        if (!source) return null;
        const pluginApi = createPluginApi(manifest);
        let definition = await evaluatePluginModule(source, pluginApi);
        definition = {
            id: definition.id || manifest.id,
            name: definition.name || manifest.name || manifest.id,
            version: definition.version || manifest.version || '0.0.0',
            description: definition.description || manifest.description || '',
            author: definition.author || manifest.author || '',
            categories: Array.isArray(definition.categories)
                ? definition.categories
                : Array.isArray(manifest.categories)
                ? manifest.categories
                : [],
            settingsComponent:
                definition.settingsComponent || (definition.useBuiltinSettingsComponent && definition.useBuiltinSettingsComponent()),
            defaultConfig: definition.defaultConfig || {},
            onActivate: definition.onActivate,
            onDeactivate: definition.onDeactivate,
            onConfigChange: definition.onConfigChange,
            manifest,
        };
        definitions.set(id, definition);
        return definition;
    };

    const createContext = (id, definition) => {
        const cleanup = [];
        const pluginStore = store;
        const ensureConfig = () => {
            let config = pluginStore.pluginConfigs[id];
            if (!config) {
                config = reactive(clone(definition.defaultConfig || {}));
                pluginStore.pluginConfigs[id] = config;
            }
            return config;
        };
        const context = {
            id,
            manifest: definition.manifest,
            stores: {
                playerStore: usePlayerStore(),
                otherStore: useOtherStore(),
                pluginStore,
            },
            windowApi: safeWindowApi,
            vue: Vue,
            get config() {
                return ensureConfig();
            },
            getConfig() {
                return ensureConfig();
            },
            updateConfig(patch) {
                pluginStore.mergePluginConfig(id, patch);
            },
            setConfig(nextConfig) {
                pluginStore.replacePluginConfig(id, nextConfig);
            },
            onCleanup(fn) {
                if (typeof fn === 'function') cleanup.push(fn);
            },
        };
        activeContexts.set(id, { context, cleanup });
        return context;
    };

    return {
        async activate(id) {
            if (activeContexts.has(id)) return true;
            const definition = await ensureDefinition(id);
            if (!definition) return false;
            const context = createContext(id, definition);
            try {
                if (typeof definition.onActivate === 'function') {
                    await definition.onActivate(context);
                }
            } catch (error) {
                console.error('[plugins] 激活失败:', id, error);
            }
            return true;
        },
        deactivate(id) {
            const entry = activeContexts.get(id);
            const definition = definitions.get(id);
            if (!entry) return;
            try {
                if (definition && typeof definition.onDeactivate === 'function') {
                    definition.onDeactivate(entry.context);
                }
            } catch (error) {
                console.error('[plugins] 停用失败:', id, error);
            }
            for (const fn of entry.cleanup) {
                try {
                    fn();
                } catch (err) {
                    console.error('[plugins] 清理失败:', err);
                }
            }
            activeContexts.delete(id);
        },
        isActive(id) {
            return activeContexts.has(id);
        },
        async ensureDefinition(id) {
            return await ensureDefinition(id);
        },
        getDefinition(id) {
            return definitions.get(id) || null;
        },
        async getSettingsComponent(id) {
            const definition = await ensureDefinition(id);
            if (!definition || !definition.settingsComponent) return null;
            const componentId = definition.settingsComponent;
            if (componentId.startsWith('builtin:')) {
                const key = componentId.slice(8);
                const loader = builtinComponents[key];
                if (!loader) return null;
                const module = await loader();
                return markRaw(module.default || module);
            }
            if (componentId.startsWith('runtime:')) {
                return dynamicComponents.get(componentId) || null;
            }
            return null;
        },
        notifyConfigChange(id) {
            const definition = definitions.get(id);
            const entry = activeContexts.get(id);
            if (!definition || !entry) return;
            if (typeof definition.onConfigChange === 'function') {
                try {
                    definition.onConfigChange(entry.context, entry.context.getConfig());
                } catch (error) {
                    console.error('[plugins] 配置更新回调失败:', id, error);
                }
            }
        },
        clearDefinition(id) {
            definitions.delete(id);
            activeContexts.delete(id);
        },
        getActiveContext(id) {
            const entry = activeContexts.get(id);
            return entry ? entry.context : null;
        },
    };
};

export const initPluginSystem = async () => {
    const { usePluginStore } = await import('../store/pluginStore');
    const store = usePluginStore();
    await store.initialize();
    return store;
};
