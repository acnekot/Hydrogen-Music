const DEFAULT_SCOPE = 'global'
const DEFAULT_STORAGE_KEY = 'hydrogen.plugins.settings'
const PACKAGE_EXTENSION = '.hym'
const PACKAGE_MANIFEST_PATH = 'manifest.json'
const PACKAGE_DEFAULT_MAIN = 'index.js'

const textDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null

function readText(bytes) {
  if (!bytes) return ''
  if (!textDecoder) {
    throw new Error('当前环境不支持读取文本内容')
  }
  return textDecoder.decode(bytes)
}

function normalizePackagePath(path) {
  if (!path) return ''
  return String(path).replace(/^[./\\]+/, '').replace(/\\+/g, '/').trim()
}

function sanitizeRelativePath(path) {
  const normalized = normalizePackagePath(path)
  if (!normalized || normalized.includes('..')) {
    throw new Error(`非法的文件路径：${path}`)
  }
  return normalized
}

function uint8ToBase64(view) {
  if (!view) return ''
  const buffer = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
  return arrayBufferToBase64(buffer)
}

function base64ToUint8(base64) {
  const buffer = base64ToArrayBuffer(base64)
  return new Uint8Array(buffer)
}

async function inflateRaw(data) {
  if (typeof DecompressionStream !== 'function') {
    throw new Error('当前环境不支持解压 Deflate，请使用存储模式创建插件包')
  }
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  const buffer = await new Response(stream).arrayBuffer()
  return new Uint8Array(buffer)
}

async function extractPackageEntries(arrayBuffer) {
  const view = new DataView(arrayBuffer)
  const length = view.byteLength
  const files = new Map()
  let offset = 0

  while (offset + 30 <= length) {
    const signature = view.getUint32(offset, true)

    if (signature === 0x04034b50) {
      const flags = view.getUint16(offset + 6, true)
      if (flags & 0x0008) {
        throw new Error('暂不支持带有数据描述符的插件包')
      }

      const compression = view.getUint16(offset + 8, true)
      const compressedSize = view.getUint32(offset + 18, true)
      const uncompressedSize = view.getUint32(offset + 22, true)
      const nameLength = view.getUint16(offset + 26, true)
      const extraLength = view.getUint16(offset + 28, true)

      const nameStart = offset + 30
      const dataStart = nameStart + nameLength + extraLength
      const dataEnd = dataStart + compressedSize

      if (dataEnd > length) {
        throw new Error('插件包内容不完整，无法读取')
      }

      const rawName = new Uint8Array(arrayBuffer, nameStart, nameLength)
      const filename = normalizePackagePath(readText(rawName))

      const compressed = new Uint8Array(arrayBuffer, dataStart, compressedSize)
      let fileData

      if (compression === 0) {
        fileData = new Uint8Array(compressed)
      } else if (compression === 8) {
        fileData = await inflateRaw(compressed)
      } else {
        throw new Error(`不支持的压缩算法：${compression}`)
      }

      if (uncompressedSize && fileData.length !== uncompressedSize) {
        console.warn('[PluginManager] 解压后的文件长度与记录不一致，将以解压结果为准。')
      }

      if (filename) {
        files.set(filename, fileData)
      }

      offset = dataEnd
      continue
    }

    if (signature === 0x02014b50 || signature === 0x06054b50) {
      break
    }

    offset += 1
  }

  return files
}

function arrayBufferToBase64(buffer) {
  if (!buffer) return ''
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
    let segment = ''
    for (let j = 0; j < chunk.length; j += 1) {
      segment += String.fromCharCode(chunk[j])
    }
    binary += segment
  }
  if (typeof btoa === 'function') {
    return btoa(binary)
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(binary, 'binary').toString('base64')
  }
  throw new Error('当前环境不支持 Base64 编码')
}

function base64ToArrayBuffer(base64) {
  if (!base64) return new ArrayBuffer(0)
  let binary
  if (typeof atob === 'function') {
    binary = atob(base64)
  } else if (typeof Buffer !== 'undefined') {
    binary = Buffer.from(base64, 'base64').toString('binary')
  } else {
    throw new Error('当前环境不支持 Base64 解码')
  }
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return buffer
}

