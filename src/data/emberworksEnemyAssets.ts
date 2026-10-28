import { enemyAnims } from './enemyAnims';

// How the Emberworks' enemies (061) read on screen, beyond their rigs (src/data/art): their telegraphs in the shared
// enemy red (ENEMY_FX.telegraphColor), the hazards they leave (drawn as 060's flood pools, smaller), and the
// kiln-tender's beam in the kiln's orange. Palette ids, ms, world px, alphas 0..1.

/** Their animation sets (joined into ENEMY_ANIMS): the mote's swell flickers over two frames, and the hound's bellows heave as it plants; the golem's death is its split. */
export const EMBER_ENEMY_ANIMS = {
  'cinder-mote': enemyAnims('cinder-mote', false, [], 2),
  'bellows-hound': enemyAnims('bellows-hound', true, [], 2),
  'slag-golem': enemyAnims('slag-golem', true),
  'slag-whelp': enemyAnims('slag-whelp'),
  'kiln-tender': enemyAnims('kiln-tender', true),
} as const;

export const EMBER_ENEMY_LOOK = {
  /** The mote's swell: its burst's circle faint, a disc growing to it over the wind-up; the sprite swells by up to `grow` (×) with it. */
  swell: { alpha: 0.22, fillAlpha: 0.45, grow: 0.45 },
  /**
   * The hazards (a mote's pool, a hound's trail): 060's flood pools' molten sheet (FORGE_LOOK.pools' colours), with
   * tongues of flame every `tongueEvery` px round their edge, `tongue` px tall, the last `fadeTicks` fading out.
   */
  hazard: {
    tongueEvery: 14,
    tongue: 3,
    edgeWidth: 1.5,
    fadeTicks: 30,
    /** The bright edge's alpha, and the tongues' (both times the fade). */
    edgeAlpha: 0.9,
    tongueAlpha: 0.7,
    /** A circle's tongues: at least `minTongues` round it, set in at `tongueInset` of its radius. */
    minTongues: 3,
    tongueInset: 0.8,
  },
  /**
   * The kiln-tender's beam, in the kiln's orange (not the enemy red: it never hurts the player), from its nozzle (per
   * view from its feet, side facing right) to its target's body: thin and faint through the wind-up, then a glowing
   * beam with a hot core flickering every `flickerMs` while it channels. Its target glows soft orange round its body,
   * pulsing every `pulseMs`; hovering it reads `hoverLine`.
   */
  beam: {
    color: 'cinder',
    core: 'cinder-light',
    windupWidth: 1,
    windupAlpha: 0.55,
    width: 2.5,
    alpha: 0.85,
    glow: 5,
    glowAlpha: 0.3,
    coreWidth: 1,
    flickerMs: 90,
    /** The channel's flicker: its glow and beam alpha swing between `flicker[0] - flicker[1]` and `flicker[0] + flicker[1]` of theirs. */
    flicker: [0.85, 0.15] as const,
    nozzle: { side: [17, -30] as const, down: [12, -34] as const, up: [12, -34] as const },
    /** The target's glow: an ellipse of half-width `radius` px (at least half its hurtbox's width), `squash` × as tall as wide. */
    targetGlow: { color: 'cinder', radius: 16, alpha: [0.22, 0.42] as const, pulseMs: 520, squash: 0.8 },
    hoverLine: 'Being repaired',
  },
} as const;
