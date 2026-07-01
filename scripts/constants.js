export const MODULE_ID = "fx-browser";
export const MODULE_TITLE = "FX Browser";

export const SETTINGS = {
  CUSTOM_DIRECTORIES: "customDirectories",
  WINDOW_STATE: "windowState",
  PLACEMENT: "placementSettings",
  ASSET_CACHE: "assetCache",
  LAST_SCAN: "lastScan",
  LIBRARY_ORGANIZATION: "libraryOrganization",
  ORIGIN_VAULT_SOURCES: "originVaultSources",
  INCLUDE_JB2A_SOURCES: "includeJb2aSources"
};

export const FLAGS = {
  SCOPE: MODULE_ID
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
  rotation: 0,
  loop: true,
  visible: true,
  locked: false,
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

export const DEFAULT_LIBRARY_ORGANIZATION = {
  folders: [],
  assets: {}
};

export const DEFAULT_ORIGIN_VAULT_SOURCES = [];

export const EMPTY_LIBRARY_MESSAGE = "Aucune bibliothèque d'effets détectée.";
export const MISSING_ASSET_MESSAGE = "FX introuvable ou inaccessible.";
