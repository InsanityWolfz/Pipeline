// The locked palettes (docs/art.md).
// PIXEL_PALETTE: every pixel of the remaining grid sprites (assets/sprites); `char` is the grid symbol.
// DAYLIGHT_PALETTE (016): every colour of the vector shape data in src/data/art, by id.

export interface PaletteColor {
  id: string;
  char: string;
  hex: string;
}

/** Grid symbol for a transparent pixel. */
export const TRANSPARENT = '.';

/** The outline color: the palette's darkest entry. */
export const OUTLINE_ID = 'outline';

export const PIXEL_PALETTE: readonly PaletteColor[] = [
  // Darks and stone
  { id: 'outline', char: 'o', hex: '#120e1f' },
  { id: 'shadow-violet', char: 'v', hex: '#241c38' },
  { id: 'slate-dark', char: 's', hex: '#2e3347' },
  { id: 'slate', char: 'S', hex: '#464b63' },
  { id: 'slate-light', char: 'l', hex: '#6a7088' },
  { id: 'stone-pale', char: 'L', hex: '#9aa0b4' },
  { id: 'mist', char: 'm', hex: '#c9cedb' },
  // Dusk violets and teal shadows
  { id: 'violet', char: 'p', hex: '#4a3a6b' },
  { id: 'violet-light', char: 'P', hex: '#7a63a0' },
  { id: 'teal-deep', char: 't', hex: '#14323a' },
  { id: 'teal', char: 'T', hex: '#1f4d52' },
  // Moss and earth
  { id: 'moss-dark', char: 'g', hex: '#24402e' },
  { id: 'moss', char: 'G', hex: '#3d6b3f' },
  { id: 'moss-light', char: 'h', hex: '#6f9a4f' },
  { id: 'earth', char: 'e', hex: '#4a3427' },
  { id: 'earth-light', char: 'E', hex: '#7a573b' },
  // Ember highlights
  { id: 'ember-dark', char: 'r', hex: '#7a2e2a' },
  { id: 'ember', char: 'R', hex: '#c4552e' },
  { id: 'ember-light', char: 'y', hex: '#f0a14a' },
  { id: 'gold', char: 'Y', hex: '#f4d27a' },
  // Ley lines: the signature accent
  { id: 'ley-deep', char: 'c', hex: '#1a7f8c' },
  { id: 'ley-cyan', char: 'C', hex: '#36e2e0' },
  { id: 'ley-glow', char: 'w', hex: '#a8fff4' },
  { id: 'white', char: 'W', hex: '#f4f7fb' },
];

/** A vector colour (016): no grid symbol. */
export interface VectorColor {
  id: string;
  hex: string;
}

/** The vector outline: one ink for every outlined shape (016). */
export const INK_ID = 'ink';

/** Bright daylight (016), from the approved style test (docs/art/style-test.html). */
export const DAYLIGHT_PALETTE: readonly VectorColor[] = [
  { id: 'ink', hex: '#1e1a2e' },
  // Grass, dirt and sun
  { id: 'grass-dark', hex: '#2f8a3a' },
  { id: 'grass', hex: '#45ad45' },
  { id: 'grass-bright', hex: '#5cc850' },
  { id: 'grass-light', hex: '#8ee060' },
  { id: 'sun', hex: '#d6f27a' },
  { id: 'ground-shade', hex: '#1e4a28' },
  { id: 'dirt-dark', hex: '#b88d4f' },
  { id: 'dirt', hex: '#d9b26e' },
  { id: 'dirt-light', hex: '#ecd096' },
  { id: 'sand', hex: '#e3cf96' },
  // Water
  { id: 'water-deep', hex: '#1f6fc0' },
  { id: 'water', hex: '#3a9be8' },
  { id: 'water-light', hex: '#7fd0ff' },
  { id: 'foam', hex: '#d4f4ff' },
  // Rock and stone
  { id: 'rock-dark', hex: '#5f6880' },
  { id: 'rock', hex: '#8e97ab' },
  { id: 'rock-light', hex: '#c3cad8' },
  { id: 'rock-pale', hex: '#e6ebf3' },
  // Wood and leaves
  { id: 'wood-dark', hex: '#5e3a22' },
  { id: 'wood', hex: '#8a5a33' },
  { id: 'wood-light', hex: '#b07a48' },
  { id: 'leaf-dark', hex: '#1f7a35' },
  { id: 'leaf', hex: '#2f9a42' },
  { id: 'leaf-light', hex: '#4fc24f' },
  { id: 'leaf-pale', hex: '#9ae86a' },
  // Ley: the signature accent
  { id: 'cyan-deep', hex: '#138f9c' },
  { id: 'cyan', hex: '#2ee6e0' },
  { id: 'cyan-glow', hex: '#b8fff8' },
  { id: 'hood-dark', hex: '#0d1c24' },
  // The wanderer
  { id: 'rust-dark', hex: '#7a321d' },
  { id: 'rust', hex: '#b5532f' },
  { id: 'rust-light', hex: '#dc7d4f' },
  { id: 'robe', hex: '#e9dcc0' },
  { id: 'gold-trim', hex: '#f2c45a' },
  { id: 'gold-shade', hex: '#b8862e' },
  { id: 'leather-dark', hex: '#3e2818' },
  { id: 'leather', hex: '#5a3a26' },
  { id: 'strap', hex: '#6a4426' },
  { id: 'brass-dark', hex: '#a8782a' },
  { id: 'brass', hex: '#e0b04a' },
  { id: 'brass-light', hex: '#f6dc8a' },
  { id: 'dormant', hex: '#7d9ea3' },
  { id: 'dormant-dark', hex: '#4b6468' },
  // The Husk and fire
  { id: 'straw-dark', hex: '#a57c34' },
  { id: 'straw', hex: '#d9b65a' },
  { id: 'straw-light', hex: '#f0d88a' },
  { id: 'cinder', hex: '#ff7a2a' },
  { id: 'cinder-light', hex: '#ffd27a' },
  { id: 'flame-dark', hex: '#d8361f' },
  // Husk resin (018): the same amber as the resin item's icon.
  { id: 'resin-dark', hex: '#c4552e' },
  { id: 'resin', hex: '#f0a14a' },
  { id: 'resin-light', hex: '#f4d27a' },
  // The Wisp
  { id: 'wisp-dark', hex: '#5b2f8f' },
  { id: 'wisp', hex: '#9b5de5' },
  { id: 'wisp-light', hex: '#d7b8ff' },
  { id: 'mask', hex: '#efe6d2' },
  // The Pylon Warden
  { id: 'warden-dark', hex: '#4c5a4a' },
  { id: 'warden', hex: '#7d8f6e' },
  { id: 'warden-light', hex: '#b2c29a' },
  { id: 'moss-tuft', hex: '#5fae3e' },
  // Highlights
  { id: 'snow', hex: '#ffffff' },
  { id: 'hit-red', hex: '#ff4d4d' },
];

/** The hex of a palette color by id, from either palette. Throws on an unknown id. */
export function paletteHex(id: string): string {
  const color = PIXEL_PALETTE.find((c) => c.id === id) ?? DAYLIGHT_PALETTE.find((c) => c.id === id);
  if (!color) throw new Error(`Unknown palette color '${id}'`);
  return color.hex;
}

/** `#rrggbb` as [r, g, b]. */
export function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}
