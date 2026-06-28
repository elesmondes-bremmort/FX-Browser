import { FLAGS } from "./constants.js";

export class FXOverlayRenderer {
  static register() {
    Hooks.on("drawTile", (tile) => {
      if (!tile.document?.getFlag?.(FLAGS.SCOPE, FLAGS.IS_OVERLAY)) return;
      tile.tooltip = tile.document.name ?? "FX Overlay";
    });
  }
}
