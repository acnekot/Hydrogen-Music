const pluginRegistry = [
    {
        name: 'hello-world',
        description: '示例插件，展示 Hydrogen 插件系统的基础能力。',
        version: '1.0.0',
        enabled: false,
        loader: () => import('./samples/helloWorldPlugin.js'),
    },
];

export { pluginRegistry };
export default pluginRegistry;
