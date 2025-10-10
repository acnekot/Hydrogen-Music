# Hydrogen Plugin System

The Hydrogen plugin system (`hydrogen_plugins_core`) provides an extensible runtime for adding new capabilities to Hydrogen Music or other desktop audio players that embed the plugin core. Plugins can integrate third-party APIs, add UI entry points, control playback, or apply theme changes without modifying the host application.

## Architecture Overview

- **Plugin Manager** – Created during application bootstrap (`createPluginManager`). It keeps track of registered plugins, exposes lifecycle hooks, shared APIs, UI slots, and command dispatchers.
- **Context Object** – Passed to every plugin during `setup(context)`. It contains references to the Vue app instance, router, Pinia instance, optional Electron bridge (`electronAPI`), and helper methods for registering UI, commands, and shared APIs.
- **UI Slots** – Named extension points where plugins can render Vue components. The host currently exposes:
  - `player.controls`: the button row inside the main player toolbar.
  - `lyric.visualizer`: the decoration layer rendered behind the lyric view.
  Additional slots can be exposed by calling `pluginManager.registerUI` from the host.
- **Commands** – Plugins can register command handlers (`context.registerCommand`) that can be invoked by other plugins or the host using `pluginManager.invokeCommand(name, payload)`.
- **Shared APIs** – Plugins may expose runtime services (`context.expose`) for other plugins to reuse. Consumers can query them with `pluginManager.getExposed(name)`.
- **Event Bus** – `context.emit`, `context.on`, and `context.off` provide a lightweight pub/sub channel for cross-plugin communication.

## Built-in Plugins

Two reference plugins ship with the core runtime:

| Plugin ID | Purpose |
|-----------|---------|
| `hydrogen.desktop-lyric` | Re-implements the detachable desktop lyric window as a plugin. Registers the toggle button in the player toolbar and manages IPC synchronisation with the Electron main process.
| `hydrogen.audio-visualizer` | Renders the lyric page visualizer canvas. The plugin consumes player state, audio analyser data, and slot props provided by the host lyric view.

These plugins demonstrate how UI slots, commands, and shared services can be combined to deliver complex features without touching host components.

## Creating a Plugin

1. **Define the Plugin Module**

   ```js
   // src/plugins/community/my-awesome-plugin/index.js
   import MyControl from './MyControl.vue'

   export default {
     id: 'example.awesome-plugin',
     setup(context) {
       // Register UI contributions
       context.registerUI('player.controls', {
         id: 'example.awesome-plugin:button',
         component: MyControl,
         order: 100
       })

       // Register a command that other components can call
       context.registerCommand('awesome.toggle', () => {
         // custom logic
       })

       // Expose an API for other plugins
       context.expose('awesomeService', {
         doSomething() { /* ... */ }
       })

       return {}
     }
   }
   ```

2. **Bundle the Plugin**

   Export your plugin from a module that can be imported by the host. Plugins can live inside `src/plugins` or in external packages. For external distribution, package the plugin as an npm module that exports the descriptor above.

3. **Register the Plugin**

   Modify the host registration list (`src/plugins/index.js`) or call `pluginManager.registerPlugin()` at runtime. The manager accepts plugin objects or factory functions.

4. **Consume Host Resources**

   The plugin context exposes:

   - `app`, `router`, and `pinia` – access to the Vue application environment. You can instantiate Pinia stores via `useMyStore(context.pinia)`.
   - `electronAPI` – bridge to Electron preload APIs (if running inside the desktop shell).
   - `emit` / `on` – global event bus utilities.
   - `onCleanup(fn)` – register teardown callbacks invoked when the plugin is unloaded.

5. **Use Slot Props (Optional)**

   Some slots provide additional runtime data through props. For example, the lyric view passes a `slotProps` object to every `lyric.visualizer` contribution containing:

   ```js
   {
     lyricAreaVisible: Boolean,
     lyricPlaceholderVisible: Boolean,
     lyricScrollRef: Ref<HTMLElement | null>,
     lyricContainerRef: Ref<HTMLElement | null>
   }
   ```

   Plugin components can `defineProps({ slotProps: Object })` to receive these values.

## Recommended Patterns

- **Isolate State** – Use Pinia stores or `ref` instances inside plugin components rather than mutating global state directly.
- **Guard Electron Calls** – Always check for the presence of `electronAPI` when calling desktop-specific methods so the plugin remains portable in web builds.
- **Register Cleanup** – Use `context.onCleanup` to dispose timers, watchers, or observers created inside your plugin.
- **Order UI Contributions** – Provide the `order` field when registering UI components to control where they appear relative to other contributions.

## Example: Accessing Playback

```js
import { usePlayerStore } from '@/store/playerStore'

export default {
  id: 'example.playback-controller',
  setup({ pinia, registerCommand }) {
    const playerStore = usePlayerStore(pinia)

    registerCommand('example.play.toggle', () => {
      playerStore.playing = !playerStore.playing
    })
  }
}
```

This plugin toggles playback using the shared Pinia store while exposing a command other extensions can reuse.

## Development Workflow

1. Start the app (`npm run dev`) – the plugin manager registers built-in and custom plugins on hot reload.
2. Edit your plugin files – Vite HMR updates components, while the plugin manager preserves plugin registrations.
3. For standalone use in other apps, copy the `src/plugins/core` directory (or publish it as a package) and import `createPluginManager` into your host application.

Refer to the built-in plugins for concrete usage patterns.
