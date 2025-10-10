import { EventEmitter } from 'node:events';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { DefaultPluginApiClient } from './api.js';
import { FilesystemHotReloadController } from './hotReload.js';
import { NodeVmSandbox } from './sandbox.js';
import { DefaultPluginUiController } from './ui.js';
import type {
  PermissionResolver,
  PluginApiInvoker,
  PluginContext,
  PluginDescriptor,
  PluginLifecycle,
  PluginLogger,
  PluginManagerHooks,
  PluginManagerOptions,
  PluginModule,
  PluginRecord,
  PluginSource,
  PluginUiContribution,
  PluginHotReloadController,
  RendererBridge,
} from './types.js';
import { topoSort } from './utils.js';

export interface FilesystemPluginScannerOptions {
  rootDir?: string;
  extraPaths?: string[];
}

export class FilesystemPluginScanner {
  constructor(private readonly options: FilesystemPluginScannerOptions = {}) {}

  async scan(): Promise<PluginSource[]> {
    const rootDir = this.options.rootDir ?? path.join(os.homedir(), '.hydrogen', 'plugins');
    const searchPaths = [rootDir, ...(this.options.extraPaths ?? [])];
    const sources: PluginSource[] = [];

    for (const searchPath of searchPaths) {
      try {
        const stat = await fs.stat(searchPath);
        if (!stat.isDirectory()) continue;
      } catch {
        continue;
      }

      const entries = await fs.readdir(searchPath);
      for (const entry of entries) {
        const basePath = path.join(searchPath, entry);
        try {
          const source = await this.parse(basePath);
          if (source) sources.push(source);
        } catch (error) {
          console.warn(`[plugins-core] Failed to parse plugin at ${basePath}:`, error);
        }
      }
    }

    return sources;
  }

  async parse(basePath: string): Promise<PluginSource | undefined> {
    const pkgPath = path.join(basePath, 'package.json');
    try {
      const raw = await fs.readFile(pkgPath, 'utf8');
      const pkg = JSON.parse(raw) as Record<string, unknown> & { hydrogenPlugin?: Record<string, unknown> };
      const descriptor = this.parseDescriptor(pkg, basePath);
      if (!descriptor) return undefined;
      const entryFile = path.resolve(basePath, descriptor.entry);
      return {
        basePath,
        descriptor,
        entryFile,
        packageJson: pkg,
      };
    } catch (error) {
      console.warn(`[plugins-core] skip ${basePath}:`, error);
      return undefined;
    }
  }

  private parseDescriptor(pkg: Record<string, unknown> & { hydrogenPlugin?: Record<string, unknown> }, basePath: string): PluginDescriptor | undefined {
    const metadata = pkg.hydrogenPlugin ?? pkg['hydrogen-plugin'];
    if (!metadata || typeof metadata !== 'object') {
      return undefined;
    }

    const entry = typeof metadata['entry'] === 'string' ? (metadata['entry'] as string) : pkg['main'];
    if (!entry) {
      throw new Error(`Plugin at ${basePath} missing hydrogenPlugin.entry or main field.`);
    }

    return {
      id: String(metadata['id'] ?? pkg['name'] ?? path.basename(basePath)),
      name: String(pkg['displayName'] ?? pkg['name'] ?? metadata['name'] ?? path.basename(basePath)),
      version: String(pkg['version'] ?? '0.0.0'),
      description: typeof pkg['description'] === 'string' ? pkg['description'] : undefined,
      author: typeof pkg['author'] === 'string' ? pkg['author'] : undefined,
      entry: entry,
      main: typeof pkg['main'] === 'string' ? pkg['main'] : undefined,
      dependencies: Array.isArray(metadata['dependencies']) ? (metadata['dependencies'] as PluginDescriptor['dependencies']) : undefined,
      permissions: Array.isArray(metadata['permissions']) ? (metadata['permissions'] as PluginDescriptor['permissions']) : undefined,
      minimumCore: typeof metadata['minimumCore'] === 'string' ? (metadata['minimumCore'] as string) : undefined,
      ui: typeof metadata['ui'] === 'object' && metadata['ui'] ? (metadata['ui'] as PluginUiContribution) : undefined,
    };
  }
}

