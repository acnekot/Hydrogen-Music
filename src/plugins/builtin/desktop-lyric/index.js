import DesktopLyricToggleButton from './components/DesktopLyricToggleButton.vue'
import { createDesktopLyricService } from './desktopLyricService'

const PLUGIN_ID = 'hydrogen.desktop-lyric'

export default {
  id: PLUGIN_ID,
  setup(context) {
    const service = createDesktopLyricService({
      pinia: context.pinia,
      electronAPI: context.electronAPI || (typeof window !== 'undefined' ? window.electronAPI : undefined)
    })

    service.init()

    context.onCleanup(() => {
      service.destroy()
    })

    context.registerCommand('desktopLyric.toggle', () => service.toggleDesktopLyric())
    context.registerCommand('desktopLyric.refresh', () => service.sendCurrentLyricData())

    context.registerUI('player.controls', {
      id: `${PLUGIN_ID}:toggle-button`,
      component: DesktopLyricToggleButton,
      order: 50
    })

    context.expose('desktopLyricService', service)

    return {
      service
    }
  }
}
