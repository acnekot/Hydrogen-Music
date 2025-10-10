import { watch, FSWatcher } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { PluginHotReloadController, PluginHotReloadOptions, PluginLogger } from './types.js';

export class FilesystemHotReloadController implements PluginHotReloadController {
  private watchers: FSWatcher[] = [];
  private readonly logger: PluginLogger;

  constructor(private readonly options: PluginHotReloadOptions) {
    this.logger = options.logger ?? console;
  }

  start(): void {
    if (this.watchers.length) return;
    for (const watchPath of this.options.watchPaths) {
      const resolved = this.resolvePath(watchPath);
      try {
        const watcher = watch(resolved, { recursive: true }, async (_eventType, filename) => {
          if (!filename) return;
          const pluginId = this.extractPluginId(filename);
          try {
            await this.options.onInvalidate(pluginId);
            this.logger.info(`Reloaded plugin ${pluginId}`);
          } catch (error) {
            this.logger.error(`Failed to reload plugin ${pluginId}`, { error });
          }
        });
        this.watchers.push(watcher);
      } catch (error) {
        this.logger.warn(`Failed to watch ${resolved}`, { error });
      }
    }
  }

  stop(): void {
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
  }

  private extractPluginId(filename: string): string {
    const normalized = filename.replace(/\\/g, '/');
    const parts = normalized.split('/');
    return parts[0] ?? normalized;
}

  private resolvePath(watchPath: string): string {
    if (watchPath === '~') {
      return os.homedir();
    }
    if (watchPath.startsWith('~/')) {
      return path.join(os.homedir(), watchPath.slice(2));
    }
    return path.resolve(watchPath);
  }
}
