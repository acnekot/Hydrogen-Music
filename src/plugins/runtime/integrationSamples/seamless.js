import { usePlayerStore } from '@/store/playerStore';
import router from '@/router/router';

export default function registerSeamlessIntegration(context) {
    const playerStore = usePlayerStore();

    const autoFocus = () => context.getSetting('autoFocusLyric', true);

    context.onSongChange(() => {
        if (!autoFocus()) return;
        playerStore.widgetState = false;
        playerStore.lyricShow = true;
        if (router.currentRoute.value.path !== '/player') {
            router.push('/player');
        }
    });

    context.registerSettingsPanel(async () => {
        const module = await import('./SeamlessPanel.vue');
        return module.default || module;
    });
}
