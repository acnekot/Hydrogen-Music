import { defineStore } from 'pinia';

export const usePluginStore = defineStore('pluginStore', {
  state: () => ({
    plugins: [],
    enabled: {}
  }),
  getters: {
    pluginList: (state) => state.plugins,
    enabledPluginIds: (state) => Object.keys(state.enabled).filter(id => state.enabled[id])
  },
  actions: {
    registerPlugins(manifests) {
      const sorted = [...manifests].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans', { sensitivity: 'accent' }));
      this.plugins = sorted;
      sorted.forEach((manifest) => {
        if (!(manifest.id in this.enabled)) {
          this.enabled[manifest.id] = manifest.enabledByDefault;
        }
      });
    },
    setEnabledState(id, value) {
      this.enabled = { ...this.enabled, [id]: value };
    },
    isEnabled(id) {
      if (Object.prototype.hasOwnProperty.call(this.enabled, id)) {
        return this.enabled[id];
      }
      const manifest = this.plugins.find(plugin => plugin.id === id);
      return manifest ? manifest.enabledByDefault : false;
    }
  },
  persist: {
    storage: localStorage,
    paths: ['enabled']
  }
});
