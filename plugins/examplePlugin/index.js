export default {
    name: 'examplePlugin',
    version: '1.0.0',
    activate(app) {
        console.log('Example Plugin activated!');
        // Example: Add a menu item or extend app functionality
        app.addMenuItem('Example Plugin', () => {
            console.log('Example Plugin menu item clicked!');
        });
    },
    deactivate() {
        console.log('Example Plugin deactivated!');
        // Cleanup any resources or UI changes made by the plugin
    },
};