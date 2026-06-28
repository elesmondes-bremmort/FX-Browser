import { FXBrowserSettings } from "./settings.js";
import { canUseCanvas, getGridSize, notify } from "./utils.js";

export class FXTileCreator {
  static async createFromDrop(asset, dropEvent) {
    if (!asset?.path) {
      notify(game.i18n.localize("fx-browser.errors.missingAsset"), "error");
      return null;
    }

    if (!canUseCanvas()) {
      notify(game.i18n.localize("fx-browser.errors.noScene"), "warn");
      return null;
    }

    const position = this.#getDropPosition(dropEvent);
    const settings = FXBrowserSettings.getPlacement();
    const gridSize = getGridSize();
    const width = Math.max(1, Number(settings.width) || 2) * gridSize;
    const height = Math.max(1, Number(settings.height) || 2) * gridSize;
    const tileData = {
      x: position.x - width / 2,
      y: position.y - height / 2,
      width,
      height,
      rotation: Number(settings.rotation) || 0,
      alpha: Number(settings.alpha),
      elevation: Number(settings.elevation) || 0,
      texture: {
        src: asset.path,
        scaleX: 1,
        scaleY: 1
      },
      video: {
        autoplay: true,
        loop: Boolean(settings.loop),
        volume: 0
      },
      hidden: false,
      locked: false
    };

    if (settings.name) tileData.name = settings.name;

    try {
      const created = await canvas.scene.createEmbeddedDocuments("Tile", [tileData]);
      ui.controls?.initialize?.({ tool: "tiles" });
      return created?.[0] ?? null;
    } catch (error) {
      console.error("FX Browser | Failed to create tile", error);
      notify(game.i18n.localize("fx-browser.errors.tileCreate"), "error");
      return null;
    }
  }

  static #getDropPosition(event) {
    const point = { x: event.clientX, y: event.clientY };
    if (canvas?.canvasCoordinatesFromClient) return canvas.canvasCoordinatesFromClient(point);
    if (canvas?.app?.renderer?.events?.pointer) return canvas.app.renderer.events.pointer.getLocalPosition(canvas.stage);
    return canvas.stage.worldTransform.applyInverse(point);
  }
}
