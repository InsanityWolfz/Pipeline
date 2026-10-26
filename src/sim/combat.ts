import { shardBaseDamage } from '../data/ammo';
import { enemyDef } from '../data/enemies';
import { SPLIT } from '../data/tags';
import { createShard, type ArrowState } from './arrows';
import { aggro, damageEnemy, inHurtbox, targetable, type EnemyState, type HitStyle } from './enemies';
import { recordBlock, shieldBlocks } from './shield';
import { hitPart, partAt, partKey, plated } from './forgewrightParts';
import { onBossDeath } from './altar';
import { killXp } from './leveling';
import { afterKeystoneHit, burning, keystoneHit, takePool } from './keystones';
import { spawnDrops } from './drops';
import { spreadBurn } from './fire';
import { onEmberDeath } from './emberDeaths';
import type { SimState } from './state';
import { rotate } from './volley';
import { shardEmissionOf, shotEmission } from './emissions';
import { statOf } from './statResolve';

// Arrows against enemies, and what happens when an enemy dies.

/** An arrow knocks and flashes; its hit records its damage type (a cold one chills, 029) and whether it burns (054). */
const arrowHit = (arrow: ArrowState): HitStyle => ({ knock: arrow.knockback, flash: true, damageType: arrow.damageType, burning: burning(arrow) });

/**
 * A Split, the star shot (029, 054): the stats' shards (SPLIT.shards, 037: Splinter's more) from the hit point,
 * 360 / shards degrees apart, the first along its flight, none able to hit the enemy it struck, each for half the
 * bolt's damage: half its round's base, through the Shards' damage stats (so Ley and All ammo reach it as they reach
 * the bolt). They join the flight after this tick's (`spawned`).
 */
function sendShards(state: SimState, arrow: ArrowState, struck: EnemyState, spawned: ArrowState[]): void {
  // Split's Shards and their damage through resolveStat (039): Splinter adds Shards; Ley and All ammo damage reach each one.
  const count = statOf(state, 'shards', shotEmission(arrow), SPLIT.shards);
  const shard = shardEmissionOf(arrow.ammoId, true);
  const def = {
    speed: statOf(state, 'speed', shard, SPLIT.speed),
    range: statOf(state, 'range', shard, SPLIT.range),
    damage: statOf(state, 'damage', shard, shardBaseDamage(arrow.ammoId)),
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
  // 060: the Forgewright's plating takes a hit on its body: no damage, no burst. A piercing shot glances off and flies
  // on (so a line through both bellows, past its body, still works).
  if (plated(e)) {
    recordBlock(state, e, arrow.x, arrow.y);
    if (e.mode === 'idle' || e.mode === 'return') aggro(e);
    return arrow.pierce;
  }
  // The keystones (037): a pooled arrow hits harder and bursts; a ley bolt shatters a frozen enemy.
  const hit = keystoneHit(state, arrow, e);
  damageEnemy(state, e, arrow.damage * hit.scale, arrow.dx, arrow.dy, arrowHit(arrow));
  if (arrow.split) sendShards(state, arrow, e, spawned);
  afterKeystoneHit(state, arrow, e, hit, spawned);
  return true;
}

/** 060: a hit on one of the Forgewright's bellows: the bellows takes it (a Split still bursts, the keystones still act). */
function strikePart(state: SimState, arrow: ArrowState, e: EnemyState, part: number, spawned: ArrowState[]): void {
  arrow.hitIds.push(partKey(e.id, part));
  const hit = keystoneHit(state, arrow, e);
  hitPart(state, e, part, arrow.damage * hit.scale, arrowHit(arrow));
  if (arrow.split) sendShards(state, arrow, e, spawned);
  afterKeystoneHit(state, arrow, e, hit, spawned);
}

/** The bellows (060) under a point that this arrow hasn't hit yet, if any. */
function freshPart(arrow: ArrowState, e: EnemyState): number | null {
  const part = partAt(e, arrow.x, arrow.y);
  return part !== null && !arrow.hitIds.includes(partKey(e.id, part)) ? part : null;
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
        if (en.roomId !== arrow.roomId || en.health <= 0 || !targetable(en)) continue;
        // 060: a bellows first, each once, then the body.
        const part = freshPart(arrow, en);
        if (part !== null) {
          strikePart(state, arrow, en, part, spawned);
          continue;
        }
        if (arrow.hitIds.includes(en.id) || !inHurtbox(en, arrow.x, arrow.y)) continue;
        if (!strike(state, arrow, en, spawned)) return true;
      }
      return false;
    }
    let e: EnemyState | undefined;
    let first = Infinity;
    let hitPartOf: number | null = null;
    for (const en of state.enemies) {
      if (en.roomId !== arrow.roomId || en.health <= 0 || !targetable(en)) continue;
      // 060: a bellows under the arrow is hit before the body it belongs to.
      const part = freshPart(arrow, en);
      if (part === null && (arrow.hitIds.includes(en.id) || !inHurtbox(en, arrow.x, arrow.y))) continue;
      const along = (en.x - arrow.x) * arrow.dx + (en.y - arrow.y) * arrow.dy;
      if (along < first) {
        first = along;
        e = en;
        hitPartOf = part;
      }
    }
    if (!e) return false;
    if (hitPartOf !== null) strikePart(state, arrow, e, hitPartOf, spawned);
    else strike(state, arrow, e, spawned);
    return true;
  };
}

/**
 * Removes dead enemies, recording their deaths, dropping their loot and giving their XP (037). A cinder mote that
 * burst on its own (061: `spent`) just goes, passing on only its burn. A death rule (061: a killed mote's death burst, emberDeaths.ts) can kill
 * others, so it passes again until none is left dead.
 */
export function removeDead(state: SimState): void {
  while (state.enemies.some((e) => e.health <= 0)) removeDeadOnce(state);
}

function removeDeadOnce(state: SimState): void {
  let kept = 0;
  const dying: EnemyState[] = [];
  for (const e of state.enemies) {
    if (e.health > 0) state.enemies[kept++] = e;
    else dying.push(e);
  }
  state.enemies.length = kept;
  for (const e of dying) {
    // 061.22: a mote spent on its own burst still passes its burn on (060), but drops nothing, gives no XP and has no death burst.
    if (e.spent) {
      spreadBurn(state, e);
      continue;
    }
    const def = enemyDef(e.enemyId);
    state.events.deaths.push({ id: e.id, enemyId: e.enemyId, x: e.x, y: e.y, facing: e.facing, ...(e.champion ? { champion: true as const } : {}) });
    // A whelp (061) drops nothing at all.
    if (!def.noLoot) spawnDrops(state, def, e.x, e.y, e.roomId, e.champion !== null);
    // Any kill gives XP (037): by ammo, burst or punch. Before the boss's own record, which drops a summoned boss.
    killXp(state, e);
    onBossDeath(state, e.enemyId);
    // 060: a burning enemy passes its burn on as it dies (to the living).
    spreadBurn(state, e);
    onEmberDeath(state, e);
  }
}
