import { enemyDef } from '../data/enemies';
import type { MiteDef } from '../data/stormcrownEnemies';
import { engage, enter, hold, inAggroBox, leash, startWindup, toward } from './aiCommon';
import { aggro, type EnemyState } from './enemies';
import { damagePlayer } from './health';
import type { SimState } from './state';

// The static mite (065): a tiny spark-beetle that comes in threes (a trio wakes together). Aggroed, it runs straight at
// the player; at contact it stops and winds up a red pulse under it, then zaps a player inside (a roll's i-frames
// dodge it), then backs off before it runs in again. Killed, it discharges into the mites round it (stormDeaths.ts).

/** Advances a mite's mode and returns this tick's own move, px. */
export function miteThink(state: SimState, e: EnemyState, def: MiteDef): [number, number] {
  const { zap } = def;
  const p = state.player;
  const idle = engage(state, e, inAggroBox(e, p));
  if (idle) return idle;
  wakeTrio(state, e);
  if (e.mode === 'windup') {
    if (e.modeTicks < zap.windupTicks) return hold(e);
    enter(e, 'swipe');
    land(state, e, def);
    return [0, 0];
  }
  if (e.mode === 'swipe') {
    if (e.modeTicks < zap.swipeTicks) return hold(e);
    enter(e, 'recover');
  }
  // Backing off: it runs from the player.
  if (e.mode === 'recover') {
    if (e.modeTicks < zap.recoverTicks) {
      e.modeTicks += 1;
      return toward(e.x - p.x, e.y - p.y, def);
    }
    e.mode = 'chase';
    e.modeTicks = 0;
  }
  const home = leash(e, def);
  if (home) return home;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  if (e.roomId === state.roomId && Math.hypot(dx, dy) <= zap.triggerRange) {
    if (e.cooldown === 0) startWindup(e, def, dx, dy);
    return [0, 0];
  }
  return toward(dx, dy, def);
}

/** Its trio wakes with it: an awake mite wakes any of its trio still idle or heading home. */
function wakeTrio(state: SimState, e: EnemyState): void {
  if (e.trio < 0) return;
  for (const o of state.enemies) if (o !== e && o.trio === e.trio && o.health > 0 && (o.mode === 'idle' || o.mode === 'return')) aggro(o);
}

/** Its zap: the pulse under it hits feet inside, knocking them out from it. */
function land(state: SimState, e: EnemyState, def: MiteDef): void {
  const { zap } = def;
  state.events.zaps.push({ id: e.id, x: e.x, y: e.y, radius: zap.radius });
  if (e.roomId !== state.roomId) return;
  const dx = state.player.x - e.x;
  const dy = state.player.y - e.y;
  const dist = Math.hypot(dx, dy);
  if (dist > zap.radius) return;
  const [kx, ky] = dist > 0 ? [dx / dist, dy / dist] : [e.swipeDirX, e.swipeDirY];
  damagePlayer(state, zap.damage, kx, ky, zap.knockback, zap.knockTicks);
}

/** A swarm's size (065: a static mite's trio), or 1: how many come when this enemy is picked for a pack or a pen. */
export function swarmOf(enemyId: string): number {
  const def = enemyDef(enemyId);
  return def.kind === 'mite' ? def.swarm : 1;
}

/**
 * Links a pack's mites into trios (065), in their order: each run of a mite's `swarm` (three) shares its first's id.
 * Wherever a pack is made (population, a site's guards, the sandbox), its mites come in whole trios, listed together.
 */
export function linkTrios(members: readonly EnemyState[]): void {
  let lead: EnemyState | null = null;
  let count = 0;
  for (const m of members) {
    const def = enemyDef(m.enemyId);
    if (def.kind !== 'mite') continue;
    if (!lead || count >= def.swarm) {
      lead = m;
      count = 0;
    }
    m.trio = lead.id;
    count += 1;
  }
}
