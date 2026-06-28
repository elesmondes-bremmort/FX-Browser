import { FXOverlayManager } from "./overlayManager.js";

const DRAG_TYPE = "fx-browser-overlay";
const MIME_TYPE = "application/x-fx-browser-overlay";

export class FXDragDrop {
  constructor(getAssetById) {
    this.getAssetById = getAssetById;
    this.boundDrop = this.#onCanvasDrop.bind(this);
    this.boundDragOver = this.#onDragOver.bind(this);
    this.lastDropKey = null;
  }

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
      event.dataTransfer.effectAllowed = "copy";
    });
  }

  bindCanvasDrop() {
    document.addEventListener("dragover", this.boundDragOver, true);
    document.addEventListener("drop", this.boundDrop, true);
  }

  unbindCanvasDrop() {
    document.removeEventListener("dragover", this.boundDragOver, true);
    document.removeEventListener("drop", this.boundDrop, true);
  }

  #onDragOver(event) {
    if (!this.#isCanvasEvent(event) || !this.#hasOverlayPayload(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  }

  async #onCanvasDrop(event) {
    if (!this.#isCanvasEvent(event)) return;

    const payload = this.#readPayload(event);
    if (payload?.type !== DRAG_TYPE) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const dropKey = `${payload.assetPath}-${event.clientX}-${event.clientY}-${Math.round(event.timeStamp / 250)}`;
    if (this.lastDropKey === dropKey) return;
    this.lastDropKey = dropKey;
    const asset = this.getAssetById(payload.id) ?? payload;
    await FXOverlayManager.createFromAsset(asset, event);
  }

  #readPayload(event) {
    const raw = event.dataTransfer?.getData(MIME_TYPE) || event.dataTransfer?.getData("application/json");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  #isCanvasEvent(event) {
    return Boolean(event.target?.closest?.("#board, #canvas, canvas"));
  }

  #hasOverlayPayload(event) {
    return Array.from(event.dataTransfer?.types ?? []).includes(MIME_TYPE);
  }
}
