import { ellipse, flat, line, path, rect, solid, type Shape, type VectorSprite } from './types';

// Static and frame-by-frame vector sprites (016): projectiles, combat effects, and
// the dormant tube on its stone. Each replaces the atlas frame of the same name.
// Shapes are world px around `anchor`; projectiles point along +x.

const sprite = (key: string, size: readonly [number, number], anchor: readonly [number, number], frames: readonly (readonly Shape[])[]): VectorSprite => ({
  key,
  size,
  anchor,
  frames,
});
const shadow = (key: string, rx: number, ry: number): VectorSprite =>
  sprite(key, [rx * 2 + 2, ry * 2 + 2], [rx + 1, ry + 1], [[ellipse(0, 0, rx, ry, { fill: { id: 'ground-shade', alpha: 0.35 } })]]);

/** A star of `points` points between radius `r` and `r * inner`. */
function star(r: number, inner: number, points: number, turn: number): string {
  const pts = Array.from({ length: points * 2 }, (_, i) => {
    const a = turn + (i * Math.PI) / points;
    const rad = i % 2 === 0 ? r : r * inner;
    return `${(Math.cos(a) * rad).toFixed(2)} ${(Math.sin(a) * rad).toFixed(2)}`;
  });
  return `M ${pts[0]} ${pts.slice(1).map((p) => `L ${p}`).join(' ')} Z`;
}

const flameFill = (r: number) => ({
  radial: [0, r * 0.3, r] as const,
  stops: [
    { at: 0, color: 'cinder-light' },
    { at: 0.55, color: 'cinder' },
    { at: 1, color: 'flame-dark' },
  ],
});

const STONE: readonly Shape[] = [
  ellipse(0, -6, 14, 6, solid('rock-dark')),
  ellipse(0, -9, 14, 6, solid('rock-light')),
  ellipse(0, -9, 9.5, 3.8, { stroke: { color: 'rock', width: 1 } }),
  ellipse(-11, -5, 3, 1.6, flat('leaf-light')),
];

const DORMANT_TUBE: readonly Shape[] = [
  rect(-9, -13, 18, 5, 2.5, solid('dormant')),
  ...[-5, -1, 3].map((x) => rect(x, -13.6, 1.6, 6.2, 0.8, solid('dormant-dark'))),
  rect(-14, -13.8, 6, 6.4, 2, solid('brass')),
  rect(8, -14, 3, 7, 1, solid('dormant-dark')),
];

export const VECTOR_SPRITES: readonly VectorSprite[] = [
  sprite('arrow', [24, 8], [14, 4], [
    [
      line([-13, 0, -6, 0], 1.6, { id: 'cyan', alpha: 0.55 }),
      line([-8, 0, 4, 0], 1.4, 'wood-light', true),
      path('M -8 0 L -10.5 -2.2 L -6 0 L -10.5 2.2 Z', flat('rust-light')),
      path('M 7 0 L 3 -2.4 L 3 2.4 Z', solid('rock-pale')),
    ],
  ]),
  shadow('arrow-shadow', 5, 1.3),
  sprite('bomb', [14, 16], [7, 9], [
    [
      ellipse(0, 0, 4.4, 4.4, { fill: { radial: [-1, -1, 5], stops: [{ at: 0, color: 'rock-dark' }, { at: 1, color: 'ink' }] }, outline: true }),
      rect(-4.3, -1, 8.6, 2, 1, flat('cinder')),
      ellipse(-1.6, -1.8, 1.2, 0.8, flat('rock-light')),
      line([1.6, -3.6, 3, -5.8], 1, 'wood', true),
      ellipse(3.1, -6.2, 1.2, 1.2, { fill: 'cinder-light', glow: { color: 'cinder', blur: 3 } }),
    ],
  ]),
  shadow('bomb-shadow', 4, 1.4),
  sprite('ley-bolt', [22, 8], [12, 4], [
    [
      { ...line([-10, 0, -1, 0], 2.6, { id: 'cyan', alpha: 0.5 }), glow: { color: 'cyan', blur: 4 } },
      path('M 6 0 L 0 -2.8 L -2.4 0 L 0 2.8 Z', { fill: 'cyan-glow', outline: true, glow: { color: 'cyan', blur: 5 } }),
    ],
  ]),
  shadow('ley-bolt-shadow', 5, 1.3),
  sprite('wisp-orb', [18, 18], [9, 9], [
    [
      ellipse(0, 0, 5.6, 5.6, { stroke: { color: { id: 'wisp', alpha: 0.6 }, width: 1 } }),
      ellipse(0, 0, 4.4, 4.4, {
        fill: { radial: [0, 0, 4.4], stops: [{ at: 0, color: 'snow' }, { at: 0.5, color: 'wisp-light' }, { at: 1, color: 'wisp' }] },
        outline: true,
        glow: { color: 'wisp-light', blur: 6 },
      }),
    ],
  ]),
  shadow('wisp-orb-shadow', 5, 2),
  sprite('muzzle-flash', [18, 18], [9, 9], [6.5, 4].map((r, i) => [
    path(star(r, 0.45, 5, i * 0.6), { fill: 'cyan-glow', glow: { color: 'cyan', blur: 6 } }),
    ellipse(0, 0, r * 0.35, r * 0.35, flat('snow')),
  ])),
  sprite('fire-burst', [64, 64], [32, 32], [0, 1, 2, 3].map((k) => {
    const r = 8 + k * 6;
    return [
      path(star(r + 4, 0.72, 8, k * 0.3), { fill: flameFill(r + 4), alpha: 1 - k * 0.2 }),
      ellipse(0, 0, r * 0.75, r * 0.75, { fill: flameFill(r), alpha: 1 - k * 0.25 }),
    ];
  })),
  sprite('burn-flame', [12, 14], [6, 7], [-1, 1, 0].map((tip, k) => [
    path(`M ${tip} ${-6 - (k % 2)} Q 4 -1 3 3 Q 2 6 0 6 Q -2 6 -3 3 Q -4 -1 ${tip} ${-6 - (k % 2)} Z`, { fill: flameFill(6), glow: { color: 'cinder', blur: 3 } }),
  ])),
  sprite('pickup-sparkle', [14, 14], [7, 7], [2.5, 5.5, 4, 2].map((s, k) => [
    path(star(s, 0.3, 4, Math.PI / 4), { fill: k % 2 === 0 ? 'cyan-glow' : 'gold-trim', glow: { color: 'cyan', blur: 3 }, alpha: k === 3 ? 0.6 : 1 }),
  ])),
  sprite('deposit-swirl', [28, 34], [14, 33], [0, 1, 2, 3].map((k) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = k * 0.8 + i * 1.05;
      return ellipse(Math.cos(a) * 9, -5 - i * 4.2 - k * 2, 1.4, 1.4, { fill: i % 2 ? 'cyan' : 'cyan-glow', glow: { color: 'cyan', blur: 3 }, alpha: 1 - k * 0.18 });
    }),
  )),
  sprite('tube-stone', [32, 32], [16, 31], [[...STONE, ...DORMANT_TUBE]]),
  sprite('tube-stone-empty', [32, 32], [16, 31], [STONE]),
];
