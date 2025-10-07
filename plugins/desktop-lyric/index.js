module.exports = async (context) => {
  const settings = await context.getData();
  if (typeof settings.autoLaunch === 'undefined') {
    context.setSetting('autoLaunch', false);
  }
  if (typeof settings.disableOnUnload === 'undefined') {
    context.setSetting('disableOnUnload', false);
  }
  const runtime = await context.importModule('desktop-lyric/runtime');
  const register = runtime.default || runtime;
  if (typeof register === 'function') {
    register(context);
  }
};
