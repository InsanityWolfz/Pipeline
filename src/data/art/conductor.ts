import { CONDUCTOR_SPRITES } from '../conductorAssets';
import type { EnemyPart, EnemyRigDef } from './enemyRig';
import { BRASS, glassInlay, litRect, rimOf, rivets, stormVein } from './enemyLook';
import { ellipse, flat, line, path, rect, solid, type Shape, type VectorSprite } from './types';

// The Conductor (064, draft for Shaun's review): a tall robed storm construct of the lost builders, its slate-violet
// robe hanging to the ground over a body of iron, a brass collar and a hood with no face but two cyan eyes, a storm
// rod for a staff in its right hand, its forked brass crown sparking. It hovers a hand off the ground (its robe's hem
// never quite touches). The six arena rods are its own sprites: standing (a tall iron rod, a forked brass crown, a
// cyan rune course), broken (snapped off above its socket) and regrowing (the stump sprouting cyan light). Light
// from the top left; world px round the feet.
// 076: the Storm-works look: the slate-violet robe with a pale storm rim, its iron body and brass collar and crown
// riveted; the crown's sparks are violet lightning, the staff carries a storm-glass head; its eyes and the robe's seam
// stay ley cyan. The rods take the same look, their crown sparks violet. Each attack is a strip: the lash dips the
// staff across its body, draws it far back with the robe swept, crackles; the call lowers the staff crouching, raises
// it high overhead stretched, trembles; the chain draws its arms in, spreads them wide with the robe flared, trembles.

const robe = { linear: [-20, -80, 20, -6] as const, stops: [{ at: 0, color: 'storm-light' }, { at: 0.5, color: 'storm' }, { at: 1, color: 'storm-dark' }] };
const hood = { linear: [-10, -98, 10, -78] as const, stops: [{ at: 0, color: 'storm-light' }, { at: 1, color: 'storm-dark' }] };

const ground: EnemyPart = { id: 'shadow', role: 'ground', pivot: [0, 0], shapes: [ellipse(0, -1, 18, 4, { fill: { id: 'ground-shade', alpha: 0.32 } })] };

/** The robe's hem, split in two so it sways as legs would. */
const hem = (id: string, role: 'leg-back' | 'leg-front', x: number, fill: string): EnemyPart => ({
  id,
  role,
  pivot: [x, -20],
  shapes: [path(`M ${x - 9} -24 L ${x + 9} -24 L ${x + 11} -6 Q ${x} -3 ${x - 11} -6 Z`, { fill: { linear: [x - 9, -24, x + 11, -4], stops: [{ at: 0, color: fill === 'storm' ? 'storm-light' : 'storm' }, { at: 1, color: 'storm-dark' }] }, outline: true, rim: rimOf('storm') }), line([x - 10, -7, x + 10, -7], 1, 'brass-dark')],
});

/** The robe and its iron body: a long slate-violet robe, a brass collar and belt, a cyan ley seam down its front. */
const body = (front: boolean): EnemyPart => ({
  id: 'robe',
  role: 'body',
  pivot: [0, -48],
  shapes: [
    path('M -14 -78 Q -20 -50 -19 -18 L 19 -18 Q 20 -50 14 -78 Q 0 -84 -14 -78 Z', { fill: robe, outline: true, rim: rimOf('storm') }),
    path('M 4 -80 Q 12 -50 10 -18 L 19 -18 Q 20 -50 14 -78 Z', flat({ id: 'storm-dark', alpha: 0.5 })),
    path('M -12 -60 Q -14 -40 -13 -22 M 7 -64 Q 9 -42 8 -22', { stroke: { color: { id: 'storm-dark', alpha: 0.6 }, width: 0.9 } }),
    litRect(-15, -48, 30, 4, 1.5, BRASS, 'storm'),
    ...rivets([[-12, -46], [12, -46]], 0.8),
    ...glassInlay(-8, -46, 1.6),
    ...glassInlay(8, -46, 1.6),
    ellipse(0, -46, 2.2, 2.2, { fill: 'cyan', glow: { color: 'cyan', blur: 3 } }),
    ...(front ? [{ ...line([0, -76, 0, -50], 1, { id: 'cyan', alpha: 0.8 }), glow: { color: 'cyan', blur: 3 } }, { ...line([0, -43, 0, -20], 1, { id: 'cyan', alpha: 0.6 }), glow: { color: 'cyan', blur: 3 } }] : []),
    path('M -16 -80 Q 0 -86 16 -80 L 13 -74 Q 0 -78 -13 -74 Z', { fill: { linear: [-16, -86, 16, -74], stops: [{ at: 0, color: 'brass-light' }, { at: 0.45, color: 'brass' }, { at: 1, color: 'brass-dark' }] }, outline: true }),
    ...rivets([[-10, -78], [10, -78]], 0.7),
    ellipse(-8, -70, 4, 8, flat({ id: 'storm-pale', alpha: 0.25 })),
  ],
});

