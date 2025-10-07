#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { parse, compileScript, compileStyle } = require('@vue/compiler-sfc');

const rootDir = path.resolve(__dirname, '..');
const pluginsDir = path.join(rootDir, 'plugins');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function normalizeNewlines(value) {
  return value.replace(/\r\n?/g, '\n');
}

function compileVueComponent({ source, filename, id }) {
  const { descriptor } = parse(source, { filename });
  const script = compileScript(descriptor, { id, inlineTemplate: true });
  let code = script.content;
  const styles = descriptor.styles || [];
  let css = '';
  for (const style of styles) {
    const result = compileStyle({
      id,
      filename,
      source: style.content,
      scoped: style.scoped,
      isProd: true
    });
    if (result.errors && result.errors.length) {
      throw result.errors[0];
    }
    css += result.code + '\n';
  }
  code = code.replace('export default', 'const __sfc__ =');
  css = normalizeNewlines(css).trim();
  const lines = [];
  lines.push(code.trim());
  lines.push(`const __css__ = ${JSON.stringify(css)};`);
  lines.push('let __styleEl__ = null;');
  lines.push('function __injectCSS__() {');
  lines.push('  if (__styleEl__ || !__css__) return;');
  lines.push("  if (typeof document === 'undefined') return;");
  lines.push("  __styleEl__ = document.createElement('style');");
  lines.push("  __styleEl__.setAttribute('type', 'text/css');");
  lines.push('  __styleEl__.innerHTML = __css__;');
  lines.push('  document.head.appendChild(__styleEl__);');
  lines.push('}');
  lines.push('__injectCSS__();');
  lines.push('const __setup__ = __sfc__.setup;');
  lines.push('__sfc__.setup = function(...args) {');
  lines.push('  __injectCSS__();');
  lines.push('  return __setup__ ? __setup__.apply(this, args) : undefined;');
  lines.push('};');
  lines.push('export default __sfc__;');
  return `${lines.join('\n\n')}\n`;
}

function replaceAll(content, replacements) {
  return replacements.reduce((acc, [from, to]) => acc.split(from).join(to), content);
}

function buildPluginPackage(plugin) {
  ensureDir(pluginsDir);
  const outputDir = path.join(pluginsDir, plugin.name);
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const moduleSourcePath = path.join(rootDir, plugin.modulePath);
  let moduleCode = fs.readFileSync(moduleSourcePath, 'utf-8');
  if (plugin.moduleReplacements) {
    moduleCode = replaceAll(moduleCode, plugin.moduleReplacements);
  }
  fs.writeFileSync(path.join(outputDir, 'index.js'), moduleCode, 'utf-8');

  const viewSourcePath = path.join(rootDir, plugin.viewPath);
  let viewSource = fs.readFileSync(viewSourcePath, 'utf-8');
  if (plugin.viewReplacements) {
    viewSource = replaceAll(viewSource, plugin.viewReplacements);
  }
  const compiledView = compileVueComponent({
    source: viewSource,
    filename: path.basename(plugin.viewPath),
    id: plugin.viewId
  });
  fs.writeFileSync(path.join(outputDir, plugin.viewOutput), compiledView, 'utf-8');

  const manifestPath = path.join(outputDir, 'manifest.json');
  const manifestContent = `${JSON.stringify(plugin.manifest, null, 2)}\n`;
  fs.writeFileSync(manifestPath, manifestContent, 'utf-8');
}

const plugins = [
  {
    name: 'audio-effects',
    modulePath: 'src/plugins/modules/audioEffectsPlugin.js',
    viewPath: 'src/plugins/views/AudioEffectsSettings.vue',
    viewId: 'audio-effects-settings',
    viewOutput: 'AudioEffectsSettings.js',
    moduleReplacements: [["../views/AudioEffectsSettings.vue", "./AudioEffectsSettings.js"]],
    viewReplacements: [["../modules/audioEffectsPlugin", "./index.js"]],
    manifest: {
      name: 'audio-effects',
      displayName: '音效增强',
      version: '1.1.0',
      description: '提供低音、高音、存在感、立体声宽度与空间混响的综合音效调节。',
      author: 'Hydrogen Music Team',
      main: 'index.js'
    }
  },
  {
    name: 'lyric-visualizer',
    modulePath: 'src/plugins/modules/lyricVisualizerPlugin.js',
    viewPath: 'src/plugins/views/LyricVisualizerSettings.vue',
    viewId: 'lyric-visualizer-settings',
    viewOutput: 'LyricVisualizerSettings.js',
    moduleReplacements: [["../views/LyricVisualizerSettings.vue", "./LyricVisualizerSettings.js"]],
    viewReplacements: [["../modules/lyricVisualizerPlugin", "./index.js"]],
    manifest: {
      name: 'lyric-visualizer',
      displayName: '歌词可视化',
      version: '1.0.0',
      description: '提供实时的歌词波形与背景动画可视化展示。',
      author: 'Hydrogen Music Team',
      main: 'index.js'
    }
  }
];

function main() {
  ensureDir(pluginsDir);
  for (const plugin of plugins) {
    buildPluginPackage(plugin);
  }
}

main();
