import { FXAssetScanner } from "./assetScanner.js";
import { FXBrowserApp } from "./browser.js";
import { CANVAS_CONTROL_ID, CANVAS_EDIT_TOOL_ID, CANVAS_TOOL_ID, MODULE_ID } from "./constants.js";
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
    onChange: () => {
      debugLog("canvas control click received", CANVAS_TOOL_ID);
      FXBrowserApp.toggle();
    }
  };
  const editTool = {
    name: CANVAS_EDIT_TOOL_ID,
    title: "FX Overlay",
    icon: "fa-solid fa-fire",
    toggle: true,
    visible: game.user?.isGM,
    onChange: (...args) => {
      FXOverlayLayer.setEditMode(getToolActiveState(args));
      window.setTimeout(() => FXOverlayLayer.syncEditModeFromControls(), 0);
    }
  };

  const control = {
    name: CANVAS_CONTROL_ID,
    title: "FX Browser",
    icon: button.icon,
    layer: "tiles",
    tools: [button, editTool]
  };

  if (Array.isArray(controls)) {
    const existing = controls.find((item) => item.name === CANVAS_CONTROL_ID);
    if (existing) {
      ensureControlTools(existing, [button, editTool]);
      return;
    }
    controls.push(control);
    debugLog("canvas control button added");
    return;
  }

  if (controls instanceof Map) {
    if (controls.has(CANVAS_CONTROL_ID)) {
      ensureControlTools(controls.get(CANVAS_CONTROL_ID), [button, editTool]);
      return;
    }
    controls.set(CANVAS_CONTROL_ID, { ...control, tools: new Map([[button.name, button], [editTool.name, editTool]]) });
    debugLog("canvas control button added");
    return;
  }

  if (controls?.[CANVAS_CONTROL_ID]) {
    ensureControlTools(controls[CANVAS_CONTROL_ID], [button, editTool]);
    return;
  }
  controls[CANVAS_CONTROL_ID] = { ...control, tools: { [button.name]: button, [editTool.name]: editTool } };
  debugLog("canvas control button added");
}

function ensureControlTools(control, tools) {
  if (!control) return;
  if (control.tools instanceof Map) {
    for (const tool of tools) {
      if (!control.tools.has(tool.name)) control.tools.set(tool.name, tool);
    }
    return;
  }

  if (Array.isArray(control.tools)) {
    for (const tool of tools) {
      if (!control.tools.some((item) => item.name === tool.name)) control.tools.push(tool);
    }
    return;
  }

  control.tools = control.tools ?? {};
  for (const tool of tools) {
    if (!control.tools[tool.name]) control.tools[tool.name] = tool;
  }
}

function getToolActiveState(args) {
  const explicit = args.find((arg) => typeof arg === "boolean");
  if (typeof explicit === "boolean") return explicit;
  return true;
}

Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag?.(MODULE_ID);
});
