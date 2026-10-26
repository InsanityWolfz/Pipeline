import { enemyAnims } from './enemyAnims';

// How the Stormcrown's enemies (065) read on screen, beyond their rigs (src/data/art): their telegraphs in the shared
// enemy red (ENEMY_FX.telegraphColor). Palette ids, ms, world px, alphas 0..1.

/** Their animation sets (joined into ENEMY_ANIMS): the hawk's climb is its recover pose. */
export const STORM_ENEMY_ANIMS = {
  thunderhawk: enemyAnims('thunderhawk', true),
  'static-mite': enemyAnims('static-mite', true, [], 2),
} as const;
