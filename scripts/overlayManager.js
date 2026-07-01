import { DEFAULT_PLACEMENT, FLAGS, MISSING_ASSET_MESSAGE } from "./constants.js";
import { FXBrowserSettings } from "./settings.js";
import { canUseCanvas, getGridSize, notify } from "./utils.js";

export class FXOverlayManager {
  static getScene() {
    return canvas?.scene ?? game.scenes?.active ?? null;
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
      const created = await canvas.scene.createEmbeddedDocuments("Tile", [this.#toTileData(asset, dropEvent)]);
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

  static async cleanupExperimentRemnants() {
    if (!game.user?.isGM) return;
    const scene = this.getScene();
    if (!scene) return;
    const lightIds = this.#collectionValues(scene.lights)
      .filter((light) => light.getFlag?.(FLAGS.SCOPE, "generatedLight") === true)
      .map((light) => light.id);
    if (lightIds.length) await scene.deleteEmbeddedDocuments("AmbientLight", lightIds);

    const tileUpdates = this.#collectionValues(scene.tiles)
      .filter((tile) => this.isOverlayDocument(tile))
      .map((tile) => this.#getRemnantCleanupUpdate(tile))
      .filter(Boolean);
    if (tileUpdates.length) await scene.updateEmbeddedDocuments("Tile", tileUpdates);
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
      alpha: 1,
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
    if (Number.isFinite(Number(event?.x)) && Number.isFinite(Number(event?.y))) {
      return { x: Number(event.x), y: Number(event.y) };
    }

    const point = { x: event.clientX, y: event.clientY };
    if (canvas?.canvasCoordinatesFromClient) return canvas.canvasCoordinatesFromClient(point);
    if (canvas?.app?.renderer?.events?.pointer) return canvas.app.renderer.events.pointer.getLocalPosition(canvas.stage);
    return canvas.stage.worldTransform.applyInverse(point);
  }

  static #getRemnantCleanupUpdate(tile) {
    const flags = tile.flags?.[FLAGS.SCOPE] ?? {};
    const update = {
      _id: tile.id
    };

    for (const key of ["linkedLightId", "linkedTileId", "generatedLight", "mode", "renderMode", "foreground"]) {
      if (Object.prototype.hasOwnProperty.call(flags, key)) update[`flags.${FLAGS.SCOPE}.-=${key}`] = null;
    }
    if (Number(tile.sort ?? 0) > 1) update.sort = 1;
    if (Number(tile.elevation ?? 0) > 1) update.elevation = 1;
    if (Number(tile.alpha ?? 1) !== 1) update.alpha = 1;
    return Object.keys(update).length > 1 ? update : null;
  }

  static #collectionValues(collection) {
    if (!collection) return [];
    if (typeof collection.filter === "function") return collection.filter(() => true);
    if (typeof collection.values === "function") return Array.from(collection.values());
    return Array.from(collection);
  }
}
