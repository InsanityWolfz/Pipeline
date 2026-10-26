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
} as const;

export const EMBER_ENEMY_LOOK = {
  /** The mote's swell: its burst's circle faint, a disc growing to it over the wind-up; the sprite swells by up to `grow` (×) with it. */
  swell: { alpha: 0.22, fillAlpha: 0.45, edgeWidth: 1.5, edgeAlpha: 0.8, grow: 0.45 },
  /**
   * The hazards (a mote's pool, a hound's trail): 060's flood pools' molten sheet (FORGE_LOOK.pools' colours), with
   * tongues of flame every `tongueEvery` px round their edge, `tongue` px tall, the last `fadeTicks` fading out.
   */
  hazard: { tongueEvery: 14, tongue: 3, edgeWidth: 1.5, fadeTicks: 30 },
} as const;
