import { ellipse, flat, line, path, rect, solid, svg } from './types';
import { bandolier, clasp, faceGlow, part, quiver, strap, trimStroke } from './wandererBits';
import { big, lit, TONES, WANDERER_TRIM_FX } from './wandererLook';
import type { WandererLook, WandererViewDef } from './wandererTypes';

// The arcane ranger side on (075), facing right: hip-local style px, y up the screen negative, the feet 22 below the
// hip. The cape hangs behind to the back of the knees in two tails; the brass tank rides high between the shoulder
// blades over it; the hood's pointed tip sweeps back into a short tail.

const HEM = 'M -17 10 L -14 12.8 L -11 10 L -7 13.8 L -3 11.8';
const HOOD_EDGE = 'M 9.4 -34.4 Q 4 -38.2 1.6 -32 Q 0.6 -26.4 3.4 -23.2';

export function sideView(L: WandererLook): WandererViewDef {
  const C = L.cloth;
  const J = L.jerkin;
  return {
    order: [
      'cape', 'cape-tails', 'cape-hem', '@shimmer', 'hood-tail', 'quiver', '@far-leg', 'tank', '@window', '@bubble', '@far-arm',
      '@near-leg', 'skirt-back', 'jerkin', 'skirt-front', 'gear', 'cowl', 'clasp', 'hood', '@glow', 'hood-edge', '@hose', 'clip', '@tube', '@near-arm', '@flash',
    ],
    parts: [
      part('cape', [-2, -20], [
        path('M -2.5 -21.5 Q -10.5 -19.5 -13.8 -9 Q -15.6 -2.5 -16 3 L -1.5 3 Q -1.5 -8 1 -19 Z', big(C, [-16, -22, -1, 3])),
        path('M -9.6 -10 Q -11.4 -4 -11.6 2', { stroke: { color: C.dark, width: 0.9 } }),
      ]),
      part('cape-tails', [-7, 1], [
        path(`M -16 0 Q -17.2 5 -17 10 L -14 12.8 L -11 10 L -7 13.8 L -3 11.8 Q -1.8 6 -1.6 0 Z`, big(C, [-17, 0, -2, 14])),
        path('M -17 10 L -14 12.8 L -11 10 Q -11.8 5 -12.2 0 L -16 0 Q -17.2 5 -17 10 Z', flat({ id: C.dark, alpha: 0.5 })),
      ]),
      part('cape-hem', [-7, 1], [trimStroke(HEM, L, WANDERER_TRIM_FX.hem)]),
      part('hood-tail', [-2, -40], [path('M 1.2 -41.4 Q -4.6 -43.8 -11 -38.4 Q -7.4 -38.4 -3.8 -36.2 Z', big(C, [-11, -43, 1, -36]))]),
      part('quiver', [-6, 0], quiver([-1.5, 4.5], [-11.5, -3])),
      part('tank', [-10.5, -17], [
        rect(-15, -26.5, 10, 18, 4, big(TONES.brass, [-15, -27, -5, -8])),
        rect(-15.8, -28, 11.6, 2.8, 1.2, solid('brass-dark')),
        rect(-15.8, -10.6, 11.6, 2.8, 1.2, solid('brass-dark')),
        rect(-9.4, -8.2, 3.2, 2.4, 0.8, solid('brass-dark')),
        strap([-15.2, -18.5], [-4.8, -18.5], 1.5, 'leather'),
      ]),
      part('window-lit', [-10.5, -17], [rect(-12.8, -24, 5.2, 9.6, 2, { fill: lit({ dark: 'cyan-deep', mid: 'cyan', light: 'cyan-glow' }, -13, -24, -8, -14), outline: true })]),
      part('window-dormant', [-10.5, -17], [rect(-12.8, -24, 5.2, 9.6, 2, solid('dormant-dark'))]),
      part('skirt-back', [-3, -2], [
        path('M -5.9 -2.4 L -0.4 -2.4 L -0.8 5.4 Q -3.6 6.6 -6.6 5.2 Z', big(J, [-6.6, -2.4, -0.4, 6.6])),
        path('M -6.2 4.3 Q -3.6 5.4 -1.1 4.3', { stroke: { color: 'cyan', width: 0.6 } }),
      ]),
      part('jerkin', [0, -10], [
        path('M -5.2 -19.5 Q 1 -21 5.2 -19.2 Q 7.6 -12 6.8 -2 L -5.8 -2 Q -6.8 -11 -5.2 -19.5 Z', big(J, [-6, -20, 7, -2])),
        path('M 1.5 -18.5 Q 2.2 -10 1.8 -2.5', { stroke: { color: J.dark, width: 0.7 } }),
        path('M -5.2 -12 Q 0 -11.2 6.8 -12.2', { stroke: { color: J.dark, width: 0.5 } }),
        path('M 4.4 -16.6 L 4.4 -13 L 5.6 -11.6 M 4.4 -13 L 3.2 -11.6 M 4.4 -9.6 L 4.4 -5.6', { stroke: { color: 'cyan', width: 0.6 } }),
      ]),
      part('skirt-front', [2, -2], [
        path('M -0.2 -2.4 L 6.8 -2.4 L 7.4 4.6 Q 4 6.2 0.2 5.2 Z', big(J, [-0.2, -2.4, 7.4, 6.2])),
        path('M 0.5 4.4 Q 4 5.4 7 3.9', { stroke: { color: 'cyan', width: 0.6 } }),
      ]),
      part('gear', [0, -8], [
        strap([-6, -23], [0, -20.6], 1.5, 'leather'),
        path('M 0 -20.6 Q 5 -17 5.4 -6', { stroke: { color: 'leather', width: 1.5 } }),
        strap([-5.9, -10.5], [-4.6, -10], 1.5, 'leather'),
        ...bandolier([-2.5, -19.2], [6.1, -5.6]),
        rect(-6.4, -5.4, 13.6, 3.8, 1.3, { fill: lit(TONES.leather, -6, -5, 7, -1.6), outline: true }),
        ellipse(6.1, -3.5, 1.5, 1.7, { fill: 'cyan', outline: true, glow: { color: 'cyan', blur: 1.5 } }),
        rect(0.2, -3.2, 4.4, 4.6, 1.4, { fill: lit(TONES.leather, 0, -3, 4.6, 1.4), outline: true }),
        line([0.4, -1.8, 4.4, -1.8], 0.8, 'leather-dark'),
      ]),
      part('cowl', [0, -20], [
        path('M -7.6 -24.4 Q 0 -27.4 7.4 -23.6 Q 9 -19.2 7 -16.6 Q 0.5 -15.2 -6 -16.6 Q -9.2 -19.8 -7.6 -24.4 Z', big(C, [-8, -26, 8, -16])),
        path('M -5 -17.6 Q 0.5 -16.4 6 -17.8', { stroke: { color: C.dark, width: 0.7 } }),
      ]),
      part('clasp', [6.4, -20], [clasp(6.6, -19.8, L)]),
      part('hood', [0, -30], [
        path('M -8.2 -27 Q -9.4 -35.4 -3.4 -40.2 Q 0 -42.8 3.6 -41.2 Q 8.6 -38.8 10.2 -32.6 Q 11.8 -27 9.6 -22.6 Q 4 -20.9 -1 -22.4 Q -6.6 -23 -8.2 -27 Z', big(C, [-9, -42, 11, -21])),
        path('M -4.8 -36.5 Q -6.5 -30 -4.6 -24.4', { stroke: { color: C.dark, width: 0.8 } }),
        ellipse(5.9, -29.8, 4.7, 6.5, { fill: 'hood-dark', outline: true }),
        path('M 8.2 -35.6 Q 3.6 -40.6 -1.4 -41.6', { stroke: { color: 'cyan', width: 0.7 }, glow: { color: 'cyan', blur: 1.5 } }),
      ]),
      part('hood-edge', [0, -30], [trimStroke(HOOD_EDGE, L, WANDERER_TRIM_FX.edge)]),
      part('clip', [-1.5, -2.6], [rect(-3, -4.2, 3.2, 3.2, 0.9, { fill: lit(TONES.brass, -3, -4, 0, -1), outline: true })]),
    ],
    joints: {
      cape: { at: [-2, -20], kind: 'turn' },
      capeTail: { at: [-7, 1], kind: 'turn' },
      hoodTail: { at: [-1.5, -40.5], kind: 'turn' },
      skirtFront: { at: [2, -2], kind: 'turn' },
      skirtBack: { at: [-3, -2], kind: 'turn' },
    },
    chains: { cape: ['cape'], 'cape-tails': ['cape', 'capeTail'], 'cape-hem': ['cape', 'capeTail'], 'hood-tail': ['hoodTail'], 'skirt-front': ['skirtFront'], 'skirt-back': ['skirtBack'] },
    tankParts: ['tank', 'window-lit', 'window-dormant'],
    tankBase: [-10.5, -8],
    trimParts: ['cape-hem', 'hood-edge', 'clasp'],
    hem: { part: 'cape-hem', d: svg(HEM) },
    shoulders: { far: [-1, -17.5], near: [2, -17] },
    hips: { far: [-1, 0], near: [1, 0] },
    gunPivot: [5, -7],
    hose: { from: [-7.8, -6.6], clip: [-1.4, -2.4], sag: [1, 5] },
    window: { lit: 'window-lit', dormant: 'window-dormant', bubble: rect(-12.2, -16.8, 4, 2.2, 1, flat('cyan-glow')), rise: 6.4 },
    glow: faceGlow(6.2, -29.8, 4.4, 5.8),
    feet: 4,
  };
}
