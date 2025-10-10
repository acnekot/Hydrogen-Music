import { initPluginSystem, pluginManager, usePluginArea } from './manager.js';
import desktopLyricPlugin from './builtin/desktopLyric/index.js';
import audioVisualizerPlugin from './builtin/audioVisualizer/index.js';

export function setupPlugins(app) {
  initPluginSystem(app);
  pluginManager.use(desktopLyricPlugin);
  pluginManager.use(audioVisualizerPlugin);
}

export { pluginManager, usePluginArea };
