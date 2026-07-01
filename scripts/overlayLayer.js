import { CANVAS_EDIT_TOOL_ID, FLAGS } from "./constants.js";
import { FXOverlayManager } from "./overlayManager.js";

export class FXOverlayLayer {
  static active = false;
  static selectedOverlayId = null;
  static syncInterval = null;

  static register() {
    Hooks.on("drawTile", (tile) => this.applyTileInteractivity(tile));
    Hooks.on("controlTile", (tile, controlled) => {
      if (!controlled) return;
      if (tile.document?.getFlag?.(FLAGS.SCOPE, FLAGS.IS_OVERLAY)) {
        if (!this.isEditModeActive()) {
          tile.release?.();
          return;
        }
        this.selectedOverlayId = tile.document.id;
        Hooks.callAll("fxBrowserOverlaySelected", tile.document.id);
      }
    });
    Hooks.on("canvasReady", () => this.applyAll());
    Hooks.on("renderSceneControls", () => this.syncEditModeFromControls());
    document.addEventListener("keydown", (event) => this.#onKeyDown(event));
    this.syncInterval = window.setInterval(() => this.syncEditModeFromControls(), 300);
  }

  static setEditMode(active) {
    const next = Boolean(active);
    if (this.active === next) {
      this.applyAll();
      return;
    }
    this.active = next;
    if (!next) this.#releaseControlledOverlays();
    this.applyAll();
  }

  static syncEditModeFromControls() {
    const toolName = this.#getActiveToolName();
    if (!toolName) return;
    this.setEditMode(toolName === CANVAS_EDIT_TOOL_ID);
  }

  static isEditModeActive() {
    const toolName = this.#getActiveToolName();
    return this.active || toolName === CANVAS_EDIT_TOOL_ID;
  }

  static applyAll() {
    for (const tile of canvas?.tiles?.placeables ?? []) this.applyTileInteractivity(tile);
  }

  static applyTileInteractivity(tile) {
    if (!tile?.document?.getFlag?.(FLAGS.SCOPE, FLAGS.IS_OVERLAY)) return;
    const active = this.isEditModeActive();
    tile.eventMode = active ? "static" : "none";
    tile.interactive = active;
    tile.interactiveChildren = active;
    tile.cursor = active ? "move" : null;
    if (!active && tile.controlled) tile.release?.();
  }

  static async #onKeyDown(event) {
    if (!this.isEditModeActive()) return;
    if (event.key !== "Delete") return;
    if (this.#isTextInput(event.target)) return;

    const id = this.selectedOverlayId ?? this.#getControlledOverlayId();
    if (!id) return;
    event.preventDefault();
    event.stopPropagation();
    await FXOverlayManager.deleteOverlay(id);
    this.selectedOverlayId = null;
  }

  static #getControlledOverlayId() {
    const tile = canvas?.tiles?.controlled?.find?.((item) => item.document?.getFlag?.(FLAGS.SCOPE, FLAGS.IS_OVERLAY));
    return tile?.document?.id ?? null;
  }

  static #releaseControlledOverlays() {
    for (const tile of canvas?.tiles?.controlled ?? []) {
      if (tile.document?.getFlag?.(FLAGS.SCOPE, FLAGS.IS_OVERLAY)) tile.release?.();
    }
    this.selectedOverlayId = null;
  }

  static #isTextInput(target) {
    const element = target instanceof HTMLElement ? target : null;
    if (!element) return false;
    if (element.isContentEditable) return true;
    return ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
  }

  static #getActiveToolName() {
    const controls = ui?.controls;
    const direct = [
      controls?.activeTool,
      controls?.tool?.name,
      typeof controls?.tool === "string" ? controls.tool : null
    ].find(Boolean);
    if (direct) return direct;

    const activeControl = controls?.control;
    if (activeControl?.activeTool) return activeControl.activeTool;
    if (activeControl?.tool) return typeof activeControl.tool === "string" ? activeControl.tool : activeControl.tool?.name;

    const controlList = controls?.controls instanceof Map ? Array.from(controls.controls.values()) : controls?.controls;
    if (!Array.isArray(controlList)) return null;
    const active = controlList.find((control) => control.active || control.name === controls?.activeControl || control.name === controls?.control?.name);
    const tool = active?.activeTool ?? active?.tool ?? null;
    return typeof tool === "string" ? tool : tool?.name ?? null;
  }
}
