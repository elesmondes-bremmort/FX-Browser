import { EMPTY_LIBRARY_MESSAGE, JB2A_DIRECTORIES } from "./constants.js";
import { FXBrowserCache } from "./cache.js";
import { categorizeAsset, detectPlaybackKind } from "./categories.js";
import { FXOriginVaultSources } from "./originVaultSources.js";
import { FXBrowserSettings } from "./settings.js";
import { cleanAssetName, notify, stableId } from "./utils.js";

export class FXAssetScanner {
  static async scan({ notifyResult = true } = {}) {
    const sources = this.getConfiguredSources();
    const assetsByPath = new Map();

    for (const source of sources) {
      await this.#scanDirectory(source, assetsByPath);
    }

    const assets = [...assetsByPath.values()].sort((a, b) => a.path.localeCompare(b.path));
    await FXBrowserCache.set(assets);

    if (notifyResult && sources.length === 0) notify("Aucune source Origin Vault active. Ajoutez une source dans l'onglet Sources.", "warn");
    else if (notifyResult && assets.length === 0) notify(EMPTY_LIBRARY_MESSAGE, "warn");
    else if (notifyResult) notify(game.i18n.format("fx-browser.scan.complete", { count: assets.length }), "info");

    return assets;
  }

  static getCachedAssets() {
    return FXBrowserCache.get().assets;
  }

  static getConfiguredSources() {
    const originVaultSources = FXOriginVaultSources.getSources()
      .filter((source) => source.enabled && source.path)
      .map((source) => ({ ...source, paths: [source.path] }));

    if (!FXBrowserSettings.includeJb2aSources()) return originVaultSources;

    return [
      ...originVaultSources,
      { id: "jb2a-free", name: "JB2A Free", path: "modules/JB2A_DnD5e", paths: ["modules/JB2A_DnD5e", "modules/jb2a_dnd5e", "modules/JB2A_DND5E"], enabled: true, type: "jb2a" },
      { id: "jb2a-patreon", name: "JB2A Patreon", path: "modules/jb2a_patreon", paths: ["modules/jb2a_patreon", "modules/JB2A_Patreon", "modules/JB2A_PATREON"], enabled: true, type: "jb2a" },
      ...FXBrowserSettings.getCustomDirectories().map((path, index) => ({
        id: stableId(`custom-${path}`),
        name: `Dossier custom ${index + 1}`,
        path,
        paths: [path],
        enabled: true,
        type: "custom"
      }))
    ];
  }

  static async #scanDirectory(source, assetsByPath) {
    if (!source?.paths?.length) return;

    for (const directory of source.paths) {
      try {
        const result = await FilePicker.browse("data", directory, { recursive: true });
        for (const file of result.files ?? []) {
          if (!String(file).toLowerCase().endsWith(".webm")) continue;
          if (!assetsByPath.has(file)) assetsByPath.set(file, this.#toAsset(file, source));
        }
      } catch (error) {
        console.debug("FX Browser | Skipping unavailable directory", directory, error);
      }
    }
  }

  static #toAsset(path, source) {
    const category = categorizeAsset(path);
    return {
      id: stableId(path),
      path,
      assetPath: path,
      originalName: cleanAssetName(path),
      name: cleanAssetName(path),
      displayName: cleanAssetName(path),
      fileName: path.split("/").pop() ?? path,
      category: category.id,
      categoryLabel: category.label,
      playback: detectPlaybackKind(path),
      sourceId: source.id,
      sourceName: source.name,
      sourcePath: source.path,
      sourceEnabled: source.enabled !== false,
      originVaultRepositoryId: source.originVaultRepositoryId || source.id,
      originVaultItemId: source.originVaultItemId || "",
      missing: false,
      favorite: false,
      virtualFolderId: ""
    };
  }
}
