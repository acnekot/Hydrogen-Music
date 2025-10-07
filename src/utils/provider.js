export const PROVIDERS = {
  netease: {
    id: 'netease',
    key: 'netease',
    name: '网易云音乐',
    shortName: '云音乐',
    icon: () => new URL('../assets/img/netease-music.png', import.meta.url).href,
    accentColor: '#E20000',
    loginTitle: '登录网易云账号',
    loginDescription: '打开登录窗口，在弹出的页面中完成网易云音乐登录。',
    embeddedDescription: '点击下方按钮，在弹出的窗口中扫码或输入账号密码完成网易云音乐登录。'
  },
  kugou: {
    id: 'kugou',
    key: 'kugou',
    name: '酷狗音乐',
    shortName: '酷狗音乐',
    icon: () => new URL('../assets/img/kugou-music.svg', import.meta.url).href,
    accentColor: '#1C6CFF',
    loginTitle: '登录酷狗账号',
    loginDescription: '打开登录窗口，在弹出的页面中完成酷狗音乐登录。',
    embeddedDescription: '点击下方按钮，在弹出的窗口中扫码或输入账号密码完成酷狗音乐登录。'
  }
}

export function getProviderMeta(provider = 'netease') {
  return PROVIDERS[provider] || PROVIDERS.netease
}

export function getAllProviders() {
  return Object.values(PROVIDERS)
}
