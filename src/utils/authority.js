import Cookies from "js-cookie";

const NETEASE_AUTH_KEYS = ['MUSIC_U', 'MUSIC_A_T', 'MUSIC_R_T']
const KUGOU_AUTH_KEYS = ['kg_mid', 'kg_dfid', 'kg_dfid_collect', 'kg_mid_temp']

export function setCookies(data, type, provider = 'netease') {
  if (!data) return

  if (provider === 'kugou') {
    const rawCookie = data.cookie || data.cookies
    if (!rawCookie) return
    const cookieItems = rawCookie.split(';')
    const normalized = []

    cookieItems.forEach(cookie => {
      const item = cookie.trim()
      if (!item) return
      const [name, value] = item.split('=')
      if (!name || !value) return

      normalized.push(`${name}=${value}`)

      if (KUGOU_AUTH_KEYS.includes(name)) {
        try {
          localStorage.setItem('kugou:cookie:' + name, value)
        } catch (_) {}
      }
    })

    if (normalized.length) {
      try {
        localStorage.setItem('kugou:cookie', normalized.join('; '))
      } catch (_) {}
    }
    return
  }

  const cookieText = data.cookie
  if (!cookieText) return

  if (type === 'account') {
    const cookies = cookieText.split(';;')
    cookies.map(cookie => {
      document.cookie = cookie
      const temCookie = cookie.split(';')[0].split('=')
      localStorage.setItem('cookie:' + temCookie[0], temCookie[1])
    })
    return
  }

  const cookies = cookieText.split(';')
  cookies.map(cookie => {
    const temCookie = cookie.trim().split('=')
    if (temCookie[0] && temCookie[1]) {
      document.cookie = cookie.trim()
      if (NETEASE_AUTH_KEYS.includes(temCookie[0])) {
        localStorage.setItem('cookie:' + temCookie[0], temCookie[1])
      }
    }
  })
}

//获取Cookie - 优先从localStorage读取，确保在Electron中的可靠性
export function getCookie(key) {
  const localStorageValue = localStorage.getItem('cookie:' + key)
  if (localStorageValue) {
    return localStorageValue
  }
  return Cookies.get(key)
}

function getPersistedUserState() {
  try {
    const raw = localStorage.getItem('userStore')
    if (!raw) return null
    return JSON.parse(raw)
  } catch (_) {
    return null
  }
}

//判断是否登录
export function isLogin() {
  const hasNetease = getCookie('MUSIC_U') !== undefined
  if (hasNetease) return true

  const persisted = getPersistedUserState()
  if (persisted?.kugouAuth?.token) return true
  if (persisted?.kugouUser) return true

  const kugouCookie = localStorage.getItem('kugou:cookie')
  return !!kugouCookie
}

// 清理登录相关Cookie与本地存储（不影响其他设置）
export function clearLoginCookies(provider = 'netease') {
  try {
    if (provider === 'kugou') {
      localStorage.removeItem('kugou:cookie')
      KUGOU_AUTH_KEYS.forEach(key => {
        try { localStorage.removeItem('kugou:cookie:' + key) } catch (_) {}
      })
      return
    }

    NETEASE_AUTH_KEYS.forEach((k) => {
      try { localStorage.removeItem('cookie:' + k) } catch (_) {}
      try {
        document.cookie = `${k}=; Max-Age=0; path=/`
        const hostParts = location.hostname.split('.')
        if (hostParts.length > 1) {
          const rootDomain = `.${hostParts.slice(-2).join('.')}`
          document.cookie = `${k}=; Max-Age=0; path=/; domain=${rootDomain}`
        }
      } catch (_) {}
    })
  } catch (_) {}
}
