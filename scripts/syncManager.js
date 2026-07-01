import { FLAGS } from "./constants.js";

export class FXSyncManager {
  static register() {
    Hooks.on("createTile", (tile, options) => this.#refreshIfOverlay(tile, options));
    Hooks.on("updateTile", (tile, changes, options) => this.#refreshIfOverlay(tile, options));
    Hooks.on("deleteTile", (tile, options) => this.#refreshIfOverlay(tile, options));
    Hooks.on("canvasReady", () => Hooks.callAll("fxBrowserOverlaySceneChanged", canvas.scene));
  }

  static #refreshIfOverlay(tile, options = {}) {
    if (!tile?.getFlag?.(FLAGS.SCOPE, FLAGS.IS_OVERLAY)) return;
    if (options.fxBrowserDrop) return;
    Hooks.callAll("fxBrowserOverlaySceneChanged", tile.parent);
  }
}
