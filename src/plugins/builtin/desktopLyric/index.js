import DesktopLyricControl from './DesktopLyricControl.vue';
import { createDesktopLyricService } from './service.js';

export default {
  id: 'builtin-desktop-lyric',
  name: 'Desktop Lyric',
  version: '1.0.0',
  setup(context) {
    const service = createDesktopLyricService(context);

    context.contributions.register('ui:player-controls', {
      id: 'desktop-lyric-toggle',
      order: 90,
      component: DesktopLyricControl,
      props: {
        toggleDesktopLyric: service.toggleDesktopLyric,
      },
    });

    context.addCleanup(() => {
      service.destroy();
    });
  },
};
