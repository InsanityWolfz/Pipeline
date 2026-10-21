import type { HealSource } from './player';
// Asset keys and look numbers for 030's art: the Ley Spring, its ripples and light,
// and the signs of healing on the player. Render draws by these keys; the shapes are
// in src/data/art/spring.ts. Times ms, sizes world px, alphas 0..1.

export const SPRING_SPRITES = {
  /** A Ley Spring: a low ring of rune-carved stones round a pool of glowing ley water. */
  spring: 'ley-spring',
  /** One ripple ring on the pool, scaled out and faded by render. */
  ripple: 'spring-ripple',
  /** A healing mote: a small ley sparkle rising off the player. */
  mote: 'heal-mote',
  /** The foundry shimmer's ring on the floor round the player, drawn white for render to tint. */
  ring: 'heal-ring',
} as const;

export const SPRING_LOOK = {
  /** Ripples per pool, each this long, starting `period / ripples` apart, at these offsets from the centre (px). */
  ripples: { period: 3600, from: 0.4, to: 2.6, alpha: 0.7, at: [[-14, -8], [12, 6], [-4, 14], [16, -14]] as readonly (readonly [number, number])[] },
  /** The pool's soft light: its colour and radius (px), and its breathing between two alphas; brighter and wider under a healing player. */
  light: { color: 'cyan', radius: 56, breatheMs: 4200, alpha: [0.3, 0.5] as const, healAlpha: 0.85, healScale: 1.12, easeMs: 300 },
  /**
   * Cyan motes rising off a healing player: one every `everyMs`, from up to `spread` px either side of the feet and
   * `start` px above them, rising at `speed` px/s and swaying `sway` px once every `swayMs` × 2π, for `lifeMs`, at a
   * scale in `scale`. Each fades in over the first `fadeIn` of its life and shrinks by `shrink` by its end.
   */
  motes: {
    everyMs: 70,
    spread: 11,
    start: [4, 26] as const,
    speed: [24, 40] as const,
    sway: 3,
    swayMs: 180,
    lifeMs: [700, 1100] as const,
    scale: [0.8, 1.2] as const,
    fadeIn: 1 / 6,
    shrink: 0.4,
    /** 050 (A.15, Shaun: "don't have any animations when you're regenning"): the sources whose healing shows motes; field regen (Mending, gear) shows none. */
    sources: ['spring', 'pylon', 'foundry'] as readonly HealSource[],
  },
  /** A claimed pylon's thread to a healing player: from this far above the pylon's base to this far above the feet; its wave (as the supply tendril's). */
  thread: { color: 'cyan-glow', glow: 'cyan', width: 1, glowWidth: 4, alpha: 0.45, glowAlpha: 0.18, pylonRise: 26, playerRise: 16, wobble: 3, waves: 2, waveMs: 140, steps: 18 },
  /**
   * The foundry's shimmer: a light round the player swelling from `from` to `to` × radius and fading, and a ring on
   * the floor spreading from `ringFrom` to `ringTo` scale, both warm turning to cyan (fully cyan `coolAt` through the loop), every `ms`.
   */
  shimmer: { ms: 800, radius: 34, from: 0.7, to: 1.6, alpha: 1, ringFrom: 0.5, ringTo: 1.8, ringAlpha: 0.9, warm: 'cinder-light', cool: 'cyan', coolAt: 2 / 3, rise: 16 },
} as const;