function sanitizeManifest(manifest, fallbackName = '') {
  if (!manifest || typeof manifest !== 'object') {
    return { name: fallbackName }
  }
  const normalized = { ...manifest }
  if (!normalized.name && fallbackName) {
    normalized.name = fallbackName
  }
  return normalized
}

export class PluginSettingsStore {
  constructor(options = {}) {
    const { storageKey = DEFAULT_STORAGE_KEY, storage = null } = options
    this.storageKey = storageKey
    this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null)
    this.state = { plugins: {} }
    this._load()
  }

  _load() {
    if (!this.storage) return
    try {
      const raw = this.storage.getItem(this.storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        const plugins = parsed.plugins
        if (plugins && typeof plugins === 'object') {
          this.state.plugins = { ...plugins }
        }
      }
    } catch (error) {
      console.warn('[PluginManager] Failed to parse stored plugin settings.', error)
    }
  }

  _persist() {
    if (!this.storage) return
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(this.state))
    } catch (error) {
      console.warn('[PluginManager] Failed to persist plugin settings.', error)
    }
  }

  getState(name) {
    return this.state.plugins?.[name] ?? null
  }

  setState(name, patch) {
    if (!name) return null
    const next = {
      ...(this.state.plugins?.[name] ?? {}),
      ...(patch ?? {})
    }
    if (next.removed) {
      next.enabled = false
    }
    if (!this.state.plugins || typeof this.state.plugins !== 'object') {
      this.state.plugins = {}
    }
    this.state.plugins[name] = next
    this._persist()
    return next
  }

  deleteState(name) {
    if (!name || !this.state.plugins) return
    if (this.state.plugins[name]) {
      delete this.state.plugins[name]
      this._persist()
    }
  }

  list() {
    return { ...(this.state.plugins ?? {}) }
  }

  export() {
    return JSON.parse(JSON.stringify(this.state))
  }

  import(payload, { merge = true } = {}) {
    if (!payload || typeof payload !== 'object') return
    const incoming = payload.plugins
    if (!incoming || typeof incoming !== 'object') return
    if (!merge) {
      this.state.plugins = {}
    }
    this.state.plugins = {
      ...(this.state.plugins ?? {}),
      ...incoming
    }
    this._persist()
  }
}

class HookRegistry {
  constructor() {
    this._hooks = new Map()
  }

  on(name, handler) {
    if (typeof handler !== 'function') {
      console.warn(`[PluginManager] Attempted to register non-function handler for hook "${name}".`)
      return () => {}
    }
    if (!this._hooks.has(name)) {
      this._hooks.set(name, new Set())
    }
    const handlers = this._hooks.get(name)
    handlers.add(handler)
    return () => this.off(name, handler)
  }

  off(name, handler) {
    const handlers = this._hooks.get(name)
    if (!handlers) return
    handlers.delete(handler)
    if (handlers.size === 0) {
      this._hooks.delete(name)
    }
  }

  async emit(name, payload, context) {
    const handlers = this._hooks.get(name)
    if (!handlers || handlers.size === 0) return []
    const executions = []
    handlers.forEach((handler) => {
      try {
        executions.push(Promise.resolve(handler(payload, context)))
      } catch (error) {
        console.error(`[PluginManager] Hook "${name}" handler failed:`, error)
      }
    })
    return Promise.all(executions)
  }
}

export class PluginManager {
  constructor(app, options = {}) {
    this.app = app
    this.router = options.router ?? null
    this.pinia = options.pinia ?? null
    this.scope = options.scope ?? DEFAULT_SCOPE
    this.plugins = new Map()
    this.hooks = new HookRegistry()
    this.settingsStore = options.settingsStore ?? new PluginSettingsStore({
      storageKey: options.settingsKey,
      storage: options.storage
    })
    this.moduleSources = new Map()
    this.packageUrls = new Map()
    this._restorePackagesPromise = null
    this._restorePackagesPromise = this._restorePersistedPackages()
  }

  _getPluginBridge() {
    if (typeof window === 'undefined') return null
    const bridge = window.electronAPI?.plugins ?? null
    if (!bridge) return null
    if (typeof bridge !== 'object') return null
    return bridge
  }

