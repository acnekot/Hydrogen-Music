import { defineStore } from 'pinia';
import { reactive, markRaw } from 'vue';
import { createPluginRuntime, clone as cloneDeep } from '../plugins/runtime';

const defaultCategories = () => ({
    api: false,
    theme: false,
    sound: false,
    integration: false,
});

const safeWindowApi = typeof window !== 'undefined' && window.windowApi ? window.windowApi : null;

export const usePluginStore = defineStore('pluginStore', {
    state: () => ({
        initialized: false,
        initializing: false,
        systemEnabled: false,
        warningAcknowledged: false,
        pluginDirectory: '',
        categoriesEnabled: defaultCategories(),
        enabledPlugins: {},
        pluginConfigs: {},
        plugins: [],
        manifests: {},
        runtime: null,
    }),
    getters: {
        isPluginEnabled(state) {
            return (id) => Boolean(state.enabledPlugins && state.enabledPlugins[id]);
        },
        isPluginActive(state) {
            return (id) => Boolean(state.runtime && state.runtime.isActive(id));
        },
        pluginManifest(state) {
            return (id) => state.manifests[id] || null;
        },
        pluginConfig(state) {
            return (id) => state.pluginConfigs[id] || null;
        },
    },
    actions: {
        async initialize() {
            if (this.initialized || this.initializing) return;
            this.initializing = true;
            if (!safeWindowApi || !safeWindowApi.getPluginConfig) {
                this.initialized = true;
                this.initializing = false;
                return;
            }
            try {
                const config = await safeWindowApi.getPluginConfig();
                this.applyConfig(config);
                this.runtime = markRaw(createPluginRuntime(this));
                await this.refreshPlugins();
                this.initialized = true;
            } catch (error) {
                console.error('[plugins] 初始化失败:', error);
            } finally {
                this.initializing = false;
            }
        },
        applyConfig(config) {
            const categories = defaultCategories();
            if (config && config.categoriesEnabled) {
                for (const key of Object.keys(categories)) {
                    categories[key] = Boolean(config.categoriesEnabled[key]);
                }
            }
            this.systemEnabled = Boolean(config?.systemEnabled);
            this.warningAcknowledged = Boolean(config?.warningAcknowledged);
            this.pluginDirectory = config?.pluginDirectory || '';
            this.categoriesEnabled = categories;
            this.enabledPlugins = { ...(config?.enabledPlugins || {}) };
            const rawConfigs = config?.pluginConfigs || {};
            const hydratedConfigs = {};
            for (const key of Object.keys(rawConfigs)) {
                hydratedConfigs[key] = reactive(cloneDeep(rawConfigs[key]));
            }
            this.pluginConfigs = hydratedConfigs;
        },
        async saveConfig() {
            if (!safeWindowApi || !safeWindowApi.setPluginConfig) return;
            const plainConfigs = {};
            for (const [key, value] of Object.entries(this.pluginConfigs)) {
                plainConfigs[key] = cloneDeep(value);
            }
            const payload = {
                systemEnabled: this.systemEnabled,
                warningAcknowledged: this.warningAcknowledged,
                pluginDirectory: this.pluginDirectory,
                categoriesEnabled: { ...this.categoriesEnabled },
                enabledPlugins: { ...this.enabledPlugins },
                pluginConfigs: plainConfigs,
            };
            try {
                await safeWindowApi.setPluginConfig(payload);
            } catch (error) {
                console.error('[plugins] 保存配置失败:', error);
            }
        },
        async refreshPlugins() {
            if (!safeWindowApi || !safeWindowApi.listPlugins) {
                this.plugins = [];
                this.manifests = {};
                return;
            }
            try {
                const list = await safeWindowApi.listPlugins();
                const manifests = {};
                for (const manifest of list) {
                    manifests[manifest.id] = manifest;
                    if (!this.pluginConfigs[manifest.id]) {
                        this.pluginConfigs[manifest.id] = reactive({});
                    }
                }
                this.plugins = list;
                this.manifests = manifests;
                this.removeUnknownPlugins();
                if (!this.runtime) {
                    this.runtime = markRaw(createPluginRuntime(this));
                }
                await this.ensureActivationStates();
                await this.saveConfig();
            } catch (error) {
                console.error('[plugins] 刷新插件列表失败:', error);
            }
        },
        removeUnknownPlugins() {
            for (const key of Object.keys(this.enabledPlugins)) {
                if (!this.manifests[key]) {
                    delete this.enabledPlugins[key];
                }
            }
            for (const key of Object.keys(this.pluginConfigs)) {
                if (!this.manifests[key]) {
                    delete this.pluginConfigs[key];
                    if (this.runtime) {
                        this.runtime.clearDefinition(key);
                    }
                }
            }
        },
        shouldActivatePlugin(id) {
            if (!this.systemEnabled) return false;
            if (!this.enabledPlugins[id]) return false;
            const manifest = this.manifests[id];
            if (!manifest) return false;
            const categories = Array.isArray(manifest.categories) ? manifest.categories : [];
            if (categories.length === 0) return true;
            return categories.every(category => this.categoriesEnabled[category] !== false);
        },
        async ensureActivationStates() {
            if (!this.runtime) return;
            const handled = new Set();
            for (const plugin of this.plugins) {
                handled.add(plugin.id);
                if (this.shouldActivatePlugin(plugin.id)) {
                    await this.runtime.activate(plugin.id);
                } else {
                    this.runtime.deactivate(plugin.id);
                }
            }
            // Deactivate plugins that are no longer present
            if (this.runtime) {
                for (const key of Object.keys(this.enabledPlugins)) {
                    if (!handled.has(key)) {
                        this.runtime.deactivate(key);
                    }
                }
            }
        },
        async setSystemEnabled(enabled) {
            this.systemEnabled = Boolean(enabled);
            await this.saveConfig();
            await this.ensureActivationStates();
        },
        async setWarningAcknowledged() {
            this.warningAcknowledged = true;
            await this.saveConfig();
        },
        async toggleCategory(category, value) {
            if (!(category in this.categoriesEnabled)) return;
            this.categoriesEnabled = {
                ...this.categoriesEnabled,
                [category]: value === undefined ? !this.categoriesEnabled[category] : Boolean(value),
            };
            await this.saveConfig();
            await this.ensureActivationStates();
        },
        async enablePlugin(id) {
            this.enabledPlugins = { ...this.enabledPlugins, [id]: true };
            await this.saveConfig();
            await this.ensureActivationStates();
        },
        async disablePlugin(id) {
            if (this.enabledPlugins[id]) {
                const next = { ...this.enabledPlugins };
                delete next[id];
                this.enabledPlugins = next;
                await this.saveConfig();
                if (this.runtime) this.runtime.deactivate(id);
            }
        },
        async deletePlugin(id) {
            if (!safeWindowApi || !safeWindowApi.deletePlugin) return { success: false, message: '无法访问插件删除接口' };
            const result = await safeWindowApi.deletePlugin(id);
            await this.refreshPlugins();
            return result;
        },
        async importPlugin(sourcePath, options) {
            if (!safeWindowApi || !safeWindowApi.importPlugin) return { success: false, message: '无法访问插件导入接口' };
            const result = await safeWindowApi.importPlugin(sourcePath, options || {});
            await this.refreshPlugins();
            return result;
        },
        async choosePluginDirectory() {
            if (!safeWindowApi || !safeWindowApi.choosePluginDirectory) return null;
            const dir = await safeWindowApi.choosePluginDirectory();
            if (dir) {
                this.pluginDirectory = dir;
                await this.saveConfig();
                await this.refreshPlugins();
            }
            return dir;
        },
        async setPluginDirectory(dir) {
            this.pluginDirectory = dir;
            await this.saveConfig();
            await this.refreshPlugins();
        },
        async resetPluginDirectory() {
            if (!safeWindowApi || !safeWindowApi.getPluginConfig || !safeWindowApi.setPluginConfig) return;
            const config = await safeWindowApi.getPluginConfig();
            config.pluginDirectory = null;
            const saved = await safeWindowApi.setPluginConfig(config);
            if (saved) {
                this.applyConfig(saved);
            }
            await this.refreshPlugins();
        },
        async reloadRenderer() {
            if (!safeWindowApi || !safeWindowApi.reloadRenderer) return { success: false, message: 'reloadRenderer 未实现' };
            return await safeWindowApi.reloadRenderer();
        },
        async loadSettingsComponent(id) {
            if (!this.runtime) return null;
            return await this.runtime.getSettingsComponent(id);
        },
        mergePluginConfig(id, patch) {
            if (!this.pluginConfigs[id]) {
                this.pluginConfigs[id] = reactive({});
            }
            Object.assign(this.pluginConfigs[id], patch || {});
            this.saveConfig();
            if (this.runtime) this.runtime.notifyConfigChange(id);
        },
        replacePluginConfig(id, config) {
            this.pluginConfigs[id] = reactive(cloneDeep(config || {}));
            this.saveConfig();
            if (this.runtime) this.runtime.notifyConfigChange(id);
        },
    },
});

export const initPluginStore = async () => {
    const store = usePluginStore();
    await store.initialize();
    return store;
};
