import { LIGHT_CATCH } from '../../data/lights';
import { hexToRgb, paletteHex } from '../../data/palette';
import type { Quality } from '../../data/settings';

// 074: the light catch. An enemy, the player or a ground item inside a light's radius gets an additive copy of its
// frame in the light's colour: its alpha the lights' falloff at its feet × their intensity × `gain`, from the two
// nearest lights, at most `maxAlpha`. Pure, so tests pin it down.

/** A placed light, as the catch reads it (its intensity already × the mood's light scale). */
export interface PlacedLight {
  x: number;
  y: number;
  radius: number;
  color: string;
  intensity: number;
}

/** A light's falloff `d` px from it: 1 at the light, 0 at its radius (Phaser's lights fall off as 1 − (d/r)²). */
export const falloff = (d: number, radius: number): number => (d >= radius ? 0 : 1 - (d / radius) ** 2);

/** The catch at a point: its colour (0xrrggbb, the lights' mix by strength) and alpha, or null with none. */
export function catchAt(x: number, y: number, lights: readonly PlacedLight[], quality: Quality): { color: number; alpha: number } | null {
  if (!(LIGHT_CATCH.tiers as readonly Quality[]).includes(quality)) return null;
  const near = lights
    .map((l) => ({ l, d: Math.hypot(l.x - x, l.y - y) }))
    .filter((e) => e.d < e.l.radius)
    .sort((a, b) => a.d - b.d)
    .slice(0, LIGHT_CATCH.nearest);
  let sum = 0;
  const rgb = [0, 0, 0];
  for (const { l, d } of near) {
    const w = falloff(d, l.radius) * l.intensity;
    sum += w;
    hexToRgb(paletteHex(l.color)).forEach((c, i) => (rgb[i] = (rgb[i] ?? 0) + c * w));
  }
  if (sum <= 0) return null;
  const [r = 0, g = 0, b = 0] = rgb.map((c) => Math.round(c / sum));
  return { color: (r << 16) | (g << 8) | b, alpha: Math.min(LIGHT_CATCH.maxAlpha, sum * LIGHT_CATCH.gain) };
}
