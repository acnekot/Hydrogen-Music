import { usePlayerStore } from '../../store/playerStore'

const ROUTE_NAME = 'plugin-lyric-visualizer-settings'

export const lyricVisualizerDefaults = Object.freeze({
  height: 220,
  frequencyMin: 20,
  frequencyMax: 8000,
  transitionDelay: 0.75,
  barCount: 48,
  barWidth: 55,
  color: 'black',
  opacity: 100,
  style: 'bars',
  radialSize: 100,
  radialOffsetX: 0,
  radialOffsetY: 0
})

function resetLyricVisualizerState(pinia) {
  if (!pinia) return
  const playerStore = usePlayerStore(pinia)
  playerStore.lyricVisualizer = false
  playerStore.lyricVisualizerHeight = lyricVisualizerDefaults.height
  playerStore.lyricVisualizerFrequencyMin = lyricVisualizerDefaults.frequencyMin
  playerStore.lyricVisualizerFrequencyMax = lyricVisualizerDefaults.frequencyMax
  playerStore.lyricVisualizerTransitionDelay = lyricVisualizerDefaults.transitionDelay
  playerStore.lyricVisualizerBarCount = lyricVisualizerDefaults.barCount
  playerStore.lyricVisualizerBarWidth = lyricVisualizerDefaults.barWidth
  playerStore.lyricVisualizerColor = lyricVisualizerDefaults.color
  playerStore.lyricVisualizerOpacity = lyricVisualizerDefaults.opacity
  playerStore.lyricVisualizerStyle = lyricVisualizerDefaults.style
  playerStore.lyricVisualizerRadialSize = lyricVisualizerDefaults.radialSize
  playerStore.lyricVisualizerRadialOffsetX = lyricVisualizerDefaults.radialOffsetX
  playerStore.lyricVisualizerRadialOffsetY = lyricVisualizerDefaults.radialOffsetY
}

export default {
  name: 'lyric-visualizer',
  displayName: '歌词可视化',
  version: '1.0.0',
  description: '在歌词区域展示实时音频频谱，并支持灵活的外观自定义。',
  author: 'Hydrogen Music Team',
  enabled: true,
  removable: true,
  settings: {
    label: '打开歌词可视化设置',
    route: { name: ROUTE_NAME }
  },
  async setup({ router, pinia }) {
    if (router && !router.hasRoute(ROUTE_NAME)) {
      router.addRoute({
        path: '/plugins/lyric-visualizer',
        name: ROUTE_NAME,
        component: () => import('../views/LyricVisualizerSettings.vue')
      })
    }

    return async () => {
      if (router && router.hasRoute(ROUTE_NAME)) {
        router.removeRoute(ROUTE_NAME)
      }
      resetLyricVisualizerState(pinia)
    }
  }
}
