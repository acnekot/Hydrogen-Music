module.exports = (pluginApi) => {
  const settingsComponent = pluginApi.useBuiltinComponent('lyric-visualizer');

  return {
    id: 'lyric-visualizer',
    name: '歌词可视化插件',
    version: '1.0.0',
    description: '为歌词区域添加频谱或辐射样式的可视化效果。',
    categories: ['integration'],
    settingsComponent,
    defaultConfig: {
      autoEnable: false,
    },
    async onActivate(context) {
      const config = context.getConfig();
      if (config.autoEnable) {
        context.stores.playerStore.lyricVisualizer = true;
      }
    },
    onDeactivate(context) {
      context.stores.playerStore.lyricVisualizer = false;
    },
    onConfigChange(context, config) {
      if (!config.autoEnable) {
        context.stores.playerStore.lyricVisualizer = false;
      }
    },
  };
};
