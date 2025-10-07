import request from '../utils/request'
import pinia from '../store/pinia'
import { useServiceProviderStore, resolveProviderConfig } from '../store/serviceProviderStore'

const serviceProviderStore = useServiceProviderStore(pinia)
/**
 * 登录后调用此接口 ,可获取用户账号信息
 * @returns 
 */
export function getUserProfile() {
    if (serviceProviderStore.current === 'kugou') {
        const provider = resolveProviderConfig('kugou')
        return Promise.resolve({
            profile: {
                nickname: '酷狗音乐用户',
                userId: 'kugou-user',
                avatarUrl: provider.icon,
            }
        })
    }
    return request({
      url: '/user/account',
      method: 'get',
      params: {
        timestamp: new Date().getTime(),
      },
    });
  }

/**
 * 登录后调用此接口 , 传入用户 id, 可以获取用户歌单
 * 必选参数 : uid : 用户 id
 * 可选参数 :
 * limit : 返回数量 , 默认为 30
 * offset : 偏移数量，用于分页 , 如 :( 页数 -1)*30, 其中 30 为 limit 的值 , 默认为 0
 * @returns 
 */
export function getUserPlaylist(params) {
    if (serviceProviderStore.current === 'kugou') {
        return Promise.resolve({ playlist: [] })
    }
    return request({
      url: '/user/playlist',
      method: 'get',
      params,
    });
  }

/**
 * 获取用户信息 , 歌单，收藏，mv, dj 数量
 * 说明 : 登录后调用此接口 , 可以获取用户信息
 * @param {*} params 
 * @returns 
 */
  export function getUserPlaylistCount() {
    if (serviceProviderStore.current === 'kugou') {
        return Promise.resolve({})
    }
    return request({
      url: '/user/subcount',
      method: 'get',
      params: {
        timestamp: new Date().getTime(),
      }
    });
  }

/**
 * 说明 : 调用此接口 , 传入用户 id, 可获取已喜欢音乐 id 列表(id 数组)
 * @param {*} id
 * @returns
 */
export function getLikelist(id) {
    if (serviceProviderStore.current === 'kugou') {
        return Promise.resolve({ ids: [] })
    }
    return request({
      url: '/likelist',
      method: 'get',
      params: {
        id: id,
        timestamp: new Date().getTime(),
      }
    });
  }

/**
 * 说明: 登录后调用此接口，可获取当前 VIP 信息。
 * @param {*} id 
 * @returns 
 */
  export function getVipInfo() {
    if (serviceProviderStore.current === 'kugou') {
        return Promise.resolve({ data: {} })
    }
    return request({
      url: '/vip/info',
      method: 'get',
      params: {
        timestamp: new Date().getTime(),
      }
    });
  }

export function logout() {
    if (serviceProviderStore.current === 'kugou') {
        return Promise.resolve({ code: 200 })
    }
    return request({
        url: '/logout',
        method: 'post',
        params: {

        },
    });
  }