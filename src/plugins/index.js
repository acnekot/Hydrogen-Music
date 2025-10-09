import { createPluginManager, providePluginManager, setActivePluginManager } from './manager';
import desktopLyricPlugin from './desktop-lyric';
import audioVisualizerPlugin from './lyric-visualizer';

const manager = createPluginManager();

manager.register(desktopLyricPlugin);
manager.register(audioVisualizerPlugin);

export function installPlugins(app, baseContextFactory) {
  providePluginManager(app, manager, baseContextFactory);
  setActivePluginManager(manager);
}

export function getPluginManager() {
  return manager;
}
