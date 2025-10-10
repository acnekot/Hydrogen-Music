import DesktopLyricToggleButton from './DesktopLyricToggleButton.vue';
import { initDesktopLyric, destroyDesktopLyric } from './service';

export default {
  id: 'builtin.desktop-lyric',
  name: 'Desktop Lyric',
  version: '1.0.0',
  description: 'Floating lyric window rendered on the desktop.',
  setup(context) {
    initDesktopLyric();
    const disposeToggle = context.ui.registerPlayerControl({
      id: 'desktop-lyric-toggle',
      order: 50,
      component: DesktopLyricToggleButton,
    });

    return () => {
      disposeToggle?.();
      destroyDesktopLyric();
    };
  },
};
