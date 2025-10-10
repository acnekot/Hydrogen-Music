import type { PluginUiContribution, PluginUiController, RendererBridge } from './types.js';

export class DefaultPluginUiController implements PluginUiController {
  private registered = false;

  constructor(private readonly bridge: RendererBridge, private readonly pluginId: string) {}

  async register(contribution: PluginUiContribution): Promise<void> {
    if (this.registered) {
      await this.unregister();
    }

    if (contribution.components?.length) {
      await this.bridge.registerComponents(contribution.components, this.pluginId);
    }
    if (contribution.piniaStores?.length) {
      await this.bridge.registerPiniaStores(contribution.piniaStores, this.pluginId);
    }
    if (contribution.menus?.length) {
      await this.bridge.registerMenus(contribution.menus, this.pluginId);
    }

    this.registered = true;
  }

  async unregister(): Promise<void> {
    if (!this.registered) return;
    await this.bridge.unregisterPlugin(this.pluginId);
    this.registered = false;
  }
}
