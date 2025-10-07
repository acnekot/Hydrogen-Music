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
import { Quasar, Dialog, Notify, Loading, LoadingBar } from 'quasar'
import quasarLang from 'quasar/lang/zh-CN'
import '@quasar/extras/material-icons/material-icons.css'
import '@quasar/extras/roboto-font/roboto-font.css'
import 'quasar/src/css/index.sass'
const app = createApp(App)
app.use(router)
app.use(pinia)
app.use(Quasar, {
  plugins: {
    Dialog,
    Notify,
    Loading,
    LoadingBar
  },
  lang: quasarLang,
  config: {
    brand: {
      primary: '#00acc1',
      secondary: '#424242',
      accent: '#ff6f61'
    },
    notify: {
      progress: true,
      position: 'top'
    },
    loadingBar: {
      position: 'top',
      color: 'primary'
    }
  }
})
app.directive('lazy', lazy)
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
