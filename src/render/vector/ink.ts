import type { Ink } from '../../data/art/types';
import { hexToRgb, paletteHex } from '../../data/palette';

// A palette ink (016) as a CSS colour for the canvas.

export function inkCss(i: Ink): string {
  if (typeof i === 'string') return paletteHex(i);
  const [r, g, b] = hexToRgb(paletteHex(i.id));
  return `rgba(${r},${g},${b},${i.alpha})`;
}
