const ROUTE_NAME = 'plugin-mixer-console'

export default {
  name: 'mixer-console',
  version: '1.0.0',
  description: '提供简易混音台，预设多个声道与主控通道。',
  author: 'Hydrogen Music Team',
  enabled: true,
  removable: true,
  settings: {
    label: '打开混音台',
    route: { name: ROUTE_NAME }
  },
  async setup({ router, hooks }) {
    if (router && !router.hasRoute(ROUTE_NAME)) {
      router.addRoute({
        path: '/plugins/mixer',
        name: ROUTE_NAME,
        component: () => import('../views/MixerConsole.vue')
      })
    }

    const offReady = hooks.on('app:ready', () => {
      console.info('[MixerConsolePlugin] 混音台已准备就绪。')
    })

    return () => {
      offReady()
      if (router && router.hasRoute(ROUTE_NAME)) {
        router.removeRoute(ROUTE_NAME)
      }
    }
  }
}
