import { enemyDef } from '../data/enemies';
import { STAR } from '../data/tags';
import { createShard, type ArrowState } from './arrows';
import { damageEnemy, inHurtbox, type EnemyState, type HitStyle } from './enemies';
import { spawnDrops } from './drops';
import type { SimState } from './state';
import { rotate } from './volley';

// Arrows against enemies, and what happens when an enemy dies.

/** An arrow knocks and flashes; its hit records its damage type (a cold one chills, 029). */
const arrowHit = (arrow: ArrowState): HitStyle => ({ knock: true, flash: true, damageType: arrow.damageType });

/**
 * A star round's burst (029): STAR.shards shards from the hit point, 360 / shards degrees apart, the first along
 * its flight, none able to hit the enemy it struck. They join the flight after this tick's (`spawned`).
 */
function burstStar(state: SimState, arrow: ArrowState, struck: EnemyState, spawned: ArrowState[]): void {
  for (let k = 0; k < STAR.shards; k++) {
    const [dx, dy] = rotate(arrow.dx, arrow.dy, (k * 360) / STAR.shards);
    spawned.push(createShard(state.nextArrowId++, arrow.roomId, arrow.x, arrow.y, dx, dy, struck.id));
  }
  state.events.starBursts.push({ x: arrow.x, y: arrow.y });
}

/** Damages an enemy with an arrow, bursting a star round. */
function strike(state: SimState, arrow: ArrowState, e: EnemyState, spawned: ArrowState[]): void {
  arrow.hitIds.push(e.id);
  damageEnemy(state, e, arrow.damage, arrow.dx, arrow.dy, arrowHit(arrow));
  if (arrow.split) burstStar(state, arrow, e, spawned);
}

/**
 * An arrow-hit test for stepArrows: damages the live enemy under the arrow that it
 * reached first, the one furthest back along its flight, when hurtboxes overlap.
 * A piercing shot instead hits every enemy under it that it hasn't hit yet and flies on.
 * Star shards a hit sets off go into `spawned`, for the caller to add after the flight.
 */
export function arrowHits(state: SimState, spawned: ArrowState[] = []): (arrow: ArrowState) => boolean {
  return (arrow) => {
    if (arrow.pierce) {
      for (const en of state.enemies) {
        if (en.roomId !== arrow.roomId || en.health <= 0 || arrow.hitIds.includes(en.id)) continue;
        if (!inHurtbox(en, arrow.x, arrow.y)) continue;
        strike(state, arrow, en, spawned);
      }
      return false;
    }
    let e: EnemyState | undefined;
    let first = Infinity;
    for (const en of state.enemies) {
      if (en.roomId !== arrow.roomId || en.health <= 0 || arrow.hitIds.includes(en.id) || !inHurtbox(en, arrow.x, arrow.y)) continue;
      const along = (en.x - arrow.x) * arrow.dx + (en.y - arrow.y) * arrow.dy;
      if (along < first) {
        first = along;
        e = en;
      }
    }
    if (!e) return false;
    strike(state, arrow, e, spawned);
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
    state.events.deaths.push({ id: e.id, enemyId: e.enemyId, x: e.x, y: e.y, facing: e.facing, ...(e.champion ? { champion: true as const } : {}) });
    spawnDrops(state, enemyDef(e.enemyId), e.x, e.y, e.roomId, e.champion !== null);
  }
  state.enemies.length = kept;
}
