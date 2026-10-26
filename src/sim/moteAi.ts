import type { MoteDef } from '../data/emberworksEnemies';
import { engage, hold, inAggroBox, leash, startWindup, toward } from './aiCommon';
import type { EnemyState } from './enemies';
import { layPool } from './floodPools';
import { damagePlayer } from './health';
import type { SimState } from './state';

// The cinder mote (061): a floating ember in a cage of slag. Aggroed, it drifts straight at the player, needing no
// clear line (walls still stop it, as any feet); with their feet within its trigger it stops and swells, a red circle
// growing under it, then bursts on a player inside (a roll's i-frames dodge it). It leaves a fire pool that hurts only
// the player and is gone, `spent`: no drop, no XP and no death burst (combat.ts). A mote killed first bursts on the
// enemies round it instead (emberDeaths.ts).

/** Advances a mote's mode and returns this tick's own move, px. */
export function moteThink(state: SimState, e: EnemyState, def: MoteDef): [number, number] {
  const { swell } = def;
  const p = state.player;
  const idle = engage(state, e, inAggroBox(e, p));
  if (idle) return idle;
  if (e.mode === 'windup') {
    if (e.modeTicks < swell.windupTicks) return hold(e);
    burst(state, e, def);
    return [0, 0];
  }
  // A Stun (039) holds it in recovery; it swells again once it's over.
  if (e.mode === 'recover') {
    if (e.modeTicks < swell.recoverTicks) return hold(e);
    e.mode = 'chase';
    e.modeTicks = 0;
  }
  const home = leash(e, def);
  if (home) return home;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  if (e.roomId === state.roomId && Math.hypot(dx, dy) <= swell.triggerRange) {
    startWindup(e, def, dx, dy);
    return [0, 0];
  }
  return toward(dx, dy, def);
}

/** Its burst: a player inside takes the hit, knocked out from it; its pool lies where it stood; it's spent. */
function burst(state: SimState, e: EnemyState, def: MoteDef): void {
  const { swell, pool } = def;
  state.events.moteBursts.push({ id: e.id, x: e.x, y: e.y, radius: swell.radius });
  layPool(state, e, 'circle', { x0: e.x, y0: e.y, x1: e.x, y1: e.y, r: pool.radius }, pool);
  e.health = 0;
  e.spent = true;
  if (e.roomId !== state.roomId) return;
  const dx = state.player.x - e.x;
  const dy = state.player.y - e.y;
  const dist = Math.hypot(dx, dy);
  if (dist > swell.radius) return;
  const [kx, ky] = dist > 0 ? [dx / dist, dy / dist] : [e.swipeDirX, e.swipeDirY];
  damagePlayer(state, swell.damage, kx, ky, swell.knockback, swell.knockTicks);
}

/** The swell's circle while it grows (061: getState's), else null. */
export const swellShown = (e: Pick<EnemyState, 'mode' | 'modeTicks'>, def: MoteDef): { radius: number; ticks: number } | null =>
  e.mode === 'windup' ? { radius: def.swell.radius, ticks: e.modeTicks } : null;
