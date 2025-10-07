import { reactive } from 'vue';
import { usePluginStore } from '@/store/pluginStore';

const builtinModuleLoaders = {
    'desktop-lyric/runtime': () => import('./runtime/desktopLyric/index.js'),
    'desktop-lyric/settings': () => import('./runtime/desktopLyric/settingsPanel.vue'),
    'lyric-visualizer/runtime': () => import('./runtime/lyricVisualizer/index.js'),
    'lyric-visualizer/settings': () => import('./runtime/lyricVisualizer/settingsPanel.vue'),
    'theme/skyline-panel': () => import('./runtime/themeSamples/SkylinePanel.vue'),
    'sound/sfx-panel': () => import('./runtime/soundSamples/SfxPanel.vue'),
    'integration/seamless': () => import('./runtime/integrationSamples/seamless.js'),
    'integration/seamless-panel': () => import('./runtime/integrationSamples/SeamlessPanel.vue'),
};

export function createPluginContext(metadata, cleanups) {
    const store = usePluginStore();
    const pluginId = metadata.id;

    const getSettings = () => store.getPluginSettings(pluginId);

    const ensureCategory = (category) => {
        store.ensureCategory(category);
        return !!store.categoryEnabled[category];
    };

    const context = reactive({
        id: pluginId,
        metadata,
        isPluginSystemEnabled: () => store.pluginSystemEnabled,
        isCategoryEnabled: ensureCategory,
        getSetting(key, fallback = undefined) {
            const settings = getSettings();
            if (Object.prototype.hasOwnProperty.call(settings, key)) return settings[key];
            return fallback;
        },
        setSetting(key, value) {
            const current = { ...getSettings(), [key]: value };
            store.setPluginSettings(pluginId, current);
            windowApi.plugins.updateData(pluginId, current);
        },
        registerDesktopLyric(payload) {
            store.applyDesktopLyricContribution({
                pluginId,
                ...payload,
            });
            if (payload?.onDeactivate) cleanups.push(payload.onDeactivate);
        },
        registerLyricRenderer(payload) {
            store.applyLyricRendererContribution({
                pluginId,
                ...payload,
            });
            if (payload?.onDeactivate) cleanups.push(payload.onDeactivate);
        },
        registerSettingsPanel(loader) {
            store.settingsPanels.set(pluginId, loader);
            cleanups.push(() => {
                if (store.settingsPanels.has(pluginId)) store.settingsPanels.delete(pluginId);
            });
        },
        registerThemeStyle(cssText) {
            store.setThemeStyle(pluginId, cssText);
            cleanups.push(() => {
                if (store.themeStyles.has(pluginId)) {
                    const styleEl = store.themeStyles.get(pluginId);
                    if (styleEl && styleEl.parentNode) {
                        styleEl.parentNode.removeChild(styleEl);
                    }
                    store.themeStyles.delete(pluginId);
                }
            });
        },
        registerSoundEffect(hook) {
            store.soundHooks.set(pluginId, hook);
            if (typeof hook?.onSongChange === 'function') {
                store.registerSongChangeHook(pluginId, hook.onSongChange);
            }
            cleanups.push(() => {
                if (store.soundHooks.has(pluginId)) {
                    try {
                        store.soundHooks.get(pluginId)?.dispose?.();
                    } catch (err) {
                        console.error('[Plugin] dispose sound hook failed', err);
                    }
                    store.soundHooks.delete(pluginId);
                }
            });
        },
        registerIntegrationHook(hook) {
            store.integrationHooks.set(pluginId, hook);
            hook?.onActivate?.();
            cleanups.push(() => {
                if (store.integrationHooks.has(pluginId)) {
                    try {
                        store.integrationHooks.get(pluginId)?.dispose?.();
                    } catch (err) {
                        console.error('[Plugin] dispose integration hook failed', err);
                    }
                    store.integrationHooks.delete(pluginId);
                }
            });
        },
        onSongChange(handler) {
            store.registerSongChangeHook(pluginId, handler);
            cleanups.push(() => {
                const hooks = store.registeredSongChangeHooks;
                if (hooks?.value) hooks.value.delete(pluginId);
                else if (hooks?.delete) hooks.delete(pluginId);
            });
        },
        async importModule(moduleId) {
            const loader = builtinModuleLoaders[moduleId];
            if (!loader) throw new Error(`无法加载内置模块: ${moduleId}`);
            return loader();
        },
        async readText(relativePath) {
            return windowApi.plugins.readFile(pluginId, relativePath, 'utf-8');
        },
        async readBinary(relativePath) {
            return windowApi.plugins.readFile(pluginId, relativePath, null);
        },
        async loadStyle(relativePath) {
            const css = await this.readText(relativePath);
            if (css) this.registerThemeStyle(css);
        },
        reportError(error) {
            const message = error?.message || String(error);
            store.markError(pluginId, error);
            windowApi.plugins.reportError(pluginId, message);
        },
        clearError() {
            store.clearError(pluginId);
        },
        updateData(patch) {
            return windowApi.plugins.updateData(pluginId, patch);
        },
        getData() {
            return windowApi.plugins.getData(pluginId);
        },
    });

    return context;
}
