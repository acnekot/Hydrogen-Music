import { defineStore } from 'pinia';
import { reactive } from 'vue';
import { noticeOpen } from '../utils/dialog';

const getPluginApi = () => {
    if (typeof window === 'undefined') return null;
    return window.pluginApi || null;
};

const extractDefaultsFromManifest = (manifest) => {
    const defaults = {};
    if (!manifest || !manifest.settings || !Array.isArray(manifest.settings.sections)) return defaults;
    for (const section of manifest.settings.sections) {
        if (!section || !Array.isArray(section.fields)) continue;
        for (const field of section.fields) {
            if (!field || !field.key) continue;
            if (Object.prototype.hasOwnProperty.call(defaults, field.key)) continue;
            if (field.default !== undefined) {
                defaults[field.key] = field.default;
            } else if (field.type === 'toggle') {
                defaults[field.key] = false;
            } else if (field.type === 'text' || field.type === 'textarea') {
                defaults[field.key] = '';
            } else if (field.type === 'number') {
                defaults[field.key] = field.min ?? 0;
            } else if (field.type === 'select' && Array.isArray(field.options) && field.options.length > 0) {
                defaults[field.key] = field.options[0].value;
            }
        }
    }
    return defaults;
};

export const usePluginStore = defineStore('pluginStore', {
    state: () => ({
        enabled: false,
        warningAcknowledged: false,
        pluginDirectory: '',
        manifests: reactive([]),
        pluginStates: {},
        loading: false,
        lastError: null,
    }),
    getters: {
        installedPlugins(state) {
            return state.manifests || [];
        },
        isPluginEnabled: (state) => (pluginId) => {
            if (!state.enabled) return false;
            const entry = state.pluginStates[pluginId];
            return !!(entry && entry.enabled);
        },
        activePlugins(state) {
            if (!state.enabled) return [];
            return (state.manifests || []).filter((manifest) => {
                const entry = state.pluginStates[manifest.id];
                return entry && entry.enabled;
            });
        },
        activeCapabilities() {
            const caps = new Set();
            for (const manifest of this.activePlugins) {
                if (!manifest || !Array.isArray(manifest.capabilities)) continue;
                manifest.capabilities.forEach((cap) => caps.add(cap));
            }
            return Array.from(caps);
        },
        hasCapability() {
            return (capability) => this.activeCapabilities.includes(capability);
        },
    },
    actions: {
        async initialize(forceReload = false) {
            if (this.loading && !forceReload) return;
            const pluginApi = getPluginApi();
            if (!pluginApi) return;
            this.loading = true;
            try {
                const config = await pluginApi.getConfig();
                if (config) {
                    this.enabled = !!config.enabled;
                    this.warningAcknowledged = !!config.warningAcknowledged;
                    this.pluginDirectory = config.directory || '';
                    this.pluginStates = config.installed || {};
                }
                await this.refreshManifests();
            } catch (error) {
                console.error('初始化插件系统失败:', error);
                this.lastError = error;
            } finally {
                this.loading = false;
            }
        },
        async refreshManifests() {
            const pluginApi = getPluginApi();
            if (!pluginApi) return;
            try {
                const result = await pluginApi.listPlugins();
                this.pluginDirectory = result?.directory || this.pluginDirectory;
                const manifests = Array.isArray(result?.plugins) ? result.plugins : [];
                this.manifests.splice(0, this.manifests.length, ...manifests);
                for (const manifest of manifests) {
                    this.ensurePluginState(manifest.id, manifest);
                }
                await this.persistStates();
            } catch (error) {
                console.error('刷新插件列表失败:', error);
                this.lastError = error;
            }
        },
        ensurePluginState(pluginId, manifest) {
            if (!pluginId) return;
            if (!this.pluginStates[pluginId]) {
                const defaults = extractDefaultsFromManifest(manifest);
                this.pluginStates[pluginId] = {
                    enabled: false,
                    settings: { ...defaults },
                };
            } else if (!this.pluginStates[pluginId].settings) {
                const defaults = extractDefaultsFromManifest(manifest);
                this.pluginStates[pluginId].settings = { ...defaults };
            } else if (manifest) {
                const defaults = extractDefaultsFromManifest(manifest);
                this.pluginStates[pluginId].settings = {
                    ...defaults,
                    ...this.pluginStates[pluginId].settings,
                };
            }
        },
        async persistStates() {
            const pluginApi = getPluginApi();
            if (!pluginApi) return;
            try {
                await pluginApi.updateConfig({
                    enabled: this.enabled,
                    warningAcknowledged: this.warningAcknowledged,
                    directory: this.pluginDirectory,
                    installed: this.pluginStates,
                });
            } catch (error) {
                console.error('持久化插件状态失败:', error);
            }
        },
        async setGlobalEnabled(flag) {
            if (flag && !this.warningAcknowledged) {
                const confirmed = window.confirm('插件功能暂不完善，BUG满天飞，确定打开？');
                if (!confirmed) return;
                this.warningAcknowledged = true;
            }
            this.enabled = !!flag;
            await this.persistStates();
        },
        async togglePlugin(pluginId, manifest, flag) {
            this.ensurePluginState(pluginId, manifest);
            if (!this.pluginStates[pluginId]) return;
            this.pluginStates[pluginId].enabled = flag;
            await this.persistStates();
            noticeOpen(`${manifest?.name || pluginId}${flag ? ' 已启用' : ' 已禁用'}`, 2);
        },
        async updatePluginSetting(pluginId, key, value, manifest) {
            this.ensurePluginState(pluginId, manifest);
            if (!this.pluginStates[pluginId]) return;
            if (!this.pluginStates[pluginId].settings) {
                this.pluginStates[pluginId].settings = {};
            }
            this.pluginStates[pluginId].settings[key] = value;
            await this.persistStates();
        },
        getPluginSettings(pluginId) {
            return this.pluginStates[pluginId]?.settings || {};
        },
        async chooseDirectory() {
            const pluginApi = getPluginApi();
            if (!pluginApi) return;
            try {
                const selected = await pluginApi.chooseDirectory(this.pluginDirectory);
                if (selected) {
                    this.pluginDirectory = selected;
                    await this.refreshManifests();
                    await this.persistStates();
                }
            } catch (error) {
                console.error('选择插件目录失败:', error);
            }
        },
        async importPlugin() {
            const pluginApi = getPluginApi();
            if (!pluginApi) return;
            try {
                const result = await pluginApi.importPlugin();
                if (result?.success) {
                    noticeOpen(`${result.manifest?.name || '插件'} 导入成功`, 2);
                } else if (result?.reason !== 'canceled') {
                    noticeOpen('插件导入失败', 2);
                }
                await this.refreshManifests();
            } catch (error) {
                console.error('导入插件失败:', error);
                noticeOpen('插件导入失败', 2);
            }
        },
        async deletePlugin(pluginId, manifest) {
            const pluginApi = getPluginApi();
            if (!pluginApi) return;
            try {
                const result = await pluginApi.deletePlugin(pluginId);
                if (result?.success) {
                    noticeOpen(`${manifest?.name || pluginId} 已删除`, 2);
                    delete this.pluginStates[pluginId];
                    await this.refreshManifests();
                } else if (result?.reason !== 'not-found') {
                    noticeOpen('删除插件失败', 2);
                }
            } catch (error) {
                console.error('删除插件失败:', error);
                noticeOpen('删除插件失败', 2);
            }
        },
        async reloadPlayer() {
            const pluginApi = getPluginApi();
            if (!pluginApi) return;
            await pluginApi.reloadPlayer();
        },
    },
});
