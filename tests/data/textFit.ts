import { TEXT_STYLES } from '../../src/data/fonts';

/** A generous width estimate for a line in a style: no glyph of either bundled font is wider than 0.62 of its size. */
export const widthOf = (text: string, style: keyof typeof TEXT_STYLES, scale = 1): number => text.length * TEXT_STYLES[style].size * scale * 0.62;
