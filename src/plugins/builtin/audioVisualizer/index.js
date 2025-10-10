import VisualizerCanvas from './VisualizerCanvas.vue';

export default {
  id: 'builtin-audio-visualizer',
  name: 'Audio Visualizer',
  version: '1.0.0',
  setup(context) {
    context.contributions.register('ui:lyric-visualizers', {
      id: 'audio-visualizer-canvas',
      component: VisualizerCanvas,
      order: 10,
    });
  },
};
