import { TICK_RATE } from '../data/config';
import type { ChargerDef } from '../data/hollowsEnemies';
import { FEET_BOX } from '../data/player';
import { engage, enter, hold, inAggroBox, leash, startWindup, toward } from './aiCommon';
import type { EnemyState } from './enemies';
import { boxHitsSolid } from './collision';
import { damagePlayer } from './health';
import { clearGround } from './sightLine';
import { roomById, type SimState } from './state';
import { applyStun } from './stun';

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
 * One tick of the charge (`modeTicks` 1 on the tick it sets off): first the strike on a player its body touches, then
 * a wall it ran into last tick stuns it, then the lane's end stops it; otherwise the next step down the lane.
 */
function ram(state: SimState, e: EnemyState, def: ChargerDef): [number, number] {
  const { charge } = def;
  strike(state, e, def);
  // A solid tile stops it dazed (a node or a pylon in its way only stops it, and it runs out its lane).
  if (e.modeTicks > 1 && e.bumped && boxHitsSolid(roomById(e.roomId), e.x + e.swipeDirX, e.y + e.swipeDirY, def.feetBox)) {
    // 039.6: the wall's daze is the Stun status, for its own stunTicks, in the dazed pose.
    enter(e, 'stun');
    applyStun(state, e, charge.stunTicks, 'stun');
    return [0, 0];
  }
  const step = charge.speed / TICK_RATE;
  const travelled = (e.modeTicks - 1) * step;
  if (travelled >= charge.distance || e.modeTicks > charge.swipeTicks) {
    enter(e, 'recover');
    return [0, 0];
  }
  e.modeTicks += 1;
  const go = Math.min(step, charge.distance - travelled);
  return [e.swipeDirX * go, e.swipeDirY * go];
}

/** Hits the player once per charge if their feet box touches its body (a circle half the lane's width round its feet), knocking them along the lane. */
function strike(state: SimState, e: EnemyState, def: ChargerDef): void {
  if (e.struck || e.roomId !== state.roomId) return;
  const { charge } = def;
  const p = state.player;
  const gapX = Math.max(0, Math.abs(p.x - e.x) - FEET_BOX.w / 2);
  const gapY = Math.max(0, Math.abs(p.y - e.y) - FEET_BOX.h / 2);
  if (Math.hypot(gapX, gapY) > charge.width / 2) return;
  if (damagePlayer(state, charge.damage, e.swipeDirX, e.swipeDirY, charge.knockback, charge.knockTicks)) e.struck = true;
}

/** How far the charge has run down its lane, px (035: getState's lane). */
export const charged = (e: Pick<EnemyState, 'mode' | 'modeTicks'>, def: ChargerDef): number =>
  e.mode === 'swipe' ? Math.min(def.charge.distance, (e.modeTicks - 1) * (def.charge.speed / TICK_RATE)) : 0;
