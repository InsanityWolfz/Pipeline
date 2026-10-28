import { BOSS_PHASE_SPRITES as S } from '../arenaAssets';
import type { ParticleBurst } from '../juice';
import { INTRO_LOOK } from './bossIntro';

// 080: how each boss phase the sim already has shows on the body (docs/specs/080-boss-intros.md "Phase changes, as
// drawn"): a colour layer (an additive copy of the boss's current frame, tinted, as 076's dissolve tints), glows, and
// small part sprites (bossPhaseParts.ts) placed on the posed geometry with 076's `posedPoint`, so every attack pose
// shows them. Render reads the sim's flags only (src/render/bossPhase.ts); it never compares health to a threshold.

/** A colour layer: the tint and its alpha (pulsing between `alpha` and `pulseTo` over `pulseMs`, if set). */
export interface PhaseLayer {
  readonly color: string;
  readonly alpha: number;
  readonly pulseTo?: number;
  readonly pulseMs?: number;
}

/** A part placed on the rig: its sprite key, the rig part it rides and the point on it (style px), per view. */
export interface PhasePart {
  readonly key: string;
  readonly part: string;
  readonly at: Readonly<Record<'side' | 'down' | 'up', readonly [number, number]>>;
  /** Shown only in these views (the shield's runes on its face). */
  readonly views?: readonly ('side' | 'down' | 'up')[];
  /** Additive (a glow), else drawn over the body. */
  readonly add?: boolean;
}

const ALL = (p: readonly [number, number]): Readonly<Record<'side' | 'down' | 'up', readonly [number, number]>> => ({ side: p, down: p, up: p });

