import { reactive, computed } from 'vue';
import HydrogenPluginManager, { MemoryStorage } from '../../hydrogen_plugins_core/index.js';
import pinia from '../store/pinia';
import { usePlayerStore } from '../store/playerStore';
import { useOtherStore } from '../store/otherStore';
import { useUserStore } from '../store/userStore';
import { useLibraryStore } from '../store/libraryStore';
import { useCloudStore } from '../store/cloudStore';
import { useLocalStore } from '../store/localStore';
import { startMusic, pauseMusic, playNext, playLast, changeProgress } from '../utils/player';

const contributionState = reactive({});

function createStorage(namespace) {
  if (typeof window !== 'undefined' && window.localStorage) {
    const prefix = `hydrogen-plugin:${namespace}:`;
    return {
      get(key, defaultValue = null) {
        try {
          const raw = window.localStorage.getItem(prefix + key);
          if (raw === null || raw === undefined) return defaultValue;
          return JSON.parse(raw);
        } catch (error) {
          console.warn('[plugin-storage] Failed to parse value', error);
          return defaultValue;
        }
      },
      set(key, value) {
        try {
          const data = JSON.stringify(value);
          window.localStorage.setItem(prefix + key, data);
        } catch (error) {
          console.warn('[plugin-storage] Failed to store value', error);
        }
      },
      remove(key) {
        window.localStorage.removeItem(prefix + key);
      },
      clear() {
        const keys = [];
        for (let i = 0; i < window.localStorage.length; i += 1) {
          const storageKey = window.localStorage.key(i);
          if (storageKey && storageKey.startsWith(prefix)) {
            keys.push(storageKey);
          }
        }
        keys.forEach((key) => window.localStorage.removeItem(key));
      },
    };
  }
  return new MemoryStorage(namespace);
}

export const pluginManager = new HydrogenPluginManager({
  logger: console,
  storageFactory: (pluginId) => createStorage(pluginId),
});

pluginManager.on('area-registered', ({ area }) => {
  if (!(area in contributionState)) {
    contributionState[area] = [];
  }
});

pluginManager.on('contribution-changed', ({ area, items }) => {
  contributionState[area] = items;
});

function createAudioApi(playerStore) {
  return {
    play: () => startMusic(),
    pause: () => pauseMusic(),
    toggle: () => {
      if (playerStore.playing) {
        pauseMusic();
      } else {
        startMusic();
      }
    },
    next: () => playNext(),
    previous: () => playLast(),
    seekToPercent: (percent) => {
      if (typeof percent !== 'number' || Number.isNaN(percent)) return;
      const clamped = Math.min(100, Math.max(0, percent));
      const time = (playerStore.time || 0) * (clamped / 100);
      changeProgress(time);
    },
    seekToSeconds: (seconds) => {
      if (typeof seconds !== 'number' || Number.isNaN(seconds)) return;
      changeProgress(Math.max(0, seconds));
    },
    setVolume: (value) => {
      if (typeof value !== 'number' || Number.isNaN(value)) return;
      const clamped = Math.min(1, Math.max(0, value));
      playerStore.volume = clamped;
      try {
        if (playerStore.currentMusic && typeof playerStore.currentMusic.volume === 'function') {
          playerStore.currentMusic.volume(clamped);
        }
      } catch (error) {
        console.warn('[plugin-audio] Failed to set volume', error);
      }
    },
  };
}

export function initPluginSystem(app) {
  pluginManager.registerArea('ui:player-controls');
  pluginManager.registerArea('ui:lyric-visualizers');
  pluginManager.registerArea('ui:settings-panels');
  pluginManager.registerArea('services:lyrics');
  pluginManager.registerArea('services:audio-filters');

  pluginManager.setContextProvider(() => {
    const playerStore = usePlayerStore(pinia);
    const otherStore = useOtherStore(pinia);
    const userStore = useUserStore(pinia);
    const libraryStore = useLibraryStore(pinia);
    const cloudStore = useCloudStore(pinia);
    const localStore = useLocalStore(pinia);

    const rendererApi = typeof window !== 'undefined' ? (window.windowApi || window.electronAPI || null) : null;

    return {
      app,
      stores: {
        player: playerStore,
        other: otherStore,
        user: userStore,
        library: libraryStore,
        cloud: cloudStore,
        local: localStore,
      },
      audio: createAudioApi(playerStore),
      ipc: rendererApi,
      windowApi: rendererApi,
    };
  });
}

export function usePluginArea(areaName) {
  return computed(() => contributionState[areaName] || []);
}
