import { MODULE_ID } from "./constants.js";

export function localize(key) {
  return game.i18n.localize(`${MODULE_ID}.${key}`);
}

export function notify(message, type = "info") {
  const uiType = ui.notifications?.[type] ? type : "info";
  ui.notifications?.[uiType]?.(message);
}

export function debugLog(...args) {
  if (CONFIG?.debug?.[MODULE_ID]) console.debug("FX Browser |", ...args);
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function parseDirectoryList(value) {
  if (Array.isArray(value)) return value.map(String).map((path) => path.trim()).filter(Boolean);
  return String(value ?? "")
    .split(/\r?\n|,/)
    .map((path) => path.trim())
    .filter(Boolean);
}

export function cleanAssetName(path) {
  const fileName = String(path).split("/").pop() ?? path;
  return fileName
    .replace(/\.webm$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\d{2,4}x\d{2,4}\b/gi, "")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function stableId(value) {
  let hash = 0;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return `fx-${Math.abs(hash)}`;
}

export function getGridSize() {
  return canvas?.scene?.grid?.size || canvas?.grid?.size || 100;
}

export function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function canUseCanvas() {
  return Boolean(canvas?.ready && canvas?.scene);
}