/** The hood: deep and faceless, its brim brass-trimmed. */
const head = (face: boolean): EnemyPart => ({
  id: 'hood',
  role: 'head',
  pivot: [0, -86],
  shapes: [
    path('M -10 -78 Q -12 -92 0 -100 Q 12 -92 10 -78 Z', { fill: hood, outline: true, rim: rimOf('storm') }),
    ...(face ? [path('M -6 -80 Q -7 -90 0 -93 Q 7 -90 6 -80 Z', flat('ink'))] : []),
    line([-10, -79, 10, -79], 1.2, 'brass'),
  ],
});

/** Its eyes: two cyan points in the hood that flare as it gathers the storm. */
const eyes = (xs: readonly number[]): EnemyPart => ({
  id: 'eyes',
  role: 'glow',
  follows: 'head',
  pivot: [0, -86],
  shapes: xs.map((x) => ellipse(x, -86, 1.4, 1, { fill: 'cyan-glow', glow: { color: 'cyan', blur: 4 } })),
});

/** Its free arm: a robed sleeve, an iron hand. */
const arm = (from: readonly [number, number], to: readonly [number, number], mirror = false): EnemyPart => ({
  id: 'arm',
  role: 'arm-back',
  mirror,
  pivot: from,
  shapes: [line([from[0], from[1], to[0], to[1]], 8, 'storm', true), line([from[0] - 1.6, from[1], to[0] - 1.6, to[1]], 1.6, { id: 'storm-light', alpha: 0.6 }), ellipse(to[0], to[1] + 2, 3.6, 3.4, { fill: { linear: [to[0] - 3, to[1] - 1, to[0] + 3, to[1] + 5], stops: [{ at: 0, color: 'iron-light' }, { at: 1, color: 'iron' }] }, outline: true })],
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
      line([from[0] - 1.6, from[1], hx - 1.6, hy], 1.6, { id: 'storm-light', alpha: 0.6 }),
      line([hx, hy + 22, hx, hy - 40], 2.6, 'iron', true),
      line([hx - 0.6, hy + 20, hx - 0.6, hy - 38], 0.7, 'iron-light'),
      line([hx, hy - 40, hx - 5, hy - 50], 1.6, 'brass', true),
      line([hx, hy - 40, hx + 5, hy - 50], 1.6, 'brass', true),
      line([hx, hy - 40, hx, hy - 50], 1.6, 'brass-light', true),
      ...glassInlay(hx, hy - 52, 3),
      ...stormVein([hx - 5, hy - 50, hx - 2, hy - 54, hx - 4, hy - 57], 0.5),
      ...stormVein([hx + 5, hy - 50, hx + 3, hy - 55, hx + 6, hy - 58], 0.5),
      ellipse(hx, hy + 2, 3.6, 3.4, { fill: { linear: [hx - 3, hy - 1, hx + 3, hy + 5], stops: [{ at: 0, color: 'iron-light' }, { at: 1, color: 'iron' }] }, outline: true }),
    ],
  };
};

