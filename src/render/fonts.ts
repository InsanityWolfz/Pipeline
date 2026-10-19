import type { Types } from 'phaser';
import { FONT_FILES, TEXT_STYLES, type TextStyleKey } from '../data/fonts';
import { paletteHex } from '../data/palette';

// The bundled fonts (020): Vite serves the files from assets/fonts, and each is
// registered as a FontFace before the game starts, so Text never draws with a
// fallback and nothing comes from the network.

const URLS = import.meta.glob<string>('../../assets/fonts/*.ttf', { query: '?url', import: 'default', eager: true });

/** Loads and registers both fonts. Resolves once they can be drawn. */
export async function loadFonts(): Promise<void> {
  await Promise.all(
    Object.values(FONT_FILES).map(async (f) => {
      const url = URLS[`../../assets/fonts/${f.file}`];
      if (!url) throw new Error(`Font file '${f.file}' is missing`);
      const face = await new FontFace(f.family, `url(${url})`, { weight: '100 900' }).load();
      document.fonts.add(face);
    }),
  );
}

/** Whether both fonts are registered and loaded. (`document.fonts.check` alone says yes for a family that was never added.) */
export function fontsReady(): boolean {
  const loaded = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, ''));
  return Object.values(FONT_FILES).every((f) => loaded.includes(f.family));
}

/** The Phaser text style for a style key, drawn at `resolution` texels per view px; `scale` draws it that much bigger (025). */
export function phaserStyle(key: TextStyleKey, resolution: number, scale = 1): Types.GameObjects.Text.TextStyle {
  const s = TEXT_STYLES[key];
  return {
    fontFamily: `"${FONT_FILES[s.font].family}"`,
    fontSize: `${s.size * scale}px`,
    fontStyle: String(s.weight),
    color: paletteHex(s.fill),
    stroke: paletteHex(s.stroke),
    strokeThickness: s.strokeWidth * scale,
    resolution,
  };
}
