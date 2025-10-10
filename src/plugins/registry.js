const builtinRegistry = Object.freeze([
    {
        name: 'hello-world',
        description: '示例插件，展示 Hydrogen 插件系统的基础能力。',
        version: '1.0.0',
        enabled: false,
        entry: './samples/helloWorldPlugin.js',
        builtin: true,
    },
]);

const PROTOCOL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//;

const resolveModuleSpecifier = (value) => {
    if (!value || typeof value !== 'string') return value;

    const trimmed = value.trim();
    if (!trimmed) return trimmed;

    if (PROTOCOL_PATTERN.test(trimmed)) {
        return trimmed;
    }

    const normalized = trimmed.replace(/\\/g, '/');

    const isWindowsAbsolute = /^[a-zA-Z]:\//.test(normalized);
    const isAbsolute = isWindowsAbsolute || normalized.startsWith('/');

    if (isAbsolute) {
        const absolutePath = isWindowsAbsolute ? normalized : normalized.startsWith('/') ? normalized : `/${normalized}`;
        const fileUrl = isWindowsAbsolute ? `file:///${absolutePath}` : `file://${absolutePath}`;

        try {
            return new URL(fileUrl).href;
        } catch (error) {
            console.warn('[PluginRegistry] Failed to normalise absolute module path, falling back to encoded URI.', error);
            return encodeURI(fileUrl);
        }
    }

    try {
        return new URL(normalized, import.meta.url).href;
    } catch (error) {
        console.warn('[PluginRegistry] Failed to resolve relative module path, returning raw value.', error);
        return normalized;
    }
};

const toRawDescriptor = (descriptor = {}, { forceBuiltin = false } = {}) => {
    if (!descriptor || typeof descriptor !== 'object') return null;

    const name = typeof descriptor.name === 'string' ? descriptor.name.trim() : '';
    if (!name) return null;

    const raw = {
        name,
        enabled: descriptor.enabled !== false,
    };

    if (typeof descriptor.description === 'string') {
        raw.description = descriptor.description;
    }

    if (descriptor.version !== undefined && descriptor.version !== null) {
        raw.version = String(descriptor.version);
    }

    if (descriptor.entry) {
        raw.entry = String(descriptor.entry);
    }

    if (descriptor.path) {
        raw.path = String(descriptor.path);
    }

    if (descriptor.sourcePath) {
        raw.sourcePath = String(descriptor.sourcePath);
    }

    if (descriptor.options && typeof descriptor.options === 'object') {
        raw.options = { ...descriptor.options };
    }

    if (descriptor.builtin === true || forceBuiltin) {
        raw.builtin = true;
    }

    return raw;
};

const mergeRegistries = (preferred = [], fallback = []) => {
    const map = new Map();

    const append = (item, { builtin = false } = {}) => {
        const raw = toRawDescriptor(item, { forceBuiltin: builtin });
        if (!raw) return;

        const existing = map.get(raw.name);
        if (existing) {
            map.set(raw.name, {
                ...existing,
                ...raw,
                builtin: existing.builtin || raw.builtin || builtin,
            });
        } else {
            map.set(raw.name, raw);
        }
    };

    fallback.forEach(item => append(item, { builtin: true }));
    preferred.forEach(item => append(item));

    return Array.from(map.values()).map(descriptor => ({
        ...descriptor,
        enabled: descriptor.enabled !== false,
    }));
};

const createLoader = (descriptor) => {
    const candidates = [descriptor.loader, descriptor.import, descriptor.load, descriptor.module];
    for (const candidate of candidates) {
        if (typeof candidate === 'function') {
            return candidate;
        }
    }

    if (descriptor.entry && typeof descriptor.entry === 'string') {
        const entryPath = resolveModuleSpecifier(descriptor.entry);
        return () => import(/* @vite-ignore */ entryPath);
    }

    if (descriptor.path && typeof descriptor.path === 'string') {
        const modulePath = resolveModuleSpecifier(descriptor.path);
        return () => import(/* @vite-ignore */ modulePath);
    }

    return null;
};

const normalizePluginDescriptor = (descriptor) => {
    const normalized = {
        ...descriptor,
        enabled: descriptor.enabled !== false,
    };

    const loader = createLoader(normalized);
    if (!loader) {
        throw new Error(`插件 "${normalized.name}" 缺少可执行的加载入口。`);
    }

    normalized.loader = loader;
    return normalized;
};

const stripRuntimeFields = (descriptor) => {
    const {
        loader,
        import: importFn,
        load,
        module,
        instance,
        cleanups,
        context,
        ...rest
    } = descriptor;

    return toRawDescriptor(rest, { forceBuiltin: rest.builtin === true });
};

const readStoredRegistry = async () => {
    if (typeof window === 'undefined' || !window.pluginApi?.getRegistry) return [];

    try {
        const stored = await window.pluginApi.getRegistry();
        return Array.isArray(stored) ? stored : [];
    } catch (error) {
        console.warn('[PluginRegistry] Failed to read stored registry:', error);
        return [];
    }
};

const writeStoredRegistry = async (registry) => {
    if (typeof window === 'undefined' || !window.pluginApi?.saveRegistry) return;

    try {
        await window.pluginApi.saveRegistry(registry.map(stripRuntimeFields).filter(Boolean));
    } catch (error) {
        console.warn('[PluginRegistry] Failed to persist registry:', error);
    }
};

const loadRawPluginRegistry = async () => {
    const stored = await readStoredRegistry();
    const merged = mergeRegistries(stored, builtinRegistry);

    if (typeof window !== 'undefined' && window.pluginApi?.saveRegistry) {
        await writeStoredRegistry(merged);
    }

    return merged;
};

const loadPluginRegistry = async () => {
    const raw = await loadRawPluginRegistry();
    return raw.map(item => normalizePluginDescriptor(item));
};

const saveRawPluginRegistry = async (registry = []) => {
    const merged = mergeRegistries(registry, builtinRegistry);
    if (typeof window !== 'undefined' && window.pluginApi?.saveRegistry) {
        await writeStoredRegistry(merged);
    }
    return merged;
};

export {
    builtinRegistry,
    loadRawPluginRegistry,
    loadPluginRegistry,
    normalizePluginDescriptor,
    saveRawPluginRegistry,
};

export default loadPluginRegistry;
