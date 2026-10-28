import { LIGHTNING_FLASH, MOOD_BLEND, MOOD_EDGES, REGION_MOODS, type RegionMood } from '../../data/moods';
import { hexToRgb, paletteHex } from '../../data/palette';
import type { Ring } from '../../data/ringScale';
import { WORLD_SHAPE } from '../../data/worldShape';

// 074: the mood where the camera's centre stands (render only): each region's own, blended over MOOD_BLEND.tiles each
// side of a region edge, quantised to MOOD_BLEND.steps so the props' tint changes a few times across a band; and the
// lightning flash lifting the ambient. Pure, so tests pin it down.

export type Rgb = readonly [number, number, number];

/** The mood as drawn: the ring inside the band (and the one outside while blending), the blend toward it, and the looks. */
export interface MoodNow {
  ring: Ring;
  outer: Ring | null;
  blend: number;
  /** The world layer's ambient, 0..255 a channel. */
  ambient: Rgb;
  wash: { rgb: Rgb; alpha: number };
  fog: { rgb: Rgb; alpha: number; speed: number };
  lightScale: number;
}

/** White toward a palette colour by `darkness` (0 white, 1 the colour). */
export function ambientRgb(color: string, darkness: number): Rgb {
  const [r, g, b] = hexToRgb(paletteHex(color));
  const m = (c: number) => Math.round(255 + (c - 255) * darkness);
  return [m(r), m(g), m(b)];
}

/** An Rgb from three channels, rounded. */
const rgb = (r: number, g: number, b: number): Rgb => [Math.round(r), Math.round(g), Math.round(b)];

const mix = (a: Rgb, b: Rgb, t: number): Rgb => rgb(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** A region mood's looks, unblended. */
function looks(m: RegionMood): Omit<MoodNow, 'ring' | 'outer' | 'blend'> {
  const fog = m.fog;
  return {
    ambient: ambientRgb(m.ambient.color, m.ambient.darkness),
    wash: { rgb: hexToRgb(paletteHex(m.wash.color)), alpha: m.wash.alpha },
    // No fog is that region's fog colour (or the wash's) at nothing, so a blend fades it in without a colour jump.
    fog: fog ? { rgb: hexToRgb(paletteHex(fog.color)), alpha: fog.alpha, speed: fog.speed } : { rgb: hexToRgb(paletteHex(m.wash.color)), alpha: 0, speed: 0 },
    lightScale: m.lightScale,
  };
}

/** The danger ring at a distance from the foundry's door, tiles: Region 1's three by its bounds, then the edges' rings outward. */
function ringAtDistance(d: number): Ring {
  const [r0, r1] = WORLD_SHAPE.rings;
  let ring: Ring = d < r0 ? 0 : d < r1 ? 1 : 2;
  for (const e of MOOD_EDGES) if (d >= e.radius) ring = e.outer;
  return ring;
}

/** The mood `d` tiles from the foundry's door. */
export function moodAt(d: number): MoodNow {
  const band = MOOD_BLEND.tiles;
  for (const e of MOOD_EDGES) {
    if (d < e.radius - band || d > e.radius + band) continue;
    const t = Math.round(((d - (e.radius - band)) / (2 * band)) * MOOD_BLEND.steps) / MOOD_BLEND.steps;
    const inner = e.inner;
    const a = looks(REGION_MOODS[inner]);
    const b = looks(REGION_MOODS[e.outer]);
    const fogRgb = a.fog.alpha === 0 ? b.fog.rgb : b.fog.alpha === 0 ? a.fog.rgb : mix(a.fog.rgb, b.fog.rgb, t);
    return {
      ring: inner,
      outer: e.outer,
      blend: t,
      ambient: mix(a.ambient, b.ambient, t),
      wash: { rgb: mix(a.wash.rgb, b.wash.rgb, t), alpha: lerp(a.wash.alpha, b.wash.alpha, t) },
      fog: { rgb: fogRgb, alpha: lerp(a.fog.alpha, b.fog.alpha, t), speed: lerp(a.fog.speed || b.fog.speed, b.fog.speed || a.fog.speed, t) },
      lightScale: lerp(a.lightScale, b.lightScale, t),
    };
  }
  const ring = ringAtDistance(d);
  return { ring, outer: null, blend: 0, ...looks(REGION_MOODS[ring]) };
}

/** Region 1's mood: the sandbox's (074), and the overworld's before its camera has a centre. */
export const SUNNY_MOOD: MoodNow = { ring: 0, outer: null, blend: 0, ...looks(REGION_MOODS[0]) };

/** How much of the lightning flash shows `ms` after it struck: full for `holdMs`, eased back over `easeMs`; none with Flashes off. */
export function flashLevel(ms: number, flashes: boolean): number {
  const F = LIGHTNING_FLASH;
  if (!flashes || ms > F.holdMs + F.easeMs) return 0;
  if (ms <= F.holdMs) return 1;
  const t = (ms - F.holdMs) / F.easeMs;
  return 1 - t * (2 - t);
}

const FLASH_RGB = ambientRgb(LIGHTNING_FLASH.color, LIGHTNING_FLASH.darkness);

/** The ambient lifted toward the flash's by `level`; a channel never goes darker than it was. */
export function withFlash(ambient: Rgb, level: number): Rgb {
  if (level <= 0) return ambient;
  const lift = (c: number, to: number) => Math.max(c, c + (to - c) * level);
  return rgb(lift(ambient[0], FLASH_RGB[0]), lift(ambient[1], FLASH_RGB[1]), lift(ambient[2], FLASH_RGB[2]));
}

/** An Rgb as Phaser's 0xrrggbb. */
export const rgbInt = (c: Rgb): number => (c[0] << 16) | (c[1] << 8) | c[2];
