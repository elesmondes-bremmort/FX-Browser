import { FXBrowserSettings } from "./settings.js";
import { stableId } from "./utils.js";

const ORIGIN_VAULT_MODULE_IDS = ["origin-vault", "origin_vault", "originvault"];

export class FXOriginVaultSources {
  static isAvailable() {
    return ORIGIN_VAULT_MODULE_IDS.some((id) => game.modules?.get?.(id)?.active);
  }

  static getSources() {
    return FXBrowserSettings.getOriginVaultSources().map((source) => ({
      id: source.id || stableId(source.path || source.name),
      name: source.name || "Origin Vault Repository",
      path: source.path || "",
      enabled: source.enabled !== false,
      originVaultRepositoryId: source.originVaultRepositoryId || source.id || "",
      originVaultItemId: source.originVaultItemId || "",
      type: "origin-vault"
    }));
  }

  static async setSources(sources) {
    await FXBrowserSettings.setOriginVaultSources(sources.map((source) => ({
      id: source.id || stableId(source.path || source.name),
      name: source.name || "Origin Vault Repository",
      path: source.path || "",
      enabled: source.enabled !== false,
      originVaultRepositoryId: source.originVaultRepositoryId || source.id || "",
      originVaultItemId: source.originVaultItemId || "",
      type: "origin-vault"
    })));
  }

  static async addSource({ name, path, enabled = true, originVaultRepositoryId = "", originVaultItemId = "" }) {
    const sources = this.getSources();
    const id = stableId(`origin-vault-${originVaultRepositoryId || path || name}`);
    const next = {
      id,
      name: name || "Origin Vault Repository",
      path,
      enabled,
      originVaultRepositoryId: originVaultRepositoryId || id,
      originVaultItemId,
      type: "origin-vault"
    };
    await this.setSources([...sources.filter((source) => source.id !== id), next]);
    return next;
  }

  static async removeSource(id) {
    await this.setSources(this.getSources().filter((source) => source.id !== id));
  }

  static async toggleSource(id) {
    await this.setSources(this.getSources().map((source) => source.id === id ? { ...source, enabled: !source.enabled } : source));
  }

  static discoverRepositories() {
    const api = this.#getApi();
    const candidates = [
      api?.repositories,
      api?.collections,
      api?.sources,
      api?.getRepositories?.(),
      api?.getCollections?.(),
      api?.getSources?.()
    ].find((value) => Array.isArray(value));

    return (candidates ?? []).map((repository) => ({
      id: repository.id || repository.uuid || stableId(repository.path || repository.name),
      name: repository.name || repository.label || "Origin Vault Repository",
      path: repository.path || repository.root || repository.directory || "",
      enabled: false,
      originVaultRepositoryId: repository.id || repository.uuid || "",
      originVaultItemId: repository.itemId || "",
      type: "origin-vault"
    })).filter((source) => source.path);
  }

  static #getApi() {
    for (const id of ORIGIN_VAULT_MODULE_IDS) {
      const module = game.modules?.get?.(id);
      if (module?.active) return module.api ?? module;
    }
    return null;
  }
}
