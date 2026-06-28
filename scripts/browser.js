import { CATEGORIES } from "./categories.js";
import { DEFAULT_WINDOW_STATE, EMPTY_LIBRARY_MESSAGE } from "./constants.js";
import { FXAssetScanner } from "./assetScanner.js";
import { FXDragDrop } from "./dragDrop.js";
import { FXOverlayControls } from "./overlayControls.js";
import { FXOverlayManager } from "./overlayManager.js";
import { FXPreview } from "./preview.js";
import { FXBrowserSettings } from "./settings.js";
import { clampNumber, localize, notify } from "./utils.js";

export class FXBrowserApp extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "fx-browser-app",
    tag: "section",
    classes: ["fx-browser-window"],
    window: {
      title: "FX Browser",
      icon: "fa-solid fa-wand-magic-sparkles",
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
    this.filteredAssets = this.assets;
    this.selectedAsset = this.assets[0] ?? null;
    this.category = "all";
    this.query = "";
    this.preview = null;
    this.selectedOverlayId = null;
    this.dragDrop = new FXDragDrop((id) => this.assets.find((asset) => asset.id === id));
    this.dragDrop.bindCanvasDrop();
  }

  async _prepareContext() {
    this.#filterAssets();
    const overlays = FXOverlayManager.getOverlays();
    const selectedOverlay = overlays.find((overlay) => overlay.id === this.selectedOverlayId) ?? overlays[0] ?? null;
    this.selectedOverlayId = selectedOverlay?.id ?? null;

    return {
      categories: CATEGORIES.map((category) => ({ ...category, active: category.id === this.category })),
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
      this.render({ force: true });
    });

    root.querySelectorAll("[data-asset-id]").forEach((card) => {
      const asset = this.assets.find((item) => item.id === card.dataset.assetId);
      if (!asset) return;
      this.dragDrop.activateCard(card, asset);
      card.addEventListener("click", () => {
        this.selectedAsset = asset;
        this.render({ force: true });
      });
    });

    root.querySelectorAll("[data-placement]").forEach((input) => {
      input.addEventListener("change", () => this.#savePlacement(root));
      input.addEventListener("input", () => this.#savePlacement(root));
    });
  }

  async close(options) {
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
    const query = this.query.trim().toLowerCase();
    this.filteredAssets = this.assets.filter((asset) => {
      const matchesCategory = this.category === "all" || asset.category === this.category;
      const haystack = `${asset.name} ${asset.path} ${asset.categoryLabel}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      return matchesCategory && matchesQuery;
    });

    if (this.selectedAsset && !this.filteredAssets.some((asset) => asset.id === this.selectedAsset.id)) {
      this.selectedAsset = this.filteredAssets[0] ?? null;
    }
  }

  static async #onRescan() {
    this.assets = await FXAssetScanner.scan();
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

  static toggle() {
    if (!game.user?.isGM) {
      notify(localize("errors.gmOnly"), "warn");
      return;
    }

    if (FXBrowserApp.instance?.rendered) {
      FXBrowserApp.instance.close();
      return;
    }

    FXBrowserApp.instance = new FXBrowserApp();
    FXBrowserApp.instance.render({ force: true });
  }
}

FXBrowserApp.instance = null;
