import type { GlyphKey } from "./glyphs";

/**
 * Exact mapping from every real catalog item name to its glyph key.
 * These 36 names are authoritative; anything not listed falls back to the
 * keyword matcher in {@link getIconKey}.
 */
const EXACT_NAME_TO_KEY: Readonly<Record<string, GlyphKey>> = {
  Barongs: "shirtFormal",
  Blouses: "blouse",
  "Caps / Bonnets / Headgear": "cap",
  "Coats / Jackets": "coat",
  "Polo shirts": "shirt",
  Polos: "shirt",
  Sandos: "tank",
  "T-shirts": "tshirt",
  Pants: "pants",
  Shorts: "shorts",
  Skirts: "skirt",
  Dresses: "dress",
  Dusters: "dress",
  Gowns: "dress",
  Jumpers: "overalls",
  Overalls: "overalls",
  Bras: "bra",
  "Briefs / Boxers": "underwear",
  "Chemise / Half-slips": "dress",
  Panties: "underwear",
  "Panty Hose": "stocking",
  "Socks (per pc. not pair)": "socks",
  Stockings: "stocking",
  "Bath Robes": "coat",
  Bathmats: "mat",
  "Bed Sheets": "sheet",
  Blankets: "blanket",
  Comforters: "blanket",
  Curtains: "sheet",
  "Place mats": "mat",
  Pillowcases: "pillow",
  "Table runners": "sheet",
  Tablecloths: "sheet",
  "Towels / Face Towels": "towel",
  Bags: "bag",
  Shoes: "shoe",
};

/**
 * Ordered keyword rules for custom / unknown item names. Each entry maps a
 * lowercase substring to a glyph key; the first rule whose token appears in the
 * lowercased name wins. Order matters where tokens could overlap.
 */
const KEYWORD_RULES: ReadonlyArray<readonly [token: string, key: GlyphKey]> = [
  // More-specific tokens first so overlaps resolve correctly
  // (e.g. "panty"/"pantie" must beat "pant").
  ["panty", "underwear"],
  ["pantie", "underwear"],
  ["brief", "underwear"],
  ["boxer", "underwear"],
  ["shirt", "shirt"],
  ["pant", "pants"],
  ["short", "shorts"],
  ["sock", "socks"],
  ["towel", "towel"],
  ["sheet", "sheet"],
  ["dress", "dress"],
  ["gown", "dress"],
  ["bag", "bag"],
  ["shoe", "shoe"],
  ["bra", "bra"],
];

/**
 * Resolve any item name to a glyph key.
 *
 * 1. Exact match against the 36 known catalog names.
 * 2. Otherwise, first matching keyword rule (case-insensitive substring).
 * 3. Otherwise, `"generic"`.
 */
export function getIconKey(name: string): GlyphKey {
  const exact = EXACT_NAME_TO_KEY[name];
  if (exact) {
    return exact;
  }

  const lower = name.toLowerCase();
  for (const [token, key] of KEYWORD_RULES) {
    if (lower.includes(token)) {
      return key;
    }
  }

  return "generic";
}

/**
 * Category tint token used by consumers to color an icon by group. Returns a
 * CSS custom-property reference so themes control the actual color.
 */
export function getItemTint(category: string): string {
  switch (category) {
    case "Regular Laundry":
      return "var(--tint-regular)";
    case "Home Items":
      return "var(--tint-home)";
    case "Other Items":
      return "var(--tint-other)";
    default:
      return "var(--tint-regular)";
  }
}
