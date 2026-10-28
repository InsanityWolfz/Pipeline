import type { EnemyPart, EnemyRigDef } from './enemyRig';
import { GUARDIAN, glowLine, litPath, litRect, mossTuft, rimOf, shade, tone, type Tone } from './enemyLook';
import { ellipse, flat, line, path, solid } from './types';

// The Pylon Warden (016, draft for Shaun's review): a mossy stone guardian with
// boulder fists, one cyan eye slit, and (018) its core set in its chest, a violet
// heart-stone with a glowing gold heart: what it drops as the warden core. It raises both fists overhead, slams, then
// stays crouched to recover.
// 076: the Mossbound ruins look: shaded guardian stone with a warm rim, more moss on its shoulders and fists, and a
// cyan rune course down each forearm. Its slam gathers in a squat, coils with both fists high and its back arched,
// and trembles at the peak; the slam lands squashed.

/** The far limbs in shadow. */
const FAR = tone('warden-dark', 'warden-dark', 'warden');

const leg = (id: string, role: 'leg-back' | 'leg-front', x: number, t: Tone): EnemyPart => ({
  id,
  role,
  pivot: [x + 4.5, -14],
  shapes: [litRect(x, -15, 9, 15, 3, t, 'ruin'), line([x + 1.5, -6, x + 7.5, -6], 0.8, { id: 'warden-dark', alpha: 0.6 })],
});
/** A stone arm with a boulder fist, moss on the fist and a rune course down the forearm. */
const arm = (id: string, role: 'arm-back' | 'arm-front', from: readonly [number, number], to: readonly [number, number], t: Tone, mirror = false): EnemyPart => {
  const [fx, fy] = to;
  const mx = from[0] + (fx - from[0]) * 0.35;
  const my = from[1] + (fy - from[1]) * 0.35;
  return {
    id,
    role,
    mirror,
    pivot: from,
    shapes: [
      line([from[0], from[1], fx, fy], 7, t.mid, true),
      line([from[0] - 1.2, from[1], fx - 1.2, fy], 2, { id: t.light, alpha: 0.6 }),
      ellipse(fx, fy + 2, 6.4, 5.8, { fill: shade(t, [fx - 6.4, fy - 3.8, fx + 6.4, fy + 7.8]), outline: true, rim: rimOf('ruin') }),
      ellipse(fx - 1.8, fy - 0.2, 2.2, 1.5, flat('warden-light')),
      line([fx - 3, fy + 4.5, fx + 3, fy + 4.5], 0.7, { id: 'warden-dark', alpha: 0.7 }),
      ...mossTuft(fx - 4.5, fx + 1.5, fy - 2.6, 1.8),
      glowLine([mx, my, (mx + fx) / 2, (my + fy) / 2 - 0.5], 1, 'cyan', 2.5),
      ellipse((mx + fx) / 2 + 0.4, (my + fy) / 2 + 1.6, 0.7, 0.7, { fill: 'cyan-glow' }),
    ],
  };
};
const torso = (front: boolean): EnemyPart => ({
  id: 'torso',
  role: 'body',
  pivot: [0, -28],
  shapes: [
    litPath('M -16 -42 Q -18 -26 -12 -14 L 12 -14 Q 18 -26 16 -42 Q 0 -48 -16 -42 Z', GUARDIAN, 'ruin'),
    path('M 8 -44 Q 16 -30 12 -14 L 12 -14 Q 18 -26 16 -42 Z', flat({ id: 'warden-dark', alpha: 0.7 })),
    // Weathered courses of stone across the chest.
    path('M -15 -24 Q 0 -21 14 -24 M -16 -33 Q -6 -31 -2 -33', { stroke: { color: { id: 'warden-dark', alpha: 0.55 }, width: 0.8 } }),
    path('M -14 -40 Q -4 -43 6 -42', { stroke: { color: { id: 'warden-light', alpha: 0.8 }, width: 1 } }),
    ...mossTuft(-18, -6, -43.5, 2.8),
    ...mossTuft(6, 16, -44, 2.4),
    ...mossTuft(-12, -5, -16, 1.6),
    ...(front ? [ellipse(0, -30, 6, 6, { fill: { radial: [0, -30, 6], stops: [{ at: 0, color: 'warden-dark' }, { at: 1, color: 'ink' }] }, outline: true })] : [path('M -8 -36 L 8 -24', { stroke: { color: 'warden-dark', width: 1.2 } }), ellipse(CORE.side, -30, 4, 5, solid('warden-dark'))]),
  ],
});

/**
 * The core in the chest socket (rig px; side view sits forward), and its halo's pulse while winding up (drawn over
 * the baked frames by EnemyView): halo radius, growing by `swell` at the peak, its colour, opacity at rest and peak.
 */
export const CORE = { enemyId: 'pylon-warden', at: [0, -30] as const, side: 7, halo: 9, swell: 0.3, haloColor: 'core', pulseMs: 420, rest: 0.25, peak: 0.75 } as const;

