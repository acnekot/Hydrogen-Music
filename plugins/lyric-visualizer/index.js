module.exports = async (context) => {
  const settings = await context.getData();
  if (typeof settings.autoEnable === 'undefined') {
    context.setSetting('autoEnable', true);
  }
  if (typeof settings.disableOnUnload === 'undefined') {
    context.setSetting('disableOnUnload', false);
  }
  const runtime = await context.importModule('lyric-visualizer/runtime');
  const register = runtime.default || runtime;
  if (typeof register === 'function') {
    register(context);
  }
};
