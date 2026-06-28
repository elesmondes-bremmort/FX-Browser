export const CATEGORIES = [
  { id: "all", label: "All", keywords: [] },
  { id: "fire", label: "Fire", keywords: ["fire", "flame", "burn", "ember", "torch", "campfire"] },
  { id: "smoke", label: "Smoke", keywords: ["smoke", "steam", "smog"] },
  { id: "magic", label: "Magic", keywords: ["magic", "spell", "arcane", "energy", "eldritch", "divine"] },
  { id: "explosion", label: "Explosion", keywords: ["explosion", "explode", "burst", "impact", "detonation"] },
  { id: "portal", label: "Portal", keywords: ["portal", "gate", "vortex", "rift"] },
  { id: "lightning", label: "Lightning", keywords: ["lightning", "electric", "shock", "bolt"] },
  { id: "fog", label: "Fog", keywords: ["fog", "mist", "haze"] },
  { id: "blood", label: "Blood", keywords: ["blood", "bleed", "gore"] },
  { id: "rune", label: "Rune", keywords: ["rune", "sigil", "glyph", "circle"] },
  { id: "ice", label: "Ice", keywords: ["ice", "frost", "snow", "cold"] },
  { id: "water", label: "Water", keywords: ["water", "splash", "wave", "liquid"] },
  { id: "nature", label: "Nature", keywords: ["nature", "leaf", "vine", "plant", "earth"] },
  { id: "aura", label: "Aura", keywords: ["aura", "glow", "emanation"] },
  { id: "projectile", label: "Projectile", keywords: ["projectile", "missile", "arrow", "beam", "ray"] },
  { id: "other", label: "Other", keywords: [] }
];

export function categorizeAsset(path) {
  const haystack = String(path).toLowerCase();
  const match = CATEGORIES.find((category) => {
    if (category.id === "all" || category.id === "other") return false;
    return category.keywords.some((keyword) => haystack.includes(keyword));
  });
  return match ?? CATEGORIES.find((category) => category.id === "other");
}

export function detectPlaybackKind(path) {
  const haystack = String(path).toLowerCase();
  if (/\b(loop|loops|looping|persistent)\b/.test(haystack)) return "Loop";
  if (/\b(burst|impact|explosion|hit|single)\b/.test(haystack)) return "Burst";
  return "Loop";
}
