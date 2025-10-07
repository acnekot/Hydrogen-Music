import { usePlayerStore } from '@/store/playerStore';
import LyricRenderer from './LyricRenderer.vue';

export default function registerLyricVisualizer(context) {
    const playerStore = usePlayerStore();
    context.registerLyricRenderer({
        component: LyricRenderer,
        props: {},
        onActivate: () => {
            if (context.getSetting('autoEnable', true) && !playerStore.lyricVisualizer) {
                playerStore.lyricVisualizer = true;
            }
        },
        onDeactivate: () => {
            if (context.getSetting('disableOnUnload', false)) {
                playerStore.lyricVisualizer = false;
            }
        },
    });

    context.registerSettingsPanel(async () => {
        const module = await import('./settingsPanel.vue');
        return module.default || module;
    });
}
