import { usePlayerStore } from '@/store/playerStore';
import { initDesktopLyric, toggleDesktopLyric, destroyDesktopLyric } from './controller';

export default function registerDesktopLyric(context) {
    const playerStore = usePlayerStore();
    context.registerDesktopLyric({
        init: initDesktopLyric,
        toggle: toggleDesktopLyric,
        destroy: destroyDesktopLyric,
        onDeactivate: destroyDesktopLyric,
    });
    if (context.getSetting('autoLaunch', false)) {
        context.onSongChange(() => {
            if (playerStore.playing && !playerStore.isDesktopLyricOpen) {
                toggleDesktopLyric();
            }
        });
    }
    context.registerSettingsPanel(async () => {
        const module = await import('./settingsPanel.vue');
        return module.default || module;
    });
}
