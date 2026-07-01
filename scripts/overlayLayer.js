import { CANVAS_EDIT_TOOL_ID } from "./constants.js";
import { FXOverlayManager } from "./overlayManager.js";

const CANVAS_LISTENER_OPTIONS = { capture: true };

export class FXOverlayLayer {
  static active = false;
  static selectedOverlayId = null;
  static dragState = null;
  static overlayContainer = null;
  static overlayFrame = null;
  static overlayLabel = null;
  static boundCanvas = null;
  static boundPointerDown = null;
  static boundPointerMove = null;
  static boundPointerUp = null;

  static register() {
    this.boundPointerDown = (event) => this.#onPointerDown(event);
    this.boundPointerMove = (event) => this.#onPointerMove(event);
    this.boundPointerUp = (event) => this.#onPointerUp(event);

    Hooks.on("canvasReady", () => {
      this.#bindCanvasEvents();
      this.#ensureSelectionOverlay();
      this.redrawSelection();
      this.applyAll();
    });
    Hooks.once("ready", () => this.applyAll());
    Hooks.on("renderSceneControls", () => {
      this.syncEditModeFromControls();
      this.applyAll();
      window.setTimeout(() => this.applyAll(), 0);
    });
    Hooks.on("activateTilesLayer", () => this.applyAll());
    Hooks.on("createTile", (tile) => {
      window.setTimeout(() => this.applyTileInteractivity(FXOverlayManager.getPlaceable(tile.id)), 0);
    });
    Hooks.on("drawTile", (tile) => this.applyTileInteractivity(tile));
    Hooks.on("updateTile", (tile) => {
      this.applyTileInteractivity(tile);
      if (tile.id === this.selectedOverlayId) this.redrawSelection();
    });
    Hooks.on("deleteTile", (tile) => {
      if (tile.id === this.selectedOverlayId) this.clearSelection();
    });
    Hooks.on("controlTile", (tile, controlled) => {
      if (!controlled || !FXOverlayManager.isOverlayPlaceable(tile)) return;
      if (this.isNativeTileSelectActive()) return;
      if (!this.isEditModeActive()) {
        tile.release?.();
        return;
      }
      this.selectOverlay(tile.document.id);
    });
    document.addEventListener("keydown", (event) => this.#onKeyDown(event));
  }

  static setEditMode(active) {
    const next = Boolean(active);
    if (this.active === next) {
      this.applyAll();
      this.redrawSelection();
      return;
    }

    this.active = next;
    if (!next) this.clearSelection();
    this.applyAll();
    this.redrawSelection();
  }

  static syncEditModeFromControls() {
    const toolName = this.#getActiveToolName();
    if (toolName) this.setEditMode(toolName === CANVAS_EDIT_TOOL_ID);
  }

  static isEditModeActive() {
    return this.active || this.#getActiveToolName() === CANVAS_EDIT_TOOL_ID;
  }

  static isNativeTileSelectActive() {
    return this.#getActiveControlName() === "tiles" && this.#getActiveToolName() === "select";
  }

  static selectOverlay(id, { pan = false } = {}) {
    if (!id) return;
    const tile = FXOverlayManager.getPlaceable(id);
    if (!tile || !FXOverlayManager.isOverlayPlaceable(tile)) return;
    this.selectedOverlayId = id;
    this.setEditMode(true);
    this.redrawSelection();
    if (pan) canvas?.animatePan?.({ x: tile.center.x, y: tile.center.y, duration: 250 });
    Hooks.callAll("fxBrowserOverlaySelected", id);
  }

  static clearSelection() {
    this.selectedOverlayId = null;
    this.dragState = null;
    this.redrawSelection();
  }

  static applyAll() {
    for (const tile of canvas?.tiles?.placeables ?? []) this.applyTileInteractivity(tile);
  }

  static applyTileInteractivity(tile) {
    if (!FXOverlayManager.isOverlayPlaceable(tile)) return;
    const active = this.isNativeTileSelectActive();
    this.#setTilePointerState(tile, active);
    if (!active && !this.isEditModeActive() && tile.controlled) tile.release?.();
  }

  static findFxAtPoint(sceneX, sceneY) {
    return [...(canvas?.tiles?.placeables ?? [])]
      .filter((tile) => FXOverlayManager.isOverlayPlaceable(tile) && !tile.document?.hidden)
      .sort((a, b) => this.#getTileSort(b) - this.#getTileSort(a))
      .find((tile) => this.#containsPoint(tile, sceneX, sceneY)) ?? null;
  }

  static redrawSelection(preview = null) {
    this.#ensureSelectionOverlay();
    const frame = this.overlayFrame;
    const label = this.overlayLabel;
    if (!frame || !label) return;

    frame.clear();
    label.visible = false;

    if (!this.isEditModeActive() || !this.selectedOverlayId) return;
    const tile = FXOverlayManager.getPlaceable(this.selectedOverlayId);
    if (!tile) return;

    const rect = preview ?? this.#getTileRect(tile);
    frame.lineStyle(4, 0xd7b45f, 0.95);
    frame.beginFill(0xd7b45f, 0.06);
    frame.drawRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height);
    frame.endFill();
    frame.position.set(rect.x + rect.width / 2, rect.y + rect.height / 2);
    frame.rotation = (Number(rect.rotation) || 0) * Math.PI / 180;

    label.text = tile.document?.name || tile.document?.id || "FX Overlay";
    label.visible = true;
    label.position.set(rect.x, rect.y - 22);
  }

  static #bindCanvasEvents() {
    const view = canvas?.app?.view;
    if (!(view instanceof HTMLCanvasElement) || this.boundCanvas === view) return;
    if (this.boundCanvas) this.#unbindCanvasEvents();
    view.addEventListener("pointerdown", this.boundPointerDown, CANVAS_LISTENER_OPTIONS);
    view.addEventListener("pointermove", this.boundPointerMove, CANVAS_LISTENER_OPTIONS);
    view.addEventListener("pointerup", this.boundPointerUp, CANVAS_LISTENER_OPTIONS);
    view.addEventListener("pointercancel", this.boundPointerUp, CANVAS_LISTENER_OPTIONS);
    this.boundCanvas = view;
  }

  static #unbindCanvasEvents() {
    this.boundCanvas?.removeEventListener("pointerdown", this.boundPointerDown, CANVAS_LISTENER_OPTIONS);
    this.boundCanvas?.removeEventListener("pointermove", this.boundPointerMove, CANVAS_LISTENER_OPTIONS);
    this.boundCanvas?.removeEventListener("pointerup", this.boundPointerUp, CANVAS_LISTENER_OPTIONS);
    this.boundCanvas?.removeEventListener("pointercancel", this.boundPointerUp, CANVAS_LISTENER_OPTIONS);
    this.boundCanvas = null;
  }

