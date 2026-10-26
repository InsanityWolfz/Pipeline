import type { MiteDef } from '../data/stormcrownEnemies';
import { defOf } from './champions';
import { damageEnemy, targetable, type EnemyState, type HitStyle } from './enemies';
import type { SimState } from './state';

// What the Stormcrown's enemies do as they die (065), from removeDead (combat.ts): a killed static mite's discharge.
// removeDead passes again while anything is left dead, so a discharge that kills its neighbours sets theirs off too.

/** A discharge's hit: lightning with no knock, flashing. It never arcs on (only a round's or Shard's hit does, combat.ts). */
const DISCHARGE: HitStyle = { knock: 0, flash: true, damageType: 'lightning' };

/** Runs a dying enemy's own death rule, if it has one. */
export function onStormDeath(state: SimState, e: EnemyState): void {
  const def = defOf(e);
  if (def.kind === 'mite') discharge(state, e, def);
}

/** A killed mite discharges into every other living, hittable mite in its room within its radius; never the player. */
function discharge(state: SimState, e: EnemyState, def: MiteDef): void {
  const { radius, damage } = def.discharge;
  const hit: { id: number; x: number; y: number }[] = [];
  for (const o of state.enemies) {
    if (o === e || o.roomId !== e.roomId || o.health <= 0 || !targetable(o) || defOf(o).kind !== 'mite') continue;
    const dx = o.x - e.x;
    const dy = o.y - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist > radius) continue;
    damageEnemy(state, o, damage, dist > 0 ? dx / dist : 0, dist > 0 ? dy / dist : 0, DISCHARGE);
    hit.push({ id: o.id, x: o.x, y: o.y });
  }
  state.events.discharges.push({ id: e.id, x: e.x, y: e.y, radius, hit });
}
