module.exports = async (context) => {
  const settings = await context.getData();
  if (typeof settings.autoFocusLyric === 'undefined') {
    context.setSetting('autoFocusLyric', true);
  }
  const runtime = await context.importModule('integration/seamless');
  const register = runtime.default || runtime;
  if (typeof register === 'function') {
    register(context);
  }
};
