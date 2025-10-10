import { promises as fs } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

import type { PluginSandbox } from './types.js';

export interface NodeSandboxOptions {
  globals?: Record<string, unknown>;
  requireOverride?: (id: string, parent: string) => unknown;
}

export class NodeVmSandbox implements PluginSandbox {
  private context: vm.Context;

  constructor(private readonly options: NodeSandboxOptions = {}) {
    this.context = vm.createContext({
      console,
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,
      URL,
      ...options.globals,
    });
  }

  async runModule(filePath: string): Promise<unknown> {
    const code = await fs.readFile(filePath, 'utf8');
    const moduleDir = path.dirname(filePath);
    const require = createRequire(filePath);

    const sandboxRequire = (id: string) => {
      if (this.options.requireOverride) {
        return this.options.requireOverride(id, filePath);
      }
      return require(id);
    };

    const exports = {} as Record<string, unknown>;
    const module = { exports } as { exports: Record<string, unknown> };

    const script = new vm.Script(
      `(function (exports, module, require, __dirname, __filename) {\n${code}\n})`,
      { filename: filePath }
    );
    const fn = script.runInContext(this.context);
    fn(exports, module, sandboxRequire, moduleDir, filePath);
    const result = module.exports ?? exports;
    return result as unknown;
  }

  dispose(): void {
    this.context = vm.createContext({});
  }
}