export const CONDUCTOR_RIG: EnemyRigDef = {
  id: 'conductor',
  scale: 1,
  box: { size: [136, 160], anchor: [68, 150] },
  hip: [0, -20],
  tells: {
    windup: { part: 'staff', at: { side: [16, -98], down: [-20, -98], up: [20, -98] } },
    call: { part: 'staff', at: { side: [16, -98], down: [-20, -98], up: [20, -98] } },
    chain: { part: 'staff', at: { side: [16, -46], down: [-20, -46], up: [20, -46] } },
  },
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
    // 076: the lash: the staff dipped across its body; drawn far back, the robe swept; crackling. Whipped forward.
    windup: [
      { armFront: 0.55, lean: 0.08, bob: -2, squash: 0.06, glow: 0.8 },
      { armFront: -2.05, armBack: 0.3, lean: -0.22, bob: -3, squash: -0.06, glow: 1 },
      { armFront: -2.3, armBack: 0.35, lean: -0.28, bob: -3, squash: -0.08, glow: 1 },
    ],
    swipe: [
      { armFront: 1.1, lean: 0.2, bob: -1, shift: 2, squash: -0.06, glow: 1 },
      { armFront: 1.2, lean: 0.2, bob: -1, glow: 1 },
    ],
    recover: [{ armFront: 0.6, lean: 0.1, bob: -2, glow: 0.4 }],
    // Flinch only: a snap of the hood.
    hit: [{ lean: -0.1, head: -0.3, bob: -1, squash: 0.04 }],
    // Before a blink: it gathers, flickering, its eyes blazing (the vanish and the arrival are render's flare).
    blink: [
      { bob: -5, squash: -0.04, alpha: 0.75, armFront: -0.6, armBack: -0.6, glow: 1 },
      { bob: -4, squash: -0.02, alpha: 0.95, armFront: -0.5, armBack: -0.5, glow: 0.8 },
    ],
    // The storm call: the staff lowered, crouching; raised high overhead, stretched; trembling.
    call: [
      { armFront: 0.45, sink: 2, bob: 0, squash: 0.12, glow: 0.8 },
      { armFront: -2.85, armBack: -0.9, lean: -0.16, bob: -6, squash: -0.12, head: -0.2, glow: 1 },
      { armFront: -3.05, armBack: -1, lean: -0.18, bob: -7, squash: -0.15, head: -0.25, glow: 1 },
    ],
    // The rod chain: arms drawn in; spread wide, the robe flared; trembling.
    chain: [
      { armFront: 0.35, armBack: 0.35, spread: -3, bob: -2, squash: -0.04, glow: 0.8 },
      { armFront: -1.35, armBack: -1.35, spread: 4, bob: -4, squash: 0.08, glow: 1 },
      { armFront: -1.5, armBack: -1.5, spread: 5, bob: -4.5, squash: 0.1, glow: 1 },
    ],
    // The staff falls and the crown's sparks die.
    death: [{ armFront: 1.35, armBack: 0.4, head: 0.35, headLift: 2, bob: 0, squash: -0.06, lean: 0.12, glow: 0 }],
  },
};

/** An arena rod's socket: an iron collar on a slate block, its rune ring. */
const SOCKET: Shape[] = [
  ellipse(0, 0, 11, 3.5, flat({ id: 'ink', alpha: 0.3 })),
  rect(-7, -5, 14, 5, 1.5, { fill: { linear: [-7, -5, 7, 0], stops: [{ at: 0, color: 'storm-pale' }, { at: 0.45, color: 'storm-light' }, { at: 1, color: 'storm-dark' }] }, outline: true, rim: rimOf('storm') }),
  ...rivets([[-5, -2.5], [5, -2.5]], 0.6),
  rect(-3.5, -8, 7, 4, 1, solid('iron-dark')),
];

/** A rod's shaft from `top`, iron with a brass band and a cyan rune course, lit along its light side. */
const shaft = (top: number): Shape[] => [
  rect(-2.6, top, 5.2, -8 - top, 1, { fill: { linear: [-2.6, 0, 2.6, 0], stops: [{ at: 0, color: 'iron-light' }, { at: 0.5, color: 'iron' }, { at: 1, color: 'iron-dark' }] }, outline: true }),
  litRect(-3.4, -24, 6.8, 3, 1, BRASS, 'storm'),
  ...glassInlay(0, -40, 1.6),
];

const STANDING: Shape[] = [
  ...SOCKET,
  ...shaft(-60),
  { ...line([0, -52, 0, -30], 0.9, { id: 'cyan', alpha: 0.85 }), glow: { color: 'cyan', blur: 3 } },
  line([0, -60, -6, -70], 1.6, 'brass', true),
  line([0, -60, 6, -70], 1.6, 'brass', true),
  line([0, -60, 0, -72], 1.6, 'brass-light', true),
  { ...ellipse(0, -72, 2.2, 2.2, { fill: 'snow' }), glow: { color: 'storm-glow', blur: 5 } },
  ...stormVein([-6, -70, -4, -74, -6, -77], 0.45),
  ...stormVein([6, -70, 4, -75, 6, -77], 0.45),
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
