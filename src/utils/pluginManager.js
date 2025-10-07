class PluginManager {
    constructor(app) {
        this.app = app; // Main application instance
        this.plugins = new Map(); // Store loaded plugins
    }

    async loadPlugin(pluginPath) {
        try {
            const pluginModule = await import(/* @vite-ignore */ pluginPath);
            const plugin = pluginModule.default;

            if (!plugin || typeof plugin.activate !== 'function' || typeof plugin.deactivate !== 'function') {
                console.error(`Invalid plugin at ${pluginPath}`);
                return;
            }

            this.plugins.set(plugin.name, plugin);
            plugin.activate(this.app);
            console.log(`Plugin ${plugin.name} loaded and activated.`);
        } catch (error) {
            console.error(`Failed to load plugin at ${pluginPath}:`, error);
        }
    }

    unloadPlugin(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (plugin) {
            plugin.deactivate();
            this.plugins.delete(pluginName);
            console.log(`Plugin ${pluginName} deactivated and unloaded.`);
        } else {
            console.warn(`Plugin ${pluginName} not found.`);
        }
    }

    listPlugins() {
        return Array.from(this.plugins.keys());
    }
}

export default PluginManager;