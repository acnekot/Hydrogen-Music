import { defineStore } from 'pinia';
import { computed, reactive, ref, watch } from 'vue';
import { usePlayerStore } from './playerStore';
import { useOtherStore } from './otherStore';

const defaultPluginCategories = () => ({
    thirdPartyApi: true,
    theme: true,
    sound: true,
    integration: true,
});

export const usePluginStore = defineStore('pluginStore', () => {
    const playerStore = usePlayerStore();
    const otherStore = useOtherStore();

    const initialized = ref(false);
    const pluginSystemEnabled = ref(false);
    const firstConfirmationDismissed = ref(false);
    const pluginDirectory = ref('');
    const categoryEnabled = reactive(defaultPluginCategories());
    const plugins = ref([]);
    const enabledPlugins = reactive(new Map());
    const loading = ref(false);
    const pluginSettings = reactive({});
    const desktopLyricContribution = ref(null);
    const lyricRendererContribution = ref(null);
    const settingsPanels = reactive(new Map());
    const themeStyles = reactive(new Map());
    const soundHooks = reactive(new Map());
    const integrationHooks = reactive(new Map());
    const registeredSongChangeHooks = ref(new Map());
    const pluginErrors = reactive(new Map());
    const pendingSoftReload = ref(false);

    const activePlugins = computed(() => plugins.value.filter(p => enabledPlugins.get(p.id)));

    const ensureCategory = name => {
        if (Object.prototype.hasOwnProperty.call(categoryEnabled, name)) return;
        categoryEnabled[name] = true;
    };

    const resetRuntimeForPlugin = id => {
        if (desktopLyricContribution.value && desktopLyricContribution.value.pluginId === id) {
            try {
                desktopLyricContribution.value.onDeactivate?.();
            } catch (err) {
                console.error('[Plugin] Failed to deactivate desktop lyric contribution', err);
            }
            desktopLyricContribution.value = null;
        }
        if (lyricRendererContribution.value && lyricRendererContribution.value.pluginId === id) {
            try {
                lyricRendererContribution.value.onDeactivate?.();
            } catch (err) {
                console.error('[Plugin] Failed to deactivate lyric renderer contribution', err);
            }
            lyricRendererContribution.value = null;
        }
        if (settingsPanels.has(id)) settingsPanels.delete(id);
        if (themeStyles.has(id)) {
            const styleEl = themeStyles.get(id);
            if (styleEl && styleEl.parentNode) {
                styleEl.parentNode.removeChild(styleEl);
            }
            themeStyles.delete(id);
        }
        if (soundHooks.has(id)) {
            try {
                soundHooks.get(id)?.dispose?.();
            } catch (err) {
                console.error('[Plugin] Failed to dispose sound hook', err);
            }
            soundHooks.delete(id);
        }
        if (integrationHooks.has(id)) {
            try {
                integrationHooks.get(id)?.dispose?.();
            } catch (err) {
                console.error('[Plugin] Failed to dispose integration hook', err);
            }
            integrationHooks.delete(id);
        }
        if (registeredSongChangeHooks.value.has(id)) registeredSongChangeHooks.value.delete(id);
    };

    const applyDesktopLyricContribution = payload => {
        if (!payload) return;
        desktopLyricContribution.value = payload;
        payload.onActivate?.();
    };

    const applyLyricRendererContribution = payload => {
        if (!payload) return;
        lyricRendererContribution.value = payload;
        payload.onActivate?.();
    };

    const setThemeStyle = (pluginId, cssText) => {
        if (!cssText) return;
        let styleEl = themeStyles.get(pluginId);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.setAttribute('data-plugin-style', pluginId);
            document.head.appendChild(styleEl);
            themeStyles.set(pluginId, styleEl);
        }
        styleEl.innerHTML = cssText;
    };

    const registerSongChangeHook = (pluginId, hook) => {
        registeredSongChangeHooks.value.set(pluginId, hook);
    };

    const songWatcherStop = ref(null);

    const ensureSongWatcher = () => {
        if (songWatcherStop.value) return;
        songWatcherStop.value = watch(
            () => playerStore.songId,
            async (newSong, oldSong) => {
                if (newSong === oldSong) return;
                for (const hook of registeredSongChangeHooks.value.values()) {
                    try {
                        await hook?.(newSong, oldSong);
                    } catch (err) {
                        console.error('[Plugin] Song change hook failed', err);
                    }
                }
            },
            { immediate: false }
        );
    };

    const disposeSongWatcher = () => {
        if (songWatcherStop.value) {
            songWatcherStop.value();
            songWatcherStop.value = null;
        }
    };

    watch(
        () => registeredSongChangeHooks.value.size,
        size => {
            if (size > 0) ensureSongWatcher();
            else disposeSongWatcher();
        },
        { immediate: true }
    );

    const setPluginSettings = (pluginId, values) => {
        pluginSettings[pluginId] = values;
    };

    const getPluginSettings = pluginId => pluginSettings[pluginId] || {};

    const markError = (pluginId, error) => {
        pluginErrors.set(pluginId, {
            message: error?.message || String(error),
            stack: error?.stack,
            time: Date.now(),
        });
    };

    const clearError = pluginId => {
        pluginErrors.delete(pluginId);
    };

    const requestSoftReload = () => {
        pendingSoftReload.value = true;
        otherStore.noticeText = '正在载入全部插件…';
        otherStore.noticeShow = true;
        setTimeout(() => {
            otherStore.noticeShow = false;
            pendingSoftReload.value = false;
            window.location.reload();
        }, 800);
    };

    return {
        initialized,
        pluginSystemEnabled,
        firstConfirmationDismissed,
        pluginDirectory,
        categoryEnabled,
        plugins,
        enabledPlugins,
        loading,
        pluginSettings,
        desktopLyricContribution,
        lyricRendererContribution,
        settingsPanels,
        themeStyles,
        soundHooks,
        integrationHooks,
        registeredSongChangeHooks,
        pluginErrors,
        pendingSoftReload,
        activePlugins,
        ensureCategory,
        resetRuntimeForPlugin,
        applyDesktopLyricContribution,
        applyLyricRendererContribution,
        setThemeStyle,
        registerSongChangeHook,
        setPluginSettings,
        getPluginSettings,
        markError,
        clearError,
        requestSoftReload,
    };
});
