import { CROWN_ARENA } from '../../src/data/arenas';
import { enemyDef, type ConductorDef } from '../../src/data/enemies';
import { HOLLOWS_START } from '../../src/data/playtest';
import { CROWN_SPIRE } from '../../src/data/stormcrownSites';
import type { EnemyState } from '../../src/sim/enemies';
import { createSim, type SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer } from './fight';

// The Conductor's Crown Spire (064) for sim tests, like hall.ts: the Stormcrown's barrier down (the Forgewright
// beaten), only the Conductor left, and the player placed in the spire.

export const CONDUCTOR = enemyDef('conductor') as ConductorDef;
/** The court's middle, px. */
export const SPIRE_MIDDLE = tileCentre(CROWN_SPIRE.middle);
export const SPIRE_DOOR_OUT = tileCentre(CROWN_ARENA.door.leaveTo);

/** The Stormcrown open, only the Conductor left, and the player in the spire `dy` px below its middle (`dx` across). */
export function spire(dy = 0, seed = 11, dx = 0): { s: SimState; c: EnemyState } {
  const s = createSim(seed, { start: HOLLOWS_START });
  s.bossDefeats.push('bulwark', 'forgewright');
  s.gates.emberworks = true;
  s.gates.stormcrown = true;
  const c = s.enemies.find((e) => e.enemyId === 'conductor');
  if (!c) throw new Error('no Conductor');
  s.enemies = [c];
  movePlayer(s, SPIRE_MIDDLE.x + dx, SPIRE_MIDDLE.y + dy);
  return { s, c };
}

/** Keeps the player at full health, so a long scenario never KOs them. */
export const topUp = (s: SimState): void => {
  s.player.health = 100;
  s.player.hurtTicks = 0;
};
