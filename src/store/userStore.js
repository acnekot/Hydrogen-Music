import { defineStore } from "pinia";

export const useUserStore = defineStore('userStore', {
    state: () => {
        return {
            user: null,
            kugouUser: null,
            loginMode: null,
            likelist: null,
            favoritePlaylistId: null,
            appOptionShow: false,
            biliUser: null,
            homePage: true,
            cloudDiskPage: true,
            personalFMPage: true,
            loginProvider: 'netease',
            kugouAuth: null,
        }
    },
    actions: {
        updateUser(userinfo) {
            this.user = userinfo
        },
        updateKugouUser(userinfo) {
            this.kugouUser = userinfo
        },
        updateLikelist(likelist) {
            this.likelist = likelist
        },
        updateFavoritePlaylistId(playlistId) {
            this.favoritePlaylistId = playlistId
        },
        setLoginProvider(provider) {
            this.loginProvider = provider
        },
        updateKugouAuth(auth) {
            this.kugouAuth = auth
        }
    },
    persist: {
        storage: localStorage,
        paths: [
            'user',
            'kugouUser',
            'biliUser',
            'homePage',
            'cloudDiskPage',
            'personalFMPage',
            'favoritePlaylistId',
            'loginProvider',
            'kugouAuth'
        ]
    },
})
