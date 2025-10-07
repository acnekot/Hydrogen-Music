module.exports = (pluginApi) => {
  const settingsComponent = pluginApi.useBuiltinComponent('theme-showcase');
  let styleEl = null;

  const ensureStyle = () => {
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.setAttribute('data-plugin', 'theme-showcase');
      document.head.appendChild(styleEl);
    }
    return styleEl;
  };

  const applyTheme = (config) => {
    const accent = config.accentColor || '#4ad5ff';
    const gradient = config.dynamicBackground
      ? `linear-gradient(135deg, ${accent}66, #0b1025)`
      : '';
    const el = ensureStyle();
    el.textContent = `:root{--plugin-accent-color:${accent};}
body.plugin-theme-dynamic::before{content:'';position:fixed;inset:0;z-index:-1;background:${gradient || 'transparent'};pointer-events:none;}
.button,.btn,.option-add,.option-reset,.option-add-group .option-add{border-color:${accent}33;color:${accent};}
.button:hover,.btn:hover{border-color:${accent};color:${accent};}`;
    document.documentElement.style.setProperty('--accent-color', accent);
    if (config.dynamicBackground) {
      document.body.classList.add('plugin-theme-dynamic');
    } else {
      document.body.classList.remove('plugin-theme-dynamic');
    }
  };

  const resetTheme = () => {
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
    }
    styleEl = null;
    document.body.classList.remove('plugin-theme-dynamic');
    document.documentElement.style.removeProperty('--accent-color');
  };

  return {
    id: 'theme-showcase',
    name: '主题美化插件',
    version: '1.0.0',
    description: '调整强调色与背景，打造个性化界面。',
    categories: ['theme'],
    settingsComponent,
    defaultConfig: {
      themeMode: 'system',
      accentColor: '#4ad5ff',
      dynamicBackground: false,
    },
    onActivate(context) {
      applyTheme(context.getConfig());
    },
    onDeactivate() {
      resetTheme();
    },
    onConfigChange(context, config) {
      applyTheme(config);
    },
  };
};
