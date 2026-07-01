import { DEFAULT_WINDOW_STATE } from "./constants.js";
import { FXAssetScanner } from "./assetScanner.js";
import { FXDragDrop } from "./dragDrop.js";
import { FXLibraryManager } from "./libraryManager.js";
import { FXOriginVaultSources } from "./originVaultSources.js";
import { FXOverlayControls } from "./overlayControls.js";
import { FXOverlayManager } from "./overlayManager.js";
import { FXPreview } from "./preview.js";
import { FXBrowserSettings } from "./settings.js";
import { clampNumber, debugLog, localize, notify } from "./utils.js";

export class FXBrowserApp extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "fx-browser-app",
    tag: "section",
    classes: ["fx-browser-window"],
    window: {
      title: "FX Browser",
      icon: "fa-solid fa-fire",
      resizable: true
    },
    position: DEFAULT_WINDOW_STATE,
    actions: {
      rescan: FXBrowserApp.#onRescan
    }
  };

  static PARTS = {
    main: {
      template: "modules/fx-browser/templates/browser.hbs"
    }
  };

  constructor(options = {}) {
    super({ ...options, position: FXBrowserSettings.getWindowState() });
    this.assets = FXAssetScanner.getCachedAssets();
    this.library = FXLibraryManager.buildLibrary(this.assets);
    this.filteredAssets = this.library.assets;
    this.selectedAsset = this.library.assets.find((asset) => !asset.missing) ?? null;
    this.folderFilter = "";
    this.specialFilter = "all";
    this.query = "";
    this.showSources = false;
    this.contextMenu = null;
    this.formState = null;
    this.preview = null;
    this.selectedOverlayId = null;
    this.searchDebounce = null;
    this.dragDrop = new FXDragDrop((id) => this.library.assets.find((asset) => asset.id === id));
    this.dragDrop.bindCanvasDrop();
  }

  async _prepareContext() {
    this.#refreshLibrary();
    this.#filterAssets();
    const overlays = FXOverlayManager.getOverlays();
    const selectedOverlay = overlays.find((overlay) => overlay.id === this.selectedOverlayId) ?? overlays[0] ?? null;
    this.selectedOverlayId = selectedOverlay?.id ?? null;

    return {
      tabs: this.#getTabContext(),
      configuredSources: this.#getConfiguredSourceContext(),
      originVaultAvailable: FXOriginVaultSources.isAvailable(),
      showSources: this.showSources,
      contextMenu: this.#getContextMenuContext(),
      formState: this.formState,
      assets: this.filteredAssets,
      overlays,
      selectedOverlay,
      selectedAsset: this.#getSelectedAssetContext(),
      folders: this.library.folders,
      placement: FXBrowserSettings.getPlacement(),
      emptyMessage: this.#getEmptyMessage(),
      hasAssets: this.filteredAssets.length > 0,
      query: this.query
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element;
    this.preview = new FXPreview(root);
    this.preview.render(this.selectedAsset);
    this.preview.activateListeners();

    new FXOverlayControls(root, (id) => {
      this.selectedOverlayId = id;
      this.render({ force: true });
    }, () => {
      this.formState = {
        type: "delete-all-overlays",
        title: "Supprimer tous les FX",
        message: "Supprimer tous les FX Overlay de cette scène ?",
        submitLabel: "Supprimer",
        isConfirm: true
      };
      this.render({ force: true });
    }).activate(this.selectedOverlayId);

    root.addEventListener("click", (event) => {
      if (!event.target.closest(".fx-browser-context-menu")) this.#closeContextMenu();
    });

    root.querySelector("[data-search]")?.addEventListener("input", (event) => {
      this.query = event.currentTarget.value;
      window.clearTimeout(this.searchDebounce);
      this.searchDebounce = window.setTimeout(() => this.#renderAssetList(), 125);
    });

    root.querySelectorAll("[data-special-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        this.specialFilter = button.dataset.specialFilter;
        this.folderFilter = "";
        this.#closeContextMenu();
        this.render({ force: true });
      });
    });

    root.querySelectorAll("[data-folder-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        this.folderFilter = button.dataset.folderFilter;
        this.specialFilter = "folder";
        this.#closeContextMenu();
        this.render({ force: true });
      });
    });

    root.querySelector("[data-folder-create]")?.addEventListener("click", () => {
      this.formState = { type: "folder-create", title: "Nouvel onglet", name: "", isNameForm: true };
      this.render({ force: true });
    });

    root.querySelectorAll("[data-folder-rename]").forEach((button) => {
      button.addEventListener("click", () => {
        const folder = this.library.folders.find((item) => item.id === button.dataset.folderRename);
        if (!folder) return;
        this.formState = { type: "folder-rename", title: "Renommer l'onglet", folderId: folder.id, name: folder.name, isNameForm: true };
        this.render({ force: true });
      });
    });

    root.querySelectorAll("[data-folder-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        await FXLibraryManager.deleteFolder(button.dataset.folderDelete);
        if (this.folderFilter === button.dataset.folderDelete) {
          this.folderFilter = "";
          this.specialFilter = "all";
        }
        this.render({ force: true });
      });
    });

    root.querySelector("[data-source-panel-toggle]")?.addEventListener("click", () => {
      this.showSources = !this.showSources;
      this.render({ force: true });
    });

    root.querySelector("[data-source-add]")?.addEventListener("click", () => {
      this.formState = { type: "source", title: "Ajouter une source Origin Vault", name: "", path: "", isSource: true };
      this.render({ force: true });
    });

    root.querySelector("[data-source-rescan]")?.addEventListener("click", () => this.#rescanLibrary());

    root.querySelectorAll("[data-source-toggle]").forEach((input) => {
      input.addEventListener("change", async () => {
        await FXOriginVaultSources.toggleSource(input.dataset.sourceToggle);
        this.assets = await FXAssetScanner.scan({ notifyResult: false });
        this.render({ force: true });
      });
    });

    root.querySelectorAll("[data-source-remove]").forEach((button) => {
      button.addEventListener("click", async () => {
        await FXOriginVaultSources.removeSource(button.dataset.sourceRemove);
        this.assets = await FXAssetScanner.scan({ notifyResult: false });
        this.render({ force: true });
      });
    });

    root.querySelectorAll("[data-context-action]").forEach((button) => {
      button.addEventListener("click", (event) => this.#onContextAction(event, button.dataset.contextAction, button.dataset.folderId));
    });

    root.querySelectorAll("[data-asset-action]").forEach((button) => {
      button.addEventListener("click", (event) => this.#onAssetAction(event, button.dataset.assetAction));
    });

    root.querySelector("[data-fx-form]")?.addEventListener("submit", (event) => this.#onInternalFormSubmit(event));
    root.querySelector("[data-form-cancel]")?.addEventListener("click", () => {
      this.formState = null;
      this.render({ force: true });
    });

    this.#activateAssetCards();

    root.querySelectorAll("[data-placement]").forEach((input) => {
      input.addEventListener("change", () => this.#savePlacement(root));
      input.addEventListener("input", () => this.#savePlacement(root));
    });
  }

  #activateHoverPreview(card) {
    const media = card.querySelector(".fx-browser-card-media");
    const src = card.dataset.previewSrc;
    if (!media || !src) return;

    card.addEventListener("mouseenter", () => {
      if (media.querySelector("video")) return;
      const video = document.createElement("video");
      video.src = src;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      media.replaceChildren(video);
      video.play?.().catch(() => {});
    });

    card.addEventListener("mouseleave", () => {
      const video = media.querySelector("video");
      if (!video) return;
      video.pause();
      video.removeAttribute("src");
      video.load();
      media.innerHTML = `<i class="fa-solid fa-photo-film"></i>`;
    });
  }

  #activateAssetCards() {
    this.element.querySelectorAll("[data-asset-id]").forEach((card) => {
      const asset = this.library.assets.find((item) => item.id === card.dataset.assetId);
      if (!asset) return;
      if (!asset.missing) {
        this.dragDrop.activateCard(card, asset);
        this.#activateHoverPreview(card);
      }
      card.addEventListener("click", () => {
        if (asset.missing) return;
        this.selectedAsset = asset;
        this.#closeContextMenu();
        this.render({ force: true });
      });
      card.addEventListener("contextmenu", (event) => this.#openContextMenu(event, asset));
    });
  }

  async close(options) {
    window.clearTimeout(this.searchDebounce);
    this.dragDrop.unbindCanvasDrop();
    await this.#saveWindowState();
    FXBrowserApp.instance = null;
    return super.close(options);
  }

  setPosition(position = {}) {
    const result = super.setPosition(position);
    this.#saveWindowState();
    return result;
  }

  async #saveWindowState() {
    const position = this.position ?? {};
    const state = {};
    for (const key of ["width", "height", "left", "top"]) {
      if (Number.isFinite(position[key])) state[key] = position[key];
    }
    if (Object.keys(state).length) await FXBrowserSettings.setWindowState(state);
  }

  async #savePlacement(root) {
    const get = (name) => root.querySelector(`[name="${name}"]`);
    await FXBrowserSettings.setPlacement({
      width: clampNumber(get("width")?.value, 0.25, 20, 2),
      height: clampNumber(get("height")?.value, 0.25, 20, 2),
      alpha: clampNumber(get("alpha")?.value, 0, 1, 1),
      rotation: clampNumber(get("rotation")?.value, -360, 360, 0),
      loop: Boolean(get("loop")?.checked),
      elevation: clampNumber(get("elevation")?.value, -9999, 9999, 0),
      name: get("name")?.value ?? "",
      visible: Boolean(get("visible")?.checked),
      locked: Boolean(get("locked")?.checked),
      zIndex: clampNumber(get("zIndex")?.value, -9999, 9999, 0)
    });
  }

  #filterAssets() {
    this.#refreshLibrary();
    const query = this.query.trim().toLowerCase();
    this.filteredAssets = this.library.assets.filter((asset) => {
      const matchesSpecial = this.specialFilter !== "favorites" || asset.favorite;
      const matchesFolder = this.specialFilter !== "folder" || asset.virtualFolderId === this.folderFilter;
      const haystack = `${asset.originalName ?? ""} ${asset.displayName ?? ""} ${asset.name} ${asset.path} ${asset.categoryLabel} ${asset.sourceName}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      return matchesSpecial && matchesFolder && matchesQuery;
    });

    if (this.selectedAsset && !this.filteredAssets.some((asset) => asset.id === this.selectedAsset.id)) {
      this.selectedAsset = this.filteredAssets.find((asset) => !asset.missing) ?? null;
    }
  }

  static async #onRescan() {
    await this.#rescanLibrary();
  }

  refreshOverlays() {
    this.render({ force: true });
  }

  #refreshLibrary() {
    const selectedId = this.selectedAsset?.id;
    this.library = FXLibraryManager.buildLibrary(this.assets);
    if (selectedId) this.selectedAsset = this.library.assets.find((asset) => asset.id === selectedId) ?? this.selectedAsset;
  }

  async #rescanLibrary() {
    this.assets = await FXAssetScanner.scan();
    this.#refreshLibrary();
    this.selectedAsset = this.library.assets.find((asset) => !asset.missing) ?? null;
    this.render({ force: true });
  }

  #getTabContext() {
    return {
      all: this.specialFilter === "all",
      favorites: this.specialFilter === "favorites",
      folders: this.library.folders.map((folder) => ({ ...folder, active: this.specialFilter === "folder" && this.folderFilter === folder.id }))
    };
  }

  #getConfiguredSourceContext() {
    const counts = new Map(this.library.sources.map((source) => [source.id, source.count]));
    return FXOriginVaultSources.getSources().map((source) => ({
      ...source,
      count: counts.get(source.id) ?? 0
    }));
  }

  async #renderAssetList() {
    this.#filterAssets();
    const grid = this.element.querySelector(".fx-browser-grid");
    if (!grid) return;
    if (!this.filteredAssets.length) {
      grid.innerHTML = `<div class="fx-browser-empty">${this.#getEmptyMessage()}</div>`;
      return;
    }

    const cards = await Promise.all(this.filteredAssets.map((asset) => renderTemplate("modules/fx-browser/templates/asset-card.hbs", asset)));
    grid.innerHTML = cards.join("");
    this.#activateAssetCards();
  }

  #getEmptyMessage() {
    const hasSources = FXOriginVaultSources.getSources().length > 0;
    const hasIndexedAssets = this.library.assets.some((asset) => !asset.missing);
    if (this.query.trim() && hasIndexedAssets) return "Aucun effet trouve pour cette recherche.";
    if (hasSources && !hasIndexedAssets) return "Source detectee, aucun FX indexe. Cliquez sur Rescanner.";
    if (!hasSources) return "Aucune bibliotheque d'effets detectee.";
    return "Aucune bibliotheque d'effets scannee.";
  }

  #getSelectedAssetContext() {
    const asset = this.selectedAsset;
    if (!asset) return null;
    return {
      ...asset,
      favoriteLabel: asset.favorite ? "Oui" : "Non",
      folderNames: this.library.folders.filter((folder) => folder.id === asset.virtualFolderId).map((folder) => folder.name).join(", ") || "Aucun"
    };
  }

  #openContextMenu(event, asset) {
    event.preventDefault();
    event.stopPropagation();
    const rect = this.element.getBoundingClientRect();
    this.contextMenu = {
      assetId: asset.id,
      x: Math.max(8, event.clientX - rect.left),
      y: Math.max(8, event.clientY - rect.top)
    };
    if (!asset.missing) this.selectedAsset = asset;
    this.render({ force: true });
  }

  #closeContextMenu() {
    this.contextMenu = null;
    this.element?.querySelector(".fx-browser-context-menu")?.remove();
  }

  #getContextMenuContext() {
    if (!this.contextMenu) return null;
    const asset = this.library.assets.find((item) => item.id === this.contextMenu.assetId);
    if (!asset) return null;
    return {
      ...this.contextMenu,
      asset,
      isFavorite: asset.favorite,
      hasCurrentFolder: Boolean(asset.virtualFolderId),
      folders: this.library.folders.map((folder) => ({ ...folder, selected: asset.virtualFolderId === folder.id }))
    };
  }

  async #onContextAction(event, action, folderId = "") {
    event.preventDefault();
    event.stopPropagation();
    const asset = this.library.assets.find((item) => item.id === this.contextMenu?.assetId);
    if (!asset) return;
    await this.#runAssetAction(asset, action, folderId);
    this.contextMenu = null;
    this.render({ force: true });
  }

  #onAssetAction(event, action) {
    event.preventDefault();
    const asset = this.selectedAsset;
    if (!asset) return;
    this.#runAssetAction(asset, action).then(() => this.render({ force: true }));
  }

  async #runAssetAction(asset, action, folderId = "") {
    if (action === "rename") {
      this.formState = { type: "asset-rename", title: "Renommer l'effet", assetId: asset.id, name: asset.displayName || asset.name, isNameForm: true };
      return;
    }
    if (action === "favorite") await FXLibraryManager.toggleFavorite(asset.path, asset.sourceId, asset.sourceEnabled);
    if (action === "move") await FXLibraryManager.moveAsset(asset.path, folderId, asset.sourceId, asset.sourceEnabled);
    if (action === "remove-folder") await FXLibraryManager.moveAsset(asset.path, "", asset.sourceId, asset.sourceEnabled);
    if (action === "copy-path") await game.clipboard?.copyPlainText?.(asset.path);
    if (action === "preview") this.selectedAsset = asset;
    if (action === "add-tab") this.formState = { type: "asset-move", title: "Ajouter a un onglet", assetId: asset.id, isMove: true, folders: this.library.folders };
    this.#refreshLibrary();
  }

  async #onInternalFormSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const type = this.formState?.type;

    if (type === "source") {
      await FXOriginVaultSources.addSource({ name: data.get("name"), path: data.get("path"), enabled: true });
      this.assets = await FXAssetScanner.scan({ notifyResult: false });
    }
    if (type === "folder-create") await FXLibraryManager.createFolder(data.get("name"));
    if (type === "folder-rename") await FXLibraryManager.renameFolder(this.formState.folderId, data.get("name"));
    if (type === "asset-rename") {
      const asset = this.library.assets.find((item) => item.id === this.formState.assetId);
      if (asset) await FXLibraryManager.renameAsset(asset.path, data.get("name"), asset.sourceId, asset.sourceEnabled);
    }
    if (type === "asset-move") {
      const asset = this.library.assets.find((item) => item.id === this.formState.assetId);
      if (asset) await FXLibraryManager.moveAsset(asset.path, data.get("folderId"), asset.sourceId, asset.sourceEnabled);
    }
    if (type === "delete-all-overlays") {
      await FXOverlayManager.deleteAllOverlays();
      this.selectedOverlayId = null;
    }

    this.formState = null;
    this.#refreshLibrary();
    this.render({ force: true });
  }

  static async toggle() {
    if (!game.user?.isGM) {
      notify(localize("errors.gmOnly"), "warn");
      return;
    }

    try {
      if (FXBrowserApp.instance?.rendered) {
        await FXBrowserApp.instance.close();
        debugLog("window closed");
        return;
      }

      FXBrowserApp.instance = FXBrowserApp.instance ?? new FXBrowserApp();
      await FXBrowserApp.instance.render({ force: true });
      debugLog("window opened");
    } catch (error) {
      console.error("FX Browser | Failed to toggle browser window", error);
      notify(game.i18n.localize("fx-browser.errors.windowToggle"), "error");
    }
  }
}

FXBrowserApp.instance = null;
