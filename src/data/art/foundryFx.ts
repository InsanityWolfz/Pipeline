import { FOUNDRY_FX_FRAMES } from '../foundryAssets';
import { HEAT } from '../foundryFx';
import { ellipse, path, type Shape, type VectorSprite } from './types';

// 079: the foundry's effect frames. The heat shimmer: soft ribbons rising off a working forge's top face, four frames
// that loop (each ribbon one step further up and fainter), drawn additively in cinder-light at a low alpha, so it reads
// as heat haze, not flame. The steam puff and spark are white (tinted per particle). The lit inlay rune is 020's inlay
// rune in cyan-glow with a soft halo; the bead a small cyan-glow dot with a short trail behind it (pointing +x).

const N = HEAT.shimmer.frames;

/** One ribbon: a wavy vertical stroke rising from (x, y) by `h`, its phase `p` (0..1) through the loop. */
function ribbon(x: number, p: number, sway: number): Shape {
  const y0 = -2 - p * 8;
  const h = 10;
  const a = 0.9 * (1 - p);
  return path(`M ${x} ${y0} Q ${x + sway} ${y0 - h * 0.35} ${x} ${y0 - h * 0.6} Q ${x - sway} ${y0 - h * 0.85} ${x} ${y0 - h}`, { stroke: { color: { id: 'cinder-light', alpha: a }, width: 1.4 }, glow: { color: 'cinder', blur: 2 } });
}

const shimmer = (i: number): Shape[] =>
  [-6, 0, 6].map((x, k) => {
    const p = ((i / N + k / 3) % 1 + 1) % 1;
    return ribbon(x, p, k % 2 === 0 ? 1.4 : -1.4);
  });

const RUNE = 'M -3 -5 L 2 -1 L -2 1 L 3 5';

export const FOUNDRY_FX_SPRITES: readonly VectorSprite[] = [
  { key: FOUNDRY_FX_FRAMES.shimmer.key, size: [24, 24], anchor: [12, 22], frames: Array.from({ length: N }, (_, i) => shimmer(i)) },
  { key: FOUNDRY_FX_FRAMES.steam, size: [8, 8], anchor: [4, 4], frames: [[ellipse(0, 0, 3.4, 3.4, { fill: { radial: [0, 0, 3.6], stops: [{ at: 0, color: 'snow' }, { at: 0.55, color: { id: 'snow', alpha: 0.7 } }, { at: 1, color: { id: 'snow', alpha: 0 } }] } })]] },
  { key: FOUNDRY_FX_FRAMES.spark, size: [2, 2], anchor: [1, 1], frames: [[ellipse(0, 0, 0.7, 0.7, { fill: 'snow' })]] },
  {
    key: FOUNDRY_FX_FRAMES.rune,
    size: [32, 32],
    anchor: [16, 16],
    frames: [
      [
        ellipse(0, 0, 13, 13, { fill: { radial: [0, 0, 13], stops: [{ at: 0, color: { id: 'cyan', alpha: 0.45 } }, { at: 1, color: { id: 'cyan', alpha: 0 } }] } }),
        ellipse(0, 0, 8, 8, { stroke: { color: { id: 'cyan', alpha: 0.6 }, width: 0.8 } }),
        { ...path(RUNE, { stroke: { color: 'cyan-glow', width: 1 } }), glow: { color: 'cyan', blur: 3 } },
      ],
    ],
  },
  {
    key: FOUNDRY_FX_FRAMES.bead,
    size: [12, 6],
    anchor: [9, 3],
    frames: [
      [
        path('M -8 0 L 0 -1.2 L 0 1.2 Z', { fill: { linear: [-8, 0, 0, 0], stops: [{ at: 0, color: { id: 'cyan', alpha: 0 } }, { at: 1, color: { id: 'cyan', alpha: 0.7 } }] } }),
        ellipse(0, 0, 1.5, 1.5, { fill: 'cyan-glow', glow: { color: 'cyan', blur: 2 } }),
      ],
    ],
  },
];
