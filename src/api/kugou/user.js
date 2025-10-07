import kugouRequest from './request'
import { useUserStore } from '../../store/userStore'
import pinia from '../../store/pinia'

const userStore = useUserStore(pinia)

export function getUserProfile() {
  return kugouRequest({
    url: '/user/profile',
    method: 'get',
    params: {
      timestamp: Date.now(),
    },
  }).then(res => normalizeProfile(res))
}

export function getUserPlaylist(params = {}) {
  return kugouRequest({
    url: '/user/playlist',
    method: 'get',
    params,
  })
}

export function getLikelist(id) {
  return kugouRequest({
    url: '/user/likelist',
    method: 'get',
    params: {
      id,
      timestamp: Date.now(),
    },
  })
}

export function logout() {
  return kugouRequest({
    url: '/logout',
    method: 'post',
  })
}

function normalizeProfile(response) {
  if (!response) return response
  const rawProfile = response.profile || response.data || response
  if (!rawProfile) return response

  const normalized = {
    userId: rawProfile.userId || rawProfile.userid || rawProfile.uid,
    nickname: rawProfile.nickname || rawProfile.nick || rawProfile.username,
    avatarUrl: rawProfile.avatarUrl || rawProfile.avatar || rawProfile.avatarUrlBig || rawProfile.img,
    vipType: rawProfile.vipType || rawProfile.vip || 0,
  }

  userStore.updateKugouUser(normalized)

  return {
    profile: normalized,
    raw: response,
  }
}
