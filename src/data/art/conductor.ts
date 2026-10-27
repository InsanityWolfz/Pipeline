import { CONDUCTOR_SPRITES } from '../conductorAssets';
import { legacyRig, type EnemyPart, type EnemyRigDef } from './enemyRig';
import { ellipse, flat, line, path, rect, solid, type Shape, type VectorSprite } from './types';

// The Conductor (064, draft for Shaun's review): a tall robed storm construct of the lost builders, its slate-violet
// robe hanging to the ground over a body of iron, a brass collar and a hood with no face but two cyan eyes, a storm
// rod for a staff in its right hand, its forked brass crown sparking. It hovers a hand off the ground (its robe's hem
// never quite touches). The six arena rods are its own sprites: standing (a tall iron rod, a forked brass crown, a
// cyan rune course), broken (snapped off above its socket) and regrowing (the stump sprouting cyan light). Light
// from the top left; world px round the feet.

const robe = { linear: [-20, -80, 20, -6] as const, stops: [{ at: 0, color: 'storm-light' }, { at: 0.5, color: 'storm' }, { at: 1, color: 'storm-dark' }] };
const hood = { linear: [-10, -98, 10, -78] as const, stops: [{ at: 0, color: 'storm-light' }, { at: 1, color: 'storm-dark' }] };

const ground: EnemyPart = { id: 'shadow', role: 'ground', pivot: [0, 0], shapes: [ellipse(0, -1, 18, 4, { fill: { id: 'ground-shade', alpha: 0.32 } })] };

/** The robe's hem, split in two so it sways as legs would. */
const hem = (id: string, role: 'leg-back' | 'leg-front', x: number, fill: string): EnemyPart => ({
  id,
  role,
  pivot: [x, -20],
  shapes: [path(`M ${x - 9} -24 L ${x + 9} -24 L ${x + 11} -6 Q ${x} -3 ${x - 11} -6 Z`, solid(fill)), line([x - 10, -7, x + 10, -7], 1, 'brass-dark')],
});

/** The robe and its iron body: a long slate-violet robe, a brass collar and belt, a cyan ley seam down its front. */
const body = (front: boolean): EnemyPart => ({
  id: 'robe',
  role: 'body',
  pivot: [0, -48],
  shapes: [
    path('M -14 -78 Q -20 -50 -19 -18 L 19 -18 Q 20 -50 14 -78 Q 0 -84 -14 -78 Z', { fill: robe, outline: true }),
    path('M 4 -80 Q 12 -50 10 -18 L 19 -18 Q 20 -50 14 -78 Z', flat({ id: 'storm-dark', alpha: 0.5 })),
    rect(-15, -48, 30, 4, 1.5, solid('brass')),
    ellipse(0, -46, 2.2, 2.2, { fill: 'cyan', glow: { color: 'cyan', blur: 3 } }),
    ...(front ? [{ ...line([0, -76, 0, -50], 1, { id: 'cyan', alpha: 0.8 }), glow: { color: 'cyan', blur: 3 } }, { ...line([0, -43, 0, -20], 1, { id: 'cyan', alpha: 0.6 }), glow: { color: 'cyan', blur: 3 } }] : []),
    path('M -16 -80 Q 0 -86 16 -80 L 13 -74 Q 0 -78 -13 -74 Z', { fill: 'brass', outline: true }),
    ellipse(-8, -70, 4, 8, flat({ id: 'storm-pale', alpha: 0.25 })),
  ],
});

/** The hood: deep and faceless, its brim brass-trimmed. */
const head = (face: boolean): EnemyPart => ({
  id: 'hood',
  role: 'head',
  pivot: [0, -86],
  shapes: [
    path('M -10 -78 Q -12 -92 0 -100 Q 12 -92 10 -78 Z', { fill: hood, outline: true }),
    ...(face ? [path('M -6 -80 Q -7 -90 0 -93 Q 7 -90 6 -80 Z', flat('ink'))] : []),
    line([-10, -79, 10, -79], 1.2, 'brass'),
  ],
});

