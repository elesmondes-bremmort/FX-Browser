import { DEFAULT_PLACEMENT, FLAGS, MISSING_ASSET_MESSAGE } from "./constants.js";
import { FXBrowserSettings } from "./settings.js";
import { canUseCanvas, debugLog, getGridSize, notify, stableId } from "./utils.js";

export class FXOverlayManager {
  static getScene() {
    return canvas?.scene ?? game.scenes?.active ?? null;
  }

  static getOverlays(scene = this.getScene()) {
    if (!scene) return [];
    return scene.tiles
      .filter((tile) => this.isOverlayDocument(tile))
      .map((tile) => this.fromTile(tile))
      .sort((a, b) => (a.zIndex - b.zIndex) || a.name.localeCompare(b.name));
  }

  static fromTile(tile) {
    const data = tile.getFlag(FLAGS.SCOPE, FLAGS.DATA) ?? {};
    return {
      id: tile.id,
      assetPath: tile.getFlag(FLAGS.SCOPE, "assetPath") ?? tile.texture?.src ?? data.assetPath ?? "",
      name: tile.name ?? data.name ?? "FX Overlay",
      x: tile.x,
      y: tile.y,
      width: tile.width,
      height: tile.height,
      rotation: tile.rotation ?? 0,
      opacity: tile.alpha ?? data.opacity ?? 1,
      loop: tile.video?.loop ?? data.loop ?? true,
      visible: !tile.hidden,
      locked: Boolean(tile.locked),
      zIndex: tile.elevation ?? tile.sort ?? data.zIndex ?? 0,
      type: data.type ?? "webm",
      tileId: tile.id
    };
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

    const position = this.#getDropPosition(dropEvent);
    const placement = FXBrowserSettings.getPlacement();
    const gridSize = getGridSize();
    const width = Math.max(0.25, Number(placement.width) || DEFAULT_PLACEMENT.width) * gridSize;
    const height = Math.max(0.25, Number(placement.height) || DEFAULT_PLACEMENT.height) * gridSize;
    const name = placement.name || asset.name || "FX Overlay";
    const overlayData = {
      id: stableId(`${assetPath}-${Date.now()}`),
      assetPath,
      name,
      x: position.x - width / 2,
      y: position.y - height / 2,
      width,
      height,
      rotation: Number(placement.rotation) || 0,
      opacity: Number.isFinite(Number(placement.alpha)) ? Number(placement.alpha) : 1,
      loop: Boolean(placement.loop),
      visible: placement.visible !== false,
      locked: Boolean(placement.locked),
      zIndex: Number.isFinite(Number(placement.zIndex ?? placement.elevation)) ? Number(placement.zIndex ?? placement.elevation) : DEFAULT_PLACEMENT.zIndex,
      type: "webm"
    };

    const tileData = this.#toTileData(overlayData);

    try {
      debugLog("creating overlay", assetPath);
      const created = await canvas.scene.createEmbeddedDocuments("Tile", [tileData], { fxBrowserDrop: true });
      debugLog("update scene flags");
      const tile = created?.[0] ?? null;
      if (tile) {
        await this.#renderTile(tile);
        Hooks.callAll("fxBrowserOverlayChanged", canvas.scene, this.fromTile(tile));
      }
      return tile;
    } catch (error) {
      console.error("FX Browser | Failed to create FX Overlay", error);
      notify(game.i18n.localize("fx-browser.errors.overlayCreate"), "error");
      return null;
    }
  }

