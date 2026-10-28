import { enemyDef, type BulwarkDef } from '../../src/data/enemies';
import { HOLLOWS } from '../../src/data/hollows';
import { HOLLOWS_START } from '../../src/data/playtest';
import type { EnemyState } from '../../src/sim/enemies';
import { createSim, type SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer } from './fight';
import { runIntro } from './introKit';

// The Bulwark's Sunken Forum (034) for sim tests: the hollows start with only the
// Bulwark left and the player placed in the arena.

export const DEF = enemyDef('bulwark') as BulwarkDef;
export const START = tileCentre(HOLLOWS.arena.start);

/** The hollows start with only the Bulwark left, and the player in the forum `dy` px below its start point (out of pound range); 080: its intro stepped out unless `intro` is false. */
export function forum(dy = 160, seed = 11, intro = true): { s: SimState; b: EnemyState } {
  const s = createSim(seed, { start: HOLLOWS_START });
  const b = s.enemies.find((e) => e.enemyId === 'bulwark');
  if (!b) throw new Error('no Bulwark');
  s.enemies = [b];
  movePlayer(s, START.x, START.y + dy);
  // 080: the intro stepped out (unless asked not to), so the next tick is the boss's wake as before.
  if (intro) runIntro(s);
  return { s, b };
}

/** A point `dist` px from the Bulwark at `deg` degrees off its shield's facing (180: straight behind it). */
export function offFacing(b: EnemyState, deg: number, dist: number): { x: number; y: number } {
  const a = b.angle + (deg * Math.PI) / 180;
  return { x: b.x + Math.cos(a) * dist, y: b.y + Math.sin(a) * dist };
}
