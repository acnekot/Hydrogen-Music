import { initLyricService, destroyLyricService, syncLyricIndexFromProgress } from './lyricService';
import { usePlayerStore } from '../store/playerStore';

let warnedDisabled = false;

function ensureStore() {
    try {
        return usePlayerStore();
    } catch (error) {
        return null;
    }
}

export const initDesktopLyric = () => {
    initLyricService();
    const store = ensureStore();
    if (store && store.isDesktopLyricOpen) {
        store.isDesktopLyricOpen = false;
    }
};

export const toggleDesktopLyric = async () => {
    const store = ensureStore();
    if (store && store.isDesktopLyricOpen) {
        store.isDesktopLyricOpen = false;
    }
    if (!warnedDisabled && typeof console !== 'undefined') {
        console.info('[desktop-lyric] Feature disabled. Use a plugin to enable desktop lyrics.');
        warnedDisabled = true;
    }
    return { success: false, message: 'Desktop lyric feature is disabled' };
};

export const destroyDesktopLyric = () => {
    destroyLyricService();
};

export { syncLyricIndexFromProgress };
