import type { RamDef } from '../data/stormcrownEnemies';
import { engage, inAggroBox, inArc, leash, mayStart, startWindup, stepAttack, toward } from './aiCommon';
import type { EnemyState } from './enemies';
import { damagePlayer } from './health';
import { slowPlayer } from './slow';
import type { SimState } from './state';

// The gale ram (065): a heavy, broad fan-faced wind construct. It walks at the player; within its gust's range it
// plants and winds up a red cone in front of it, locked at the wind-up's start, then gusts: a player inside takes its
// damage, is pushed back out from it, and is slowed (slow.ts). A roll's i-frames dodge the whole gust.

/** Advances a ram's mode and returns this tick's own move, px. */
export function ramThink(state: SimState, e: EnemyState, def: RamDef): [number, number] {
  const idle = engage(state, e, inAggroBox(e, state.player));
  if (idle) return idle;
  const attack = stepAttack(e, def, () => gust(state, e, def));
  if (attack) return attack;
  const home = leash(e, def);
  if (home) return home;
  const dx = state.player.x - e.x;
  const dy = state.player.y - e.y;
  if (Math.hypot(dx, dy) > def.gust.range) return toward(dx, dy, def);
  if (e.cooldown === 0 && mayStart(state, e)) startWindup(e, def, dx, dy);
  return [0, 0];
}

/** Its gust: feet inside the locked cone take the hit, pushed out from it, and slowed; a hit spent on a Wardstone block doesn't slow. */
function gust(state: SimState, e: EnemyState, def: RamDef): void {
  const { gust: g } = def;
  state.events.gusts.push({ id: e.id, x: e.x, y: e.y, dx: e.swipeDirX, dy: e.swipeDirY });
  if (e.roomId !== state.roomId) return;
  const p = state.player;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  if (!inArc(dx, dy, e.swipeDirX, e.swipeDirY, g.reach, g.arcDegrees)) return;
  const dist = Math.hypot(dx, dy);
  const [kx, ky] = dist > 0 ? [dx / dist, dy / dist] : [e.swipeDirX, e.swipeDirY];
  if (damagePlayer(state, g.damage, kx, ky, g.push, g.pushTicks) && p.lastHitTick === state.tick) slowPlayer(p, g.slow, g.slowTicks);
}
