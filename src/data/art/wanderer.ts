import { ellipse, flat, line, path, rect, solid, trim, type LimbStyle, type Part, type Shape } from './types';

// The wanderer (016): a hooded figure of the lost civilization in a rust cloak, a
// cyan ley glow for a face, leather gloves, and the tube held like a minigun with
// its ringed hose running round the hip into a brass tank on the back.
// Approved in the style test (docs/art/style-test.html, round 3).
//
// Units are the style test's: hip-local px with y up the screen negative, facing
// right in the side view. `scale` fits them to the game's 32×40 player box. The
// rig in src/render/vector/wandererRig.ts poses these parts from sim state.

const HEM = 'M -14 17 Q -9 20.5 -4.5 17.5 Q 0 20.5 4.5 17.5 Q 9 20.5 13 16.5';
const HEM_FRONT = 'M -14 17 Q -9 20.5 -4.5 17.5 Q 0 20.5 4.5 17.5 Q 9 20.5 14 17';
const CLOAK_FRONT = `M -9 -24 Q -15 -2 -14 17 Q -9 20.5 -4.5 17.5 Q 0 20.5 4.5 17.5 Q 9 20.5 14 17 Q 15 -2 9 -24 Z`;
const MANTLE_FRONT = 'M -11 -20 Q 0 -27 11 -20 Q 10 -12 0 -11 Q -10 -12 -11 -20 Z';
const GLOW = (x: number, y: number): Shape =>
  ellipse(x, y, 6.3, 7.3, {
    fill: {
      radial: [x + 0.5, y - 0.5, 7],
      stops: [
        { at: 0, color: 'cyan-glow' },
        { at: 0.45, color: 'cyan' },
        { at: 1, color: { id: 'cyan-deep', alpha: 0 } },
      ],
    },
    glow: { color: 'cyan', blur: 8 },
  });

const part = (id: string, pivot: readonly [number, number], shapes: readonly Shape[]): Part => ({ id, pivot, shapes });

/** Tank parts shared by the views that show it from the side. */
const tankSide: readonly Shape[] = [
  rect(-22, -27, 14, 24, 4, solid('brass')),
  rect(-12, -27, 4, 24, 2, flat('brass-dark')),
  rect(-23, -7, 16, 3.4, 1, solid('brass-dark')),
  rect(-23, -29, 16, 3.4, 1, solid('brass-dark')),
  rect(-20, -26, 3, 2, 1, flat('brass-light')),
];

export type WandererView = 'side' | 'down' | 'up';

/** Dynamic pieces the rig draws itself, by token in a view's draw order. */
export const WANDERER_DYNAMIC = ['@far-arm', '@near-arm', '@hose', '@tube', '@window', '@bubble', '@glow'] as const;
export type WandererDynamic = (typeof WANDERER_DYNAMIC)[number];

export interface WandererViewDef {
  /** Draw order: part ids and dynamic tokens. */
  order: readonly (string | WandererDynamic)[];
  parts: readonly Part[];
  /** Where each arm leaves the body, hip-local. */
  shoulders: { far: readonly [number, number]; near: readonly [number, number] };
  /** The tube's pivot, hip-local. */
  gunPivot: readonly [number, number];
  /** The hose leaves the tank here and bulges by `sag` toward the feet before reaching the tube. */
  hose: { from: readonly [number, number]; sag: readonly [number, number] };
  /** The tank window (lit or dormant) and the bubble rising in it. */
  window?: { lit: string; dormant: string; bubble: Shape; rise: number };
  /** The face glow, or none (seen from behind). */
  glow?: Shape;
  /** The trailing cloak flaps around this part, if the view has one. */
  trail?: string;
  /** Feet sit this far either side of the centre at rest; side views stride along x, others alternate lifts. */
  feet: number;
  /** 050 (A.1): both arms the near arm's wide sleeve and forearm, the far one mirrored, so facing forward they match. */
  matchedArms?: boolean;
}

