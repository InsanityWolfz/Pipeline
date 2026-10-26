import { enemyAnims } from './enemyAnims';

// How the Stormcrown's enemies (065) read on screen, beyond their rigs (src/data/art): their telegraphs in the shared
// enemy red (ENEMY_FX.telegraphColor). Palette ids, ms, world px, alphas 0..1.

/** Their animation sets (joined into ENEMY_ANIMS): the hawk's climb is its recover pose. */
export const STORM_ENEMY_ANIMS = {
  thunderhawk: enemyAnims('thunderhawk', true),
  'static-mite': enemyAnims('static-mite', true, [], 2),
  'storm-sentinel': enemyAnims('storm-sentinel', true, [], 2),
  'gale-ram': enemyAnims('gale-ram', true, [], 2),
} as const;

export const STORM_ENEMY_LOOK = {
  /**
   * A gale ram's gust: while its pose holds, `streaks` pale wind curls sweep out through its cone from its feet to its
   * reach, each a short arc `len` radians long, curling as they go; `lift` px off the ground.
   */
  gust: { color: 'foam', core: 'snow', streaks: 6, len: 0.5, width: 2, alpha: 0.75, lift: 8 },
  /**
   * The slow (065) on the player: `curls` pale wind curls circling their legs, `radius` px round the feet (squashed
   * `squash` × as tall), turning once every `turnMs`, each `len` radians long; the alpha fades with the slow's last
   * `fadeTicks`. On the HP bar: `streaks` short pale diagonal streaks sliding over the fill every `slideMs`.
   */
  slow: { color: 'foam', alpha: 0.8, curls: 3, radius: 13, squash: 0.45, lift: 6, turnMs: 700, len: 1.6, width: 1.5, fadeTicks: 30 },
  slowBar: { color: 'foam', alpha: 0.7, streaks: 4, slideMs: 900, width: 1.2, slant: 4 },
} as const;
