import { FLAGS } from "./constants.js";

export class FXOverlayLayer {
  static register() {
    Hooks.on("controlTile", (tile, controlled) => {
      if (!controlled) return;
      if (tile.document?.getFlag?.(FLAGS.SCOPE, FLAGS.IS_OVERLAY)) {
        Hooks.callAll("fxBrowserOverlaySelected", tile.document.id);
      }
    });
  }
}
