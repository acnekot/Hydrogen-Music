#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { parse, compileScript, compileStyle } = require('@vue/compiler-sfc');

const rootDir = path.resolve(__dirname, '..');
const pluginsDir = path.join(rootDir, 'plugins');

const vuePackage = require(path.join(rootDir, 'node_modules/vue/package.json'));
const piniaPackage = require(path.join(rootDir, 'node_modules/pinia/package.json'));
const howlerPackage = require(path.join(rootDir, 'node_modules/howler/package.json'));

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

function copyDependency(outputDir, dependency) {
  const nodeModulesDir = path.join(outputDir, 'node_modules');
  ensureDir(nodeModulesDir);
  const sourceDir = path.join(rootDir, 'node_modules', dependency.name);
  const targetDir = path.join(nodeModulesDir, dependency.name);
  ensureDir(targetDir);

  const files = Array.isArray(dependency.files) ? dependency.files : [];
  for (const file of files) {
    const from = path.join(sourceDir, file.from);
    const to = path.join(targetDir, file.to);
    ensureDir(path.dirname(to));
    fs.copyFileSync(from, to);
  }

  const manifest = {
    name: dependency.name,
    version: dependency.version,
    main: dependency.main,
    module: dependency.module || dependency.main
  };
  if (dependency.type) {
    manifest.type = dependency.type;
  }
  fs.writeFileSync(path.join(targetDir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');
}

function copyExtraFile(outputDir, extra) {
  const sourcePath = path.join(rootDir, extra.from);
  const targetPath = path.join(outputDir, extra.to);
  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
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

  if (Array.isArray(plugin.dependencies)) {
    for (const dependency of plugin.dependencies) {
      copyDependency(outputDir, dependency);
    }
  }

  if (Array.isArray(plugin.extraFiles)) {
    for (const extra of plugin.extraFiles) {
      copyExtraFile(outputDir, extra);
    }
  }
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
    dependencies: [
      {
        name: 'vue',
        version: vuePackage.version,
        files: [
          { from: 'dist/vue.runtime.esm-browser.prod.js', to: 'dist/vue.runtime.esm-browser.prod.js' }
        ],
        main: 'dist/vue.runtime.esm-browser.prod.js',
        module: 'dist/vue.runtime.esm-browser.prod.js',
        type: 'module'
      },
      {
        name: 'howler',
        version: howlerPackage.version,
        files: [
          { from: 'dist/howler.js', to: 'dist/howler.js' }
        ],
        main: 'dist/howler.js',
        module: 'dist/howler.js'
      }
    ],
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
    moduleReplacements: [
      ["../views/LyricVisualizerSettings.vue", "./LyricVisualizerSettings.js"],
      ["../../store/playerStore", "./runtime/playerStore.js"]
    ],
    viewReplacements: [["../modules/lyricVisualizerPlugin", "./index.js"]],
    dependencies: [
      {
        name: 'vue',
        version: vuePackage.version,
        files: [
          { from: 'dist/vue.runtime.esm-browser.prod.js', to: 'dist/vue.runtime.esm-browser.prod.js' }
        ],
        main: 'dist/vue.runtime.esm-browser.prod.js',
        module: 'dist/vue.runtime.esm-browser.prod.js',
        type: 'module'
      },
      {
        name: 'pinia',
        version: piniaPackage.version,
        files: [
          { from: 'dist/pinia.esm-browser.js', to: 'dist/pinia.esm-browser.js' }
        ],
        main: 'dist/pinia.esm-browser.js',
        module: 'dist/pinia.esm-browser.js',
        type: 'module'
      }
    ],
    extraFiles: [
      { from: 'src/store/playerStore.js', to: 'runtime/playerStore.js' }
    ],
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
