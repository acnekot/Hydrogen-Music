import { computed, readonly, ref } from 'vue';
import { usePlayerStore } from '../store/playerStore';
import { useOtherStore } from '../store/otherStore';
import { useLocalStore } from '../store/localStore';
import { useUserStore } from '../store/userStore';
import { startMusic, pauseMusic, playNext, playLast, changeProgress } from '../utils/player';
import { setTheme, getSavedTheme, initTheme } from '../utils/theme';

const pluginDefinitions = [];
const activePlugins = ref([]);
const playerControls = ref([]);
const lyricOverlays = ref([]);

const eventListeners = new Map();

export const LyricPluginContextSymbol = Symbol('LyricPluginContext');

function emit(event, payload) {
  const listeners = eventListeners.get(event);
  if (!listeners) return;
  [...listeners].forEach(handler => {
    try {
      handler(payload);
    } catch (error) {
      console.error('[plugin:event] handler error for', event, error);
    }
  });
}

function on(event, handler) {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set());
  }
  const set = eventListeners.get(event);
  set.add(handler);
  return () => off(event, handler);
}

function off(event, handler) {
  const set = eventListeners.get(event);
  if (!set) return;
  set.delete(handler);
  if (set.size === 0) eventListeners.delete(event);
}

function registerPlayerControl(control, pluginMeta) {
  const entry = {
    id: control.id || `${pluginMeta.id}:${playerControls.value.length}`,
    order: control.order ?? 0,
    pluginId: pluginMeta.id,
    pluginName: pluginMeta.name,
    component: control.component,
    props: control.props || {},
  };
  playerControls.value = playerControls.value
    .filter(item => item.id !== entry.id)
    .concat(entry)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return () => {
    playerControls.value = playerControls.value.filter(item => item !== entry);
  };
}

function registerLyricOverlay(overlay, pluginMeta) {
  const entry = {
    id: overlay.id || `${pluginMeta.id}:${lyricOverlays.value.length}`,
    order: overlay.order ?? 0,
    target: overlay.target || 'before-lyrics',
    pluginId: pluginMeta.id,
    pluginName: pluginMeta.name,
    component: overlay.component,
    props: overlay.props || {},
  };
  lyricOverlays.value = lyricOverlays.value
    .filter(item => item.id !== entry.id)
    .concat(entry)
    .sort((a, b) => {
      if (a.target !== b.target) return a.target.localeCompare(b.target);
      const orderDiff = a.order - b.order;
      if (orderDiff !== 0) return orderDiff;
      return a.id.localeCompare(b.id);
    });
  return () => {
    lyricOverlays.value = lyricOverlays.value.filter(item => item !== entry);
  };
}

function createContext(app, { router, pinia }, pluginMeta, disposers) {
  return {
    app,
    router,
    pinia,
    meta: pluginMeta,
    events: {
      emit,
      on,
      off,
    },
    http: (...args) => fetch(...args),
    audio: {
      play: startMusic,
      pause: pauseMusic,
      next: playNext,
      previous: playLast,
      seek: changeProgress,
    },
    theme: {
      setTheme,
      getTheme: getSavedTheme,
      initTheme,
    },
    stores: {
      usePlayerStore,
      useOtherStore,
      useLocalStore,
      useUserStore,
    },
    ui: {
      registerPlayerControl: (control) => {
        const dispose = registerPlayerControl(control, pluginMeta);
        if (dispose) disposers.push(dispose);
        return dispose;
      },
      registerLyricOverlay: (overlay) => {
        const dispose = registerLyricOverlay(overlay, pluginMeta);
        if (dispose) disposers.push(dispose);
        return dispose;
      },
    },
  };
}

export function registerPlugin(pluginDefinition) {
  if (!pluginDefinition || typeof pluginDefinition !== 'object') return;
  pluginDefinitions.push(pluginDefinition);
}

export function initializePlugins(app, options) {
  const results = [];
  pluginDefinitions.forEach((pluginDefinition) => {
    const meta = {
      id: pluginDefinition.id || `plugin-${activePlugins.value.length}`,
      name: pluginDefinition.name || 'Unnamed Plugin',
      version: pluginDefinition.version || '0.0.0',
      description: pluginDefinition.description || '',
    };
    const disposers = [];
    try {
      const context = createContext(app, options, meta, disposers);
      const maybeDispose = pluginDefinition.setup?.(context);
      const dispose = () => {
        for (const fn of [...disposers].reverse()) {
          try { fn(); } catch (error) { console.error('[plugin] disposer error', meta.id, error); }
        }
        if (typeof maybeDispose === 'function') {
          try { maybeDispose(); } catch (error) {
            console.error('[plugin] teardown error', meta.id, error);
          }
        }
      };
      results.push({ meta, dispose });
      activePlugins.value = activePlugins.value.concat(meta);
    } catch (error) {
      console.error('[plugin] failed to initialize', meta.id, error);
    }
  });
  return () => {
    results.reverse().forEach(({ meta, dispose }) => {
      try { dispose(); } catch (error) { console.error('[plugin] dispose error', meta.id, error); }
    });
    activePlugins.value = [];
  };
}

export function usePlayerControls() {
  return readonly(playerControls);
}

export function useLyricOverlayComponents(target = 'before-lyrics') {
  return computed(() => lyricOverlays.value.filter(item => item.target === target));
}

export function useRegisteredPlugins() {
  return readonly(activePlugins);
}
