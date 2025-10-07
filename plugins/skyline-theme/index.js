module.exports = async (context) => {
  const css = await context.readText('theme.css');
  context.registerThemeStyle(css);
  context.registerSettingsPanel(async () => {
    const module = await context.importModule('theme/skyline-panel');
    return module.default || module;
  });
};
