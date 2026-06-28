import { FXAssetScanner } from "./assetScanner.js";
import { FXBrowserApp } from "./browser.js";
import { MODULE_ID } from "./constants.js";
import { FXOverlayLayer } from "./overlayLayer.js";
import { FXOverlayRenderer } from "./overlayRenderer.js";
import { FXSyncManager } from "./syncManager.js";
import { FXBrowserSettings } from "./settings.js";
import { debugLog } from "./utils.js";

Hooks.once("init", () => {
  debugLog("module initialized");
  FXBrowserSettings.register();
  FXSyncManager.register();
  FXOverlayLayer.register();
  FXOverlayRenderer.register();
  loadTemplates([
    "modules/fx-browser/templates/asset-card.hbs",
    "modules/fx-browser/templates/preview.hbs",
    "modules/fx-browser/templates/settings.hbs",
    "modules/fx-browser/templates/overlay-list.hbs",
    "modules/fx-browser/templates/overlay-controls.hbs"
  ]);
});

Hooks.once("ready", async () => {
  if (!game.user?.isGM) return;
  await FXAssetScanner.scan({ notifyResult: false });
});

Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user?.isGM) return;
  try {
    addCanvasControlButton(controls);
  } catch (error) {
    console.error("FX Browser | Failed to add canvas control button", error);
  }
});

Hooks.on("fxBrowserOverlaySceneChanged", () => {
  FXBrowserApp.instance?.refreshOverlays?.();
});

Hooks.on("fxBrowserOverlaySelected", (id) => {
  if (!FXBrowserApp.instance?.rendered) return;
  FXBrowserApp.instance.selectedOverlayId = id;
  FXBrowserApp.instance.refreshOverlays();
});

function addCanvasControlButton(controls) {
  if (!controls) {
    debugLog("canvas controls unavailable");
    return;
  }

  const button = {
    name: "fx-browser",
    title: "FX Browser",
    icon: "fa-solid fa-wand-magic-sparkles",
    button: true,
    visible: game.user?.isGM,
    onClick: () => {
      debugLog("canvas control click received");
      FXBrowserApp.toggle();
    }
  };

  if (Array.isArray(controls)) {
    if (controls.some((control) => control.name === button.name)) return;
    controls.push({
      name: button.name,
      title: button.title,
      icon: button.icon,
      layer: "tiles",
      tools: [button],
      activeTool: button.name
    });
    debugLog("canvas control button added");
    return;
  }

  if (controls instanceof Map) {
    if (controls.has(button.name)) return;
    controls.set(button.name, {
      name: button.name,
      title: button.title,
      icon: button.icon,
      layer: "tiles",
      tools: new Map([[button.name, button]]),
      activeTool: button.name
    });
    debugLog("canvas control button added");
    return;
  }

  if (controls?.[button.name]) return;
  controls[button.name] = {
    name: button.name,
    title: button.title,
    icon: button.icon,
    layer: "tiles",
    tools: { [button.name]: button },
    activeTool: button.name
  };
  debugLog("canvas control button added");
}

Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag?.(MODULE_ID);
});
