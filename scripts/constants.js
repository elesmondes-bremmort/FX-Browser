export const MODULE_ID = "fx-browser";
export const MODULE_TITLE = "FX Browser";
export const CANVAS_CONTROL_ID = "fx-browser-control";
export const CANVAS_TOOL_ID = "fx-browser-open-browser";
export const RIGHT_CONTROL_ID = "fx-browser-right-control";

export const SETTINGS = {
  CUSTOM_DIRECTORIES: "customDirectories",
  WINDOW_STATE: "windowState",
  PLACEMENT: "placementSettings",
  ASSET_CACHE: "assetCache",
  LAST_SCAN: "lastScan"
};

export const FLAGS = {
  SCOPE: MODULE_ID,
  IS_OVERLAY: "isOverlay",
  DATA: "overlayData"
};

export const DEFAULT_WINDOW_STATE = {
  width: 1120,
  height: 720,
  left: 140,
  top: 80
};

export const DEFAULT_PLACEMENT = {
  width: 2,
  height: 2,
  alpha: 1,
  rotation: 0,
  loop: true,
  visible: true,
  locked: false,
  elevation: 0,
  zIndex: 0,
  name: ""
};

export const JB2A_DIRECTORIES = [
  "modules/JB2A_DnD5e",
  "modules/jb2a_dnd5e",
  "modules/JB2A_DND5E",
  "modules/jb2a_patreon",
  "modules/JB2A_Patreon",
  "modules/JB2A_PATREON"
];

export const EMPTY_LIBRARY_MESSAGE = "Aucune bibliothèque d'effets détectée.";
export const MISSING_ASSET_MESSAGE = "FX introuvable ou inaccessible.";