/** Its eyes: two cyan points in the hood that flare as it gathers the storm. */
const eyes = (xs: readonly number[]): EnemyPart => ({
  id: 'eyes',
  role: 'glow',
  pivot: [0, -86],
  shapes: xs.map((x) => ellipse(x, -86, 1.4, 1, { fill: 'cyan-glow', glow: { color: 'cyan', blur: 4 } })),
});

/** Its free arm: a robed sleeve, an iron hand. */
const arm = (from: readonly [number, number], to: readonly [number, number], mirror = false): EnemyPart => ({
  id: 'arm',
  role: 'arm-back',
  mirror,
  pivot: from,
  shapes: [line([from[0], from[1], to[0], to[1]], 8, 'storm', true), ellipse(to[0], to[1] + 2, 3.6, 3.4, solid('iron-light'))],
});

/** The staff: a sleeve and hand gripping an iron storm rod, its forked brass crown sparking cyan. */
const staff = (from: readonly [number, number], to: readonly [number, number], mirror = false): EnemyPart => {
  const [hx, hy] = to;
  return {
    id: 'staff',
    role: 'arm-front',
    mirror,
    pivot: from,
    shapes: [
      line([from[0], from[1], hx, hy], 8, 'storm', true),
      line([hx, hy + 22, hx, hy - 40], 2.6, 'iron', true),
      line([hx, hy - 40, hx - 5, hy - 50], 1.6, 'brass', true),
      line([hx, hy - 40, hx + 5, hy - 50], 1.6, 'brass', true),
      line([hx, hy - 40, hx, hy - 52], 1.6, 'brass-light', true),
      { ...ellipse(hx, hy - 52, 2.4, 2.4, { fill: 'cyan-glow' }), glow: { color: 'cyan', blur: 5 } },
      ellipse(hx, hy + 2, 3.6, 3.4, solid('iron-light')),
    ],
  };
};

export const CONDUCTOR_RIG: EnemyRigDef = legacyRig({
  id: 'conductor',
  scale: 1,
  box: { size: [96, 140], anchor: [48, 130] },
  hip: [0, -20],
  views: {
    // Facing right: the staff in front, the free arm behind.
    side: [ground, hem('hem-back', 'leg-back', -4, 'storm-dark'), arm([-4, -70], [-10, -46]), hem('hem-front', 'leg-front', 4, 'storm'), body(false), head(false), eyes([5]), staff([8, -70], [16, -46])],
    // Facing the camera: the staff in its right hand (screen left), its eyes in the dark hood.
    down: [ground, hem('hem-back', 'leg-back', -6, 'storm-dark'), hem('hem-front', 'leg-front', 6, 'storm'), arm([14, -70], [20, -46], true), body(true), head(true), eyes([-3, 3]), staff([-14, -70], [-20, -46])],
    // Its back: the staff over its other shoulder.
    up: [ground, staff([14, -70], [20, -46], true), hem('hem-back', 'leg-back', -6, 'storm-dark'), hem('hem-front', 'leg-front', 6, 'storm'), body(false), head(false), arm([-14, -70], [-20, -46])],
  },
  poses: {
    // It hovers, its hem a hand off the ground.
    idle: [{ bob: -2, glow: 0.6 }],
    walk: [
      { step: 1, bob: -2, glow: 0.6 },
      { step: 0, bob: -3, glow: 0.6 },
      { step: -1, bob: -2, glow: 0.6 },
      { step: 0, bob: -3, glow: 0.6 },
    ],
    // The arc lash: the staff drawn back, then whipped forward along the line.
    windup: [{ armFront: -1.8, lean: -0.12, bob: -3, glow: 1 }],
    swipe: [
      { armFront: 1.1, lean: 0.18, bob: -1, glow: 1 },
      { armFront: 1.2, lean: 0.2, bob: -1, glow: 1 },
    ],
    recover: [{ armFront: 0.6, lean: 0.1, bob: -2, glow: 0.4 }],
    hit: [{ lean: -0.1, bob: -1 }],
    // Before a blink: it gathers, flickering, its eyes blazing (the vanish and the arrival are render's flare).
    blink: [
      { bob: -5, scaleY: 1.04, alpha: 0.75, armFront: -0.6, armBack: -0.6, glow: 1 },
      { bob: -4, scaleY: 1.02, alpha: 0.95, armFront: -0.5, armBack: -0.5, glow: 0.8 },
    ],
    // The storm call: the staff raised high overhead.
    call: [{ armFront: -2.8, armBack: -0.8, lean: -0.16, bob: -5, glow: 1 }],
    // The rod chain: its arms spread wide, the staff out to one side.
    chain: [{ armFront: -1.3, armBack: -1.3, bob: -4, scaleY: 1.03, glow: 1 }],
  },
});

