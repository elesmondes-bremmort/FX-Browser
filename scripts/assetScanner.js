import { EMPTY_LIBRARY_MESSAGE, JB2A_DIRECTORIES } from "./constants.js";
import { FXBrowserCache } from "./cache.js";
import { categorizeAsset, detectPlaybackKind } from "./categories.js";
import { FXBrowserSettings } from "./settings.js";
import { cleanAssetName, notify, stableId } from "./utils.js";

export class FXAssetScanner {
  static async scan({ notifyResult = true } = {}) {
    const directories = [...JB2A_DIRECTORIES, ...FXBrowserSettings.getCustomDirectories()];
    const paths = new Set();

    for (const directory of directories) {
      await this.#scanDirectory(directory, paths);
    }

    const assets = [...paths].sort((a, b) => a.localeCompare(b)).map((path) => this.#toAsset(path));
    await FXBrowserCache.set(assets);

    if (notifyResult && assets.length === 0) notify(EMPTY_LIBRARY_MESSAGE, "warn");
    else if (notifyResult) notify(game.i18n.format("fx-browser.scan.complete", { count: assets.length }), "info");

    return assets;
  }

  static getCachedAssets() {
    return FXBrowserCache.get().assets;
  }

  static async #scanDirectory(directory, paths) {
    if (!directory) return;

    try {
      const result = await FilePicker.browse("data", directory, { recursive: true });
      for (const file of result.files ?? []) {
        if (String(file).toLowerCase().endsWith(".webm")) paths.add(file);
      }
    } catch (error) {
      console.debug("FX Browser | Skipping unavailable directory", directory, error);
    }
  }

  static #toAsset(path) {
    const category = categorizeAsset(path);
    return {
      id: stableId(path),
      path,
      name: cleanAssetName(path),
      fileName: path.split("/").pop() ?? path,
      category: category.id,
      categoryLabel: category.label,
      playback: detectPlaybackKind(path)
    };
  }
}
