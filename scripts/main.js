import { FXAssetScanner } from "./assetScanner.js";
import { FXBrowserApp } from "./browser.js";
import { CANVAS_TOOL_ID, MODULE_ID, RIGHT_CONTROL_ID } from "./constants.js";
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
  ensureRightControlButton();
});

Hooks.on("canvasReady", () => {
  if (!game.user?.isGM) return;
  ensureRightControlButton();
});

Hooks.on("renderSceneControls", () => {
  if (!game.user?.isGM) return;
  ensureRightControlButton();
});

Hooks.on("fxBrowserOverlaySceneChanged", () => {
  FXBrowserApp.instance?.refreshOverlays?.();
});

Hooks.on("fxBrowserOverlaySelected", (id) => {
  if (!FXBrowserApp.instance?.rendered) return;
  FXBrowserApp.instance.selectedOverlayId = id;
  FXBrowserApp.instance.refreshOverlays();
});

Hooks.on("fxBrowserWindowToggled", () => {
  updateRightControlState();
});

function ensureRightControlButton() {
  const host = findRightControlHost();
  if (!host) return;

  const existing = document.getElementById(RIGHT_CONTROL_ID);
  if (existing) {
    if (existing.parentElement !== host) host.append(existing);
    applyMatchingControlStyle(existing, host);
    updateRightControlState();
    return;
  }

  const button = document.createElement("button");
  button.id = RIGHT_CONTROL_ID;
  button.className = "fx-browser-right-control";
  button.type = "button";
  button.dataset.tool = CANVAS_TOOL_ID;
  button.title = "FX Browser";
  button.setAttribute("aria-label", "FX Browser");
  button.innerHTML = '<i class="fa-solid fa-fire-flame-curved"></i>';
  applyMatchingControlStyle(button, host);
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    debugLog("right control click received", CANVAS_TOOL_ID);
    await FXBrowserApp.toggle();
    updateRightControlState();
  });

  host.append(button);
  updateRightControlState();
  debugLog("right control button added");
}

function findRightControlHost() {
  const rightDock = document.querySelector("#ui-right");
  const selectors = [
    "#ui-right .fx-browser-custom-controls",
    "#ui-right .custom-controls",
    "#ui-right [data-custom-controls]",
    "#ui-right .control-tools",
    "#ui-right nav",
    "#ui-right menu"
  ];

  const explicitHost = selectors.map((selector) => document.querySelector(selector)).find((element) => element?.querySelector?.("button, a"));
  if (explicitHost) return explicitHost;

  const buttonGroup = Array.from(rightDock?.querySelectorAll?.("div, nav, menu, section") ?? [])
    .find((element) => element.querySelectorAll(":scope > button, :scope > a").length >= 2);
  return buttonGroup ?? rightDock ?? document.body;
}

function updateRightControlState() {
  const button = document.getElementById(RIGHT_CONTROL_ID);
  if (!button) return;
  button.classList.toggle("active", Boolean(FXBrowserApp.instance?.rendered));
}

function applyMatchingControlStyle(button, host) {
  const source = Array.from(host.querySelectorAll("button, a")).find((element) => element.id !== RIGHT_CONTROL_ID);
  if (source?.className) {
    button.className = source.className;
    button.classList.add("fx-browser-right-control");
    return;
  }

  button.classList.add("fx-browser-right-control", "fx-browser-fallback-control");
}

Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag?.(MODULE_ID);
});
