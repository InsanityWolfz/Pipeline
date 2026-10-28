import { ellipse, flat, path, trim, type Ink, type Shape } from './types';

// 081: the casing (005) as an open shell, apart from the bomb's sealed sphere by shape, and its tiers' shells.

/**
 * 081: a casing: an open shell, its two halves parted. The bowl below shows its dark hollow inside a brass rim; the
 * lid is lifted and tipped up to the right, its rim brass too. `stops` shade the metal (light, mid, dark) and `sheen`
 * lights the lid's top left. No wick and no cinder band: that's the bomb.
 */
export const casingShell = (stops: readonly [Ink, Ink, Ink], sheen: Ink): Shape[] => {
  const metal = { radial: [-3, -1, 8] as [number, number, number], stops: [{ at: 0, color: stops[0] }, { at: 0.5, color: stops[1] }, { at: 1, color: stops[2] }] };
  return [
    // The bowl, its open top towards the viewer.
    path('M -6.6 1.4 C -6.6 7.4 3 7.4 3 1.4 Z', { fill: metal, outline: true }),
    ellipse(-1.8, 1.4, 4.8, 1.7, { fill: 'ink', stroke: { color: 'brass', width: 0.8 } }),
    ellipse(-1.2, 1.8, 2.8, 0.8, flat({ id: 'iron-dark', alpha: 0.8 })),
    // The lid, lifted and tipped up to the right.
    path('M 0.2 -1.8 C -0.4 -7.6 7.4 -8.4 7.2 -2.6 Z', { fill: metal, outline: true }),
    path('M 0.2 -1.8 Q 3.6 -1 7.2 -2.6', trim('brass', 0.9)),
    path('M 1.6 -3.4 Q 2 -5.8 4.2 -6.2', trim(sheen, 0.7)),
    path('M -5.2 2.6 Q -5 4.6 -3.2 5.4', trim({ id: 'snow', alpha: 0.25 }, 0.5)),
  ];
};

/** The casing (005, 081): an iron shell, open. */
export const ICON_CASING: Shape[] = casingShell(['iron', 'iron-dark', 'ink'], { id: 'rock-light', alpha: 0.6 });
