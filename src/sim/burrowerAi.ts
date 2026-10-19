import { TICK_RATE } from '../data/config';
import type { BurrowerDef } from '../data/hollowsEnemies';
import { engage, enter, hold, inAggroBox, leash, startWindup } from './aiCommon';
import { unit } from './direction';
import type { EnemyState } from './enemies';
import { damagePlayer } from './health';
import { inSafeZone } from './population';
import type { SimState } from './state';

// The Burrower (035): a segmented quarry-borer. It idles above ground at home; aggroed, it
// digs in (still hittable) and tunnels toward the player, shown only by a ripple, beyond
// reach of every hit and stopped by cliffs like anything on foot. Close to the player's
// feet (or after tunnelling a while) it stops and locks the spot it is on, a red ring
// growing there, then erupts and stays surfaced and dazed: the window to hit it. Then it
// digs in again.

/** Advances a Burrower's mode and returns this tick's own move, px. */
export function burrowThink(state: SimState, e: EnemyState, def: BurrowerDef): [number, number] {
  const { burrow } = def;
  const p = state.player;
  const idle = engage(state, e, inAggroBox(e, p));
  // Home again after tunnelling there, it comes up.
  if (e.mode === 'idle') e.underground = false;
  if (idle) return idle;
  if (e.mode === 'dig') {
    if (e.modeTicks < burrow.digTicks) return hold(e);
    e.underground = true;
    e.mode = 'chase';
    e.modeTicks = 0;
    return [0, 0];
  }
  if (e.mode === 'windup') {
    if (e.modeTicks < burrow.windupTicks) return hold(e);
    enter(e, 'swipe');
    erupt(state, e, def);
    return [0, 0];
  }
  if (e.mode === 'swipe') {
    if (e.modeTicks < burrow.swipeTicks) return hold(e);
    enter(e, 'recover');
    return [0, 0];
  }
  if (e.mode === 'recover') {
    if (e.modeTicks < burrow.surfacedTicks) return hold(e);
    e.mode = 'chase';
    e.modeTicks = 0;
  }
  const home = leash(e, def);
  if (home) return home;
  // Chasing above ground (just aggroed, or done being dazed): it digs in first.
  if (!e.underground) {
    enter(e, 'dig');
    return [0, 0];
  }
  // Tunnelling: `modeTicks` counts the ticks underground since it last dug in.
  e.modeTicks += 1;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const dist = Math.hypot(dx, dy);
  const due = dist <= burrow.lockRange || e.modeTicks >= burrow.maxTunnelTicks;
  // Never under a player standing in a safe zone (017): it waits at the edge.
  if (due && e.cooldown === 0 && e.roomId === state.roomId && !inSafeZone(state, e.roomId, p.x, p.y)) {
    // It stops and locks the spot where it is: under the player's feet when it caught them, short of them behind a wall.
    startWindup(e, def, dx, dy);
    e.spotX = e.x;
    e.spotY = e.y;
    return [0, 0];
  }
  const step = Math.min(burrow.speed / TICK_RATE, dist);
  const [ux, uy] = unit(dx, dy);
  return [ux * step, uy * step];
}

/** Surfaces at the spot: hits a player whose feet are within the ring, pushing them out from its middle. */
function erupt(state: SimState, e: EnemyState, def: BurrowerDef): void {
  const { burrow } = def;
  e.underground = false;
  state.events.eruptions.push({ id: e.id, x: e.spotX, y: e.spotY, radius: burrow.radius });
  if (e.roomId !== state.roomId) return;
  const dx = state.player.x - e.spotX;
  const dy = state.player.y - e.spotY;
  const dist = Math.hypot(dx, dy);
  if (dist > burrow.radius) return;
  const [kx, ky] = dist > 0 ? [dx / dist, dy / dist] : [e.swipeDirX, e.swipeDirY];
  damagePlayer(state, burrow.damage, kx, ky, burrow.knockback, burrow.knockTicks);
}
