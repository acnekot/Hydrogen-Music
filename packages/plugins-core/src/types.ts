import type { EventEmitter } from 'node:events';

export type PluginPermission =
  | 'filesystem:read'
  | 'filesystem:write'
  | 'network:request'
  | 'ui:inject'
  | 'ipc:invoke'
  | (string & {});

export interface PluginDependency {
  name: string;
  version?: string;
  optional?: boolean;
}

export interface PluginDescriptor {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  entry: string;
  main?: string;
  dependencies?: PluginDependency[];
  permissions?: PluginPermission[];
  minimumCore?: string;
  ui?: PluginUiContribution;
}

export interface PluginUiContribution {
  components?: Array<{
    id: string;
    mountPoint: string;
    component: string;
  }>;
  piniaStores?: Array<{
    id: string;
    module: string;
  }>;
  menus?: Array<{
    id: string;
    label: string;
    role?: string;
    parentId?: string;
  }>;
}

export interface RendererBridge {
  registerComponents(components: PluginUiContribution['components'], pluginId: string): Promise<void> | void;
  registerPiniaStores(stores: PluginUiContribution['piniaStores'], pluginId: string): Promise<void> | void;
  registerMenus(menus: PluginUiContribution['menus'], pluginId: string): Promise<void> | void;
  unregisterPlugin(pluginId: string): Promise<void> | void;
}

export interface PluginLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string | Error, meta?: Record<string, unknown>): void;
  debug?(message: string, meta?: Record<string, unknown>): void;
}

export interface PluginContext {
  appId: string;
  descriptor: PluginDescriptor;
  logger: PluginLogger;
  api: PluginApiClient;
  events: EventEmitter;
  permissions: ReadonlySet<PluginPermission>;
  ui: PluginUiController;
}

export interface PluginLifecycle {
  activate?(context: PluginContext): Promise<void> | void;
  deactivate?(): Promise<void> | void;
  dispose?(): Promise<void> | void;
  onMessage?(message: unknown): Promise<unknown> | unknown;
}

export interface PluginModule {
  default?: PluginLifecycle | ((context: PluginContext) => PluginLifecycle | void | Promise<PluginLifecycle | void>);
  activate?(context: PluginContext): Promise<void> | void;
  deactivate?(): Promise<void> | void;
  dispose?(): Promise<void> | void;
}

export interface PluginRecord {
  descriptor: PluginDescriptor;
  module?: PluginLifecycle;
  status: PluginStatus;
  sandbox?: PluginSandbox;
  error?: Error;
}

export type PluginStatus =
  | 'registered'
  | 'pending'
  | 'activating'
  | 'active'
  | 'deactivating'
  | 'inactive'
  | 'failed'
  | 'disposed';

export interface PluginSandbox {
  runModule(filePath: string): Promise<unknown>;
  dispose(): Promise<void> | void;
}

export interface PluginApiDefinition<TPayload = unknown, TResult = unknown> {
  id: string;
  handler: (payload: TPayload, context: PluginContext) => Promise<TResult> | TResult;
  description?: string;
  permission?: PluginPermission;
}

export interface PluginApiClient {
  invoke<TPayload, TResult>(id: string, payload: TPayload): Promise<TResult>;
}

export interface PluginApiInvoker {
  invoke<TPayload, TResult>(id: string, payload: TPayload, context: PluginContext): Promise<TResult>;
}

export interface PluginManagerOptions {
  appId: string;
  pluginsDir?: string;
  extraSearchPaths?: string[];
  apiInvoker: PluginApiInvoker;
  rendererBridge: RendererBridge;
  logger?: PluginLogger;
  eventBus?: EventEmitter;
  permissionResolver?: PermissionResolver;
  hotReload?: boolean;
}

export interface PermissionResolver {
  isPermissionGranted(plugin: PluginDescriptor, permission: PluginPermission): Promise<boolean> | boolean;
}

export interface PluginSource {
  basePath: string;
  descriptor: PluginDescriptor;
  entryFile: string;
  packageJson: Record<string, unknown>;
}

export interface PluginScanner {
  scan(): Promise<PluginSource[]>;
}

export interface PluginUiController {
  register(contribution: PluginUiContribution): Promise<void>;
  unregister(): Promise<void>;
}

export interface PluginHotReloadController {
  start(): void;
  stop(): void;
}

export interface PluginScanResult {
  sources: PluginSource[];
  errors: Array<{ source?: string; error: Error }>;
}

export interface PluginHooks {
  beforeActivate?(plugin: PluginRecord): Promise<void> | void;
  afterActivate?(plugin: PluginRecord): Promise<void> | void;
  beforeDeactivate?(plugin: PluginRecord): Promise<void> | void;
  afterDeactivate?(plugin: PluginRecord): Promise<void> | void;
}

export interface PluginManagerHooks extends PluginHooks {
  onRegister?(plugin: PluginRecord): Promise<void> | void;
  onDispose?(plugin: PluginRecord): Promise<void> | void;
}

export interface PluginManagerRuntimeOptions {
  hooks?: PluginManagerHooks;
}

export interface PluginRuntimeConfig {
  source: PluginSource;
  sandbox: PluginSandbox;
}

export interface PluginHotReloadOptions {
  watchPaths: string[];
  onInvalidate: (pluginId: string) => Promise<void> | void;
  logger?: PluginLogger;
}

export interface PluginInstaller {
  installFromNpm(packageName: string, version?: string): Promise<PluginSource>;
  installFromZip(zipFilePath: string): Promise<PluginSource>;
}

export type PluginSearchResult = PluginSource;

export interface PluginModuleFactory {
  create(plugin: PluginSource, sandbox: PluginSandbox): Promise<PluginModule>;
}

export type PluginFactoryResult = PluginLifecycle | void;

export type PluginFactory = (context: PluginContext) => PluginFactoryResult | Promise<PluginFactoryResult>;

export interface PluginRuntime {
  record: PluginRecord;
  context: PluginContext;
}

export interface PluginScanOptions {
  recursive?: boolean;
  include?: string[];
  exclude?: string[];
}
