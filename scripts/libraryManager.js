import { FXBrowserSettings } from "./settings.js";
import { FXOriginVaultSources } from "./originVaultSources.js";
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
      folders: organization.folders.sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0) || a.name.localeCompare(b.name)),
      sources
    };
  }

  static async renameAsset(assetPath, displayName, source = "", sourceEnabled = true) {
    await this.#updateAsset(assetPath, { displayName: String(displayName ?? "").trim() || cleanAssetName(assetPath), source, sourceEnabled });
  }

  static async toggleFavorite(assetPath, source = "", sourceEnabled = true) {
    const organization = FXBrowserSettings.getLibraryOrganization();
    const current = organization.assets[assetPath] ?? {};
    await this.#updateAsset(assetPath, { favorite: !current.favorite, source, sourceEnabled });
  }

  static async moveAsset(assetPath, virtualFolderId, source = "", sourceEnabled = true) {
    await this.#updateAsset(assetPath, { virtualFolderId: virtualFolderId || "", source, sourceEnabled });
  }

  static async createFolder(name, parentId = "") {
    const organization = FXBrowserSettings.getLibraryOrganization();
    const folder = {
      id: stableId(`folder-${name}-${Date.now()}`),
      name: String(name ?? "").trim() || "Nouveau dossier",
      parentId,
      sort: organization.folders.length
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
      originVaultRepositoryId: metadata.originVaultRepositoryId || asset.originVaultRepositoryId || "",
      originVaultItemId: metadata.originVaultItemId || asset.originVaultItemId || "",
      originalName: asset.originalName || asset.name,
      assetPath: asset.assetPath || asset.path,
      sourceEnabled: metadata.sourceEnabled ?? asset.sourceEnabled !== false,
      missing: false
    };
  }

  static #missingAsset(assetPath, metadata = {}) {
    return {
      id: stableId(assetPath),
      path: assetPath,
      assetPath,
      originalName: cleanAssetName(assetPath),
      name: metadata.displayName || cleanAssetName(assetPath),
      displayName: metadata.displayName || cleanAssetName(assetPath),
      fileName: assetPath.split("/").pop() ?? assetPath,
      category: "missing",
      categoryLabel: "Asset introuvable",
      playback: "",
      sourceId: metadata.source || PERSONAL_SOURCE_ID,
      sourceName: this.#sourceName(metadata.source),
      sourcePath: "",
      originVaultRepositoryId: metadata.originVaultRepositoryId || metadata.source || "",
      originVaultItemId: metadata.originVaultItemId || "",
      sourceEnabled: this.#isSourceEnabled(metadata.source),
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
    const source = FXOriginVaultSources.getSources().find((item) => item.id === sourceId);
    if (source) return source.name;
    if (sourceId === "jb2a-free") return "JB2A Free";
    if (sourceId === "jb2a-patreon") return "JB2A Patreon";
    if (sourceId) return "Dossier custom";
    return "Dossier personnel";
  }

  static #isSourceEnabled(sourceId) {
    if (!sourceId) return false;
    const source = FXOriginVaultSources.getSources().find((item) => item.id === sourceId);
    return source?.enabled === true;
  }

  static async #updateAsset(assetPath, updates) {
    const organization = FXBrowserSettings.getLibraryOrganization();
    const current = organization.assets[assetPath] ?? {};
    organization.assets[assetPath] = {
      assetPath,
      source: updates.source ?? current.source ?? "",
      originVaultRepositoryId: updates.originVaultRepositoryId ?? current.originVaultRepositoryId ?? updates.source ?? current.source ?? "",
      originVaultItemId: updates.originVaultItemId ?? current.originVaultItemId ?? "",
      displayName: updates.displayName ?? current.displayName ?? "",
      virtualFolderId: updates.virtualFolderId ?? current.virtualFolderId ?? "",
      sourceEnabled: updates.sourceEnabled ?? current.sourceEnabled ?? true,
      favorite: updates.favorite ?? Boolean(current.favorite)
    };
    await FXBrowserSettings.setLibraryOrganization(organization);
  }
}
