import { EventEmitter } from 'node:events';

import type {
  PluginApiClient,
  PluginApiDefinition,
  PluginApiInvoker,
  PluginContext,
  PluginPermission,
  PluginDescriptor,
} from './types.js';

export class PluginApiRegistry implements PluginApiInvoker {
  private readonly definitions = new Map<string, PluginApiDefinition>();
  private readonly events = new EventEmitter();

  register(definition: PluginApiDefinition): void {
    if (this.definitions.has(definition.id)) {
      throw new Error(`Plugin API with id "${definition.id}" already registered.`);
    }
    this.definitions.set(definition.id, definition);
    this.events.emit('registered', definition.id);
  }

  unregister(id: string): void {
    if (this.definitions.delete(id)) {
      this.events.emit('unregistered', id);
    }
  }

  async invoke<TPayload, TResult>(id: string, payload: TPayload, context: PluginContext): Promise<TResult> {
    const definition = this.definitions.get(id);
    if (!definition) {
      throw new Error(`API "${id}" not found.`);
    }

    if (definition.permission && !context.permissions.has(definition.permission)) {
      throw new Error(`Plugin "${context.descriptor.id}" lacks permission "${definition.permission}" to call API "${id}".`);
    }

    return definition.handler(payload, context) as Promise<TResult>;
  }

  on(event: 'registered' | 'unregistered', listener: (id: string) => void): void {
    this.events.on(event, listener);
  }

  off(event: 'registered' | 'unregistered', listener: (id: string) => void): void {
    this.events.off(event, listener);
  }
}

export class DefaultPluginApiClient implements PluginApiClient {
  constructor(private readonly invoker: PluginApiInvoker, private readonly context: PluginContext) {}

  invoke<TPayload, TResult>(id: string, payload: TPayload): Promise<TResult> {
    return this.invoker.invoke(id, payload, this.context);
  }
}

export class StaticPermissionResolver {
  constructor(private readonly granted: Partial<Record<PluginPermission, boolean>> = {}) {}

  isPermissionGranted(_plugin: PluginDescriptor, permission: PluginPermission): boolean {
    return Boolean(this.granted[permission] ?? false);
  }
}
