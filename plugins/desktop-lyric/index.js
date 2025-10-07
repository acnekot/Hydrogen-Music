module.exports = (pluginApi) => {
  const settingsComponent = pluginApi.useBuiltinComponent('desktop-lyric');

  return {
    id: 'desktop-lyric',
    name: '桌面歌词插件',
    version: '1.0.0',
    description: '控制桌面歌词窗口的创建、同步与关闭。',
    categories: ['integration'],
    settingsComponent,
    defaultConfig: {
      autoStart: false,
      alwaysOnTop: true,
      rememberLayout: true,
    },
    async onActivate(context) {
      pluginApi.desktopLyric.init();
      context.onCleanup(() => {
        pluginApi.desktopLyric.destroy();
      });
      const config = context.getConfig();
      if (config.autoStart && !context.stores.playerStore.isDesktopLyricOpen) {
        pluginApi.desktopLyric.toggle();
      }
    },
    onDeactivate(context) {
      if (context.stores.playerStore.isDesktopLyricOpen) {
        pluginApi.desktopLyric.toggle();
      }
      pluginApi.desktopLyric.destroy();
      context.stores.playerStore.isDesktopLyricOpen = false;
    },
    onConfigChange(context, config) {
      if (!config.autoStart && context.stores.playerStore.isDesktopLyricOpen) {
        pluginApi.desktopLyric.toggle();
      }
    },
  };
};
