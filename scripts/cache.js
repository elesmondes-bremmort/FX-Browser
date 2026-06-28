import { MODULE_ID, SETTINGS } from "./constants.js";

export class FXBrowserCache {
  static get() {
    const cache = game.settings.get(MODULE_ID, SETTINGS.ASSET_CACHE);
    return {
      assets: Array.isArray(cache?.assets) ? cache.assets : [],
      scannedAt: cache?.scannedAt ?? null
    };
  }

  static async set(assets) {
    const scannedAt = new Date().toISOString();
    await game.settings.set(MODULE_ID, SETTINGS.ASSET_CACHE, { assets, scannedAt });
    await game.settings.set(MODULE_ID, SETTINGS.LAST_SCAN, scannedAt);
    return { assets, scannedAt };
  }

  static async clear() {
    return this.set([]);
  }
}
