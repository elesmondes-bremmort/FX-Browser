import { FXAssetScanner } from "./assetScanner.js";
import { FXBrowserApp } from "./browser.js";
import { MODULE_ID } from "./constants.js";
import { FXDragDrop } from "./dragDrop.js";
import { FXOverlayManager } from "./overlayManager.js";
import { FXBrowserSettings } from "./settings.js";
import { debugLog } from "./utils.js";

const LAUNCHER_TOOL_ID = "fx-browser-launcher";

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

Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user?.isGM) return;
  try {
    addLauncherTool(controls);
  } catch (error) {
    console.error("FX Browser | Failed to add launcher button", error);
  }
});

function addLauncherTool(controls) {
  const tool = {
    name: LAUNCHER_TOOL_ID,
    title: "FX Browser",
    icon: "fa-solid fa-fire",
    button: true,
    toggle: false,
    visible: game.user?.isGM,
    onChange: () => FXBrowserApp.toggle()
  };

  for (const control of getNativeControls(controls)) {
    addToolToControl(control, tool);
  }
}

function getNativeControls(controls) {
  if (!controls) return [];
  const values = controls instanceof Map ? Array.from(controls.values()) : Array.isArray(controls) ? controls : Object.values(controls);
  return values.filter((control) => control && control.name !== LAUNCHER_TOOL_ID);
}

function addToolToControl(control, tool) {
  if (control.tools instanceof Map) {
    if (!control.tools.has(tool.name)) control.tools.set(tool.name, tool);
    return;
  }

  if (Array.isArray(control.tools)) {
    if (!control.tools.some((item) => item.name === tool.name)) control.tools.push(tool);
    return;
  }

  control.tools ??= {};
  if (!control.tools[tool.name]) control.tools[tool.name] = tool;
}

Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag?.(MODULE_ID);
});
