import type { ChargerDef } from '../data/hollowsEnemies';
import { engage, enter, hold, inAggroBox, leash, startWindup, toward } from './aiCommon';
import type { EnemyState } from './enemies';
import { laneRun } from './laneRun';
import { clearGround } from './sightLine';
import { roomById, type SimState } from './state';
import { applyStun, dazeHolds } from './stun';

// The Charger (035): a horned stone ram-construct. Aggroed, it walks at the player; with
// them in range along a clear ground line and its cooldown ready, it plants and paws the
// ground, its lane locked from its feet. Then it rams down the lane, striking the player
// once if they're still in it, and stops at the lane's end to recover, or is stunned by a
// wall it runs into first: the window to punish it. It passes through other enemies.

/** Advances a Charger's mode and returns this tick's own move, px. */
export function chargeThink(state: SimState, e: EnemyState, def: ChargerDef): [number, number] {
  const { charge } = def;
  const p = state.player;
  const idle = engage(state, e, inAggroBox(e, p));
  if (idle) return idle;
  if (e.mode === 'windup') {
    if (e.modeTicks < charge.windupTicks) return hold(e);
    enter(e, 'swipe');
    e.struck = false;
    state.events.charges.push({ id: e.id, x: e.x, y: e.y, dx: e.swipeDirX, dy: e.swipeDirY, length: charge.distance });
  }
  if (e.mode === 'swipe') return ram(state, e, def);
  if (e.dazed && dazeHolds(e)) return hold(e);
  const rest = e.mode === 'recover' ? charge.recoverTicks : null;
  if (rest !== null) {
    if (e.modeTicks < rest) return hold(e);
    e.mode = 'chase';
    e.modeTicks = 0;
  }
  const home = leash(e, def);
  if (home) return home;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  if (Math.hypot(dx, dy) > charge.triggerRange || e.roomId !== state.roomId || !clearGround(roomById(e.roomId), e.x, e.y, p.x, p.y)) return toward(dx, dy, def);
  // In range with a clear line: plant and wind up, or stand and wait out the cooldown.
  if (e.cooldown === 0) {
    startWindup(e, def, dx, dy);
    e.spotX = e.x;
    e.spotY = e.y;
  }
  return [0, 0];
}

/**
 * One tick of the charge (`modeTicks` 1 on the tick it sets off): the shared lane run (laneRun.ts), where a wall it ran
 * into last tick stuns it, dazed (039.6: the Stun status, for its own stunTicks): the window to punish it.
 */
function ram(state: SimState, e: EnemyState, def: ChargerDef): [number, number] {
  return laneRun(state, e, def.charge, def.feetBox, () => applyStun(state, e, def.charge.stunTicks, 'stun'));
}
