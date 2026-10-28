import type { ParticleBurst } from '../juice';
import { SOUNDS, type SoundKey } from '../sounds';

// 080: a boss intro as drawn (docs/specs/080-boss-intros.md "The intro, as drawn"). Every beat is placed by intro ticks
// (the sim's `modeTicks` in `intro`, 1 on its first), so it fits the sim's window exactly, holds while the game is
// paused and samples at fixed ticks in tests. src/render/bossIntro.ts turns these into beats, curves and the pan.

/** The beats' first ticks (counting from 0: an intro `modeTicks` of 1 is tick 0) and the intro's end. */
export interface IntroBeats {
  readonly stir: number;
  readonly rise: number;
  readonly beat: number;
  readonly ready: number;
  readonly end: number;
}

/** A boss's own part of its intro: its beat's sound (an existing one, 080.14), its particle bursts and where they leave. */
export interface BossIntroLook {
  /** The card's lines: the name comes from the boss's def, the arena's from ARENAS (080.4); none are written here. */
  readonly sound: SoundKey;
  /** At the stir (a tremor at its feet), as the rise peaks (chips, puffs or arcs), and on the beat (the blow). */
  readonly stir: ParticleBurst;
  readonly rise: ParticleBurst;
  readonly beat: ParticleBurst;
  /** Where the beat's burst leaves, from its feet, world px (in the facing's x for the side view). */
  readonly beatAt: readonly [number, number];
  /** Its ignition's light (074) on Medium and High: colour, radius, intensity, from the beat to the end, `rise` px up. */
  readonly light: { readonly color: string; readonly radius: number; readonly intensity: number; readonly rise: number };
}

const dust = (colors: readonly string[], count: number): ParticleBurst => ({ colors, count, speed: [20, 70], angle: -Math.PI / 2, spread: Math.PI, gravity: 140, lifeMs: [300, 600], size: 2, lift: 2 });
const ring = (colors: readonly string[], count: number): ParticleBurst => ({ colors, count, speed: [60, 140], gravity: 60, lifeMs: [350, 700], size: 2, lift: 2 });
const rising = (colors: readonly string[], count: number, lift: number): ParticleBurst => ({ colors, count, speed: [20, 60], angle: -Math.PI / 2, spread: Math.PI / 2, gravity: -40, lifeMs: [500, 900], size: 2, lift });

export const INTRO_LOOK = {
  /** The full intro (165 ticks): stir 0–18, rise 18–72, the beat 72–84, ready 84–165. */
  full: { stir: 0, rise: 18, beat: 72, ready: 84, end: 165 } satisfies IntroBeats,
  /** The short intro (60 ticks, an altar re-fight): no stir; the rise's last half 0–30, the beat 30–40, ready 40–60. */
  short: { stir: 0, rise: 0, beat: 30, ready: 40, end: 60 } satisfies IntroBeats,
  /** The short intro starts its rise this far into the rise's frames (its last half). */
  shortRiseFrom: 0.5,
  /** Ready's slow two-frame breathe: each frame held this many ticks. */
  breatheTicks: 40,
  /** The rise's snap: each of its three poses eases in with a squash that settles over this many ticks. */
  riseSettleTicks: 6,
  /**
   * The name card (full intro only): fades in while scaling from `scaleFrom` to 1 over `in`, holds, fades out over
   * `out`. Its tablet is the text's width plus `pad` each side, at least `minWidth`, its top `gap` view px under the
   * boss bar's bottom; a brass rule `ruleGap` under the name, `ruleW` wide, over the arena's name.
   */
  card: { in: [84, 96], out: [147, 165], scaleFrom: 0.9, pad: 10, padY: 6, minWidth: 160, gap: 8, ruleGap: 3, ruleW: 0.6, rule: 'brass' },
  /** The boss bar's fill runs from empty to full over these ticks (region bosses); the short intro's over all of it. */
  bar: { full: [84, 132], short: [0, 60] },
  /** The pan (full intro only): in over `in`, held, out over `out`, smoothstep; no frame moves the camera more than `capPx` view px at 60 fps. */
  pan: { in: [0, 24], out: [141, 165], capPx: 24 },
  bosses: {
    'pylon-warden': {
      sound: SOUNDS.wardenSlam,
      stir: dust(['warden-light', 'rock-light', 'leaf-light'], 10),
      rise: rising(['moss-tuft', 'warden', 'rock-light'], 12, 30),
      beat: ring(['rock-light', 'warden-light', 'cyan'], 22),
      beatAt: [0, 0],
      light: { color: 'cyan', radius: 72, intensity: 1, rise: 28 },
    },
    bulwark: {
      sound: SOUNDS.bulwarkPound,
      stir: dust(['hollow-pale', 'hollow-light'], 10),
      rise: rising(['hollow', 'hollow-light', 'vein'], 14, 20),
      beat: ring(['hollow-pale', 'hollow-light', 'vein'], 24),
      beatAt: [14, 0],
      light: { color: 'gold-trim', radius: 64, intensity: 0.8, rise: 30 },
    },
    forgewright: {
      sound: SOUNDS.hammerSlam,
      stir: rising(['ash-light', 'ash-pale'], 8, 40),
      rise: rising(['ash-pale', 'cinder', 'cinder-light'], 12, 46),
      beat: { colors: ['cinder-light', 'cinder', 'gold-trim'], count: 26, speed: [80, 180], angle: -Math.PI / 2, spread: Math.PI * 0.8, gravity: 260, lifeMs: [300, 650], size: 2, lift: 2 },
      beatAt: [22, 0],
      light: { color: 'cinder', radius: 88, intensity: 1.1, rise: 36 },
    },
    conductor: {
      sound: SOUNDS.rodStrike,
      stir: rising(['storm-glow', 'storm-pale'], 8, 50),
      rise: rising(['storm-glow', 'storm-pale', 'snow'], 14, 60),
      beat: { colors: ['storm-glow', 'storm-pale', 'snow'], count: 22, speed: [60, 160], gravity: 0, lifeMs: [200, 450], size: 2, lift: 70 },
      beatAt: [0, 0],
      light: { color: 'storm-glow', radius: 96, intensity: 1.3, rise: 70 },
    },
  } as Readonly<Record<string, BossIntroLook>>,
  /** Particle counts by Graphics quality (074), all inside PARTICLE_BUDGET. */
  quality: { low: 0.5, medium: 1, high: 1.5 },
  /** 042.10: with Flashes off, no glow flickers over this alpha (the Conductor's bolt has no white core). */
  dimGlow: 0.25,
} as const;