export const BOSS_PHASE_LOOK = {
  bulwark: {
    /** Called (`addsRisen`, its adds risen below half): its veins brighten cyan, runes lit across the shield, its rim chipped. */
    called: {
      layer: { color: 'cyan-glow', alpha: 0.06 } satisfies PhaseLayer,
      parts: [
        { key: S.runes, part: 'shield', at: { side: [22, -35], down: [0, -35], up: [0, -35] }, views: ['side', 'down'], add: true },
        { key: S.chips, part: 'shield', at: { side: [22, -60], down: [0, -60], up: [0, -60] } },
      ] satisfies PhasePart[],
      /** The runes light one by one over the transition, and slate chips fall. */
      transitionMs: 500,
      burst: { colors: ['hollow-light', 'hollow-pale'], count: 10, speed: [20, 60], angle: Math.PI / 2, spread: Math.PI / 2, gravity: 200, lifeMs: [300, 600], size: 2, lift: 30 } satisfies ParticleBurst,
    },
    /** Enraged (`enraged`, below 30%): veins `danger`, a red rim, the shield split, shoulder spikes, a lower hunch. */
    enraged: {
      layer: { color: 'danger', alpha: 0.08, pulseTo: 0.13, pulseMs: 900 } satisfies PhaseLayer,
      parts: [
        { key: S.crack, part: 'shield', at: { side: [22, -35], down: [0, -35], up: [0, -35] }, add: true },
        { key: S.spikes, part: 'torso', at: ALL([0, -58]) },
      ] satisfies PhasePart[],
      /** The roar's red ring: no damage and no shake; it expands to `radius` px over the roar's middle frame. */
      ring: { color: 'danger', radius: 70, ms: 600, delayMs: 330, alpha: 0.55, width: 3, rise: 20, squash: 0.6 },
      steam: { colors: ['ash-pale', 'rock-pale'], count: 14, speed: [30, 80], angle: -Math.PI / 2, spread: Math.PI * 0.6, gravity: -50, lifeMs: [400, 800], size: 2, lift: 40 } satisfies ParticleBurst,
      /** The hunch on idle, walk and turn: a squash about the feet, its body sunk and shifted toward its facing, px. */
      hunch: { squash: 0.05, sink: 1.5, shift: 1 },
    },
  },
  forgewright: {
    /** Its seams by heat band (`heat / max`): each band's tint and glow; the bands ease in over `easeMs`. */
    bands: [
      { from: 0, color: 'flame-dark', alpha: 0.02 },
      { from: 0.25, color: 'cinder', alpha: 0.05 },
      { from: 0.5, color: 'cinder-light', alpha: 0.08 },
      { from: 0.9, color: 'snow', alpha: 0.12 },
    ] as readonly { readonly from: number; readonly color: string; readonly alpha: number }[],
    easeMs: 300,
    /** At 90%+ heat (Medium and High): a shimmer over its back, `rise` px up, wavering `px` at `hz`. */
    shimmer: { band: 3, rise: 64, px: 1.5, hz: 5, alpha: 0.18, w: 30, h: 26, lines: 3, gap: 7, slope: 2, width: 1, color: 'cinder-light' },
    /** Venting: the chest plates drawn swung open. */
    vent: { parts: [{ key: S.plates, part: 'torso', at: ALL([0, -46]) }] satisfies PhasePart[] },
    /** Enraged (below half): soot fades, red-hot plate edges, the hammer glowing with embers, a flame crest on the helm. */
    enraged: {
      layer: { color: 'iron-rust', alpha: 0.09, pulseTo: 0.13, pulseMs: 700 } satisfies PhaseLayer,
      parts: [{ key: S.crest, part: 'head', at: ALL([0, -92]), add: true }] satisfies PhasePart[],
      embers: { colors: ['cinder', 'cinder-light'], count: 2, speed: [10, 30], angle: -Math.PI / 2, spread: Math.PI / 3, gravity: -40, lifeMs: [300, 600], size: 1, lift: 0 } satisfies ParticleBurst,
      /** An ember from the hammer head every this many ms, from `emberAt` (px from its feet, toward its facing). */
      emberMs: 140,
      emberAt: [24, -40] as const,
    },
  },
  conductor: {
    /** Shielded (3+ rods): a storm-glass dome round its body, at most `alphaCap`. */
    dome: { key: S.dome, rise: 54, alphaCap: 0.3, breakMs: 400, returnMs: 500 },
    shards: { colors: ['snow', 'storm-pale', 'storm-glow'], count: 18, speed: [60, 140], gravity: 120, lifeMs: [300, 600], size: 2, lift: 54 } satisfies ParticleBurst,
    /** Grounded (under 2 rods): its stance lowered, arcs from its hem into the floor, the crown's sparks dimmed. */
    grounded: { sink: 2, arcs: 3, arcMs: 300, color: 'storm-glow', alpha: 0.6, width: 1.2, spacing: 9, jag: 3, dimJag: 2, flickerMs: 90, top: -6, drop: 7, foot: 2 },
    /** Enraged (below half): brighter seams and eyes, the staff crackling, a halo of arcs over the crown. */
    enraged: {
      layer: { color: 'storm-glow', alpha: 0.07, pulseTo: 0.11, pulseMs: 500 } satisfies PhaseLayer,
      parts: [{ key: S.halo, part: 'hood', at: ALL([0, -102]), add: true }] satisfies PhasePart[],
      /** The halo's two frames alternate this often, ms. */
      haloFrameMs: 120,
    },
  },
  /** An enrage's flare (the Forgewright's and the Conductor's): a glow swelling the body's layer by `swell` and a burst, over `ms`. */
  flare: { ms: 600, alpha: 0.3, swell: 0.025 },
  flareBurst: { colors: ['snow'], count: 16, speed: [40, 120], gravity: -20, lifeMs: [300, 600], size: 2, lift: 40 } satisfies ParticleBurst,
  flareColors: { forgewright: ['cinder', 'cinder-light', 'gold-trim'], conductor: ['storm-glow', 'storm-pale', 'snow'] } as Readonly<Record<string, readonly string[]>>,
  /** 042.10: with Flashes off no glow shows over this alpha (the intro's). */
  dimGlow: INTRO_LOOK.dimGlow,
  /** Particles scale with Graphics quality (074), all inside PARTICLE_BUDGET. */
  quality: INTRO_LOOK.quality,
} as const;
