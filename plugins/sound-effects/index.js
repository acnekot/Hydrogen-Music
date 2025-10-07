module.exports = (pluginApi) => {
  const settingsComponent = pluginApi.useBuiltinComponent('sound-effects');

  const playTone = (config) => {
    if (typeof window === 'undefined' || !window.AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = config.waveform || 'sine';
    osc.frequency.value = 660;
    const volume = Math.max(0, Math.min(100, config.volume || 0)) / 100;
    gain.gain.value = volume * 0.25;
    osc.connect(gain).connect(ctx.destination);
    const duration = Math.max(0.05, Math.min(1, config.duration || 0.14));
    osc.start();
    osc.stop(ctx.currentTime + duration);
    osc.onended = () => ctx.close();
  };

  return {
    id: 'sound-effects',
    name: '播放提示音插件',
    version: '1.0.0',
    description: '在播放控制时播放柔和的提示音。',
    categories: ['sound'],
    settingsComponent,
    defaultConfig: {
      playbackCue: true,
      switchCue: true,
      volume: 60,
      waveform: 'sine',
      duration: 0.14,
    },
    onActivate(context) {
      const { watch } = context.vue;
      const playerStore = context.stores.playerStore;
      const stopWatchers = [];

      stopWatchers.push(
        watch(
          () => playerStore.playing,
          (value, oldValue) => {
            if (value === oldValue) return;
            const config = context.getConfig();
            if (!config.playbackCue) return;
            playTone(config);
          }
        )
      );

      stopWatchers.push(
        watch(
          () => playerStore.currentIndex,
          (value, oldValue) => {
            if (value === oldValue) return;
            const config = context.getConfig();
            if (!config.switchCue) return;
            playTone({ ...config, waveform: 'triangle' });
          }
        )
      );

      context.onCleanup(() => {
        stopWatchers.forEach((stop) => stop && stop());
      });
    },
    onDeactivate() {
      // watchers removed via cleanup
    },
    onConfigChange() {
      // 动态响应由 watchers 使用的 context.getConfig()
    },
  };
};
