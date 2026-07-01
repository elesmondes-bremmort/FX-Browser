import { FXAssetScanner } from "./assetScanner.js";
import { FXBrowserApp } from "./browser.js";
import { MODULE_ID } from "./constants.js";
import { FXDragDrop } from "./dragDrop.js";
import { FXOverlayManager } from "./overlayManager.js";
import { FXBrowserSettings } from "./settings.js";
import { debugLog } from "./utils.js";

Hooks.once("init", () => {
  debugLog("module initialized");
  FXBrowserSettings.register();
  loadTemplates([
    "modules/fx-browser/templates/asset-card.hbs",
    "modules/fx-browser/templates/preview.hbs",
    "modules/fx-browser/templates/settings.hbs",
    "modules/fx-browser/templates/overlay-list.hbs"
  ]);
});

Hooks.once("ready", async () => {
  if (!game.user?.isGM) return;
  const module = game.modules.get(MODULE_ID);
  if (module) module.api = {
    open: () => FXBrowserApp.toggle(),
    toggle: () => FXBrowserApp.toggle()
  };
  await FXOverlayManager.cleanupExperimentRemnants();
  await FXAssetScanner.scan({ notifyResult: false });
});

Hooks.on("dropCanvasData", (_canvas, data) => {
  if (!game.user?.isGM) return;
  if (!FXDragDrop.isFxDropData(data)) return;
  FXOverlayManager.createFromAsset(data, data);
  return false;
});

Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag?.(MODULE_ID);
});
