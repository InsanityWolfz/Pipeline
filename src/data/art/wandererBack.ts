import { flat, path, rect, solid, svg } from './types';
import { part, quiver, strap, trimStroke } from './wandererBits';
import { big, lit, TONES, WANDERER_TRIM_FX } from './wandererLook';
import type { WandererLook, WandererViewDef } from './wandererTypes';

// The arcane ranger from behind (075, the up view): the hood's back with its tail hanging over it, the cape from the
// cowl to the knees in two tails, the brass tank slung over it between the shoulder blades in its harness, the
// bandolier across the back, the quiver on the far hip. The tube is beyond the body. The near side is +x.

const HEM = 'M -13.2 12.4 L -6.6 14.4 L 0 11.8 L 7 15.4 L 13.4 13';
const HOOD_EDGE = 'M -9.4 -24.4 Q 0 -19.4 9.4 -24.4';

export function backView(L: WandererLook): WandererViewDef {
  const C = L.cloth;
  const J = L.jerkin;
  return {
    order: [
      '@tube', '@far-arm', '@near-arm', '@far-leg', '@near-leg', 'jerkin', 'cape', 'cape-tails', 'cape-hem', '@shimmer', 'quiver', 'cowl', 'harness',
      'tank', '@window', '@bubble', '@hose', 'clip', 'hood', 'hood-edge', 'hood-tail', '@flash',
    ],
    parts: [
      part('jerkin', [0, -10], [path('M -8.8 -19.6 Q 0 -21.6 8.8 -19.6 Q 10.4 -11 9.6 -1 L -9.6 -1 Q -10.4 -11 -8.8 -19.6 Z', big(J, [-10, -21, 10, -1]))]),
      part('cape', [0, -21], [
        path('M -9 -21.6 Q -13.2 -10 -13.2 3 L 13.2 3 Q 13.2 -10 9 -21.6 Z', big(C, [-13, -22, 13, 3])),
        path('M -5 -14 Q -6.5 -5 -6.6 2 M 4.6 -14 Q 5.8 -5 6 2', { stroke: { color: C.dark, width: 0.8 } }),
      ]),
      part('cape-tails', [0, 2], [
        path(`M -13.2 1 Q -13.9 7 -13.2 12.4 L -6.6 14.4 L 0 11.8 L 7 15.4 L 13.4 13 Q 14.2 7 13.2 1 Z`, big(C, [-14, 1, 14, 15])),
        path('M 0 2 L 0 11.4', { stroke: { color: C.dark, width: 0.8 } }),
      ]),
      part('cape-hem', [0, 2], [trimStroke(HEM, L, WANDERER_TRIM_FX.hem)]),
      part('quiver', [-9, -2], quiver([-7.4, 3], [-12.4, -7])),
      part('cowl', [0, -20], [
        path('M -11 -23.4 Q 0 -26.4 11 -23.4 Q 12.8 -18.6 10.2 -15.4 Q 0 -13.6 -10.2 -15.4 Q -12.8 -18.6 -11 -23.4 Z', big(C, [-12, -26, 12, -14])),
      ]),
      part('harness', [0, -12], [
        strap([8.6, -19.4], [-8.4, -3.2], 1.9),
        strap([-4.6, -21.6], [-8.6, -17.6], 1.5, 'leather'),
        strap([4.6, -21.6], [8.6, -17.6], 1.5, 'leather'),
        path('M -10.8 -6.4 Q 0 -4.8 10.8 -6.4', { stroke: { color: 'leather', width: 1.6 } }),
      ]),
      part('tank', [0, -16], [
        rect(-7, -23, 14, 18, 4, big(TONES.brass, [-7, -23, 7, -5])),
        rect(-8, -24.4, 16, 3, 1.2, solid('brass-dark')),
        rect(-8, -7.4, 16, 3, 1.2, solid('brass-dark')),
        rect(-5.6, -20.6, 2.2, 7.6, 1.1, flat({ id: 'brass-light', alpha: 0.8 })),
        strap([-7.2, -11], [7.2, -11], 1.5, 'leather'),
      ]),
      part('window-lit', [0, -16], [rect(-2.6, -19.6, 6, 7.4, 2, { fill: lit({ dark: 'cyan-deep', mid: 'cyan', light: 'cyan-glow' }, -3, -20, 4, -12), outline: true })]),
      part('window-dormant', [0, -16], [rect(-2.6, -19.6, 6, 7.4, 2, solid('dormant-dark'))]),
      part('hood', [0, -30], [
        path('M -10.2 -25 Q -11.6 -35.8 0 -41.4 Q 11.6 -35.8 10.2 -25 Q 9 -20 0 -20.4 Q -9 -20 -10.2 -25 Z', big(C, [-11, -42, 11, -20])),
        path('M 0 -40.6 Q 0.6 -34 0 -27', { stroke: { color: 'cyan', width: 0.6 }, glow: { color: 'cyan', blur: 1.5 } }),
        path('M -6.4 -36 Q -8.2 -30 -6.6 -23.6', { stroke: { color: C.light, width: 0.8 } }),
      ]),
      part('hood-edge', [0, -30], [trimStroke(HOOD_EDGE, L, WANDERER_TRIM_FX.edge)]),
      part('hood-tail', [0, -40], [path('M -2.1 -41 Q 0 -42.6 2.1 -41 Q 1.6 -36.4 0 -33.6 Q -1.6 -36.4 -2.1 -41 Z', big(C, [-2, -42, 2, -34]))]),
      part('clip', [9.2, -3], [rect(8, -4.6, 3.2, 3.2, 0.9, { fill: lit(TONES.brass, 8, -5, 11, -1), outline: true })]),
    ],
    joints: {
      cape: { at: [0, -21], kind: 'flare', stretch: [0.3, -0.35] },
      capeTail: { at: [0, 2], kind: 'turn' },
      hoodTail: { at: [0, -41], kind: 'turn' },
    },
    chains: { cape: ['cape'], 'cape-tails': ['cape', 'capeTail'], 'cape-hem': ['cape', 'capeTail'], 'hood-tail': ['hoodTail'] },
    tankParts: ['tank', 'window-lit', 'window-dormant'],
    tankBase: [0, -5],
    trimParts: ['cape-hem', 'hood-edge'],
    hem: { part: 'cape-hem', d: svg(HEM) },
    shoulders: { far: [-8.5, -18], near: [8.5, -18] },
    hips: { far: [-3.4, 0], near: [3.4, 0] },
    gunPivot: [6, -12],
    hose: { from: [3.4, -5], clip: [9.4, -3], sag: [3, 2] },
    window: { lit: 'window-lit', dormant: 'window-dormant', bubble: rect(-1.6, -14.6, 4, 2.2, 1, flat('cyan-glow')), rise: 4.6 },
    sleeves: { near: C.dark, far: C.dark },
  };
}
