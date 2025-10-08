import mitt from 'mitt'
import router from '../router/router'
import { usePlayerStore } from '../store/playerStore'
import { useOtherStore } from '../store/otherStore'
import { useUserStore } from '../store/userStore'
import { noticeOpen, dialogOpen } from '../utils/dialog'

const eventBus = mitt()

const createConfirm = () => (title, message) =>
    new Promise((resolve) => {
        dialogOpen(title, message, (result) => resolve(!!result))
    })

export const getPluginEventBus = () => eventBus

export const createPluginContext = (meta) => {
    const playerStore = usePlayerStore()
    const otherStore = useOtherStore()
    const userStore = useUserStore()
    const confirm = createConfirm()

    return {
        meta,
        router,
        stores: {
            player: playerStore,
            other: otherStore,
            user: userStore,
        },
        events: {
            on: eventBus.on.bind(eventBus),
            off: eventBus.off.bind(eventBus),
            emit: eventBus.emit.bind(eventBus),
        },
        ui: {
            notice: noticeOpen,
            confirm,
            dialog: dialogOpen,
        },
        utils: {
            windowApi: typeof window !== 'undefined' ? window.windowApi : undefined,
        },
    }
}
