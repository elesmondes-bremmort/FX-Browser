import { DEFAULT_LIBRARY_ORGANIZATION, DEFAULT_PLACEMENT, DEFAULT_WINDOW_STATE, MODULE_ID, SETTINGS } from "./constants.js";
import { parseDirectoryList } from "./utils.js";

export class FXBrowserSettings {
  static register() {
    game.settings.register(MODULE_ID, SETTINGS.CUSTOM_DIRECTORIES, {
      name: game.i18n.localize(`${MODULE_ID}.settings.customDirectories.name`),
      hint: game.i18n.localize(`${MODULE_ID}.settings.customDirectories.hint`),
      scope: "world",
      config: true,
      type: String,
      default: ""
    });

    game.settings.register(MODULE_ID, SETTINGS.WINDOW_STATE, {
      scope: "client",
      config: false,
      type: Object,
      default: DEFAULT_WINDOW_STATE
    });

    game.settings.register(MODULE_ID, SETTINGS.PLACEMENT, {
      scope: "client",
      config: false,
      type: Object,
      default: DEFAULT_PLACEMENT
    });

    game.settings.register(MODULE_ID, SETTINGS.ASSET_CACHE, {
      scope: "world",
      config: false,
      type: Object,
      default: { assets: [], scannedAt: null }
    });

    game.settings.register(MODULE_ID, SETTINGS.LAST_SCAN, {
      scope: "world",
      config: false,
      type: String,
      default: ""
    });

    game.settings.register(MODULE_ID, SETTINGS.LIBRARY_ORGANIZATION, {
      scope: "world",
      config: false,
      type: Object,
      default: DEFAULT_LIBRARY_ORGANIZATION
    });
  }

  static getCustomDirectories() {
    return parseDirectoryList(game.settings.get(MODULE_ID, SETTINGS.CUSTOM_DIRECTORIES));
  }

  static getWindowState() {
    return { ...DEFAULT_WINDOW_STATE, ...(game.settings.get(MODULE_ID, SETTINGS.WINDOW_STATE) ?? {}) };
  }

  static async setWindowState(state) {
    await game.settings.set(MODULE_ID, SETTINGS.WINDOW_STATE, {
      ...this.getWindowState(),
      ...state
    });
  }

  static getPlacement() {
    return { ...DEFAULT_PLACEMENT, ...(game.settings.get(MODULE_ID, SETTINGS.PLACEMENT) ?? {}) };
  }

  static async setPlacement(settings) {
    await game.settings.set(MODULE_ID, SETTINGS.PLACEMENT, {
      ...this.getPlacement(),
      ...settings
    });
  }

  static getLibraryOrganization() {
    const organization = game.settings.get(MODULE_ID, SETTINGS.LIBRARY_ORGANIZATION) ?? {};
    return {
      folders: Array.isArray(organization.folders) ? organization.folders : [],
      assets: organization.assets && typeof organization.assets === "object" ? organization.assets : {}
    };
  }

  static async setLibraryOrganization(organization) {
    await game.settings.set(MODULE_ID, SETTINGS.LIBRARY_ORGANIZATION, {
      folders: Array.isArray(organization.folders) ? organization.folders : [],
      assets: organization.assets && typeof organization.assets === "object" ? organization.assets : {}
    });
  }
}