  static async updateOverlay(id, updates) {
    if (!game.user?.isGM) return null;
    const scene = this.getScene();
    const tile = scene?.tiles.get(id);
    if (!this.isOverlayDocument(tile)) return null;

    const current = this.fromTile(tile);
    const next = { ...current, ...updates };
    const updateData = {
      _id: id,
      x: Number(next.x),
      y: Number(next.y),
      width: Number(next.width),
      height: Number(next.height),
      rotation: Number(next.rotation) || 0,
      alpha: Number(next.opacity),
      hidden: !next.visible,
      locked: Boolean(next.locked),
      elevation: Number(next.zIndex) || 0,
      sort: Number(next.zIndex) || 0,
      video: {
        autoplay: true,
        loop: Boolean(next.loop),
        volume: 0
      },
      flags: {
        [FLAGS.SCOPE]: {
          overlay: true,
          assetPath: next.assetPath,
          createdBy: "fx-browser",
          [FLAGS.IS_OVERLAY]: true,
          [FLAGS.DATA]: {
            id,
            assetPath: next.assetPath,
            name: next.name,
            x: Number(next.x),
            y: Number(next.y),
            width: Number(next.width),
            height: Number(next.height),
            rotation: Number(next.rotation) || 0,
            opacity: Number(next.opacity),
            loop: Boolean(next.loop),
            visible: Boolean(next.visible),
            locked: Boolean(next.locked),
            zIndex: Number(next.zIndex) || 0,
            type: next.type ?? "webm"
          }
        }
      }
    };

    if ("name" in next) updateData.name = next.name;
    const updated = await scene.updateEmbeddedDocuments("Tile", [updateData]);
    Hooks.callAll("fxBrowserOverlayChanged", scene, this.fromTile(updated?.[0] ?? tile));
    return updated?.[0] ?? tile;
  }

  static async deleteOverlay(id) {
    if (!game.user?.isGM) return;
    const scene = this.getScene();
    const tile = scene?.tiles.get(id);
    if (!this.isOverlayDocument(tile)) return;
    await scene.deleteEmbeddedDocuments("Tile", [id]);
    Hooks.callAll("fxBrowserOverlayChanged", scene, null);
  }

  static async deleteAllOverlays() {
    if (!game.user?.isGM) return;
    const scene = this.getScene();
    if (!scene) return;
    const ids = scene.tiles
      .filter((tile) => this.isOverlayDocument(tile))
      .map((tile) => tile.id);
    if (!ids.length) return;
    await scene.deleteEmbeddedDocuments("Tile", ids);
    Hooks.callAll("fxBrowserOverlayChanged", scene, null);
  }

  static getPlaceable(id) {
    return canvas?.tiles?.placeables?.find((tile) => tile.document?.id === id) ?? null;
  }

  static isOverlayDocument(tile) {
    if (!tile) return false;
    if (tile.getFlag?.(FLAGS.SCOPE, "overlay") === true) return true;
    if (tile.getFlag?.(FLAGS.SCOPE, FLAGS.IS_OVERLAY)) return true;
    const data = tile.getFlag?.(FLAGS.SCOPE, FLAGS.DATA) ?? {};
    const src = tile.texture?.src ?? data.assetPath ?? "";
    return typeof src === "string" && src.toLowerCase().includes(".webm");
  }

  static isOverlayPlaceable(tile) {
    return this.isOverlayDocument(tile?.document);
  }

  static #toTileData(overlay) {
    return {
      name: overlay.name,
      x: overlay.x,
      y: overlay.y,
      width: overlay.width,
      height: overlay.height,
      rotation: overlay.rotation,
      alpha: overlay.opacity,
      hidden: !overlay.visible,
      locked: overlay.locked,
      elevation: overlay.zIndex,
      sort: overlay.zIndex,
      texture: {
        src: overlay.assetPath,
        scaleX: 1,
        scaleY: 1
      },
      video: {
        autoplay: true,
        loop: overlay.loop,
        volume: 0
      },
      flags: {
        [FLAGS.SCOPE]: {
          overlay: true,
          assetPath: overlay.assetPath,
          createdBy: "fx-browser",
          [FLAGS.IS_OVERLAY]: true,
          [FLAGS.DATA]: overlay
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

  static async #renderTile(tile) {
    debugLog("render overlay", tile.id);
    const layer = canvas?.tiles;
    const placeable = layer?.placeables?.find((item) => item.document?.id === tile.id);
    if (placeable) {
      placeable.refresh?.();
      return;
    }

    await layer?.draw?.();
  }
}
