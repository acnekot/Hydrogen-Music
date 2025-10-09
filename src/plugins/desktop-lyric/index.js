import { initDesktopLyric, destroyDesktopLyric, toggleDesktopLyric } from './runtime';

export default {
  id: 'desktop-lyric',
  name: 'Desktop Lyric',
  setup(_context, api) {
    api.registerCommand('desktop-lyric:toggle', () => toggleDesktopLyric());
    initDesktopLyric();
    return () => {
      destroyDesktopLyric();
    };
  },
};
