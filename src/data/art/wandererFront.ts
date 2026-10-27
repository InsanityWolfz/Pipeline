import { ellipse, line, path, rect, svg } from './types';
import { bandolier, clasp, faceGlow, part, trimStroke } from './wandererBits';
import { big, lit, TONES, WANDERER_TRIM_FX } from './wandererLook';
import type { WandererLook, WandererViewDef } from './wandererTypes';

// The arcane ranger from the front (075, the down view): the hood's hollow and glow, the cowl and its clasp gem, the
// etched jerkin crossed by the rune bandolier, the harness straps over the shoulders, the cape behind both sides
// and its two tails behind the legs, the tank's top over the shoulders. The near side (the tube's) is +x.

const HEM = 'M -15 11.4 L -8.6 13.4 L -0.4 11.2 L 8.4 14.2 L 15.4 12';
const HOOD_EDGE = 'M -6.6 -25.6 Q -7.6 -35.2 0 -37.1 Q 7.6 -35.2 6.6 -25.6';

export function frontView(L: WandererLook): WandererViewDef {
  const C = L.cloth;
  const J = L.jerkin;
  return {
    order: [
      'tank', 'cape', 'cape-tails', 'cape-hem', '@shimmer', '@far-leg', '@near-leg', 'jerkin', 'skirt-front', 'gear', '@hose', 'clip', '@tube',
      '@far-arm', '@near-arm', 'cowl', 'clasp', 'hood-tail', 'hood', '@glow', 'hood-edge', '@flash',
    ],
    parts: [
      part('tank', [0, -24], [
        rect(-7.6, -29, 15.2, 12, 4, big(TONES.brass, [-8, -29, 8, -17])),
        rect(-8.4, -30.4, 16.8, 3, 1.2, { fill: 'brass-dark', outline: true }),
      ]),
      part('cape', [0, -21], [
        path('M -8 -21.5 Q -13.6 -10 -13.6 3 L 13.6 3 Q 13.6 -10 8 -21.5 Z', big(C, [-14, -22, 14, 3])),
        path('M -11 -10 Q -12 -3 -12 2 M 11 -10 Q 12 -3 12 2', { stroke: { color: C.dark, width: 0.8 } }),
      ]),
      part('cape-tails', [0, 2], [
        path(`M -13.6 1 Q -15 7 -15 11.4 L -8.6 13.4 L -0.4 11.2 L 8.4 14.2 L 15.4 12 Q 15.4 7 13.6 1 Z`, big({ ...C, light: C.mid }, [-15, 1, 15, 14])),
      ]),
      part('cape-hem', [0, 2], [trimStroke(HEM, L, WANDERER_TRIM_FX.hem)]),
      part('jerkin', [0, -10], [
        path('M -8.6 -19.6 Q 0 -21.8 8.6 -19.6 Q 10.2 -11 9.4 -2 L -9.4 -2 Q -10.2 -11 -8.6 -19.6 Z', big(J, [-10, -21, 10, -2])),
        path('M 0 -18.6 L 0 -3', { stroke: { color: J.dark, width: 0.8 } }),
        path('M -9.3 -11.6 Q -4.6 -10.8 -0.4 -11.4 M 0.4 -11.4 Q 4.6 -10.8 9.3 -11.6', { stroke: { color: J.dark, width: 0.5 } }),
        path('M -4.4 -17.2 L -4.4 -14 L -2.9 -12.6 M -4.4 -14 L -5.9 -12.6', { stroke: { color: 'cyan', width: 0.6 } }),
        path('M 4.4 -9.8 L 4.4 -6.2 M 3 -8.6 L 5.8 -8.6', { stroke: { color: 'cyan', width: 0.6 } }),
      ]),
      part('skirt-front', [0, -2], [
        path('M -9.2 -2.4 L 9.2 -2.4 L 8.6 7 Q 4.4 8.2 1 7.2 L 0 4.6 L -1 7.2 Q -4.4 8.2 -8.6 7 Z', big(J, [-9, -2.4, 9, 8])),
        path('M -8.2 6 Q -4.4 7 -1.2 6.2 M 1.2 6.2 Q 4.4 7 8.2 6', { stroke: { color: 'cyan', width: 0.6 } }),
      ]),
      part('gear', [0, -10], [
        path('M -6.4 -20.6 Q -8.6 -18 -9.3 -12.6 M 6.4 -20.6 Q 8.6 -18 9.3 -12.6', { stroke: { color: 'leather', width: 1.6 } }),
        ...bandolier([-7.4, -18.6], [7.2, -5.4]),
        path('M -9.7 -6 Q 0 -4 9.7 -6 L 9.9 -2.2 Q 0 -0.2 -9.9 -2.2 Z', { fill: lit(TONES.leather, -10, -6, 10, -1), outline: true }),
        ellipse(0, -3.1, 1.8, 1.9, { fill: 'cyan', outline: true, glow: { color: 'cyan', blur: 1.5 } }),
        rect(6.4, -3.6, 4.4, 4.8, 1.4, { fill: lit(TONES.leather, 6, -4, 11, 1), outline: true }),
        line([6.6, -2.2, 10.6, -2.2], 0.8, 'leather-dark'),
      ]),
      part('cowl', [0, -20], [
        path('M -11 -23.4 Q 0 -27.4 11 -23.4 Q 12.8 -18.6 10.2 -15.6 Q 0 -13.4 -10.2 -15.6 Q -12.8 -18.6 -11 -23.4 Z', big(C, [-12, -27, 12, -14])),
        path('M -8 -16.6 Q 0 -14.8 8 -16.6', { stroke: { color: C.dark, width: 0.7 } }),
      ]),
      part('clasp', [0, -17], [clasp(0, -17.4, L)]),
      part('hood-tail', [0, -40], [path('M -1.2 -41.4 Q 3 -43.4 6.4 -39.4 Q 3.4 -40 1.2 -39.2 Z', big(C, [-1, -43, 6.4, -39]))]),
      part('hood', [0, -30], [
        path('M -10.2 -25.8 Q -11.6 -36 0 -41.6 Q 11.6 -36 10.2 -25.8 Q 9 -20.6 0 -20.6 Q -9 -20.6 -10.2 -25.8 Z', big(C, [-11, -42, 11, -20])),
        ellipse(0, -29.2, 6.4, 7.4, { fill: 'hood-dark', outline: true }),
        line([0, -37.4, 0, -41], 0.7, 'cyan'),
      ]),
      part('hood-edge', [0, -30], [trimStroke(HOOD_EDGE, L, WANDERER_TRIM_FX.edge)]),
      part('clip', [8.6, -3], [rect(7.4, -4.8, 3.2, 3.2, 0.9, { fill: lit(TONES.brass, 7, -5, 11, -1), outline: true })]),
    ],
    joints: {
      cape: { at: [0, -21], kind: 'flare', stretch: [0.5, -0.25] },
      capeTail: { at: [0, 2], kind: 'turn' },
      hoodTail: { at: [-1, -41], kind: 'turn' },
    },
    chains: { cape: ['cape'], 'cape-tails': ['cape', 'capeTail'], 'cape-hem': ['cape', 'capeTail'], 'hood-tail': ['hoodTail'] },
    tankParts: ['tank'],
    tankBase: [0, -17],
    trimParts: ['cape-hem', 'hood-edge', 'clasp'],
    hem: { part: 'cape-hem', d: svg(HEM) },
    shoulders: { far: [-9, -17.5], near: [9, -17.5] },
    hips: { far: [-3.4, 0], near: [3.4, 0] },
    gunPivot: [5.5, -6],
    hose: { from: [10.4, -10], clip: [9, -3.2], sag: [2.5, 1] },
    glow: faceGlow(0, -29.2, 5.6, 6.4),
    feet: 4,
    matchedArms: true,
  };
}
