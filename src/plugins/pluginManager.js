const DEFAULT_SCOPE = 'global'
const DEFAULT_STORAGE_KEY = 'hydrogen.plugins.settings'
const PACKAGE_EXTENSION = '.hym'
const PACKAGE_MANIFEST_PATH = 'manifest.json'
const PACKAGE_DEFAULT_MAIN = 'index.js'

const JS_EXTENSIONS = ['.js', '.mjs', '.cjs']
const JSON_EXTENSIONS = ['.json']
const MODULE_FALLBACK_EXTENSIONS = ['.js', '.mjs', '.cjs', '.json']
const MODULE_INDEX_FILES = ['index.js', 'index.mjs', 'index.cjs', 'index.json']

function getFileExtension(path) {
  if (!path) return ''
  const match = String(path).match(/\.([^.?#/\\]+)(?:[?#].*)?$/)
  if (!match) return ''
  return `.${match[1].toLowerCase()}`
}

function splitModuleSpecifier(specifier) {
  if (!specifier) {
    return { path: '', suffix: '' }
  }
  const str = String(specifier)
  const hashIndex = str.indexOf('#')
  const queryIndex = str.indexOf('?')
  let cutIndex = -1
  if (hashIndex >= 0 && queryIndex >= 0) {
    cutIndex = Math.min(hashIndex, queryIndex)
  } else if (hashIndex >= 0) {
    cutIndex = hashIndex
  } else if (queryIndex >= 0) {
    cutIndex = queryIndex
  }
  if (cutIndex < 0) {
    return { path: str, suffix: '' }
  }
  return {
    path: str.slice(0, cutIndex),
    suffix: str.slice(cutIndex)
  }
}

function isIdentifierChar(char) {
  if (!char) return false
  const code = char.charCodeAt(0)
  if (code >= 48 && code <= 57) return true // 0-9
  if (code >= 65 && code <= 90) return true // A-Z
  if (code >= 97 && code <= 122) return true // a-z
  return char === '_' || char === '$'
}

function skipLineComment(code, index) {
  let i = index
  while (i < code.length) {
    const ch = code[i]
    if (ch === '\n' || ch === '\r') {
      return i
    }
    i += 1
  }
  return i
}

function skipBlockComment(code, index) {
  let i = index + 2
  while (i < code.length) {
    if (code[i] === '*' && code[i + 1] === '/') {
      return i + 2
    }
    i += 1
  }
  return code.length
}

function skipWhitespace(code, index) {
  let i = index
  while (i < code.length) {
    const ch = code[i]
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f') {
      i += 1
      continue
    }
    break
  }
  return i
}

function skipWhitespaceAndComments(code, index) {
  let i = index
  while (i < code.length) {
    i = skipWhitespace(code, i)
    if (code[i] === '/' && code[i + 1] === '/') {
      i = skipLineComment(code, i + 2)
      continue
    }
    if (code[i] === '/' && code[i + 1] === '*') {
      i = skipBlockComment(code, i)
      continue
    }
    break
  }
  return i
}

function readStringLiteral(code, index) {
  const quote = code[index]
  if (quote !== '"' && quote !== "'" && quote !== '`') {
    return null
  }
  let i = index + 1
  while (i < code.length) {
    const ch = code[i]
    if (ch === '\\') {
      i += 2
      continue
    }
    if (ch === quote) {
      const value = code.slice(index + 1, i)
      return { start: index, end: i + 1, value, quote }
    }
    i += 1
  }
  return null
}

function isKeywordBoundary(code, index, keyword) {
  if (!keyword) return false
  const end = index + keyword.length
  if (code.slice(index, end) !== keyword) return false
  const before = index > 0 ? code[index - 1] : ''
  const after = end < code.length ? code[end] : ''
  if (isIdentifierChar(before)) return false
  if (isIdentifierChar(after)) return false
  return true
}

function scanModuleSpecifiers(code) {
  const entries = []
  if (!code) return entries
  const length = code.length
  let i = 0
  while (i < length) {
    const ch = code[i]
    if (ch === '"' || ch === "'" || ch === '`') {
      const literal = readStringLiteral(code, i)
      i = literal ? literal.end : i + 1
      continue
    }
    if (ch === '/' && code[i + 1] === '/') {
      i = skipLineComment(code, i + 2)
      continue
    }
    if (ch === '/' && code[i + 1] === '*') {
      i = skipBlockComment(code, i)
      continue
    }
    if (isKeywordBoundary(code, i, 'import') && code[i + 6] !== '.') {
      const info = readImportSpecifier(code, i)
      if (info) {
        entries.push(info)
        i = info.nextIndex
        continue
      }
    }
    if (isKeywordBoundary(code, i, 'export')) {
      const info = readExportSpecifier(code, i)
      if (info) {
        entries.push(info)
        i = info.nextIndex
        continue
      }
    }
    i += 1
  }
  return entries
}

function readImportSpecifier(code, index) {
  let i = index + 6
  i = skipWhitespaceAndComments(code, i)
  if (code[i] === '(') {
    i += 1
    i = skipWhitespaceAndComments(code, i)
    const literal = readStringLiteral(code, i)
    if (!literal) return null
    return { start: literal.start, end: literal.end, value: literal.value, quote: literal.quote, nextIndex: literal.end }
  }
  while (i < code.length) {
    const ch = code[i]
    if (ch === '"' || ch === "'" || ch === '`') {
      const literal = readStringLiteral(code, i)
      if (!literal) return null
      return { start: literal.start, end: literal.end, value: literal.value, quote: literal.quote, nextIndex: literal.end }
    }
    if (ch === '/' && code[i + 1] === '/') {
      i = skipLineComment(code, i + 2)
      continue
    }
    if (ch === '/' && code[i + 1] === '*') {
      i = skipBlockComment(code, i)
      continue
    }
    i += 1
  }
  return null
}

function readExportSpecifier(code, index) {
  let i = index + 6
  while (i < code.length) {
    const ch = code[i]
    if (ch === '"' || ch === "'" || ch === '`') {
      const literal = readStringLiteral(code, i)
      i = literal ? literal.end : i + 1
      continue
    }
    if (ch === '/' && code[i + 1] === '/') {
      i = skipLineComment(code, i + 2)
      continue
    }
    if (ch === '/' && code[i + 1] === '*') {
      i = skipBlockComment(code, i)
      continue
    }
    if (ch === ';' || ch === '\n' || ch === '\r') {
      break
    }
    if (isKeywordBoundary(code, i, 'from')) {
      i += 4
      i = skipWhitespaceAndComments(code, i)
      const literal = readStringLiteral(code, i)
      if (!literal) return null
      return { start: literal.start, end: literal.end, value: literal.value, quote: literal.quote, nextIndex: literal.end }
    }
    i += 1
  }
  return null
}

function applyReplacements(source, replacements) {
  if (!replacements || replacements.length === 0) return source
  const sorted = replacements.slice().sort((a, b) => a.start - b.start)
  let result = ''
  let lastIndex = 0
  for (const item of sorted) {
    result += source.slice(lastIndex, item.start)
    result += item.value
    lastIndex = item.end
  }
  result += source.slice(lastIndex)
  return result
}

class PackageModuleLoader {
  constructor(options = {}) {
    this.readText = options.readText
    this.hasFile = options.hasFile
    this.packageJsonCache = new Map()
    this.moduleCache = new Map()
    this.urlCache = new Map()
    this.objectUrls = new Set()
    this.building = new Set()
  }

  dispose() {
    this.objectUrls.forEach((url) => {
      try {
        URL.revokeObjectURL(url)
      } catch (_) {
        // ignore
      }
    })
    this.objectUrls.clear()
  }

  async importModule(entryPath) {
    const normalized = normalizePackagePath(entryPath)
    const url = await this._ensureModule(normalized)
    const module = await import(/* @vite-ignore */ `${url}#${Date.now()}`)
    return { module, url, urls: Array.from(this.objectUrls) }
  }

  resolveEntry(path) {
    return this._resolveModuleCandidate(path)
  }

  _isSupportedModule(path) {
    const ext = getFileExtension(path)
    if (!ext) return true
    if (JS_EXTENSIONS.includes(ext)) return true
    if (JSON_EXTENSIONS.includes(ext)) return true
    return false
  }

  _has(path) {
    if (!this.hasFile) return false
    return this.hasFile(normalizePackagePath(path))
  }

  async _readText(path) {
    if (!this.readText) return null
    return this.readText(normalizePackagePath(path))
  }

  _resolveRelative(fromPath, specifier) {
    const base = normalizePackagePath(fromPath)
    const { path, suffix } = splitModuleSpecifier(specifier)
    const target = normalizePackagePath(path.startsWith('/') ? path.slice(1) : path)
    const baseSegments = base.split('/')
    if (baseSegments.length) {
      baseSegments.pop()
    }
    const inputSegments = target.split('/')
    const stack = []
    for (const segment of baseSegments) {
      if (segment) stack.push(segment)
    }
    for (const segment of inputSegments) {
      if (!segment || segment === '.') continue
      if (segment === '..') {
        if (!stack.length) {
          throw new Error(`插件模块引用越界：${specifier}`)
        }
        stack.pop()
      } else {
        stack.push(segment)
      }
    }
    return { path: stack.join('/'), suffix }
  }

  async _resolveBare(specifier) {
    const { path, suffix } = splitModuleSpecifier(specifier)
    const normalized = normalizePackagePath(path)
    const base = normalized ? `node_modules/${normalized}` : ''
    if (!base) return null
    const candidate = this._resolveModuleCandidate(base)
    if (candidate) {
      return { path: candidate, suffix }
    }
    const manifestPath = `${base}/package.json`
    if (this._has(manifestPath)) {
      let manifest
      if (this.packageJsonCache.has(manifestPath)) {
        manifest = this.packageJsonCache.get(manifestPath)
      } else {
        try {
          const raw = await this._readText(manifestPath)
          manifest = raw ? JSON.parse(raw) : null
        } catch (error) {
          console.warn('[PluginManager] 无法解析插件包 package.json:', manifestPath, error)
          manifest = null
        }
        this.packageJsonCache.set(manifestPath, manifest)
      }
      if (manifest) {
        const candidates = []
        if (typeof manifest.module === 'string') candidates.push(manifest.module)
        if (typeof manifest.browser === 'string') candidates.push(manifest.browser)
        if (typeof manifest.main === 'string') candidates.push(manifest.main)
        for (const entry of candidates) {
          const resolved = this._resolveModuleCandidate(`${base}/${entry}`)
          if (resolved) {
            return { path: resolved, suffix }
          }
        }
      }
    }
    return null
  }

  _resolveModuleCandidate(requestPath) {
    const normalized = normalizePackagePath(requestPath)
    if (!normalized) return null
    if (this._has(normalized) && this._isSupportedModule(normalized)) {
      return normalized
    }
    const ext = getFileExtension(normalized)
    const candidates = []
    if (!ext) {
      for (const fallback of MODULE_FALLBACK_EXTENSIONS) {
        candidates.push(`${normalized}${fallback}`)
      }
      for (const indexFile of MODULE_INDEX_FILES) {
        candidates.push(`${normalized}/${indexFile}`)
      }
    } else if (ext === '.json' && !this._isSupportedModule(normalized)) {
      candidates.push(`${normalized}.js`)
    }
    for (const candidate of candidates) {
      const target = normalizePackagePath(candidate)
      if (this._has(target) && this._isSupportedModule(target)) {
        return target
      }
    }
    return null
  }

  async _ensureModule(path) {
    const normalized = normalizePackagePath(path)
    if (this.urlCache.has(normalized)) {
      return this.urlCache.get(normalized)
    }
    if (this.building.has(normalized)) {
      throw new Error(`检测到插件模块循环依赖：${normalized}`)
    }
    this.building.add(normalized)
    const source = await this._loadModuleSource(normalized)
    const replacements = await this._prepareReplacements(source, normalized)
    const code = applyReplacements(source.code, replacements)
    const blob = new Blob([code], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    this.urlCache.set(normalized, url)
    this.objectUrls.add(url)
    this.building.delete(normalized)
    return url
  }

  async _loadModuleSource(path) {
    const ext = getFileExtension(path)
    const raw = await this._readText(path)
    if (raw == null) {
      throw new Error(`无法读取插件文件：${path}`)
    }
    if (JSON_EXTENSIONS.includes(ext)) {
      const content = raw.trim()
      const jsonExport = content ? content : 'null'
      return { code: `export default ${jsonExport};`, type: 'json' }
    }
    if (ext && !JS_EXTENSIONS.includes(ext) && ext !== '.json') {
      throw new Error(`暂不支持的插件模块类型：${path}`)
    }
    return { code: raw, type: 'js' }
  }

  async _prepareReplacements(source, path) {
    if (source.type !== 'js') return []
    const specifiers = scanModuleSpecifiers(source.code)
    if (!specifiers.length) return []
    const replacements = []
    for (const item of specifiers) {
      if (!item || !item.value) continue
      let resolved
      const trimmed = item.value.trim()
      if (!trimmed) continue
      if (trimmed.startsWith('.') || trimmed.startsWith('/')) {
        resolved = this._resolveRelative(path, trimmed)
      } else {
        resolved = await this._resolveBare(trimmed)
      }
      if (!resolved) continue
      const moduleUrl = await this._ensureModule(resolved.path)
      const replacement = `'${moduleUrl}${resolved.suffix ?? ''}'`
      replacements.push({ start: item.start, end: item.end, value: replacement })
    }
    return replacements
  }
}

const textDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null

function isPromiseLike(value) {
  return value && typeof value.then === 'function'
}

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

function normalizePathString(path) {
  if (!path) return ''
  let normalized = String(path).replace(/\\+/g, '/').trim()
  if (!normalized) return ''
  if (normalized === '/') return '/'
  const driveMatch = normalized.match(/^([A-Za-z]:)(\/.*)?$/)
  if (driveMatch) {
    const drive = `${driveMatch[1]}/`
    const rest = driveMatch[2] ? driveMatch[2].replace(/^\/+/, '') : ''
    normalized = drive + rest
  }
  normalized = normalized.replace(/\/+/g, '/')
  if (/^[A-Za-z]:\/$/.test(normalized)) {
    return normalized
  }
  if (normalized.endsWith('/') && normalized.length > 1) {
    normalized = normalized.replace(/\/+$/, '')
  }
  return normalized
}

function normalizeComparablePath(path) {
  return normalizePathString(path)
}

function joinPathSegments(base, child) {
  const normalizedBase = normalizePathString(base)
  const normalizedChild = normalizePathString(child)
  if (!normalizedBase) return normalizedChild
  if (!normalizedChild) return normalizedBase
  if (normalizedBase === '/') {
    return `/${normalizedChild.replace(/^\/+/, '')}`
  }
  if (/^[A-Za-z]:\/$/.test(normalizedBase)) {
    return `${normalizedBase}${normalizedChild.replace(/^\/+/, '')}`
  }
  return `${normalizedBase.replace(/\/$/, '')}/${normalizedChild.replace(/^\/+/, '')}`.replace(/\/+/g, '/')
}

function extractDirectoryName(path) {
  const normalized = normalizePathString(path)
  if (!normalized) return ''
  const segments = normalized.split('/')
  return segments[segments.length - 1] || ''
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
    this.packageRoot = null
    this.packageRootPromise = null
    this._restorePackagesPromise = null
    this.getPackageRootDirectory().catch(() => {})
    this._restorePackagesPromise = this._restorePersistedPackages()
  }

  _getPluginBridge() {
    if (typeof window === 'undefined') return null
    const bridge = window.electronAPI?.plugins ?? null
    if (!bridge) return null
    if (typeof bridge !== 'object') return null
    return bridge
  }

  async _fetchPackageRoot(force = false) {
    if (!force && this.packageRoot) {
      return this.packageRoot
    }
    const bridge = this._getPluginBridge()
    if (!bridge?.getRoot) {
      return this.packageRoot ?? null
    }
    if (!force && this.packageRootPromise) {
      return this.packageRootPromise
    }
    const task = (async () => {
      try {
        const result = await bridge.getRoot()
        if (result?.directory) {
          this.packageRoot = result.directory
        }
      } catch (error) {
        console.warn('[PluginManager] 获取插件存储目录失败:', error)
      }
      const resolved = this.packageRoot ?? null
      this.packageRootPromise = null
      return resolved
    })()
    this.packageRootPromise = task
    return task
  }

  async getPackageRootDirectory(options = {}) {
    const { force = false } = options
    const root = await this._fetchPackageRoot(force)
    return root ?? null
  }

  _notePackageRoot(root) {
    if (!root) return
    const previous = normalizeComparablePath(this.packageRoot)
    const next = normalizeComparablePath(root)
    this.packageRoot = root
    if (next && next !== previous) {
      this._emitManagerEvent('manager:package-root-changed', { root })
    }
  }

  _emitManagerEvent(name, payload = {}) {
    try {
      const result = this.hooks.emit(name, payload, this.getContext())
      if (isPromiseLike(result)) {
        result.catch((error) => {
          console.warn('[PluginManager] Failed to dispatch manager event:', name, error)
        })
      }
    } catch (error) {
      console.warn('[PluginManager] Failed to notify manager event listeners:', name, error)
    }
  }

  _notifyPluginStateChanged(name, action = 'update') {
    const plugin = this.plugins.get(name) ?? null
    this._emitManagerEvent('manager:plugins-changed', {
      name,
      action,
      plugin
    })
  }

  async _resolvePackageDirectory(packageState = {}) {
    if (!packageState) return null
    if (packageState.directoryName) {
      const root = await this.getPackageRootDirectory()
      if (root) {
        return joinPathSegments(root, packageState.directoryName)
      }
    }
    return packageState.directory ?? null
  }

  async _getPluginPackageMeta(name) {
    const definition = this.moduleSources.get(name)
    const storedState = this.settingsStore?.getState(name) ?? null
    const storedPackage = storedState?.package ?? null
    let directoryName = storedPackage?.directoryName ?? definition?.meta?.packageDirName ?? null
    if (!directoryName) {
      const fallback = storedPackage?.directory ?? definition?.meta?.packageDir ?? null
      const derived = extractDirectoryName(fallback)
      if (derived) {
        directoryName = derived
        if (storedPackage) {
          const nextPackage = { ...storedPackage, directoryName }
          this.settingsStore?.setState(name, { package: nextPackage })
        }
      }
    }

    let directory = definition?.meta?.packageDir ?? null
    if (directoryName) {
      const root = await this.getPackageRootDirectory()
      if (root) {
        directory = joinPathSegments(root, directoryName)
      }
    }
    if (!directory && storedPackage?.directory) {
      directory = storedPackage.directory
    }

    if (definition?.meta) {
      definition.meta.packageDirName = directoryName ?? definition.meta.packageDirName ?? null
      if (directory) {
        definition.meta.packageDir = directory
      }
    }

    return { directory, directoryName, storedPackage }
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
      if (result?.root) {
        this._notePackageRoot(result.root)
      }
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
    const storedPackage = storedState?.package ?? null
    const experimentalAck = storedState?.experimentalAck === true || plugin.experimentalAck === true
    const packageDirName = meta?.packageDirName
      ?? storedPackage?.directoryName
      ?? extractDirectoryName(meta?.packageDir ?? storedPackage?.directory ?? '')
    const packageUrlList = Array.isArray(meta?.urls)
      ? meta.urls.filter(Boolean)
      : meta?.url
        ? [meta.url]
        : []
    const packageUrlSet = packageUrlList.length ? new Set(packageUrlList) : null

    this.moduleSources.set(name, {
      plugin,
      source,
      meta: {
        origin,
        manifest,
        files: meta?.files ?? null,
        url: meta?.url ?? null,
        urls: packageUrlSet,
        packageDir: meta?.packageDir ?? storedPackage?.directory ?? null,
        packageDirName: packageDirName ?? null,
        packageEntry: meta?.packageEntry ?? storedPackage?.entry ?? null
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
    this._notifyPluginStateChanged(name, 'register')
    if (this.settingsStore) {
      this.settingsStore.setState(name, {
        enabled,
        removed: false,
        experimentalAck
      })
    }
    if (origin === 'package' && packageUrlSet) {
      this.packageUrls.set(name, packageUrlSet)
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

    const { directory } = await this._getPluginPackageMeta(name)

    if (directory) {
      const encoding = options.type === 'json' ? 'text' : options.type === 'base64' || options.type === 'arrayBuffer' ? 'base64' : 'text'
      const payload = await this._readPackageFileFromDisk(directory, normalized, { encoding })
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
      this._notifyPluginStateChanged(name, 'enable')
      return
    }
    this.settingsStore?.setState(name, { enabled: true, removed: false })
    this._notifyPluginStateChanged(name, 'enable')
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
      this._notifyPluginStateChanged(name, 'disable')
      return
    }
    this.settingsStore?.setState(name, { enabled: false, removed: false })
    this._notifyPluginStateChanged(name, 'disable')
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
        const packageMeta = await this._getPluginPackageMeta(name)
        const packageDir = packageMeta.directory ?? stored?.package?.directory ?? null
        this.settingsStore.deleteState(name)
        let urlSet = definition?.meta?.urls
        if (!urlSet || !(urlSet instanceof Set)) {
          const fallback = this.packageUrls.get(name)
          if (fallback && fallback instanceof Set) {
            urlSet = fallback
          }
        }
        if (urlSet && urlSet instanceof Set) {
          urlSet.forEach((url) => {
            try {
              URL.revokeObjectURL(url)
            } catch (_) {
              // ignore
            }
          })
          this.packageUrls.delete(name)
        } else if (definition?.meta?.url) {
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
    this._notifyPluginStateChanged(name, 'remove')
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

    const normalizedFiles = new Map()
    files.forEach((value, key) => {
      normalizedFiles.set(normalizePackagePath(key), value)
    })

    const loader = new PackageModuleLoader({
      hasFile: (path) => normalizedFiles.has(path),
      readText: async (path) => {
        const file = normalizedFiles.get(path)
        if (!file) return null
        return readText(file)
      }
    })

    const mainPath = normalizePackagePath(manifest.main ?? PACKAGE_DEFAULT_MAIN)
    let resolvedEntry = mainPath
    if (!normalizedFiles.has(mainPath)) {
      const candidate = loader.resolveEntry(mainPath)
      if (candidate) {
        resolvedEntry = candidate
      } else {
        throw new Error(`插件包缺少入口文件 ${mainPath}`)
      }
    }

    const { module: pluginModule, urls: moduleUrls, url: entryUrl } = await loader.importModule(resolvedEntry)
    let pluginDefinition = pluginModule?.default ?? pluginModule?.plugin ?? pluginModule
    if (!pluginDefinition || typeof pluginDefinition !== 'object') {
      moduleUrls.forEach((url) => {
        try {
          URL.revokeObjectURL(url)
        } catch (_) {
          // ignore
        }
      })
      throw new Error('入口文件未导出可用的插件对象')
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

    return {
      manifest,
      plugin: normalizedPlugin,
      url: entryUrl,
      urls: moduleUrls,
      files: normalizedFiles,
      entry: resolvedEntry,
      fileList: Array.from(normalizedFiles.keys())
    }
  }

  async _loadPackageFromDirectory(directory, manifest = {}, entryPath = PACKAGE_DEFAULT_MAIN, fileList = []) {
    const normalizedEntry = normalizePackagePath(entryPath || PACKAGE_DEFAULT_MAIN)
    let knownFiles = new Set(fileList.map((item) => normalizePackagePath(item)))

    if (!knownFiles.size || !knownFiles.has(normalizedEntry)) {
      const listed = await this._listPackageFilesFromDisk(directory)
      if (Array.isArray(listed) && listed.length) {
        knownFiles = new Set(listed.map((item) => normalizePackagePath(item)))
      }
    }

    const loader = new PackageModuleLoader({
      hasFile: (path) => knownFiles.size === 0 || knownFiles.has(path),
      readText: async (path) => {
        return this._readPackageFileFromDisk(directory, path, { encoding: 'text' })
      }
    })

    let resolvedEntry = normalizedEntry
    if (!knownFiles.has(normalizedEntry)) {
      const candidate = loader.resolveEntry(normalizedEntry)
      if (candidate) {
        resolvedEntry = candidate
        if (!knownFiles.has(candidate) && knownFiles.size) {
          knownFiles.add(candidate)
        }
      } else {
        throw new Error(`无法读取插件入口文件 ${normalizedEntry}`)
      }
    }

    const { module: pluginModule, urls: moduleUrls, url: entryUrl } = await loader.importModule(resolvedEntry)
    let pluginDefinition = pluginModule?.default ?? pluginModule?.plugin ?? pluginModule
    if (!pluginDefinition || typeof pluginDefinition !== 'object') {
      moduleUrls.forEach((url) => {
        try {
          URL.revokeObjectURL(url)
        } catch (_) {
          // ignore
        }
      })
      throw new Error('入口文件未导出可用的插件对象')
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

    const files = new Set(knownFiles)

    return {
      manifest,
      plugin: normalizedPlugin,
      url: entryUrl,
      urls: moduleUrls,
      files,
      entry: resolvedEntry
    }
  }

  async _registerPackageFromState(name, meta) {
    const packageState = meta?.package
    if (!packageState) return
    if (this.plugins.has(name)) return
    const normalizedState = { ...packageState }
    if (!normalizedState.directoryName) {
      const derived = extractDirectoryName(normalizedState.directory)
      if (derived) {
        normalizedState.directoryName = derived
        this.settingsStore?.setState(name, { package: { ...normalizedState } })
      }
    }
    let resolvedDirectory = null
    if (normalizedState.directory || normalizedState.directoryName) {
      resolvedDirectory = await this._resolvePackageDirectory(normalizedState)
    }
    if (resolvedDirectory) {
      try {
        const manifest = normalizedState.manifest ?? {}
        const entryPath = normalizedState.entry ?? manifest.main ?? PACKAGE_DEFAULT_MAIN
        const fileList = Array.isArray(normalizedState.files)
          ? normalizedState.files
          : await this._listPackageFilesFromDisk(resolvedDirectory)
        const { plugin, url, urls, files } = await this._loadPackageFromDirectory(
          resolvedDirectory,
          manifest,
          entryPath,
          fileList
        )
        this.registerPlugin(plugin, `package:${name}`, {
          origin: 'package',
          manifest,
          files,
          url,
          urls,
          displayName: manifest?.displayName,
          description: manifest?.description,
          version: manifest?.version,
          packageDir: resolvedDirectory,
          packageDirName: normalizedState.directoryName ?? extractDirectoryName(resolvedDirectory),
          packageEntry: entryPath
        })
        return
      } catch (error) {
        console.error(`[PluginManager] 无法通过目录恢复插件 "${name}":`, error)
        if (!normalizedState.archive) {
          return
        }
      }
    }

    if (!normalizedState.archive) return
    try {
      const buffer = base64ToArrayBuffer(normalizedState.archive)
      const { manifest, plugin, url, urls, files, entry } = await this._loadPackageFromBuffer(buffer, name)
      this.registerPlugin(plugin, `package:${name}`, {
        origin: 'package',
        manifest,
        files,
        url,
        urls,
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
      await this.getPackageRootDirectory().catch(() => null)
      const state = this.settingsStore?.list?.() ?? {}
      const entries = Object.entries(state)
      for (const [name, meta] of entries) {
        const packageState = meta?.package
        if (!packageState) continue
        if (!packageState.archive && !packageState.directory && !packageState.directoryName) continue
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
    const { manifest, plugin, url, urls, files, entry, fileList } = await this._loadPackageFromBuffer(buffer, nameHint)
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
    }
    if (diskSnapshot?.directoryName) {
      packageState.directoryName = diskSnapshot.directoryName
    }
    if (!packageState.directoryName && packageState.directory) {
      packageState.directoryName = extractDirectoryName(packageState.directory)
    }
    if (diskSnapshot?.directory == null) {
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
      urls,
      displayName: manifest?.displayName,
      description: manifest?.description,
      version: manifest?.version,
      packageDir: diskSnapshot?.directory ?? null,
      packageDirName: diskSnapshot?.directoryName ?? packageState.directoryName ?? null,
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

  async setPackageRootDirectory(directory) {
    if (!directory) {
      throw new Error('请选择有效的目录')
    }
    const bridge = this._getPluginBridge()
    if (!bridge?.setRoot) {
      throw new Error('当前环境不支持自定义插件目录')
    }
    let result
    try {
      result = await bridge.setRoot({ directory })
    } catch (error) {
      console.error('[PluginManager] 设置插件存储目录失败:', error)
      throw error
    }
    const root = result?.directory ?? directory
    this._notePackageRoot(root)
    const moved = Array.isArray(result?.moved) ? result.moved : []
    const movedMap = new Map()
    moved.forEach((item) => {
      if (item?.from && item?.to) {
        movedMap.set(normalizeComparablePath(item.from), item.to)
      }
    })

    if (this.settingsStore) {
      const state = this.settingsStore.list()
      Object.entries(state).forEach(([name, meta]) => {
        const pkg = meta?.package
        if (!pkg) return
        const nextPackage = { ...pkg }
        if (!nextPackage.directoryName) {
          const derived = extractDirectoryName(nextPackage.directory)
          if (derived) {
            nextPackage.directoryName = derived
          }
        }
        if (nextPackage.directoryName && root) {
          nextPackage.directory = joinPathSegments(root, nextPackage.directoryName)
        } else if (nextPackage.directory) {
          const migrated = movedMap.get(normalizeComparablePath(nextPackage.directory))
          if (migrated) {
            nextPackage.directory = migrated
            nextPackage.directoryName = extractDirectoryName(migrated) || nextPackage.directoryName
          }
        }
        this.settingsStore.setState(name, { package: nextPackage })
      })
    }

    this.moduleSources.forEach((definition, pluginName) => {
      if (definition.meta?.origin !== 'package') return
      const stored = this.settingsStore?.getState(pluginName)
      const pkg = stored?.package ?? {}
      const directoryName =
        pkg.directoryName ??
        definition.meta?.packageDirName ??
        extractDirectoryName(pkg.directory ?? definition.meta?.packageDir ?? '')
      if (definition.meta) {
        definition.meta.packageDirName = directoryName ?? null
        if (root && directoryName) {
          definition.meta.packageDir = joinPathSegments(root, directoryName)
        } else if (pkg.directory) {
          definition.meta.packageDir = pkg.directory
        }
      }
    })

    await this._restorePersistedPackages({ force: true })
    const state = this.settingsStore?.list?.() ?? {}
    for (const [name, meta] of Object.entries(state)) {
      if (meta.removed) continue
      if (meta.enabled) {
        await this.enablePlugin(name)
      }
    }

    return root
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
