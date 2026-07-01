import { FXBrowserSettings } from "./settings.js";
import { cleanAssetName, stableId } from "./utils.js";

const PERSONAL_SOURCE_ID = "personal-virtual";

export class FXLibraryManager {
  static buildLibrary(assets) {
    const organization = FXBrowserSettings.getLibraryOrganization();
    const assetsByPath = new Map(assets.map((asset) => [asset.path, this.#applyMetadata(asset, organization.assets[asset.path])]));

    for (const [assetPath, metadata] of Object.entries(organization.assets)) {
      if (assetsByPath.has(assetPath)) continue;
      assetsByPath.set(assetPath, this.#missingAsset(assetPath, metadata));
    }

    const enrichedAssets = [...assetsByPath.values()];
    const sources = this.#buildSources(enrichedAssets);
    return {
      assets: enrichedAssets,
      folders: organization.folders,
      sources
    };
  }

  static async renameAsset(assetPath, displayName, source = "") {
    await this.#updateAsset(assetPath, { displayName: String(displayName ?? "").trim() || cleanAssetName(assetPath), source });
  }

  static async toggleFavorite(assetPath, source = "") {
    const organization = FXBrowserSettings.getLibraryOrganization();
    const current = organization.assets[assetPath] ?? {};
    await this.#updateAsset(assetPath, { favorite: !current.favorite, source });
  }

  static async moveAsset(assetPath, virtualFolderId, source = "") {
    await this.#updateAsset(assetPath, { virtualFolderId: virtualFolderId || "", source });
  }

  static async createFolder(name) {
    const organization = FXBrowserSettings.getLibraryOrganization();
    const folder = {
      id: stableId(`folder-${name}-${Date.now()}`),
      name: String(name ?? "").trim() || "Nouveau dossier"
    };
    organization.folders = [...organization.folders, folder];
    await FXBrowserSettings.setLibraryOrganization(organization);
    return folder;
  }

  static async renameFolder(id, name) {
    const organization = FXBrowserSettings.getLibraryOrganization();
    organization.folders = organization.folders.map((folder) => folder.id === id ? { ...folder, name: String(name ?? "").trim() || folder.name } : folder);
    await FXBrowserSettings.setLibraryOrganization(organization);
  }

  static async deleteFolder(id) {
    const organization = FXBrowserSettings.getLibraryOrganization();
    organization.folders = organization.folders.filter((folder) => folder.id !== id);
    for (const metadata of Object.values(organization.assets)) {
      if (metadata.virtualFolderId === id) metadata.virtualFolderId = "";
    }
    await FXBrowserSettings.setLibraryOrganization(organization);
  }

  static #applyMetadata(asset, metadata = {}) {
    return {
      ...asset,
      name: metadata.displayName || asset.displayName || asset.name,
      displayName: metadata.displayName || asset.displayName || asset.name,
      favorite: Boolean(metadata.favorite),
      virtualFolderId: metadata.virtualFolderId || "",
      sourceId: metadata.source || asset.sourceId || PERSONAL_SOURCE_ID,
      sourceName: asset.sourceName || "Dossier personnel",
      sourcePath: asset.sourcePath || "",
      missing: false
    };
  }

  static #missingAsset(assetPath, metadata = {}) {
    return {
      id: stableId(assetPath),
      path: assetPath,
      name: metadata.displayName || cleanAssetName(assetPath),
      displayName: metadata.displayName || cleanAssetName(assetPath),
      fileName: assetPath.split("/").pop() ?? assetPath,
      category: "missing",
      categoryLabel: "Asset introuvable",
      playback: "",
      sourceId: metadata.source || PERSONAL_SOURCE_ID,
      sourceName: this.#sourceName(metadata.source),
      sourcePath: "",
      missing: true,
      favorite: Boolean(metadata.favorite),
      virtualFolderId: metadata.virtualFolderId || ""
    };
  }

  static #buildSources(assets) {
    const sources = new Map();
    for (const asset of assets) {
      const id = asset.sourceId || PERSONAL_SOURCE_ID;
      const current = sources.get(id) ?? {
        id,
        name: asset.sourceName || "Dossier personnel",
        path: asset.sourcePath || "",
        count: 0
      };
      current.count += 1;
      sources.set(id, current);
    }
    return [...sources.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  static #sourceName(sourceId) {
    if (sourceId === "jb2a-free") return "JB2A Free";
    if (sourceId === "jb2a-patreon") return "JB2A Patreon";
    if (sourceId) return "Dossier custom";
    return "Dossier personnel";
  }

  static async #updateAsset(assetPath, updates) {
    const organization = FXBrowserSettings.getLibraryOrganization();
    const current = organization.assets[assetPath] ?? {};
    organization.assets[assetPath] = {
      assetPath,
      source: updates.source ?? current.source ?? "",
      displayName: updates.displayName ?? current.displayName ?? "",
      virtualFolderId: updates.virtualFolderId ?? current.virtualFolderId ?? "",
      favorite: updates.favorite ?? Boolean(current.favorite)
    };
    await FXBrowserSettings.setLibraryOrganization(organization);
  }
}
