const HelloWorldPlugin = {
    name: 'hello-world',
    version: '1.0.0',
    description: '一个用于演示插件 API 的示例插件。',
    activate(context) {
        const { logger, eventBus, registerCleanup } = context;

        logger.info('插件已激活，向所有开发者问好！');

        const unsubscribe = eventBus.on('plugin-manager:ready', () => {
            logger.info('收到来自插件管理器的就绪事件。');
        });

        registerCleanup(unsubscribe);

        eventBus.emit('hello-world:ready', {
            message: 'Hello World from Hydrogen plugin system!'
        });
    },
    deactivate(context) {
        context.logger.info('插件已被停用。');
    }
};

export default HelloWorldPlugin;
