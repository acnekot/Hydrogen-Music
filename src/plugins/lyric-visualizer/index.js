import LyricVisualizerCanvas from './LyricVisualizerCanvas.vue';

export default {
  id: 'lyric-visualizer',
  name: 'Lyric Visualizer',
  setup(_context, api) {
    api.registerUI({
      slot: 'lyric:before-content',
      component: LyricVisualizerCanvas,
      order: 10,
      props: slotContext => ({
        lyricScrollRef: slotContext?.refs?.lyricScroll,
      }),
    });
  },
};
