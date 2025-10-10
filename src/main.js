import { createApp } from 'vue'
import App from './App.vue'
import router from './router/router.js'
import pinia from './store/pinia'
import { init } from './utils/initApp'
import lazy from './utils/lazy'
import './style.css'
import './assets/css/reset.css'
import './assets/css/common.css'
import './assets/css/fonts.css'
import './assets/css/theme.css'
import { initTheme } from './utils/theme'
import { initMediaSession } from './utils/mediaSession'
import { createPluginManager } from './plugins/core/pluginManager'
import { PLUGIN_MANAGER_KEY } from './plugins/core/injectionKeys'
import { getBuiltinPlugins } from './plugins'

const app = createApp(App)
app.use(router)
app.use(pinia)
app.directive('lazy', lazy)

const pluginManager = createPluginManager({
  app,
  router,
  pinia,
  electronAPI: typeof window !== 'undefined' ? window.electronAPI : undefined
})

pluginManager.registerPlugins(getBuiltinPlugins())

app.provide(PLUGIN_MANAGER_KEY, pluginManager)
app.config.globalProperties.$plugins = pluginManager

// Initialize theme before app renders
initTheme()
app.mount('#app')
init()
// Initialize System Media Transport Controls (Windows SMTC / macOS Now Playing)
try { initMediaSession() } catch (_) {}

// Prevent default browser file open on drag/drop globally
window.addEventListener('dragover', (e) => {
  e.preventDefault()
})
window.addEventListener('drop', (e) => {
  e.preventDefault()
})
