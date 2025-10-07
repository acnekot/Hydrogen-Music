import { defineStore } from 'pinia'

const PROVIDER_CONFIGS = {
  netease: {
    id: 'netease',
    label: '网易云音乐',
    shortLabel: '云音乐',
    loginTitle: '登录网易云账号',
    icon: new URL('../assets/img/netease-music.png', import.meta.url).href,
    accentColor: 'rgba(226, 0, 0, 1)',
    apiBase: 'http://localhost:36530'
  },
  kugou: {
    id: 'kugou',
    label: '酷狗音乐',
    shortLabel: '酷狗音乐',
    loginTitle: '登录酷狗账号',
    icon: new URL('../assets/img/kugou-music.svg', import.meta.url).href,
    accentColor: 'rgba(0, 122, 255, 1)',
    apiBase: 'http://localhost:36730'
  }
}

const DEFAULT_PROVIDER = 'netease'

export const useServiceProviderStore = defineStore('serviceProviderStore', {
  state: () => ({
    current: DEFAULT_PROVIDER
  }),
  getters: {
    currentConfig(state) {
      return PROVIDER_CONFIGS[state.current] || PROVIDER_CONFIGS[DEFAULT_PROVIDER]
    },
    providerOptions() {
      return Object.values(PROVIDER_CONFIGS).map(item => ({
        label: item.label,
        value: item.id
      }))
    }
  },
  actions: {
    setProvider(providerId) {
      if (providerId && PROVIDER_CONFIGS[providerId]) {
        this.current = providerId
      } else {
        this.current = DEFAULT_PROVIDER
      }
    }
  },
  persist: {
    storage: localStorage,
    paths: ['current']
  }
})

export function resolveProviderConfig(providerId) {
  return PROVIDER_CONFIGS[providerId] || PROVIDER_CONFIGS[DEFAULT_PROVIDER]
}
