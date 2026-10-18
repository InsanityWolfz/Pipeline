import { enemyDef } from '../data/enemies';
import type { ArrowState } from './arrows';
import { damageEnemy, inHurtbox } from './enemies';
import { spawnDrops } from './drops';
import type { SimState } from './state';

// Arrows against enemies, and what happens when an enemy dies.

/** An arrow-hit test for stepArrows: damages the first live enemy under the arrow. */
export function arrowHits(state: SimState): (arrow: ArrowState) => boolean {
  return (arrow) => {
    const e = state.enemies.find((en) => en.health > 0 && inHurtbox(en, arrow.x, arrow.y));
    if (!e) return false;
    damageEnemy(state, e, arrow.damage, arrow.dx, arrow.dy);
    return true;
  };
}

/** Removes dead enemies, recording their deaths and dropping their loot. */
export function removeDead(state: SimState): void {
  let kept = 0;
  for (const e of state.enemies) {
    if (e.health > 0) {
      state.enemies[kept++] = e;
      continue;
    }
    state.events.deaths.push({ id: e.id, enemyId: e.enemyId, x: e.x, y: e.y, facing: e.facing });
    spawnDrops(state, enemyDef(e.enemyId), e.x, e.y);
  }
  state.enemies.length = kept;
}
