import { debugLog } from "./utils.js";

const DRAG_TYPE = "fx-browser-overlay";
const MIME_TYPE = "application/x-fx-browser-overlay";

export class FXDragDrop {
  activateCard(card, asset) {
    card.draggable = true;
    card.addEventListener("dragstart", (event) => {
      if (!event.dataTransfer) return;
      const payload = JSON.stringify({
        type: DRAG_TYPE,
        id: asset.id,
        assetPath: asset.path,
        name: asset.name,
        category: asset.category,
        categoryLabel: asset.categoryLabel,
        playback: asset.playback
      });
      event.dataTransfer.setData(MIME_TYPE, payload);
      event.dataTransfer.setData("application/json", payload);
      event.dataTransfer.setData("text/plain", payload);
      event.dataTransfer.effectAllowed = "copy";
      debugLog("drag start", asset.path);
    });
  }

  static isFxDropData(data) {
    return data?.type === DRAG_TYPE && typeof (data.assetPath ?? data.path) === "string";
  }
}
