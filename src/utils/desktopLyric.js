import { getPluginManager } from '../plugins';

const TOGGLE_COMMAND = 'desktop-lyric:toggle';

export const toggleDesktopLyric = async () => {
  const manager = getPluginManager();
  if (!manager || !manager.hasCommand(TOGGLE_COMMAND)) {
    console.warn('[DesktopLyric] Desktop lyric plugin is not available.');
    return;
  }
  return manager.executeCommand(TOGGLE_COMMAND);
};

export const initDesktopLyric = () => {
  // The desktop lyric plugin is initialized automatically when the app boots.
  // This function is kept for backward compatibility.
};