/** The core: the violet heart-stone of the drop, its gold heart glowing. A glow part, so it brightens in the wind-up and fades as the Warden falls. */
const core = (x: number): EnemyPart => ({
  id: 'core',
  role: 'glow',
  pivot: [x, CORE.at[1]],
  shapes: [
    ellipse(x, CORE.at[1], 3.8, 4.2, { fill: { radial: [x - 1, CORE.at[1] - 1.5, 4.5], stops: [{ at: 0, color: 'core' }, { at: 1, color: 'core-dark' }] }, outline: true }),
    ellipse(x, CORE.at[1] + 0.4, 1.6, 1.6, { fill: 'gold-trim', glow: { color: 'gold-trim', blur: 5 } }),
  ],
});
const head: EnemyPart = { id: 'head', role: 'head', pivot: [0, -46], shapes: [litRect(-6, -53, 12, 9, 3, tone('warden', 'warden-light', 'rock-pale'), 'ruin'), ...mossTuft(-5, 1, -53, 1.4)] };
const eye = (x: number): EnemyPart => ({
  id: 'eye',
  role: 'glow',
  follows: 'head',
  pivot: [x, -49],
  shapes: [{ kind: 'rect', x: x - 3.5, y: -50, w: 7, h: 2, r: 1, fill: 'cyan', glow: { color: 'cyan', blur: 5 } }, line([x - 2.2, -49.4, x + 1.5, -49.4], 0.6, 'cyan-glow')],
});

export const WARDEN_RIG: EnemyRigDef = {
  id: 'warden',
  scale: 0.95,
  box: { size: [96, 98], anchor: [48, 86] },
  hip: [0, -14],
  tells: { windup: { part: 'arm-front', at: { side: [10, -19], down: [19, -20], up: [19, -20] } } },
  views: {
    side: [
      leg('leg-back', 'leg-back', -9, FAR),
      arm('arm-back', 'arm-back', [-3, -38], [3, -22], FAR),
      leg('leg-front', 'leg-front', 1, GUARDIAN),
      torso(false),
      core(CORE.side),
      head,
      eye(3),
      arm('arm-front', 'arm-front', [4, -37], [10, -21], GUARDIAN),
    ],
    down: [
      leg('leg-back', 'leg-back', -11, FAR),
      leg('leg-front', 'leg-front', 2, GUARDIAN),
      arm('arm-back', 'arm-back', [-15, -38], [-19, -22], FAR),
      torso(true),
      core(0),
      head,
      eye(0),
      arm('arm-front', 'arm-front', [15, -38], [19, -22], GUARDIAN, true),
    ],
    up: [
      leg('leg-back', 'leg-back', -11, FAR),
      leg('leg-front', 'leg-front', 2, GUARDIAN),
      torso(false),
      head,
      arm('arm-back', 'arm-back', [-15, -38], [-19, -22], FAR),
      arm('arm-front', 'arm-front', [15, -38], [19, -22], GUARDIAN, true),
    ],
  },
  poses: {
    idle: [{ bob: 0 }],
    walk: [
      { step: 3, lift: 2, bob: -0.5 },
      { step: 0, bob: 0.5, scaleY: 0.985 },
      { step: -3, lift: 2, bob: -0.5 },
      { step: 0, bob: 0.5, scaleY: 0.985 },
    ],
    // 076: gather (it sinks into a squat, fists low), coil (both fists high overhead, its back arched, stretched),
    // peak (the fists trembling, eye and core blazing). The slam lands squashed.
    windup: [
      { squash: 0.14, sink: 2, armBack: -0.45, armFront: -0.45, lean: 0.12, head: 0.1, glow: 0.9 },
      { squash: -0.1, bob: -1, armBack: 2.85, armFront: 2.85, lean: -0.3, head: -0.25, glow: 1 },
      { squash: -0.14, bob: -1.2, armBack: 3.1, armFront: 3.1, lean: -0.4, head: -0.35, headLift: -0.5, glow: 1 },
    ],
    swipe: [
      { armBack: -0.45, armFront: -0.45, lean: 0.25, sink: 3, squash: 0.18, glow: 1 },
      { armBack: -0.3, armFront: -0.3, lean: 0.22, sink: 5, squash: 0.2, glow: 1 },
    ],
    recover: [{ armBack: -0.35, armFront: -0.35, lean: 0.22, sink: 4, scaleY: 0.94, glow: 0.4 }],
    // A small snap of the head (bosses flinch only).
    hit: [{ lean: -0.12, bob: 1, head: -0.3, headLift: 0.5, squash: 0.05 }],
    // It rocks back and its fists drop; the core fades last (the dissolve's halo).
    death: [{ lean: -0.35, armBack: -0.75, armFront: -0.75, head: -0.35, sink: 2, squash: -0.08, glow: 0.35 }],
  },
};
