// The locked palette (docs/art.md). Every sprite pixel is one of these colors.
// `char` is the symbol used in sprite grids under assets/sprites.

export interface PaletteColor {
  id: string;
  char: string;
  hex: string;
}

/** Grid symbol for a transparent pixel. */
export const TRANSPARENT = '.';

/** The outline color: the palette's darkest entry. */
export const OUTLINE_ID = 'outline';

export const PALETTE: readonly PaletteColor[] = [
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

/** The hex of a palette color by id. Throws on an unknown id. */
export function paletteHex(id: string): string {
  const color = PALETTE.find((c) => c.id === id);
  if (!color) throw new Error(`Unknown palette color '${id}'`);
  return color.hex;
}

/** `#rrggbb` as [r, g, b]. */
export function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}
