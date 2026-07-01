import { CATEGORIES } from "./categories.js";
import { DEFAULT_WINDOW_STATE, EMPTY_LIBRARY_MESSAGE } from "./constants.js";
import { FXAssetScanner } from "./assetScanner.js";
import { FXDragDrop } from "./dragDrop.js";
import { FXLibraryManager } from "./libraryManager.js";
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
      rescan: FXBrowserApp.#onRescan,
      selectCategory: FXBrowserApp.#onSelectCategory
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
    this.filteredAssets = this.assets;
    this.selectedAsset = this.assets[0] ?? null;
    this.category = "all";
    this.sourceFilter = "all";
    this.folderFilter = "";
    this.specialFilter = "all";
    this.query = "";
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
      categories: CATEGORIES.map((category) => ({ ...category, active: category.id === this.category })),
      sources: this.library.sources.map((source) => ({ ...source, active: this.sourceFilter === source.id })),
      folders: this.library.folders.map((folder) => ({ ...folder, active: this.folderFilter === folder.id })),
      librarySections: {
        all: this.specialFilter === "all",
        favorites: this.specialFilter === "favorites",
        personal: this.specialFilter === "personal"
      },
      assets: this.filteredAssets,
      overlays,
      selectedOverlay,
      selectedAsset: this.selectedAsset,
      placement: FXBrowserSettings.getPlacement(),
      emptyMessage: EMPTY_LIBRARY_MESSAGE,
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
    }).activate(this.selectedOverlayId);

    root.querySelector("[data-search]")?.addEventListener("input", (event) => {
      this.query = event.currentTarget.value;
      window.clearTimeout(this.searchDebounce);
      this.searchDebounce = window.setTimeout(() => this.#renderAssetList(), 125);
    });

    root.querySelectorAll("[data-source-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        this.sourceFilter = button.dataset.sourceFilter;
        this.specialFilter = "all";
        this.folderFilter = "";
        this.render({ force: true });
      });
    });

    root.querySelectorAll("[data-special-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        this.specialFilter = button.dataset.specialFilter;
        this.sourceFilter = "all";
        this.folderFilter = "";
        this.render({ force: true });
      });
    });

    root.querySelectorAll("[data-folder-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        this.folderFilter = button.dataset.folderFilter;
        this.specialFilter = "folder";
        this.sourceFilter = "all";
        this.render({ force: true });
      });
    });

    root.querySelector("[data-folder-list]")?.addEventListener("contextmenu", (event) => this.#onFolderContextMenu(event));

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
        this.preview?.render(asset);
      });
      card.addEventListener("contextmenu", (event) => this.#onAssetContextMenu(event, asset));
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
      const matchesCategory = this.category === "all" || asset.category === this.category;
      const matchesSource = this.sourceFilter === "all" || asset.sourceId === this.sourceFilter;
      const matchesSpecial = this.specialFilter !== "favorites" || asset.favorite;
      const matchesPersonal = this.specialFilter !== "personal" || Boolean(asset.virtualFolderId);
      const matchesFolder = this.specialFilter !== "folder" || asset.virtualFolderId === this.folderFilter;
      const haystack = `${asset.name} ${asset.path} ${asset.categoryLabel} ${asset.sourceName}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      return matchesCategory && matchesSource && matchesSpecial && matchesPersonal && matchesFolder && matchesQuery;
    });

    if (this.selectedAsset && !this.filteredAssets.some((asset) => asset.id === this.selectedAsset.id)) {
      this.selectedAsset = this.filteredAssets[0] ?? null;
    }
  }

  static async #onRescan() {
    this.assets = await FXAssetScanner.scan();
    this.#refreshLibrary();
    this.selectedAsset = this.assets[0] ?? null;
    this.render({ force: true });
  }

  refreshOverlays() {
    this.render({ force: true });
  }

  static async #onSelectCategory(event, target) {
    this.category = target.dataset.category;
    this.render({ force: true });
  }

  #refreshLibrary() {
    this.library = FXLibraryManager.buildLibrary(this.assets);
  }

  async #renderAssetList() {
    this.#filterAssets();
    const grid = this.element.querySelector(".fx-browser-grid");
    if (!grid) return;
    if (!this.filteredAssets.length) {
      grid.innerHTML = `<div class="fx-browser-empty">${EMPTY_LIBRARY_MESSAGE}</div>`;
      return;
    }

    const cards = await Promise.all(this.filteredAssets.map((asset) => renderTemplate("modules/fx-browser/templates/asset-card.hbs", asset)));
    grid.innerHTML = cards.join("");
    this.#activateAssetCards();
  }

  async #onAssetContextMenu(event, asset) {
    event.preventDefault();
    event.stopPropagation();
    const action = window.prompt("Action: rename, favorite, move", asset.favorite ? "favorite" : "rename");
    if (!action) return;

    if (action === "rename") {
      const name = window.prompt("Nouveau nom virtuel", asset.displayName || asset.name);
      if (name !== null) await FXLibraryManager.renameAsset(asset.path, name, asset.sourceId);
    } else if (action === "favorite") {
      await FXLibraryManager.toggleFavorite(asset.path, asset.sourceId);
    } else if (action === "move") {
      const folders = this.library.folders.map((folder) => `${folder.id}: ${folder.name}`).join("\n");
      const folderId = window.prompt(`Dossier cible (laisser vide pour retirer):\n${folders}`, asset.virtualFolderId || "");
      if (folderId !== null) await FXLibraryManager.moveAsset(asset.path, folderId, asset.sourceId);
    }

    this.#refreshLibrary();
    await this.#renderAssetList();
  }

  async #onFolderContextMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    const folderId = event.target?.closest?.("[data-folder-filter]")?.dataset?.folderFilter ?? "";
    const action = window.prompt("Action dossier: new, rename, delete", folderId ? "rename" : "new");
    if (!action) return;

    if (action === "new") {
      const name = window.prompt("Nom du dossier virtuel", "Nouveau dossier");
      if (name !== null) await FXLibraryManager.createFolder(name);
    } else if (action === "rename" && folderId) {
      const folder = this.library.folders.find((item) => item.id === folderId);
      const name = window.prompt("Nouveau nom du dossier", folder?.name ?? "");
      if (name !== null) await FXLibraryManager.renameFolder(folderId, name);
    } else if (action === "delete" && folderId) {
      await FXLibraryManager.deleteFolder(folderId);
      if (this.folderFilter === folderId) {
        this.folderFilter = "";
        this.specialFilter = "all";
      }
    }

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