  async _persistPackageToDisk(name, files, entryPath) {
    const bridge = this._getPluginBridge()
    if (!bridge?.installPackage) return null
    try {
      const payload = {
        name,
        entry: sanitizeRelativePath(entryPath),
        files: []
      }
      files.forEach((value, filePath) => {
        const data = value instanceof Uint8Array ? value : new Uint8Array(value ?? [])
        payload.files.push({
          path: sanitizeRelativePath(filePath),
          data: uint8ToBase64(data)
        })
      })
      const result = await bridge.installPackage(payload)
      return result ?? null
    } catch (error) {
      console.error('[PluginManager] 保存插件包至磁盘失败:', error)
      return null
    }
  }

  async _removePackageFromDisk(directory) {
    if (!directory) return
    const bridge = this._getPluginBridge()
    if (!bridge?.removePackage) return
    try {
      await bridge.removePackage({ directory })
    } catch (error) {
      console.error('[PluginManager] 删除磁盘中的插件包失败:', error)
    }
  }

  async _readPackageFileFromDisk(directory, filePath, options = {}) {
    if (!directory || !filePath) return null
    const bridge = this._getPluginBridge()
    if (!bridge?.readFile) return null
    try {
      const normalized = sanitizeRelativePath(filePath)
      return await bridge.readFile({ directory, path: normalized, encoding: options.encoding })
    } catch (error) {
      console.error('[PluginManager] 读取插件文件失败:', error)
      return null
    }
  }

  async _listPackageFilesFromDisk(directory) {
    if (!directory) return []
    const bridge = this._getPluginBridge()
    if (!bridge?.listFiles) return []
    try {
      const list = await bridge.listFiles({ directory })
      if (Array.isArray(list)) {
        return list.map((item) => sanitizeRelativePath(item))
      }
    } catch (error) {
      console.error('[PluginManager] 列出插件文件失败:', error)
    }
    return []
  }

  _normalizeSettingsEntry(plugin) {
    const entry = {
      label: '插件设置',
      open: null,
      route: null,
      path: null,
      href: null,
      hasEntry: false
    }
    if (!plugin || typeof plugin !== 'object') {
      return entry
    }

    const { settingsLabel } = plugin
    if (typeof settingsLabel === 'string' && settingsLabel.trim()) {
      entry.label = settingsLabel.trim()
    }

    const candidate = plugin.settings
    if (typeof candidate === 'function') {
      entry.open = candidate
    } else if (candidate && typeof candidate === 'object') {
      const { label, open, route, path, href } = candidate
      if (typeof label === 'string' && label.trim()) {
        entry.label = label.trim()
      }
      if (typeof open === 'function') {
        entry.open = open
      }
      if (route) {
        entry.route = route
      }
      if (path) {
        entry.path = path
      }
      if (href) {
        entry.href = href
      }
    }

    if (typeof plugin.openSettings === 'function') {
      entry.open = plugin.openSettings
    }

    entry.hasEntry = Boolean(entry.open || entry.route || entry.path || entry.href)
    return entry
  }

  loadFromModules(modules) {
    Object.entries(modules).forEach(([source, mod]) => {
      const plugin = mod?.default ?? mod?.plugin ?? mod
      if (!plugin) {
        console.warn(`[PluginManager] Module "${source}" did not export a plugin.`)
        return
      }
      this.registerPlugin(plugin, source, { origin: 'module' })
    })
  }

  registerPlugin(plugin, source = 'inline', meta = {}) {
    if (!plugin || typeof plugin !== 'object') {
      console.warn('[PluginManager] Attempted to register invalid plugin:', plugin)
      return
    }
    const manifest = meta?.manifest ?? null
    const displayName = meta?.displayName ?? manifest?.displayName
    const description = meta?.description ?? manifest?.description
    const version = meta?.version ?? manifest?.version
    const origin = meta?.origin ?? 'module'

    const name = plugin.name ?? manifest?.name ?? source
    if (!name) {
      console.warn('[PluginManager] Plugin is missing a name and cannot be registered.', plugin)
      return
    }
    if (this.plugins.has(name)) {
      console.warn(`[PluginManager] Plugin "${name}" is already registered.`)
      return
    }
    const storedState = this.settingsStore?.getState(name)
    const experimentalAck = storedState?.experimentalAck === true || plugin.experimentalAck === true
    this.moduleSources.set(name, {
      plugin,
      source,
      meta: {
        origin,
        manifest,
        files: meta?.files ?? null,
        url: meta?.url ?? null,
        packageDir: meta?.packageDir ?? storedState?.package?.directory ?? null,
        packageEntry: meta?.packageEntry ?? storedState?.package?.entry ?? null
      }
    })
    if (storedState?.removed) {
      return
    }
    const enabled = storedState?.enabled ?? (plugin.enabled !== false)
    this.plugins.set(name, {
      ...plugin,
      name,
      displayName: plugin.displayName ?? displayName ?? name,
      description: plugin.description ?? description ?? '',
      version: plugin.version ?? version ?? null,
      origin,
      enabled,
      source,
      isActive: false,
      teardown: null,
      removable: (meta?.removable ?? plugin.removable) !== false,
      experimentalAck
    })
    if (this.settingsStore) {
      this.settingsStore.setState(name, {
        enabled,
        removed: false,
        experimentalAck
      })
    }
    if (origin === 'package' && meta?.url) {
      this.packageUrls.set(name, meta.url)
    }
  }

