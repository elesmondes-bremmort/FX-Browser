import { FXOverlayManager } from "./overlayManager.js";

export class FXDragDrop {
  constructor(getAssetById) {
    this.getAssetById = getAssetById;
    this.boundDrop = this.#onCanvasDrop.bind(this);
    this.boundDragOver = this.#onDragOver.bind(this);
  }

  activateCard(card, asset) {
    card.draggable = true;
    card.addEventListener("dragstart", (event) => {
      if (!event.dataTransfer) return;
      const payload = JSON.stringify({ type: "fx-browser.asset", id: asset.id, path: asset.path });
      event.dataTransfer.setData("text/plain", payload);
      event.dataTransfer.setData("application/json", payload);
      event.dataTransfer.effectAllowed = "copy";
    });
  }

  bindCanvasDrop() {
    document.addEventListener("dragover", this.boundDragOver);
    document.addEventListener("drop", this.boundDrop);
  }

  unbindCanvasDrop() {
    document.removeEventListener("dragover", this.boundDragOver);
    document.removeEventListener("drop", this.boundDrop);
  }

  #onDragOver(event) {
    if (this.#isCanvasEvent(event)) event.preventDefault();
  }

  async #onCanvasDrop(event) {
    if (!this.#isCanvasEvent(event)) return;

    const payload = this.#readPayload(event);
    if (payload?.type !== "fx-browser.asset") return;

    event.preventDefault();
    const asset = this.getAssetById(payload.id) ?? payload;
    await FXOverlayManager.createFromAsset(asset, event);
  }

  #readPayload(event) {
    const raw = event.dataTransfer?.getData("application/json") || event.dataTransfer?.getData("text/plain");
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
}
