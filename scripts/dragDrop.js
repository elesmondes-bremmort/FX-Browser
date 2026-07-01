import { FXOverlayManager } from "./overlayManager.js";
import { debugLog } from "./utils.js";

const DRAG_TYPE = "fx-browser-overlay";
const MIME_TYPE = "application/x-fx-browser-overlay";

export class FXDragDrop {
  constructor(getAssetById) {
    this.getAssetById = getAssetById;
    this.boundDrop = this.#onCanvasDrop.bind(this);
    this.boundDragOver = this.#onDragOver.bind(this);
    this.lastDropKey = null;
    this.activeDropKeys = new Set();
    this.boundTargets = new Set();
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
      debugLog("drag start", asset.path);
    });
  }

  bindCanvasDrop() {
    const targets = this.#getCanvasDropTargets();
    if (!targets.length) {
      Hooks.once("canvasReady", () => this.bindCanvasDrop());
      return;
    }

    for (const target of targets) {
      if (this.boundTargets.has(target)) continue;
      target.addEventListener("dragover", this.boundDragOver);
      target.addEventListener("drop", this.boundDrop);
      this.boundTargets.add(target);
    }
  }

  unbindCanvasDrop() {
    for (const target of this.boundTargets) {
      target.removeEventListener("dragover", this.boundDragOver);
      target.removeEventListener("drop", this.boundDrop);
    }
    this.boundTargets.clear();
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
    debugLog("drop received");
    debugLog("assetPath", payload.assetPath);

    const dropKey = `${payload.assetPath}-${Math.round(event.clientX)}-${Math.round(event.clientY)}`;
    if (this.lastDropKey === dropKey || this.activeDropKeys.has(dropKey)) {
      debugLog("drop ignored as duplicate", dropKey);
      return;
    }

    this.lastDropKey = dropKey;
    this.activeDropKeys.add(dropKey);
    const asset = this.getAssetById(payload.id) ?? payload;
    try {
      await FXOverlayManager.createFromAsset(asset, event);
      debugLog("drop complete");
    } finally {
      window.setTimeout(() => {
        this.activeDropKeys.delete(dropKey);
        if (this.lastDropKey === dropKey) this.lastDropKey = null;
      }, 750);
    }
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
    const view = canvas?.app?.view;
    if (!(view instanceof HTMLCanvasElement)) return false;
    const rect = view.getBoundingClientRect();
    return event.clientX >= rect.left
      && event.clientX <= rect.right
      && event.clientY >= rect.top
      && event.clientY <= rect.bottom;
  }

  #hasOverlayPayload(event) {
    return Array.from(event.dataTransfer?.types ?? []).includes(MIME_TYPE);
  }

  #getCanvasDropTargets() {
    return [
      canvas?.app?.view,
      document.getElementById("board"),
      document.getElementById("canvas")
    ].filter((target, index, targets) => target instanceof HTMLElement && targets.indexOf(target) === index);
  }
}
