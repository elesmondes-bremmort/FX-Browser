import { FXAssetScanner } from "./assetScanner.js";
import { FXBrowserApp } from "./browser.js";
import { CANVAS_CONTROL_ID, CANVAS_TOOL_ID, MODULE_ID } from "./constants.js";
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
    name: CANVAS_TOOL_ID,
    title: "FX Browser",
    icon: "fa-solid fa-fire",
    button: true,
    toggle: false,
    visible: game.user?.isGM,
    onClick: (...args) => {
      if (!isFXBrowserToolClick(args)) return;
      debugLog("canvas control click received", CANVAS_TOOL_ID);
      FXBrowserApp.toggle();
    }
  };

  const control = {
    name: CANVAS_CONTROL_ID,
    title: "FX Browser",
    icon: button.icon,
    layer: "tiles",
    tools: [button]
  };

  if (Array.isArray(controls)) {
    if (controls.some((item) => item.name === CANVAS_CONTROL_ID)) return;
    controls.push(control);
    debugLog("canvas control button added");
    return;
  }

  if (controls instanceof Map) {
    if (controls.has(CANVAS_CONTROL_ID)) return;
    controls.set(CANVAS_CONTROL_ID, { ...control, tools: new Map([[button.name, button]]) });
    debugLog("canvas control button added");
    return;
  }

  if (controls?.[CANVAS_CONTROL_ID]) return;
  controls[CANVAS_CONTROL_ID] = { ...control, tools: { [button.name]: button } };
  debugLog("canvas control button added");
}

function isFXBrowserToolClick(args) {
  const [first] = args;
  if (typeof first === "string") return first === CANVAS_TOOL_ID;
  const target = first?.currentTarget ?? first?.target;
  const toolName = target?.dataset?.tool ?? target?.closest?.("[data-tool]")?.dataset?.tool;
  return !toolName || toolName === CANVAS_TOOL_ID;
}

Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag?.(MODULE_ID);
});