export class PluginManager {
  private readonly logger: PluginLogger;
  private readonly permissionResolver: PermissionResolver;
  private readonly rendererBridge: RendererBridge;
  private readonly eventBus: EventEmitter;
  private readonly apiInvoker: PluginApiInvoker;
  private readonly records = new Map<string, PluginRecord>();
  private readonly contexts = new Map<string, PluginContext>();
  private readonly sources = new Map<string, PluginSource>();
  private readonly hooks: PluginManagerHooks;
  private readonly scanner: FilesystemPluginScanner;
  private readonly hotReloadController?: PluginHotReloadController;

  constructor(private readonly options: PluginManagerOptions & { hooks?: PluginManagerHooks }) {
    this.logger = options.logger ?? console;
    this.permissionResolver = options.permissionResolver ?? {
      isPermissionGranted: () => true,
    };
    this.rendererBridge = options.rendererBridge;
    this.eventBus = options.eventBus ?? new EventEmitter();
    this.apiInvoker = options.apiInvoker;
    this.hooks = options.hooks ?? {};
    this.scanner = new FilesystemPluginScanner({
      rootDir: options.pluginsDir,
      extraPaths: options.extraSearchPaths,
    });

    if (options.hotReload) {
      const watchPaths = Array.from(
        new Set([
          options.pluginsDir ?? path.join(os.homedir(), '.hydrogen', 'plugins'),
          ...(options.extraSearchPaths ?? []),
        ])
      );
      this.hotReloadController = new FilesystemHotReloadController({
        watchPaths,
        onInvalidate: async (pluginId) => {
          if (!pluginId) return;
          if (!this.records.has(pluginId)) return;
          await this.reload(pluginId);
        },
        logger: this.logger,
      });
    }
  }

  get registeredPlugins(): PluginRecord[] {
    return Array.from(this.records.values());
  }

  async scanAndLoad(): Promise<void> {
    const sources = await this.scanner.scan();
    await this.loadSources(sources);
    this.hotReloadController?.start();
  }

  async loadSources(sources: PluginSource[]): Promise<void> {
    const order = topoSort(
      sources.map((source) => ({
        id: source.descriptor.id,
        dependencies: source.descriptor.dependencies?.map((d) => d.name) ?? [],
      }))
    );

    for (const pluginId of order) {
      const source = sources.find((s) => s.descriptor.id === pluginId);
      if (!source) continue;
      await this.registerAndActivate(source);
    }
  }

  async registerAndActivate(source: PluginSource): Promise<void> {
    const descriptor = source.descriptor;
    const existing = this.records.get(descriptor.id);
    if (existing) {
      await this.deactivate(descriptor.id);
      await this.dispose(descriptor.id);
    }

    for (const dependency of descriptor.dependencies ?? []) {
      const depRecord = this.records.get(dependency.name);
      if (!depRecord || depRecord.status !== 'active') {
        throw new Error(`Plugin ${descriptor.id} requires dependency ${dependency.name} to be active.`);
      }
    }

    const sandbox = new NodeVmSandbox();
    const record: PluginRecord = {
      descriptor,
      status: 'registered',
      sandbox,
    };
    this.records.set(descriptor.id, record);
    this.sources.set(descriptor.id, source);
    await this.hooks.onRegister?.(record);

    const context = await this.createContext(record);
    this.contexts.set(descriptor.id, context);

    try {
      const module = (await sandbox.runModule(source.entryFile)) as PluginModule;
      const lifecycle = await this.resolveLifecycle(module, context);
      record.module = lifecycle ?? undefined;
      record.status = 'pending';
      await this.activate(descriptor.id);
    } catch (error) {
      record.status = 'failed';
      record.error = error as Error;
      sandbox.dispose();
      this.logger.error(`Failed to load plugin ${descriptor.id}`, { error });
      throw error;
    }
  }