const sideView: WandererViewDef = {
  order: ['cloak-trail', 'tank', '@window', '@bubble', '@far-arm', 'cloak-body', 'mantle', 'hood', '@glow', '@hose', '@tube', '@near-arm'],
  parts: [
    part('cloak-trail', [-5, -24], [path('M -5 -24 Q -20 -6 -21 14 Q -15 17 -10 14 L -4 4 Z', solid('rust-dark'))]),
    part('tank', [-15, -15], tankSide),
    part('window-lit', [-16, -16], [rect(-20, -22, 8, 12, 2, solid('cyan-deep'))]),
    part('window-dormant', [-16, -16], [rect(-20, -22, 8, 12, 2, solid('dormant-dark'))]),
    part('cloak-body', [0, 0], [
      path(`M -9 -24 Q -15 -2 -14 17 Q -9 20.5 -4.5 17.5 Q 0 20.5 4.5 17.5 Q 9 20.5 13 16.5 Q 12 -2 9 -24 Z`, solid('rust')),
      path('M 4 -22 Q 10 -2 9 17 L 13 16.5 Q 12 -2 9 -24 Z', flat('rust-dark')),
      path('M -7 -20 Q -11 -2 -10 12', trim('rust-light', 1.6)),
      path('M 1 -16 Q -1 2 0 18 L 5 17.5 Q 4 2 4 -16 Z', solid('robe')),
      rect(-10, -6, 20, 4, 1.5, solid('strap')),
      ellipse(2.5, -4, 2.2, 2.2, solid('cyan')),
      path(HEM, trim('gold-trim', 1.8)),
    ]),
    part('mantle', [0, -18], [
      path('M -11 -20 Q 0 -29 11 -20 Q 10 -13 0 -12 Q -10 -13 -11 -20 Z', solid('rust-light')),
      path('M -10 -17 Q 0 -11 10 -17', trim('gold-trim', 1.4)),
      ellipse(4, -15, 2.4, 2.4, solid('gold-trim')),
    ]),
    part('hood', [0, -24], [
      path('M -14 -26 Q -9 -42 2 -41 Q 14 -42 14 -28 Q 13 -19 3 -19.5 Q -7 -20 -14 -26 Z', solid('rust')),
      path('M -6 -38 Q 0 -42 6 -40', trim('rust-light', 1.6)),
      ellipse(6.5, -29.5, 7.6, 8.6, solid('hood-dark')),
    ]),
  ],
  shoulders: { far: [-2, -18], near: [3, -18] },
  gunPivot: [4, -8],
  hose: { from: [-14, -4], sag: [0, 14] },
  window: { lit: 'window-lit', dormant: 'window-dormant', bubble: rect(-19, -21, 6, 3, 1, flat('cyan-glow')), rise: 9 },
  glow: GLOW(7, -29.5),
  trail: 'cloak-trail',
  feet: 5,
};

/**
 * 050 (A.1): the belt seen from the front wraps the body edge to edge, curving down round the front (3/4 view), its
 * shaded right end darker; it used to stop short of the cloak's edges and read as a stick held in the hands.
 */
const BELT_FRONT: readonly Shape[] = [
  path('M -12.8 -6.5 Q 0 -4 12.8 -6.5 L 13.3 -2.6 Q 0 0 -13.3 -2.6 Z', solid('strap')),
  path('M 9 -5.9 Q 11.2 -6.2 12.8 -6.5 L 13.3 -2.6 Q 11.5 -2.2 9.2 -1.9 Z', flat('leather-dark')),
];

const downView: WandererViewDef = {
  // 050 (A.1): the arms come before the hood, so the shoulders never cross the head.
  order: ['tank-back', 'cloak-body', 'mantle', '@hose', '@tube', '@far-arm', '@near-arm', 'hood', '@glow'],
  parts: [
    part('tank-back', [0, -15], [rect(-12.5, -28, 25, 23, 4, solid('brass')), rect(-12.5, -30, 25, 3.4, 1, solid('brass-dark'))]),
    part('cloak-body', [0, 0], [
      path(CLOAK_FRONT, solid('rust')),
      path('M 5 -22 Q 11 -2 10 17.8 L 14 17 Q 15 -2 9 -24 Z', flat('rust-dark')),
      path('M -2.5 -16 Q -3 2 -3 18.8 L 3 18.8 Q 3 2 2.5 -16 Z', solid('robe')),
      ...BELT_FRONT,
      line([-7, -20, -6, -5.6], 2, 'strap'),
      line([7, -20, 6, -5.6], 2, 'strap'),
      ellipse(0, -3.2, 2.2, 2.2, solid('cyan')),
      path(HEM_FRONT, trim('gold-trim', 1.8)),
    ]),
    part('mantle', [0, -18], [
      path(MANTLE_FRONT, solid('rust-light')),
      path('M -10 -17 Q 0 -11 10 -17', trim('gold-trim', 1.4)),
      ellipse(0, -13.5, 2.4, 2.4, solid('gold-trim')),
    ]),
    part('hood', [0, -24], [
      path('M -11 -26 Q -13 -40 0 -43 Q 13 -40 11 -26 Q 9 -19 0 -19 Q -9 -19 -11 -26 Z', solid('rust')),
      path('M -6 -38 Q -2 -42 2 -42', trim('rust-light', 1.6)),
      ellipse(0, -29, 7.4, 8.4, solid('hood-dark')),
    ]),
  ],
  shoulders: { far: [-9, -17], near: [9, -17] },
  gunPivot: [6, -6],
  hose: { from: [11, -6], sag: [6, 10] },
  glow: GLOW(0, -29),
  feet: 4,
  matchedArms: true,
};