  getPlugin(name) {
    return this.plugins.get(name) ?? null
  }

  listPlugins() {
    return Array.from(this.plugins.values()).map((plugin) => {
      const { teardown, ...meta } = plugin
      return {
        ...meta,
        settingsEntry: this._normalizeSettingsEntry(plugin)
      }
    })
  }

  listPluginAssets(name) {
    const definition = this.moduleSources.get(name)
    const files = definition?.meta?.files
    if (!files) return []
    if (files instanceof Map) {
      return Array.from(files.keys())
    }
    if (files instanceof Set) {
      return Array.from(files.values())
    }
    if (Array.isArray(files)) {
      return files.map((item) => normalizePackagePath(item))
    }
    return []
  }

  async readPluginAsset(name, path, options = {}) {
    if (!name || !path) return null
    await this.ensurePackagesRestored()
    const definition = this.moduleSources.get(name)
    if (!definition || definition.meta?.origin !== 'package') return null
    const files = definition.meta?.files
    const normalized = normalizePackagePath(path)
    let hasFile = false
    if (files instanceof Map) {
      hasFile = files.has(normalized)
    } else if (files instanceof Set) {
      hasFile = files.has(normalized)
    } else if (Array.isArray(files)) {
      hasFile = files.includes(normalized)
    }
    if (!hasFile) return null

    if (definition.meta?.packageDir) {
      const encoding = options.type === 'json' ? 'text' : options.type === 'base64' || options.type === 'arrayBuffer' ? 'base64' : 'text'
      const payload = await this._readPackageFileFromDisk(definition.meta.packageDir, normalized, { encoding })
      if (payload == null) return null
      if (options.type === 'arrayBuffer') {
        const bytes = typeof payload === 'string' ? base64ToUint8(payload) : new Uint8Array([])
        return bytes.buffer
      }
      if (options.type === 'json') {
        return JSON.parse(payload)
      }
      if (options.type === 'base64') {
        if (typeof payload === 'string') return payload
        return null
      }
      if (typeof payload === 'string') {
        return payload
      }
      return null
    }

    if (!(files instanceof Map)) {
      return null
    }
    const file = files.get(normalized)
    if (!file) return null
    const view = file instanceof Uint8Array ? file : new Uint8Array(file)
    if (options.type === 'arrayBuffer') {
      return view.slice().buffer
    }
    if (options.type === 'json') {
      return JSON.parse(readText(view))
    }
    if (options.type === 'base64') {
      return arrayBufferToBase64(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength))
    }
    return readText(view)
  }

  _createAssetHelpers(name) {
    return {
      list: () => this.listPluginAssets(name),
      has: (path) => {
        const normalized = normalizePackagePath(path)
        const definition = this.moduleSources.get(name)
        return Boolean(definition?.meta?.files?.has(normalized))
      },
      read: (path, options) => this.readPluginAsset(name, path, options)
    }
  }

  getContext() {
    return {
      app: this.app,
      router: this.router,
      pinia: this.pinia,
      manager: this,
      hooks: {
        on: this.hooks.on.bind(this.hooks),
        off: this.hooks.off.bind(this.hooks),
        emit: (name, payload) => this.emitHook(name, payload)
      }
    }
  }

  async emitHook(name, payload) {
    return this.hooks.emit(name, payload, this.getContext())
  }

  async activatePlugin(name) {
    const plugin = this.plugins.get(name)
    if (!plugin) {
      console.warn(`[PluginManager] Plugin "${name}" was not found.`)
      return
    }
    if (plugin.isActive) return
    if (plugin.enabled === false) return
    if (typeof plugin.setup !== 'function') {
      console.warn(`[PluginManager] Plugin "${name}" does not provide a setup function.`)
      plugin.isActive = true
      return
    }
    try {
      const context = {
        ...this.getContext(),
        plugin,
        assets: this._createAssetHelpers(name)
      }
      const teardown = await plugin.setup(context)
      if (typeof teardown === 'function') {
        plugin.teardown = teardown
      }
      plugin.isActive = true
    } catch (error) {
      console.error(`[PluginManager] Failed to activate plugin "${name}":`, error)
    }
  }

  async deactivatePlugin(name) {
    const plugin = this.plugins.get(name)
    if (!plugin || !plugin.isActive) return
    if (typeof plugin.teardown === 'function') {
      try {
        await plugin.teardown()
      } catch (error) {
        console.error(`[PluginManager] Failed to teardown plugin "${name}":`, error)
      }
    }
    plugin.isActive = false
  }

  async installAll() {
    await this.ensurePackagesRestored()
    const plugins = Array.from(this.plugins.values())
    for (const plugin of plugins) {
      if (plugin.enabled === false) continue
      await this.activatePlugin(plugin.name)
    }
  }

  async enablePlugin(name) {
    await this.ensurePackagesRestored()
    let plugin = this.plugins.get(name)
    if (!plugin) {
      plugin = this.restorePlugin(name)
    }
    if (plugin) {
      plugin.enabled = true
      this.settingsStore?.setState(name, { enabled: true, removed: false })
      await this.activatePlugin(name)
      return
    }
    this.settingsStore?.setState(name, { enabled: true, removed: false })
  }

  async disablePlugin(name) {
    await this.ensurePackagesRestored()
    let plugin = this.plugins.get(name)
    if (!plugin) {
      plugin = this.restorePlugin(name)
    }
    if (plugin) {
      plugin.enabled = false
      this.settingsStore?.setState(name, { enabled: false, removed: false })
      await this.deactivatePlugin(name)
      return
    }
    this.settingsStore?.setState(name, { enabled: false, removed: false })
  }

  async acknowledgePluginEnable(name) {
    if (!name) return
    await this.ensurePackagesRestored()
    let plugin = this.plugins.get(name)
    if (!plugin) {
      plugin = this.restorePlugin(name)
    }
    if (plugin) {
      plugin.experimentalAck = true
    }
    this.settingsStore?.setState(name, { experimentalAck: true })
  }

  async removePlugin(name, { forgetState = false } = {}) {
    await this.ensurePackagesRestored()
    const plugin = this.plugins.get(name)
    const definition = this.moduleSources.get(name)
    if (plugin) {
      if (plugin.removable === false) {
        console.warn(`[PluginManager] Plugin "${name}" is not removable.`)
        return
      }
      await this.deactivatePlugin(name)
      this.plugins.delete(name)
    }
    if (this.settingsStore) {
      if (forgetState) {
        const stored = this.settingsStore.getState(name)
        const packageDir = definition?.meta?.packageDir ?? stored?.package?.directory ?? null
        this.settingsStore.deleteState(name)
        if (definition?.meta?.url) {
          try {
            URL.revokeObjectURL(definition.meta.url)
          } catch (_) {
            // ignore
          }
          this.packageUrls.delete(name)
        }
        if (packageDir) {
          await this._removePackageFromDisk(packageDir)
        }
        this.moduleSources.delete(name)
      } else {
        this.settingsStore.setState(name, { removed: true, enabled: false })
      }
    }
  }

  hasPluginSettings(name) {
    const plugin = this.plugins.get(name)
    if (!plugin) return false
    const entry = this._normalizeSettingsEntry(plugin)
    return entry.hasEntry
  }

  async openPluginSettings(name, options = {}) {
    await this.ensurePackagesRestored()
    const plugin = this.plugins.get(name)
    if (!plugin) {
      console.warn(`[PluginManager] Plugin "${name}" was not found.`)
      return
    }
    const entry = this._normalizeSettingsEntry(plugin)
    if (!entry.hasEntry) {
      console.warn(`[PluginManager] Plugin "${name}" does not expose settings.`)
      return
    }
    const context = {
      ...this.getContext(),
      plugin,
      options,
      assets: this._createAssetHelpers(name)
    }
    try {
      if (typeof entry.open === 'function') {
        return await entry.open(context)
      }
      if (entry.route && this.router) {
        const target = typeof entry.route === 'function' ? entry.route(context) : entry.route
        if (target) {
          return await this.router.push(target)
        }
      }
      if (entry.path && this.router) {
        const target = typeof entry.path === 'function' ? entry.path(context) : entry.path
        if (target) {
          return await this.router.push(target)
        }
      }
      if (entry.href && typeof window !== 'undefined') {
        const target = typeof entry.href === 'function' ? entry.href(context) : entry.href
        if (target) {
          window.open(target, '_blank', 'noopener')
        }
      }
    } catch (error) {
      console.error(`[PluginManager] Failed to open settings for plugin "${name}":`, error)
      throw error
    }
  }

  async _loadPackageFromBuffer(arrayBuffer, nameHint = '') {
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('插件包为空')
    }
    const files = await extractPackageEntries(arrayBuffer)
    if (!files || files.size === 0) {
      throw new Error('插件包不包含任何文件')
    }

    const manifestPath = normalizePackagePath(PACKAGE_MANIFEST_PATH)
    if (!files.has(manifestPath)) {
      throw new Error('插件包缺少 manifest.json 文件')
    }
    let manifest
    try {
      manifest = JSON.parse(readText(files.get(manifestPath)))
    } catch (error) {
      throw new Error('插件包的 manifest 无法解析，请确认 JSON 格式是否正确')
    }
    manifest = sanitizeManifest(manifest, nameHint)

    const mainPath = normalizePackagePath(manifest.main ?? PACKAGE_DEFAULT_MAIN)
    const entry = files.get(mainPath)
    if (!entry) {
      throw new Error(`插件包缺少入口文件 ${mainPath}`)
    }

    let pluginModule = null
    let pluginDefinition = null
    let objectUrl = null

    if (mainPath.toLowerCase().endsWith('.json')) {
      try {
        pluginDefinition = JSON.parse(readText(entry))
      } catch (error) {
        throw new Error('入口 JSON 解析失败，请确认文件内容合法')
      }
      pluginModule = { default: pluginDefinition }
    } else {
      const code = readText(entry)
      const blob = new Blob([code], { type: 'text/javascript' })
      objectUrl = URL.createObjectURL(blob)
      try {
        pluginModule = await import(/* @vite-ignore */ `${objectUrl}#${Date.now()}`)
      } catch (error) {
        URL.revokeObjectURL(objectUrl)
        throw error
      }
      pluginDefinition = pluginModule?.default ?? pluginModule?.plugin ?? pluginModule
      if (!pluginDefinition || typeof pluginDefinition !== 'object') {
        URL.revokeObjectURL(objectUrl)
        throw new Error('入口文件未导出可用的插件对象')
      }
    }

    let normalizedPlugin = pluginDefinition
    const derivedName = manifest.name ?? nameHint ?? pluginDefinition?.name
    if (!normalizedPlugin.name && derivedName) {
      normalizedPlugin = { ...normalizedPlugin, name: derivedName }
    }
    if (!normalizedPlugin.displayName && manifest.displayName) {
      normalizedPlugin = { ...normalizedPlugin, displayName: manifest.displayName }
    }
    if (!normalizedPlugin.description && manifest.description) {
      normalizedPlugin = { ...normalizedPlugin, description: manifest.description }
    }
    if (!normalizedPlugin.version && manifest.version) {
      normalizedPlugin = { ...normalizedPlugin, version: manifest.version }
    }

    const normalizedFiles = new Map()
    files.forEach((value, key) => {
      normalizedFiles.set(normalizePackagePath(key), value)
    })

    return {
      manifest,
      plugin: normalizedPlugin,
      url: objectUrl,
      files: normalizedFiles,
      entry: mainPath,
      fileList: Array.from(normalizedFiles.keys())
    }
  }

  async _loadPackageFromDirectory(directory, manifest = {}, entryPath = PACKAGE_DEFAULT_MAIN, fileList = []) {
    const normalizedEntry = normalizePackagePath(entryPath || PACKAGE_DEFAULT_MAIN)
    const isJson = normalizedEntry.toLowerCase().endsWith('.json')
    const raw = await this._readPackageFileFromDisk(directory, normalizedEntry, { encoding: 'text' })
    if (raw == null) {
      throw new Error(`无法读取插件入口文件 ${normalizedEntry}`)
    }

    let objectUrl = null
    let pluginDefinition = null

    if (isJson) {
      try {
        pluginDefinition = JSON.parse(raw)
      } catch (error) {
        throw new Error('入口 JSON 解析失败，请确认文件内容合法')
      }
    } else {
      const blob = new Blob([raw], { type: 'text/javascript' })
      objectUrl = URL.createObjectURL(blob)
      try {
        const pluginModule = await import(/* @vite-ignore */ `${objectUrl}#${Date.now()}`)
        pluginDefinition = pluginModule?.default ?? pluginModule?.plugin ?? pluginModule
      } catch (error) {
        if (objectUrl) URL.revokeObjectURL(objectUrl)
        throw error
      }
      if (!pluginDefinition || typeof pluginDefinition !== 'object') {
        if (objectUrl) URL.revokeObjectURL(objectUrl)
        throw new Error('入口文件未导出可用的插件对象')
      }
    }

    let normalizedPlugin = pluginDefinition
    const derivedName = manifest?.name ?? normalizedPlugin?.name
    if (!normalizedPlugin.name && derivedName) {
      normalizedPlugin = { ...normalizedPlugin, name: derivedName }
    }
    if (!normalizedPlugin.displayName && manifest?.displayName) {
      normalizedPlugin = { ...normalizedPlugin, displayName: manifest.displayName }
    }
    if (!normalizedPlugin.description && manifest?.description) {
      normalizedPlugin = { ...normalizedPlugin, description: manifest.description }
    }
    if (!normalizedPlugin.version && manifest?.version) {
      normalizedPlugin = { ...normalizedPlugin, version: manifest.version }
    }

    const files = new Set(fileList.map((item) => normalizePackagePath(item)))

    return {
      manifest,
      plugin: normalizedPlugin,
      url: objectUrl,
      files,
      entry: normalizedEntry
    }
  }

  async _registerPackageFromState(name, meta) {
    const packageState = meta?.package
    if (!packageState) return
    if (this.plugins.has(name)) return
    if (packageState.directory) {
      try {
        const manifest = packageState.manifest ?? {}
        const entryPath = packageState.entry ?? manifest.main ?? PACKAGE_DEFAULT_MAIN
        const fileList = Array.isArray(packageState.files)
          ? packageState.files
          : await this._listPackageFilesFromDisk(packageState.directory)
        const { plugin, url, files } = await this._loadPackageFromDirectory(
          packageState.directory,
          manifest,
          entryPath,
          fileList
        )
        this.registerPlugin(plugin, `package:${name}`, {
          origin: 'package',
          manifest,
          files,
          url,
          displayName: manifest?.displayName,
          description: manifest?.description,
          version: manifest?.version,
          packageDir: packageState.directory,
          packageEntry: entryPath
        })
        return
      } catch (error) {
        console.error(`[PluginManager] 无法通过目录恢复插件 "${name}":`, error)
        if (!packageState.archive) {
          return
        }
      }
    }

    if (!packageState.archive) return
    try {
      const buffer = base64ToArrayBuffer(packageState.archive)
      const { manifest, plugin, url, files, entry } = await this._loadPackageFromBuffer(buffer, name)
      this.registerPlugin(plugin, `package:${name}`, {
        origin: 'package',
        manifest,
        files,
        url,
        displayName: manifest?.displayName,
        description: manifest?.description,
        version: manifest?.version,
        packageEntry: entry,
        packageDir: null
      })
    } catch (error) {
      console.error(`[PluginManager] 无法通过归档恢复插件 "${name}":`, error)
    }
  }

  async _restorePersistedPackages({ force = false } = {}) {
    if (this._restorePackagesPromise && !force) {
      return this._restorePackagesPromise
    }
    const task = (async () => {
      const state = this.settingsStore?.list?.() ?? {}
      const entries = Object.entries(state)
      for (const [name, meta] of entries) {
        const packageState = meta?.package
        if (!packageState) continue
        if (!packageState.archive && !packageState.directory) continue
        if (this.plugins.has(name)) continue
        await this._registerPackageFromState(name, meta)
      }
    })()
    this._restorePackagesPromise = task
    try {
      await task
    } catch (error) {
      console.error('[PluginManager] 恢复插件包时发生错误:', error)
    }
    return this._restorePackagesPromise
  }

  async ensurePackagesRestored() {
    if (!this._restorePackagesPromise) {
      this._restorePackagesPromise = this._restorePersistedPackages()
    }
    return this._restorePackagesPromise
  }

  async importPluginPackage(file, options = {}) {
    if (!file) {
      throw new Error('未选择插件包')
    }
    const fileName = file.name ?? ''
    if (fileName && !fileName.toLowerCase().endsWith(PACKAGE_EXTENSION)) {
      throw new Error('仅支持导入 .hym 插件包')
    }

    const buffer = await file.arrayBuffer()
    const nameHint = fileName ? fileName.replace(new RegExp(`${PACKAGE_EXTENSION}$`, 'i'), '') : ''
    const { manifest, plugin, url, files, entry, fileList } = await this._loadPackageFromBuffer(buffer, nameHint)
    const pluginName = plugin?.name ?? manifest?.name ?? nameHint

    if (!pluginName) {
      if (url) URL.revokeObjectURL(url)
      throw new Error('插件包缺少 name 字段')
    }

    if (this.plugins.has(pluginName) || this.moduleSources.has(pluginName)) {
      if (url) URL.revokeObjectURL(url)
      throw new Error(`插件 "${pluginName}" 已存在，请先删除后再导入`)
    }

    const diskSnapshot = await this._persistPackageToDisk(pluginName, files, entry)
    const packageState = {
      entry,
      files: fileList,
      manifest,
      filename: fileName,
      importedAt: Date.now()
    }
    if (diskSnapshot?.directory) {
      packageState.directory = diskSnapshot.directory
    } else {
      packageState.archive = arrayBufferToBase64(buffer)
    }
    const enabledDefault = options.enable ?? (manifest?.enabled ?? plugin.enabled !== false)

    this.settingsStore?.setState(pluginName, {
      enabled: enabledDefault,
      removed: false,
      package: packageState
    })

    this.registerPlugin(plugin, `package:${pluginName}`, {
      origin: 'package',
      manifest,
      files: diskSnapshot?.directory ? new Set(fileList) : files,
      url,
      displayName: manifest?.displayName,
      description: manifest?.description,
      version: manifest?.version,
      packageDir: diskSnapshot?.directory ?? null,
      packageEntry: entry
    })

    if (!enabledDefault) {
      await this.disablePlugin(pluginName)
      return this.getPlugin(pluginName)
    }

    if (options.activate === false) {
      return this.getPlugin(pluginName)
    }

    await this.enablePlugin(pluginName)
    return this.getPlugin(pluginName)
  }

  restorePlugin(name) {
    if (!name) return null
    const stored = this.settingsStore?.getState(name)
    if (stored?.removed) {
      this.settingsStore.setState(name, { removed: false })
    }
    if (this.plugins.has(name)) return this.plugins.get(name)
    const definition = this.moduleSources.get(name)
    if (definition) {
      this.registerPlugin(definition.plugin, definition.source, definition.meta)
      return this.plugins.get(name) ?? null
    }
    return null
  }

  exportSettings() {
    return this.settingsStore?.export() ?? { plugins: {} }
  }

  async importSettings(payload, options = {}) {
    const { merge = true, syncActivation = true } = options
    this.settingsStore?.import(payload, { merge })
    await this._restorePersistedPackages({ force: true })
    if (!syncActivation) return
    const state = this.settingsStore?.list() ?? {}
    await Promise.all(
      Object.entries(state).map(async ([name, meta]) => {
        if (meta.removed) {
          await this.removePlugin(name)
          return
        }
        if (meta.enabled) {
          await this.enablePlugin(name)
        } else {
          await this.disablePlugin(name)
        }
      })
    )
  }
}

const pluginModules = import.meta.glob('./modules/**/*.js', { eager: true })

export function createPluginManager(app, options = {}) {
  const manager = new PluginManager(app, options)
  manager.loadFromModules(pluginModules)
  return manager
}
