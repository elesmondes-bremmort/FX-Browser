import { FXOverlayManager } from "./overlayManager.js";
import { clampNumber } from "./utils.js";

export class FXOverlayControls {
  constructor(root, onChange) {
    this.root = root;
    this.onChange = onChange;
  }

  activate(selectedId) {
    this.root.querySelectorAll("[data-overlay-select]").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.dataset.overlaySelect;
        await FXOverlayManager.selectOverlay(id);
        this.onChange?.(id);
      });
    });

    this.root.querySelectorAll("[data-overlay-edit]").forEach((button) => {
      button.addEventListener("click", () => this.onChange?.(button.dataset.overlayEdit));
    });

    this.root.querySelectorAll("[data-overlay-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        await FXOverlayManager.deleteOverlay(button.dataset.overlayDelete);
        this.onChange?.(null);
      });
    });

    const form = this.root.querySelector("[data-overlay-form]");
    if (!form || !selectedId) return;
    form.addEventListener("change", () => this.#save(form, selectedId));
    form.addEventListener("input", () => this.#save(form, selectedId));
    form.querySelector("[data-overlay-delete-selected]")?.addEventListener("click", async () => {
      await FXOverlayManager.deleteOverlay(selectedId);
      this.onChange?.(null);
    });
  }

  async #save(form, id) {
    const field = (name) => form.querySelector(`[name="${name}"]`);
    await FXOverlayManager.updateOverlay(id, {
      name: field("name")?.value ?? "FX Overlay",
      x: clampNumber(field("x")?.value, -100000, 100000, 0),
      y: clampNumber(field("y")?.value, -100000, 100000, 0),
      width: clampNumber(field("width")?.value, 1, 100000, 100),
      height: clampNumber(field("height")?.value, 1, 100000, 100),
      rotation: clampNumber(field("rotation")?.value, -360, 360, 0),
      opacity: clampNumber(field("opacity")?.value, 0, 1, 1),
      loop: Boolean(field("loop")?.checked),
      visible: Boolean(field("visible")?.checked),
      locked: Boolean(field("locked")?.checked),
      zIndex: clampNumber(field("zIndex")?.value, -9999, 9999, 0)
    });
  }
}
