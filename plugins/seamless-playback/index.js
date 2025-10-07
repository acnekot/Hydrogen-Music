module.exports = (pluginApi) => {
  const settingsComponent = pluginApi.useBuiltinComponent('seamless-playback');

  const fadeHowl = (howl, from, to, duration) => {
    if (!howl || typeof howl.fade !== 'function') return;
    try {
      howl.fade(from, to, duration);
    } catch (err) {
      console.warn('[seamless-playback] fade error', err);
    }
  };

  return {
    id: 'seamless-playback',
    name: '无缝衔接插件',
    version: '1.0.0',
    description: '在曲目切换时执行淡入淡出，减少突兀感。',
    categories: ['integration'],
    settingsComponent,
    defaultConfig: {
      enabled: true,
      preloadNext: true,
      fadeIn: 800,
      fadeOut: 800,
      fadeCurve: 'sCurve',
    },
    onActivate(context) {
      const { watch, nextTick } = context.vue;
      const playerStore = context.stores.playerStore;
      const stopWatchers = [];
      let lastHowl = null;

      stopWatchers.push(
        watch(
          () => playerStore.currentMusic,
          (howl, oldHowl) => {
            const config = context.getConfig();
            if (!config.enabled) {
              lastHowl = howl;
              return;
            }
            const fadeOutMs = Math.max(0, Number(config.fadeOut || 0));
            if (oldHowl && fadeOutMs > 0) {
              const fromVolume = oldHowl.volume();
              fadeHowl(oldHowl, fromVolume, 0, fadeOutMs);
            }
            if (howl) {
              const targetVolume = howl.volume();
              const fadeInMs = Math.max(0, Number(config.fadeIn || 0));
              if (fadeInMs > 0) {
                howl.volume(0);
                const handlePlay = () => {
                  fadeHowl(howl, 0, targetVolume, fadeInMs);
                  howl.off('play', handlePlay);
                };
                howl.on('play', handlePlay);
              }
            }
            lastHowl = howl;
          }
        )
      );

      stopWatchers.push(
        watch(
          () => context.getConfig().enabled,
          (enabled) => {
            if (!enabled && lastHowl) {
              const vol = lastHowl.volume();
              if (vol === 0) {
                nextTick(() => {
                  try {
                    lastHowl.volume(1);
                  } catch (_) {}
                });
              }
            }
          }
        )
      );

      context.onCleanup(() => {
        stopWatchers.forEach((stop) => stop && stop());
      });
    },
    onDeactivate() {
      // cleanup via registered callbacks
    },
    onConfigChange() {
      // watchers read最新配置
    },
  };
};