/** An arena rod's socket: an iron collar on a slate block, its rune ring. */
const SOCKET: Shape[] = [
  ellipse(0, 0, 11, 3.5, flat({ id: 'ink', alpha: 0.3 })),
  rect(-7, -5, 14, 5, 1.5, { fill: { linear: [-7, -5, 7, 0], stops: [{ at: 0, color: 'storm-light' }, { at: 1, color: 'storm-dark' }] }, outline: true }),
  rect(-3.5, -8, 7, 4, 1, solid('iron-dark')),
];

/** A rod's shaft from `top`, iron with a brass band and a cyan rune course, lit along its light side. */
const shaft = (top: number): Shape[] => [
  rect(-2.6, top, 5.2, -8 - top, 1, { fill: { linear: [-2.6, 0, 2.6, 0], stops: [{ at: 0, color: 'iron-light' }, { at: 0.5, color: 'iron' }, { at: 1, color: 'iron-dark' }] }, outline: true }),
  rect(-3.4, -24, 6.8, 3, 1, solid('brass')),
];

const STANDING: Shape[] = [
  ...SOCKET,
  ...shaft(-60),
  { ...line([0, -52, 0, -30], 0.9, { id: 'cyan', alpha: 0.85 }), glow: { color: 'cyan', blur: 3 } },
  line([0, -60, -6, -70], 1.6, 'brass', true),
  line([0, -60, 6, -70], 1.6, 'brass', true),
  line([0, -60, 0, -72], 1.6, 'brass-light', true),
  { ...ellipse(0, -72, 2, 2, { fill: 'cyan-glow' }), glow: { color: 'cyan', blur: 4 } },
];

/** Snapped off above its socket: a jagged iron stump, its rune dark, the crown lying beside it. */
const BROKEN: Shape[] = [
  ...SOCKET,
  path('M -2.6 -8 L -2.6 -20 L -1 -17 L 0.6 -22 L 2.6 -18 L 2.6 -8 Z', { fill: 'iron', outline: true }),
  rect(-3.4, -16, 6.8, 2.4, 1, solid('brass-dark')),
  line([8, -2, 16, -5], 1.6, 'brass-dark', true),
  line([12, -3.5, 14, -9], 1.4, 'brass-dark', true),
];

/** Regrowing: the stump sprouting a column of cyan light where the rod will stand. */
const REGROWING: Shape[] = [
  ...BROKEN,
  { ...rect(-1.6, -58, 3.2, 38, 1.5, { fill: { id: 'cyan-glow', alpha: 0.55 } }), glow: { color: 'cyan', blur: 6 } },
  { ...ellipse(0, -21, 3.2, 2, { fill: 'cyan-glow' }), glow: { color: 'cyan', blur: 4 } },
];

const one = (key: string, size: readonly [number, number], anchor: readonly [number, number], shapes: readonly Shape[]): VectorSprite => ({ key, size, anchor, frames: [shapes] });

/** The Conductor's arena rods, for the vector catalog. */
export const CONDUCTOR_SPRITES_VECTOR: readonly VectorSprite[] = [
  one(CONDUCTOR_SPRITES.rod.standing, [28, 80], [14, 76], STANDING),
  one(CONDUCTOR_SPRITES.rod.broken, [40, 80], [14, 76], BROKEN),
  one(CONDUCTOR_SPRITES.rod.regrowing, [40, 80], [14, 76], REGROWING),
];
