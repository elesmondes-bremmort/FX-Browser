import { FLAGS } from "./constants.js";
import { FXBrowserSettings } from "./settings.js";

export class LightCompensationManager {
  static register() {
    Hooks.on("updateTile", (tile, changes) => this.#onTileUpdate(tile, changes));
    Hooks.on("deleteTile", (tile, options) => this.#onTileDelete(tile, options));
  }

  static async createLinkedLight(tile) {
    if (!game.user?.isGM || !tile) return null;
    const preset = FXBrowserSettings.getLightCompensation();
    if (!preset.enabled) return null;

    const scene = tile.parent ?? canvas?.scene;
    if (!scene) return null;

    const created = await scene.createEmbeddedDocuments("AmbientLight", [this.#toLightData(tile, preset)], { fxBrowserLight: true });
    const light = created?.[0] ?? null;
    if (!light) return null;

    await tile.setFlag?.(FLAGS.SCOPE, "linkedLightId", light.id);
    return light;
  }

  static async syncAll(scene = canvas?.scene) {
    if (!game.user?.isGM || !scene) return;
    const updates = [];
    for (const tile of this.#getFxTiles(scene)) {
      const light = this.#getLinkedLight(scene, tile);
      if (!light) continue;
      updates.push({ _id: light.id, ...this.#getLightPosition(tile) });
    }
    if (updates.length) await scene.updateEmbeddedDocuments("AmbientLight", updates, { fxBrowserLightSync: true });
  }

  static async deleteGeneratedLights(scene = canvas?.scene, tileIds = null) {
    if (!game.user?.isGM || !scene) return;
    const ids = this.#getGeneratedLights(scene)
      .filter((light) => !tileIds || tileIds.has(light.getFlag?.(FLAGS.SCOPE, "linkedTileId")))
      .map((light) => light.id);
    if (ids.length) await scene.deleteEmbeddedDocuments("AmbientLight", ids, { fxBrowserLightDelete: true });
  }

  static async #onTileUpdate(tile, changes = {}) {
    if (!game.user?.isGM || !this.#isFxTile(tile)) return;
    if (!("x" in changes || "y" in changes || "width" in changes || "height" in changes)) return;
    const scene = tile.parent ?? canvas?.scene;
    const light = this.#getLinkedLight(scene, tile);
    if (!scene || !light) return;
    await scene.updateEmbeddedDocuments("AmbientLight", [{ _id: light.id, ...this.#getLightPosition(tile) }], { fxBrowserLightSync: true });
  }

  static async #onTileDelete(tile, options = {}) {
    if (!game.user?.isGM || options.fxBrowserDeleteAll || !this.#isFxTile(tile)) return;
    const scene = tile.parent ?? canvas?.scene;
    const light = this.#getLinkedLight(scene, tile);
    if (!scene || !light) return;
    await scene.deleteEmbeddedDocuments("AmbientLight", [light.id], { fxBrowserLightDelete: true });
  }

  static #toLightData(tile, preset) {
    const radius = Math.max(0, Number(preset.radius) || 0);
    const level = this.#clamp(Number(preset.level), 0, 1);
    const intensity = this.#clamp(Number(preset.intensity), 0, 1);
    return {
      ...this.#getLightPosition(tile),
      rotation: 0,
      hidden: false,
      walls: false,
      vision: false,
      config: {
        bright: radius * level,
        dim: radius,
        color: preset.color || "#ffdca8",
        alpha: intensity,
        angle: 360,
        coloration: 1,
        luminosity: level,
        attenuation: 0.5,
        saturation: 0,
        contrast: 0,
        shadows: 0
      },
      flags: {
        [FLAGS.SCOPE]: {
          generatedLight: true,
          linkedTileId: tile.id
        }
      }
    };
  }

  static #getLightPosition(tile) {
    return {
      x: Number(tile.x ?? 0) + Number(tile.width ?? 0) / 2,
      y: Number(tile.y ?? 0) + Number(tile.height ?? 0) / 2
    };
  }

  static #getFxTiles(scene) {
    return this.#collectionValues(scene?.tiles).filter((tile) => this.#isFxTile(tile));
  }

  static #getGeneratedLights(scene) {
    return this.#collectionValues(scene?.lights).filter((light) => light.getFlag?.(FLAGS.SCOPE, "generatedLight") === true);
  }

  static #getLinkedLight(scene, tile) {
    if (!scene || !tile) return null;
    const linkedLightId = tile.getFlag?.(FLAGS.SCOPE, "linkedLightId");
    const byId = linkedLightId ? scene.lights?.get?.(linkedLightId) : null;
    if (byId?.getFlag?.(FLAGS.SCOPE, "generatedLight") === true) return byId;
    return this.#getGeneratedLights(scene).find((light) => light.getFlag?.(FLAGS.SCOPE, "linkedTileId") === tile.id) ?? null;
  }

  static #isFxTile(tile) {
    if (!tile) return false;
    if (tile.getFlag?.(FLAGS.SCOPE, "overlay") === true) return true;
    const src = tile.texture?.src ?? tile.getFlag?.(FLAGS.SCOPE, "assetPath") ?? "";
    return typeof src === "string" && src.toLowerCase().includes(".webm");
  }

  static #clamp(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
  }

  static #collectionValues(collection) {
    if (!collection) return [];
    if (typeof collection.filter === "function") return collection.filter(() => true);
    if (typeof collection.values === "function") return Array.from(collection.values());
    return Array.from(collection);
  }
}
