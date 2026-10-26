import type { GolemDef, MoteDef } from '../data/emberworksEnemies';
import { enemyDef } from '../data/enemies';
import { boxHitsSolid } from './collision';
import { roomById, type SimState } from './state';
import { defOf } from './champions';
import { aggro, createEnemy, damageEnemy, targetable, type EnemyState, type HitStyle } from './enemies';
import { plated } from './bossParts';

// What the Emberworks' enemies do as they die (061), from removeDead (combat.ts): a killed cinder mote's death burst,
// and a slag golem's split into whelps.
// A mote that burst on its own is `spent` and does none of this.

/** A death burst's hit: Fire with no knock, flashing, so it sets its targets burning by Fire's rules (060). */
const DEATH_BURST: HitStyle = { knock: 0, flash: true, damageType: 'fire' };

/** Runs a dying enemy's own death rule, if it has one. */
export function onEmberDeath(state: SimState, e: EnemyState): void {
  const def = defOf(e);
  if (def.kind === 'mote' && !e.spent) deathBurst(state, e, def);
  if (def.kind === 'golem') splitGolem(state, e, def);
}

/**
 * A golem splits as it dies: its whelps rise where it fell, one each side square to its facing (where a wall is, at
 * its point instead), in its pack and its ring, plain (never champions), awake. They join the list behind the dead
 * removeDead has cut, so they first act next tick.
 */
function splitGolem(state: SimState, e: EnemyState, def: GolemDef): void {
  const { into, count, apart } = def.split;
  const room = roomById(e.roomId);
  const whelps: number[] = [];
  for (let i = 0; i < count; i++) {
    const side = count > 1 ? (i / (count - 1)) * 2 - 1 : 0;
    const at = { x: e.x - e.swipeDirY * apart * side, y: e.y + e.swipeDirX * apart * side };
    const spot = boxHitsSolid(room, at.x, at.y, enemyDef(into).feetBox) ? { x: e.x, y: e.y } : at;
    const w = createEnemy(state.nextEnemyId++, into, spot, e.roomId, e.group);
    w.ring = e.ring;
    w.health = defOf(w).maxHealth;
    w.facing = e.facing;
    aggro(w);
    state.enemies.push(w);
    whelps.push(w.id);
  }
  state.events.golemSplits.push({ id: e.id, x: e.x, y: e.y, whelps });
}

/** A killed mote bursts: its Fire on every other living, hittable enemy in its room within the radius (never a plated Forgewright). */
function deathBurst(state: SimState, e: EnemyState, def: MoteDef): void {
  const { radius, damage } = def.deathBurst;
  const hit: number[] = [];
  for (const o of state.enemies) {
    if (o === e || o.roomId !== e.roomId || o.health <= 0 || !targetable(o) || plated(o)) continue;
    const dx = o.x - e.x;
    const dy = o.y - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist > radius) continue;
    damageEnemy(state, o, damage, dist > 0 ? dx / dist : 0, dist > 0 ? dy / dist : 0, DEATH_BURST);
    hit.push(o.id);
  }
  state.events.deathBursts.push({ id: e.id, x: e.x, y: e.y, radius, hit });
}
