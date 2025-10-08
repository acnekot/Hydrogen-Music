import settingsComponent from './settings.js';

let cachedStore = null;

export default {
    id: 'lyric-visualizer',
    name: '歌词可视化',
    version: '1.0.0',
    description: '在歌词区域渲染实时频谱或环形音频可视化效果。',
    author: 'Hydrogen Team',
    settingsComponent,
    async activate(context) {
        const playerStore = context.stores.player();
        cachedStore = playerStore;
        const service = {
            isActive: () => !!playerStore.lyricVisualizer,
            enable: () => {
                playerStore.lyricVisualizer = true;
            },
            disable: () => {
                playerStore.lyricVisualizer = false;
            },
        };
        context.provideService(service);
        context.registerCleanup(() => {
            context.removeService();
            cachedStore = null;
        });
    },
    async deactivate(context) {
        context.removeService();
        const store = cachedStore || context.stores.player();
        if (store) {
            store.lyricVisualizer = false;
        }
        cachedStore = null;
    },
};
