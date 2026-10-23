// The locked palette (docs/art.md): every colour of the vector shape data in
// src/data/art and of everything render draws, by id (016; the only palette since 020).

/** A palette colour. */
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
  // The Warden's core (018): the same violet heart-stone as the warden-core item's icon.
  { id: 'core-dark', hex: '#4a3a6b' },
  { id: 'core', hex: '#7a63a0' },
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
  // The foundry interior (020): warm sandstone flags and carved walls, lit by forge glow
  { id: 'mortar', hex: '#3b2b21' },
  { id: 'flag-dark', hex: '#6f553f' },
  { id: 'flag', hex: '#8a6c4f' },
  { id: 'flag-light', hex: '#a2815e' },
  { id: 'carve-dark', hex: '#4f3b2f' },
  { id: 'carve', hex: '#6f5442' },
  { id: 'carve-light', hex: '#93745a' },
  // Stonefall Hollows (034): grey-blue quarry stone, ley-iron, its rust and cyan veins, the Bulwark's danger red
  { id: 'hollow-dark', hex: '#3b475c' },
  { id: 'hollow', hex: '#5f6f88' },
  { id: 'hollow-light', hex: '#8c9cb4' },
  { id: 'hollow-pale', hex: '#bccadb' },
  { id: 'iron-dark', hex: '#2f343f' },
  { id: 'iron', hex: '#566070' },
  { id: 'iron-light', hex: '#8a95a6' },
  { id: 'iron-rust', hex: '#9a4b2b' },
  { id: 'vein', hex: '#5ef2ff' },
  { id: 'danger', hex: '#e8322f' },
  // The Emberworks (060): warm ash-grey ground and soot-dark stone, under its rust and ember glow
  { id: 'ash-dark', hex: '#3d3735' },
  { id: 'ash', hex: '#5f5753' },
  { id: 'ash-light', hex: '#857b74' },
  { id: 'ash-pale', hex: '#b3a89e' },
  // Highlights
  { id: 'snow', hex: '#ffffff' },
  { id: 'hit-red', hex: '#ff4d4d' },
];

/** The hex of a palette colour by id. Throws on an unknown id. */
export function paletteHex(id: string): string {
  const color = DAYLIGHT_PALETTE.find((c) => c.id === id);
  if (!color) throw new Error(`Unknown palette color '${id}'`);
  return color.hex;
}

/** `#rrggbb` as [r, g, b]. */
export function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}
