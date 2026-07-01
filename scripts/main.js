import { FXAssetScanner } from "./assetScanner.js";
import { FXBrowserApp } from "./browser.js";
import { CANVAS_CONTROL_ID, CANVAS_TOOL_ID, MODULE_ID } from "./constants.js";
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

Hooks.on("createTile", (tile) => refreshSceneFxPanel(tile));
Hooks.on("updateTile", (tile) => refreshSceneFxPanel(tile));
Hooks.on("deleteTile", (tile) => refreshSceneFxPanel(tile));

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
  const control = {
    name: CANVAS_CONTROL_ID,
    title: "FX Browser",
    icon: button.icon,
    layer: "tiles",
    tools: [button]
  };

  if (Array.isArray(controls)) {
    const existing = controls.find((item) => item.name === CANVAS_CONTROL_ID);
    if (existing) {
      ensureControlTools(existing, [button]);
      return;
    }
    controls.push(control);
    debugLog("canvas control button added");
    return;
  }

  if (controls instanceof Map) {
    if (controls.has(CANVAS_CONTROL_ID)) {
      ensureControlTools(controls.get(CANVAS_CONTROL_ID), [button]);
      return;
    }
    controls.set(CANVAS_CONTROL_ID, { ...control, tools: new Map([[button.name, button]]) });
    debugLog("canvas control button added");
    return;
  }

  if (controls?.[CANVAS_CONTROL_ID]) {
    ensureControlTools(controls[CANVAS_CONTROL_ID], [button]);
    return;
  }
  controls[CANVAS_CONTROL_ID] = { ...control, tools: { [button.name]: button } };
  debugLog("canvas control button added");
}

function ensureControlTools(control, tools) {
  if (!control) return;
  control.title = "FX Browser";
  control.icon = "fa-solid fa-fire";
  control.layer = "tiles";
  if (control.tools instanceof Map) {
    control.tools = new Map(tools.map((tool) => [tool.name, tool]));
    return;
  }

  if (Array.isArray(control.tools)) {
    control.tools = [...tools];
    return;
  }

  control.tools = {};
  for (const tool of tools) {
    control.tools[tool.name] = tool;
  }
}

function refreshSceneFxPanel(tile) {
  if (!FXOverlayManager.isOverlayDocument(tile)) return;
  FXBrowserApp.instance?.refreshSceneFxPanel?.();
}

Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag?.(MODULE_ID);
});
