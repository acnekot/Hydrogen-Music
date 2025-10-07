export default {
  routes: [
    {
      path: '/plugins/example/hello',
      name: 'plugin-example-hello',
      meta: {
        title: '示例插件页面'
      },
      component: () => import('./views/HelloPluginView.vue')
    }
  ],
  activate({ registerCleanup, logger }) {
    logger.info('示例插件：你好世界 已激活');

    registerCleanup(() => {
      logger.info('示例插件：你好世界 已卸载');
    });
  }
};
