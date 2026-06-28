import { FXAssetScanner } from "./assetScanner.js";
import { FXBrowserApp } from "./browser.js";
import { MODULE_ID } from "./constants.js";
import { FXBrowserSettings } from "./settings.js";

Hooks.once("init", () => {
  FXBrowserSettings.register();
  loadTemplates([
    "modules/fx-browser/templates/asset-card.hbs",
    "modules/fx-browser/templates/preview.hbs",
    "modules/fx-browser/templates/settings.hbs"
  ]);
});

Hooks.once("ready", async () => {
  if (!game.user?.isGM) return;
  await FXAssetScanner.scan({ notifyResult: false });
});

Hooks.on("renderSceneControls", () => {
  if (!game.user?.isGM) return;
  ensureDockButton();
});

Hooks.on("renderSidebar", () => {
  if (!game.user?.isGM) return;
  ensureDockButton();
});

function ensureDockButton() {
  if (document.getElementById("fx-browser-dock-button")) return;

  const target = document.querySelector("#ui-right") ?? document.querySelector("#controls") ?? document.body;
  const button = document.createElement("button");
  button.id = "fx-browser-dock-button";
  button.type = "button";
  button.className = "fx-browser-dock-button";
  button.title = "FX Browser";
  button.setAttribute("aria-label", "FX Browser");
  button.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i>`;
  button.addEventListener("click", () => FXBrowserApp.toggle());
  target.appendChild(button);
}

Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag?.(MODULE_ID);
});