const upView: WandererViewDef = {
  order: ['@tube', '@far-arm', '@near-arm', 'cloak-body', 'mantle', '@hose', 'tank', '@window', '@bubble', 'hood'],
  parts: [
    part('cloak-body', [0, 0], [
      path(CLOAK_FRONT, solid('rust')),
      path('M 5 -22 Q 11 -2 10 17.8 L 14 17 Q 15 -2 9 -24 Z', flat('rust-dark')),
      path('M -6 -18 Q -9 0 -8 14', trim('rust-light', 1.4)),
      path('M 4 -18 Q 6 0 5 15', trim('rust-dark', 1.2)),
      rect(-11, -6, 22, 4, 1.5, solid('strap')),
      path(HEM_FRONT, trim('gold-trim', 1.8)),
    ]),
    part('mantle', [0, -18], [path(MANTLE_FRONT, solid('rust-light')), path('M -10 -17 Q 0 -11 10 -17', trim('gold-trim', 1.4))]),
    part('tank', [0, -16], [
      rect(-10, -29, 20, 25, 4, solid('brass')),
      rect(5, -29, 5, 25, 2, flat('brass-dark')),
      rect(-11, -31, 22, 3.4, 1, solid('brass-dark')),
      rect(-11, -7, 22, 3.4, 1, solid('brass-dark')),
      rect(-8, -28, 3, 2, 1, flat('brass-light')),
    ]),
    part('window-lit', [0, -18], [rect(-5, -24, 10, 13, 2, solid('cyan-deep'))]),
    part('window-dormant', [0, -18], [rect(-5, -24, 10, 13, 2, solid('dormant-dark'))]),
    part('hood', [0, -24], [
      path('M -11 -25 Q -13 -40 0 -43 Q 13 -40 11 -25 Q 0 -20 -11 -25 Z', solid('rust')),
      path('M 0 -42 Q 1 -33 0 -23', trim('rust-dark', 1.2)),
      path('M -6 -38 Q -3 -41 -1 -42', trim('rust-light', 1.4)),
    ]),
  ],
  shoulders: { far: [-8, -18], near: [8, -18] },
  gunPivot: [6, -12],
  hose: { from: [3, -4], sag: [10, 8] },
  window: { lit: 'window-lit', dormant: 'window-dormant', bubble: rect(-4, -23, 8, 3, 1, flat('cyan-glow')), rise: 10 },
  feet: 4,
};

/** The tube, in gun-local px: the grip at the origin, pointing along +x. */
export const TUBE_PARTS = {
  housing: [
    rect(-9, -5, 15, 10, 3, solid('brass')),
    rect(-9, 1, 15, 4, 2, flat('brass-dark')),
    rect(12, 4, 4, 6, 1, solid('strap')),
  ],
  barrel: { lit: [rect(4, -4, 26, 8, 4, solid('cyan')), rect(5, -3, 24, 2.2, 1, flat('cyan-glow'))], dormant: [rect(4, -4, 26, 8, 4, solid('dormant')), rect(5, -3, 24, 2.2, 1, flat('rock-light'))] },
  ring: { lit: rect(-1.2, -4.6, 2.4, 9.2, 1, solid('cyan-deep')), dormant: rect(-1.2, -4.6, 2.4, 9.2, 1, solid('dormant-dark')), glowing: rect(-1.2, -4.6, 2.4, 9.2, 1, { fill: 'cyan-glow', outline: true, glow: { color: 'cyan', blur: 4 } }) },
  /** Ring positions along the barrel, rear first: they light in this order as the tube attunes. */
  rings: [8, 13.5, 19, 24.5],
  muzzle: { lit: rect(28, -5.5, 6, 11, 2, solid('cyan-deep')), dormant: rect(28, -5.5, 6, 11, 2, solid('dormant-dark')) },
  muzzleGlow: ellipse(32.5, 0, 1.8, 3.2, { fill: 'cyan-glow', glow: { color: 'cyan', blur: 4 } }),
  /** Where the hose joins, and the hands hold, in gun-local px. */
  rear: [-7, 2],
  frontGrip: [15, 5],
  rearGrip: [-1, 5],
} as const;

