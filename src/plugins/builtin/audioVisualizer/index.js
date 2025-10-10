import AudioVisualizerOverlay from './AudioVisualizerOverlay.vue';

export default {
  id: 'builtin.audio-visualizer',
  name: 'Lyric Audio Visualizer',
  version: '1.0.0',
  description: 'Renders animated audio visualizations behind the lyric view.',
  setup(context) {
    const disposeOverlay = context.ui.registerLyricOverlay({
      id: 'audio-visualizer-overlay',
      order: 10,
      target: 'before-lyrics',
      component: AudioVisualizerOverlay,
    });

    return () => {
      disposeOverlay?.();
    };
  },
};
