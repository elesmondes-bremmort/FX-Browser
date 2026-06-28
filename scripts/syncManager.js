import { FLAGS } from "./constants.js";

export class FXSyncManager {
  static register() {
    Hooks.on("createTile", (tile) => this.#refreshIfOverlay(tile));
    Hooks.on("updateTile", (tile) => this.#refreshIfOverlay(tile));
    Hooks.on("deleteTile", (tile) => this.#refreshIfOverlay(tile));
    Hooks.on("canvasReady", () => Hooks.callAll("fxBrowserOverlaySceneChanged", canvas.scene));
  }

  static #refreshIfOverlay(tile) {
    if (!tile?.getFlag?.(FLAGS.SCOPE, FLAGS.IS_OVERLAY)) return;
    Hooks.callAll("fxBrowserOverlaySceneChanged", tile.parent);
  }
}
