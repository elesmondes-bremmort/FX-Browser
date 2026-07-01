import { DEFAULT_PLACEMENT, FLAGS, MISSING_ASSET_MESSAGE } from "./constants.js";
import { FXBrowserSettings } from "./settings.js";
import { canUseCanvas, getGridSize, notify } from "./utils.js";

export class FXOverlayManager {
  static NORMAL_MODE = { sort: 1, elevation: 1 };
  static FOREGROUND_MODE = { sort: 999, elevation: 999 };

  static getScene() {
    return canvas?.scene ?? game.scenes?.active ?? null;
  }

  static getSceneFx(scene = this.getScene()) {
    if (!scene) return [];
    return this.#collectionValues(scene.tiles)
      .filter((tile) => this.isOverlayDocument(tile))
      .map((tile) => this.#fromTile(tile))
      .sort((a, b) => (b.elevation - a.elevation) || (b.sort - a.sort) || a.name.localeCompare(b.name));
  }

  static async createFromAsset(asset, dropEvent) {
    if (!game.user?.isGM) return null;

    const assetPath = asset?.path ?? asset?.assetPath;
    if (!assetPath) {
      notify(MISSING_ASSET_MESSAGE, "error");
      return null;
    }

    if (!canUseCanvas()) {
      notify(game.i18n.localize("fx-browser.errors.noScene"), "warn");
      return null;
    }

    try {
      const created = await canvas.scene.createEmbeddedDocuments("Tile", [this.#toTileData(asset, dropEvent)], { fxBrowserDrop: true });
      return created?.[0] ?? null;
    } catch (error) {
      console.error("FX Browser | Failed to create FX tile", error);
      notify(game.i18n.localize("fx-browser.errors.overlayCreate"), "error");
      return null;
    }
  }

  static async deleteAllOverlays() {
    if (!game.user?.isGM) return;
    const scene = this.getScene();
    if (!scene) return;
    const ids = scene.tiles
      .filter((tile) => this.isOverlayDocument(tile))
      .map((tile) => tile.id);
    if (ids.length) await scene.deleteEmbeddedDocuments("Tile", ids);
  }

  static async deleteOverlay(id) {
    if (!game.user?.isGM) return;
    const scene = this.getScene();
    const tile = scene?.tiles?.get?.(id);
    if (!this.isOverlayDocument(tile)) return;
    await scene.deleteEmbeddedDocuments("Tile", [id]);
  }

  static async setOverlayMode(id, mode) {
    if (!game.user?.isGM) return;
    const scene = this.getScene();
    const tile = scene?.tiles?.get?.(id);
    if (!this.isOverlayDocument(tile)) return;
    const values = mode === "foreground" ? this.FOREGROUND_MODE : this.NORMAL_MODE;
    await scene.updateEmbeddedDocuments("Tile", [{ _id: id, ...values }]);
  }

  static async setOverlayVisibility(id, visible) {
    if (!game.user?.isGM) return;
    const scene = this.getScene();
    const tile = scene?.tiles?.get?.(id);
    if (!this.isOverlayDocument(tile)) return;
    await scene.updateEmbeddedDocuments("Tile", [{ _id: id, hidden: !visible }]);
  }

  static async setAllOverlaysMode(mode) {
    if (!game.user?.isGM) return;
    const scene = this.getScene();
    if (!scene) return;
    const values = mode === "foreground" ? this.FOREGROUND_MODE : this.NORMAL_MODE;
    const updates = this.getSceneFx(scene).map((fx) => ({ _id: fx.id, ...values }));
    if (updates.length) await scene.updateEmbeddedDocuments("Tile", updates);
  }

  static async setAllOverlaysVisibility(visible) {
    if (!game.user?.isGM) return;
    const scene = this.getScene();
    if (!scene) return;
    const updates = this.getSceneFx(scene).map((fx) => ({ _id: fx.id, hidden: !visible }));
    if (updates.length) await scene.updateEmbeddedDocuments("Tile", updates);
  }

  static panToOverlay(id) {
    const tile = canvas?.scene?.tiles?.get?.(id);
    if (!tile) return;
    canvas?.animatePan?.({
      x: Number(tile.x ?? 0) + Number(tile.width ?? 0) / 2,
      y: Number(tile.y ?? 0) + Number(tile.height ?? 0) / 2,
      duration: 250
    });
  }

  static async deleteOrphanGeneratedLights() {
    if (!game.user?.isGM) return;
    const scene = this.getScene();
    if (!scene) return;
    const ids = this.#collectionValues(scene.lights)
      .filter((light) => light.getFlag?.(FLAGS.SCOPE, "generatedLight") === true)
      .map((light) => light.id);
    if (ids.length) await scene.deleteEmbeddedDocuments("AmbientLight", ids);
  }

  static isOverlayDocument(tile) {
    if (!tile) return false;
    if (tile.getFlag?.(FLAGS.SCOPE, "overlay") === true) return true;
    const src = tile.texture?.src ?? tile.getFlag?.(FLAGS.SCOPE, "assetPath") ?? "";
    return typeof src === "string" && src.toLowerCase().includes(".webm");
  }

  static #toTileData(asset, dropEvent) {
    const assetPath = asset?.path ?? asset?.assetPath;
    const placement = FXBrowserSettings.getPlacement();
    const gridSize = getGridSize();
    const width = Math.max(0.25, Number(placement.width) || DEFAULT_PLACEMENT.width) * gridSize;
    const height = Math.max(0.25, Number(placement.height) || DEFAULT_PLACEMENT.height) * gridSize;
    const position = this.#getDropPosition(dropEvent);

    return {
      name: placement.name || asset?.name || "FX Tile",
      x: position.x - width / 2,
      y: position.y - height / 2,
      width,
      height,
      rotation: Number(placement.rotation) || 0,
      alpha: Number.isFinite(Number(placement.alpha)) ? Number(placement.alpha) : 1,
      hidden: false,
      locked: false,
      elevation: 1,
      sort: 1,
      texture: {
        src: assetPath,
        scaleX: 1,
        scaleY: 1
      },
      video: {
        autoplay: true,
        loop: Boolean(placement.loop),
        volume: 0
      },
      flags: {
        [FLAGS.SCOPE]: {
          overlay: true,
          assetPath
        }
      }
    };
  }

  static #getDropPosition(event) {
    const point = { x: event.clientX, y: event.clientY };
    if (canvas?.canvasCoordinatesFromClient) return canvas.canvasCoordinatesFromClient(point);
    if (canvas?.app?.renderer?.events?.pointer) return canvas.app.renderer.events.pointer.getLocalPosition(canvas.stage);
    return canvas.stage.worldTransform.applyInverse(point);
  }

  static #fromTile(tile) {
    const sort = Number(tile.sort ?? 0);
    const elevation = Number(tile.elevation ?? 0);
    const assetPath = tile.getFlag?.(FLAGS.SCOPE, "assetPath") ?? tile.texture?.src ?? "";
    const mode = sort >= this.FOREGROUND_MODE.sort || elevation >= this.FOREGROUND_MODE.elevation ? "foreground" : "normal";
    return {
      id: tile.id,
      name: tile.name || "FX Tile",
      assetPath,
      hidden: Boolean(tile.hidden),
      visible: !tile.hidden,
      sort,
      elevation,
      mode,
      modeLabel: mode === "foreground" ? "Premier plan" : "Normal"
    };
  }

  static #collectionValues(collection) {
    if (!collection) return [];
    if (typeof collection.filter === "function") return collection.filter(() => true);
    if (typeof collection.values === "function") return Array.from(collection.values());
    return Array.from(collection);
  }
}
