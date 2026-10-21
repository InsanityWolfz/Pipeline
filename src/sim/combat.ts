import { enemyDef } from '../data/enemies';
import { SPLIT } from '../data/tags';
import { createShard, type ArrowState } from './arrows';
import { aggro, damageEnemy, inHurtbox, targetable, type EnemyState, type HitStyle } from './enemies';
import { recordBlock, shieldBlocks } from './shield';
import { onBossDeath } from './altar';
import { killXp } from './leveling';
import { afterKeystoneHit, burning, keystoneHit, takePool } from './keystones';
import { spawnDrops } from './drops';
import type { SimState } from './state';
import { rotate } from './volley';
import { shardEmissionOf, shotEmission } from './emissions';
import { statOf } from './statResolve';

// Arrows against enemies, and what happens when an enemy dies.

/** An arrow knocks and flashes; its hit records its damage type (a cold one chills, 029) and whether it burns (054). */
const arrowHit = (arrow: ArrowState): HitStyle => ({ knock: arrow.knockback, flash: true, damageType: arrow.damageType, burning: burning(arrow) });

/**
 * A Split (029): the stats' shards (SPLIT.shards, 037: Splinter's more) from the hit point, 360 / shards
 * degrees apart, the first along its flight, none able to hit the enemy it struck, each for SPLIT.damage times the ley
 * bolt's damage bonus. They join the flight after this tick's (`spawned`).
 */
function sendShards(state: SimState, arrow: ArrowState, struck: EnemyState, spawned: ArrowState[]): void {
  // Split's Shards and their damage through resolveStat (039): Splinter adds Shards; Ley and All ammo damage reach each one.
  const count = statOf(state, 'shards', shotEmission(arrow), SPLIT.shards);
  const shard = shardEmissionOf(arrow.ammoId, true);
  const def = {
    speed: statOf(state, 'speed', shard, SPLIT.speed),
    range: statOf(state, 'range', shard, SPLIT.range),
    damage: statOf(state, 'damage', shard, SPLIT.damage),
    damageType: arrow.damageType,
    fromSplit: true,
  };
  for (let k = 0; k < count; k++) {
    const [dx, dy] = rotate(arrow.dx, arrow.dy, (k * 360) / count);
    spawned.push(createShard(state.nextArrowId++, arrow, arrow.x, arrow.y, dx, dy, struck.id, def));
  }
  state.events.splits.push({ x: arrow.x, y: arrow.y });
}

/**
 * Damages an enemy with an arrow, bursting a Split round; returns false if its shield's front took it instead (034):
 * no damage and no burst, the arrow stops there even piercing, and the block is recorded (a hit still wakes it).
 */
function strike(state: SimState, arrow: ArrowState, e: EnemyState, spawned: ArrowState[]): boolean {
  arrow.hitIds.push(e.id);
  if (shieldBlocks(e, arrow.x, arrow.y, -arrow.dx, -arrow.dy)) {
    recordBlock(state, e, arrow.x, arrow.y);
    if (e.mode === 'idle' || e.mode === 'return') aggro(e);
    return false;
  }
  // The keystones (037): a pooled arrow hits harder and bursts; a ley bolt shatters a frozen enemy.
  const hit = keystoneHit(state, arrow, e);
  damageEnemy(state, e, arrow.damage * hit.scale, arrow.dx, arrow.dy, arrowHit(arrow));
  if (arrow.split) sendShards(state, arrow, e, spawned);
  afterKeystoneHit(state, arrow, e, hit, spawned);
  return true;
}

/**
 * An arrow-hit test for stepArrows: damages the live enemy under the arrow that it
 * reached first, the one furthest back along its flight, when hurtboxes overlap.
 * A piercing shot instead hits every enemy under it that it hasn't hit yet and flies on.
 * Shards a hit sets off go into `spawned`, for the caller to add after the flight.
 */
export function arrowHits(state: SimState, spawned: ArrowState[] = []): (arrow: ArrowState) => boolean {
  return (arrow) => {
    // Blastfletch (037): an arrow passing through Pool takes its charge.
    takePool(state, arrow);
    if (arrow.pierce) {
      for (const en of state.enemies) {
        if (en.roomId !== arrow.roomId || en.health <= 0 || !targetable(en) || arrow.hitIds.includes(en.id)) continue;
        if (!inHurtbox(en, arrow.x, arrow.y)) continue;
        if (!strike(state, arrow, en, spawned)) return true;
      }
      return false;
    }
    let e: EnemyState | undefined;
    let first = Infinity;
    for (const en of state.enemies) {
      if (en.roomId !== arrow.roomId || en.health <= 0 || !targetable(en) || arrow.hitIds.includes(en.id) || !inHurtbox(en, arrow.x, arrow.y)) continue;
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

/** Removes dead enemies, recording their deaths, dropping their loot and giving their XP (037). */
export function removeDead(state: SimState): void {
  let kept = 0;
  for (const e of state.enemies) {
    if (e.health > 0) {
      state.enemies[kept++] = e;
      continue;
    }
    state.events.deaths.push({ id: e.id, enemyId: e.enemyId, x: e.x, y: e.y, facing: e.facing, ...(e.champion ? { champion: true as const } : {}) });
    spawnDrops(state, enemyDef(e.enemyId), e.x, e.y, e.roomId, e.champion !== null);
    // Any kill gives XP (037): by ammo, burst or punch. Before the boss's own record, which drops a summoned boss.
    killXp(state, e);
    onBossDeath(state, e.enemyId);
  }
  state.enemies.length = kept;
}