export const WANDERER = {
  /** Style-test px to world px: about 42 px tall, a little over a tile. */
  scale: 0.66,
  /** The canvas the rig draws into each frame, world px, and where the feet sit in it. */
  box: { size: [72, 68], anchor: [36, 52] },
  /** The hip sits this far above the feet at rest. */
  hipHeight: 22,
  /** Rig layout, style-test px: where limbs bend and rest. */
  rig: {
    /** Feet stand this far apart at rest; `stance` above this spreads them. */
    restStance: 5,
    /** The knees hang this far below the hip, this far either side of the centre. */
    knee: { below: 12, x: 2 },
    /** The ankle sits this far above the feet. */
    ankle: -3,
    /** A side-view stride swings the feet this far; a step lifts a foot this high. */
    stride: 4,
    lift: 2.5,
    /** The front foot sits this much further forward in the side view. */
    frontFoot: 1,
    /** Empty-handed, the hands hang this far from the shoulders. */
    restHand: { far: [-1, 13], near: [1, 14] },
    /** The hose enters the tube's rear from this far back along it, and this far below. */
    hoseBend: { back: 10, drop: 6 },
    /** The wide near sleeve, as offsets: from the shoulder, a bulge, then either side of the elbow and back. */
    sleeve: { top: [-2, -3], bulge: [7, -1], elbowOut: [3, 2], elbowIn: [-3, 3], back: [-4, 6] },
    /** The elbow sits this far off the shoulder–grip midpoint. */
    elbow: [1, 1],
    /** A full punch (023): the tube thrusts this far forward along its aim (the butt jab); empty-handed, the near fist reaches this far from the shoulder. */
    jab: { thrust: 7, fist: 15 },
  },
  views: { side: sideView, down: downView, up: upView } satisfies Record<WandererView, WandererViewDef>,
  limbs: {
    legBack: { width: 6.5, color: 'leather-dark', outline: true },
    legFront: { width: 6.5, color: 'leather', outline: true },
    sleeveFar: { width: 6, color: 'rust-dark', outline: true },
    sleeveNear: { width: 6.5, color: 'rust', outline: true },
    forearm: { width: 4.2, color: 'leather', outline: true },
    hose: { width: 5.5, color: 'cyan', outline: true, bands: { color: 'cyan-deep', dash: [2.4, 2.6] } },
    hoseDormant: { width: 5.5, color: 'dormant', outline: true, bands: { color: 'dormant-dark', dash: [2.4, 2.6] } },
  } satisfies Record<string, LimbStyle>,
  boot: { back: rect(-4.5, -5, 9, 5, 2.5, solid('leather-dark')), front: rect(-4, -5.2, 9.5, 5.2, 2.5, solid('leather')) },
  /** A gloved hand. */
  hand: ellipse(0, 0, 2.8, 2.8, solid('leather-dark')),
} as const;

/**
 * How the body carries the tube's weight (016): render-side feel, in style-test px
 * and radians. Firing braces (wider stance, crouch, lean back); each shot shoves.
 */
export const WANDERER_FEEL = {
  firing: { lean: -0.16, crouch: 2.2, stance: 8.5, push: -2.5 },
  shot: { kick: 3.5, lean: -0.05, push: -1 },
  /** The punch (023): full on its tick, easing back over `ticks` sim ticks; the body leans and shifts into it. */
  jab: { ticks: 10, lean: 0.12, push: 2 },
  hit: { lean: 0.2, push: -2 },
  roll: { lean: 0.55, crouch: 9, stance: 3 },
  death: { lean: -1.2, crouch: 10, stance: 7 },
  /** Ease per 60 Hz frame toward the target pose, and kick decay. */
  ease: 0.2,
  kickDecay: 0.7,
  /** One 60 Hz frame, ms, and the longest frame the feel steps over at once. */
  frameMs: 16.7,
  maxFrameMs: 100,
  /** Stride radians per world px walked. */
  stride: 0.32,
  /** Cloak flap: speed (radians per ms) and swing at rest, walking and firing. */
  flapSpeed: 0.009,
  flap: { rest: 0.04, walk: 0.08, firing: 0.15 },
  /** Face glow: rest, pulse depth and speed, and on a shot. */
  glow: { rest: 0.78, pulse: 0.12, speed: 0.004, shot: 1 },
  /** Muzzle glow at rest and on a shot. */
  muzzle: { rest: 0.6, shot: 1 },
  /** Hose and tank flow, px per ms: idle and firing. */
  flow: { idle: 0.01, firing: 0.09 },
  /** The roll's smear: ghost copies this far back along the roll, world px, at this opacity. */
  smear: { steps: [10, 5], alpha: 0.22 },
  /** The tube's aim is limited to this far either side of each view's axis. */
  aimSpread: 0.85,
  /** Aim from this high above the feet, world px. */
  aimHeight: 14,
  /**
   * The sprite turns to the other axis only once the aim leads on it by this many world px. The aim is read once a
   * frame but a frame steps 0 to 2 ticks, so walking one diagonal with the cursor on the other swings the aim across
   * the 45° tie by up to two ticks' walk (about 5.7 px): without this the sprite flipped every frame.
   */
  facingBand: 6,
} as const;
