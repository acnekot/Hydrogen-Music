import { initializePlugins, registerPlugin, usePlayerControls, useLyricOverlayComponents, useRegisteredPlugins, LyricPluginContextSymbol } from './pluginManager';
import desktopLyricPlugin from './builtin/desktopLyric';
import audioVisualizerPlugin from './builtin/audioVisualizer';

registerPlugin(desktopLyricPlugin);
registerPlugin(audioVisualizerPlugin);

export {
  initializePlugins,
  usePlayerControls,
  useLyricOverlayComponents,
  useRegisteredPlugins,
  LyricPluginContextSymbol,
};
