import { ANVIL_ARENA } from '../../src/data/arenas';
import { enemyDef, type ForgewrightDef } from '../../src/data/enemies';
import { HOLLOWS_START } from '../../src/data/playtest';
import type { EnemyState } from '../../src/sim/enemies';
import { createSim, type SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer } from './fight';
import { runIntro } from './introKit';

// The Forgewright's Anvil Hall (060) for sim tests, like forum.ts: the Hollows start with the Emberworks' barrier down
// (the Bulwark beaten), only the Forgewright left, and the player placed in the hall.

export const FORGE = enemyDef('forgewright') as ForgewrightDef;
export const HALL_START = tileCentre(ANVIL_ARENA.start);

/** The Emberworks open, only the Forgewright left, and the player in the hall `dy` px below its start (`dx` across). */
export function hall(dy = 160, seed = 11, dx = 0, intro = true): { s: SimState; f: EnemyState } {
  const s = createSim(seed, { start: HOLLOWS_START });
  s.bossDefeats.push('bulwark');
  s.gates.emberworks = true;
  const f = s.enemies.find((e) => e.enemyId === 'forgewright');
  if (!f) throw new Error('no Forgewright');
  s.enemies = [f];
  movePlayer(s, HALL_START.x + dx, HALL_START.y + dy);
  // 080: the intro stepped out (unless asked not to), so the next tick is the boss's wake as before.
  if (intro) runIntro(s);
  return { s, f };
}

/** Keeps the player at full health, so a long scenario never KOs them. */
export const topUp = (s: SimState): void => {
  s.player.health = 100;
  s.player.hurtTicks = 0;
};
