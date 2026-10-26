import type { MoteDef } from '../data/emberworksEnemies';
import { defOf } from './champions';
import { damageEnemy, targetable, type EnemyState, type HitStyle } from './enemies';
import { plated } from './forgewrightParts';
import type { SimState } from './state';

// What the Emberworks' enemies do as they die (061), from removeDead (combat.ts): a killed cinder mote's death burst.
// A mote that burst on its own is `spent` and does none of this.

/** A death burst's hit: Fire with no knock, flashing, so it sets its targets burning by Fire's rules (060). */
const DEATH_BURST: HitStyle = { knock: 0, flash: true, damageType: 'fire' };

/** Runs a dying enemy's own death rule, if it has one. */
export function onEmberDeath(state: SimState, e: EnemyState): void {
  const def = defOf(e);
  if (def.kind === 'mote' && !e.spent) deathBurst(state, e, def);
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
