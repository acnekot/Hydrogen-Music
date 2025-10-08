import settingsComponent from './settings.js';
import {
    initDesktopLyric,
    destroyDesktopLyric,
    toggleDesktopLyric,
    openDesktopLyric,
    closeDesktopLyric,
    getDesktopLyricState,
    isDesktopLyricAvailable,
} from './runtime.js';

export default {
    id: 'desktop-lyric',
    name: '桌面歌词',
    version: '1.0.0',
    description: '在桌面浮窗中展示当前播放的歌词，支持实时同步和拖拽调整。',
    author: 'Hydrogen Team',
    settingsComponent,
    async activate(context) {
        if (!isDesktopLyricAvailable()) {
            console.warn('[DesktopLyric] 当前环境不支持桌面歌词窗口');
            return;
        }

        await initDesktopLyric();

        const service = {
            toggle: () => toggleDesktopLyric(),
            open: () => openDesktopLyric(),
            close: () => closeDesktopLyric(),
            isOpen: () => getDesktopLyricState(),
            isAvailable: () => isDesktopLyricAvailable(),
        };

        context.provideService(service);
        context.registerCleanup(async () => {
            context.removeService();
            await destroyDesktopLyric();
        });
    },
    async deactivate(context) {
        context.removeService();
        await destroyDesktopLyric();
    },
};
