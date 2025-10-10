import LyricVisualizerCanvas from './components/LyricVisualizerCanvas.vue'

const PLUGIN_ID = 'hydrogen.audio-visualizer'

export default {
  id: PLUGIN_ID,
  setup(context) {
    context.registerUI('lyric.visualizer', {
      id: `${PLUGIN_ID}:canvas`,
      component: LyricVisualizerCanvas,
      order: 10
    })

    return {}
  }
}