  async activate(pluginId: string): Promise<void> {
    const record = this.records.get(pluginId);
    if (!record) throw new Error(`Plugin ${pluginId} not registered`);
    if (record.status === 'active' || record.status === 'activating') return;
    if (!record.module?.activate) {
      record.status = 'active';
      return;
    }

    const context = this.contexts.get(pluginId);
    if (!context) throw new Error(`Missing context for plugin ${pluginId}`);

    await this.verifyPermissions(context);

    record.status = 'activating';
    await this.hooks.beforeActivate?.(record);
    await record.module.activate(context);
    record.status = 'active';
    await this.hooks.afterActivate?.(record);
  }

  async deactivate(pluginId: string): Promise<void> {
    const record = this.records.get(pluginId);
    if (!record) return;
    if (record.status !== 'active') return;
    record.status = 'deactivating';
    await this.hooks.beforeDeactivate?.(record);
    await record.module?.deactivate?.();
    await this.hooks.afterDeactivate?.(record);
    record.status = 'inactive';
  }

  async dispose(pluginId: string): Promise<void> {
    const record = this.records.get(pluginId);
    if (!record) return;
    try {
      await record.module?.dispose?.();
    } finally {
      record.sandbox?.dispose();
      this.records.delete(pluginId);
      this.contexts.delete(pluginId);
      this.sources.delete(pluginId);
      await this.hooks.onDispose?.(record);
    }
  }

  async reload(pluginId: string): Promise<void> {
    const source = this.sources.get(pluginId);
    if (!source) throw new Error(`Plugin ${pluginId} not registered`);
    await this.deactivate(pluginId);
    const fresh = await this.scanner.parse(source.basePath);
    if (!fresh) {
      throw new Error(`Unable to reload plugin ${pluginId}: missing source`);
    }
    await this.registerAndActivate(fresh);
  }

  getPluginContext(pluginId: string): PluginContext | undefined {
    return this.contexts.get(pluginId);
  }

  private async createContext(record: PluginRecord): Promise<PluginContext> {
    const descriptor = record.descriptor;
    const permissions = new Set(descriptor.permissions ?? []);
    const context: PluginContext = {
      appId: this.options.appId,
      descriptor,
      logger: this.logger,
      api: undefined!,
      events: this.eventBus,
      permissions,
      ui: new DefaultPluginUiController(this.rendererBridge, descriptor.id),
    };
    context.api = new DefaultPluginApiClient(this.apiInvoker, context);
    return context;
  }

  private async resolveLifecycle(module: PluginModule, context: PluginContext): Promise<PluginLifecycle | undefined> {
    if (!module) return undefined;
    if (typeof module === 'function') {
      const lifecycle = await module(context);
      return this.normalizeLifecycle(lifecycle);
    }

    if (typeof module.default === 'function') {
      const lifecycle = await module.default(context);
      return this.normalizeLifecycle(lifecycle);
    }

    const lifecycle = module.default ?? module;
    return this.normalizeLifecycle(lifecycle as PluginLifecycle);
  }

  private normalizeLifecycle(value: PluginLifecycle | void | undefined): PluginLifecycle | undefined {
    if (!value) return undefined;
    return value;
  }

  private async verifyPermissions(context: PluginContext): Promise<void> {
    const descriptor = context.descriptor;
    const required = descriptor.permissions ?? [];
    for (const permission of required) {
      const granted = await this.permissionResolver.isPermissionGranted(descriptor, permission);
      if (!granted) {
        throw new Error(`Plugin ${descriptor.id} requires permission ${permission} which is not granted.`);
      }
    }
  }
}
