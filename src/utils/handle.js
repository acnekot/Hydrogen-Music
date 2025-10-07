import pinia from '../store/pinia'
import { setCookies } from '../utils/authority'
import { getUserProfile as getNeteaseUserProfile } from '../api/user'
import { getUserProfile as getKugouUserProfile } from '../api/kugou/user'
import { getUserLikelist } from './initApp'
import { useUserStore } from '../store/userStore'
import { getProviderMeta } from './provider'

const userStore = useUserStore(pinia)
const { updateUser, updateKugouUser, updateKugouAuth } = userStore

//处理登录后的用户数据
export function loginHandle(data, type, provider = 'netease') {
    setCookies(data, type, provider)

    const meta = getProviderMeta(provider)
    if (provider === 'kugou') {
        const authPayload = {
            provider,
            cookie: data.cookie || data.cookies || '',
            timestamp: Date.now()
        }
        updateKugouAuth(authPayload)

        return getKugouUserProfile().then(result => {
            if (result && result.profile) {
                updateUser(result.profile)
                updateKugouUser(result.profile)
            }
            getUserLikelist(provider)
        }).catch(error => {
            console.error(`${meta.name} 登录后获取用户信息失败:`, error)
        })
    }

    return getNeteaseUserProfile().then(result => {
        updateUser(result.profile)
        getUserLikelist(provider)
    })
}