  static #ensureSelectionOverlay() {
    if (!canvas?.stage || !globalThis.PIXI) return;
    if (this.overlayContainer && !this.overlayContainer.destroyed) return;

    this.overlayContainer = new PIXI.Container();
    this.overlayContainer.eventMode = "none";
    this.overlayContainer.interactive = false;
    this.overlayContainer.zIndex = 999999;
    this.overlayFrame = new PIXI.Graphics();
    this.overlayLabel = new PIXI.Text("", {
      fill: 0xf2ece2,
      fontFamily: "Arial",
      fontSize: 13,
      stroke: 0x000000,
      strokeThickness: 4
    });
    this.overlayLabel.eventMode = "none";
    this.overlayContainer.addChild(this.overlayFrame, this.overlayLabel);
    canvas.stage.sortableChildren = true;
    canvas.stage.addChild(this.overlayContainer);
  }

  static #onPointerDown(event) {
    if (!this.isEditModeActive()) return;
    if (!this.#isCanvasPointerEvent(event)) return;

    const point = this.#eventToScenePoint(event);
    if (!point) return;

    const tile = this.findFxAtPoint(point.x, point.y);
    if (!tile) {
      this.clearSelection();
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this.selectedOverlayId = tile.document.id;
    this.dragState = {
      id: tile.document.id,
      start: point,
      original: this.#getTileRect(tile),
      moved: false
    };
    this.redrawSelection();
    Hooks.callAll("fxBrowserOverlaySelected", tile.document.id);
    event.preventDefault();
    event.stopPropagation();
  }

  static #onPointerMove(event) {
    if (!this.dragState) return;
    const point = this.#eventToScenePoint(event);
    if (!point) return;

    const dx = point.x - this.dragState.start.x;
    const dy = point.y - this.dragState.start.y;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) this.dragState.moved = true;
    this.redrawSelection({
      ...this.dragState.original,
      x: this.dragState.original.x + dx,
      y: this.dragState.original.y + dy
    });
    event.preventDefault();
    event.stopPropagation();
  }

  static async #onPointerUp(event) {
    if (!this.isEditModeActive() || !this.dragState) return;
    const drag = this.dragState;
    this.dragState = null;

    if (drag.moved) {
      const point = this.#eventToScenePoint(event);
      if (point) {
        await FXOverlayManager.updateOverlay(drag.id, {
          x: drag.original.x + point.x - drag.start.x,
          y: drag.original.y + point.y - drag.start.y
        });
      }
    }

    this.redrawSelection();
    event.preventDefault();
    event.stopPropagation();
  }

  static async #onKeyDown(event) {
    if (!this.isEditModeActive()) return;
    if (!["Delete", "Del"].includes(event.key) && event.code !== "Delete") return;
    if (this.#isTextInput(event.target)) return;

    const id = this.selectedOverlayId;
    if (!id) return;
    event.preventDefault();
    event.stopPropagation();
    await FXOverlayManager.deleteOverlay(id);
    this.clearSelection();
  }

  static #eventToScenePoint(event) {
    if (!canvas?.stage) return null;
    const point = { x: event.clientX, y: event.clientY };
    if (canvas.canvasCoordinatesFromClient) return canvas.canvasCoordinatesFromClient(point);
    return canvas.stage.worldTransform.applyInverse(point);
  }

  static #isCanvasPointerEvent(event) {
    const view = canvas?.app?.view;
    if (!(view instanceof HTMLCanvasElement)) return false;
    const rect = view.getBoundingClientRect();
    return event.clientX >= rect.left
      && event.clientX <= rect.right
      && event.clientY >= rect.top
      && event.clientY <= rect.bottom;
  }

  static #getTileRect(tile) {
    const document = tile.document;
    return {
      x: Number(document.x ?? tile.x) || 0,
      y: Number(document.y ?? tile.y) || 0,
      width: Math.abs(Number(document.width ?? tile.width) || 0),
      height: Math.abs(Number(document.height ?? tile.height) || 0),
      rotation: Number(document.rotation ?? tile.rotation) || 0
    };
  }

  static #containsPoint(tile, sceneX, sceneY) {
    const rect = this.#getTileRect(tile);
    if (!rect.width || !rect.height) return false;

    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    const radians = -rect.rotation * Math.PI / 180;
    const dx = sceneX - centerX;
    const dy = sceneY - centerY;
    const localX = dx * Math.cos(radians) - dy * Math.sin(radians);
    const localY = dx * Math.sin(radians) + dy * Math.cos(radians);
    return Math.abs(localX) <= rect.width / 2 && Math.abs(localY) <= rect.height / 2;
  }

  static #getTileSort(tile) {
    const document = tile.document;
    return Number(document?.elevation ?? tile.elevation ?? 0) * 100000 + Number(document?.sort ?? tile.zIndex ?? 0);
  }

  static #getActiveToolName() {
    const tool = ui?.controls?.tool;
    return tool?.name ?? null;
  }

  static #getActiveControlName() {
    const control = ui?.controls?.control;
    return control?.name ?? null;
  }

  static #setTilePointerState(tile, active) {
    const eventMode = active ? "static" : "none";
    const interactive = Boolean(active);
    const cursor = active ? "pointer" : null;
    const targets = [tile, tile.mesh, tile.bg, tile.controlIcon].filter(Boolean);

    for (const target of targets) {
      target.eventMode = eventMode;
      target.interactive = interactive;
      target.interactiveChildren = interactive;
      target.cursor = cursor;
    }
  }

  static #isTextInput(target) {
    const element = target instanceof HTMLElement ? target : null;
    if (!element) return false;
    if (element.isContentEditable) return true;
    return ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
  }
}
