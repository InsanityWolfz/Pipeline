import { TICK_RATE } from '../data/config';
import type { HawkDef } from '../data/stormcrownEnemies';
import { engage, enter, hold, inAggroBox, leash, startWindup } from './aiCommon';
import type { EnemyState } from './enemies';
import { barredFrom, walledFrom } from './flight';
import { laneRun, laneStrike } from './laneRun';
import type { SimState } from './state';

// The thunderhawk (065): a brass-and-slate storm bird construct with lightning-veined wings. It flies (flight.ts), so
// walls, cliffs and chasms never stop it. Aggroed, it circles the player at its orbit, its heading (`angle`) turning
// at no more than its turn rate, so it's evasive: straight shots lead it poorly and homing rounds track it. With its
// cooldown ready and the player in reach of its dive, it hovers and marks its dive line through their feet, locked at
// the wind-up's start (the red lane), then dives down it (061's lane run: one strike, through walls and enemies), and
// climbs away to its orbit, still circling, before it can dive again.

/** Its orbit's side, by its id: half circle one way, half the other, so a pair doesn't fly as one. */
const sideOf = (e: EnemyState): number => (e.id % 2 === 0 ? 1 : -1);

/** Advances a hawk's mode and returns this tick's own move, px. */
export function hawkThink(state: SimState, e: EnemyState, def: HawkDef): [number, number] {
  const { dive } = def;
  const p = state.player;
  // Beyond a shut barrier's line the player is out of its reach (review B1): it doesn't wake, and turns for home.
  const barred = barredFrom(state, e);
  if (barred && e.mode !== 'idle' && e.mode !== 'return') {
    e.mode = 'return';
    e.modeTicks = 0;
  }
  const idle = engage(state, e, inAggroBox(e, p) && !barred);
  if (idle) {
    if (idle[0] !== 0 || idle[1] !== 0) e.angle = Math.atan2(idle[1], idle[0]);
    return idle;
  }
  if (e.mode === 'windup') {
    if (e.modeTicks < dive.windupTicks) return hold(e);
    enter(e, 'swipe');
    e.struck = false;
    e.angle = Math.atan2(e.swipeDirY, e.swipeDirX);
    state.events.dives.push({ id: e.id, x: e.x, y: e.y, dx: e.swipeDirX, dy: e.swipeDirY, length: dive.distance });
  }
  if (e.mode === 'swipe') {
    // A flier never meets a wall: only the lane's end stops its dive, or a keep-out (an arena's walls, a shut
    // barrier, the grid's edge) it bumped into last tick (review S5), where it climbs away at once.
    if (e.modeTicks > 1 && e.bumped) {
      laneStrike(state, e, dive);
      enter(e, 'recover');
      return [0, 0];
    }
    return laneRun(state, e, dive, def.feetBox, () => enter(e, 'recover'));
  }
  // Climbing away, it flies on round its orbit.
  if (e.mode === 'recover') {
    if (e.modeTicks < dive.recoverTicks) {
      e.modeTicks += 1;
      return circle(state, e, def);
    }
    e.mode = 'chase';
    e.modeTicks = 0;
  }
  const home = leash(e, def);
  if (home) {
    if (home[0] !== 0 || home[1] !== 0) e.angle = Math.atan2(home[1], home[0]);
    return home;
  }
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  if (e.cooldown === 0 && e.roomId === state.roomId && Math.hypot(dx, dy) <= dive.distance && !walledFrom(state, e)) {
    startWindup(e, def, dx, dy);
    e.spotX = e.x;
    e.spotY = e.y;
    return [0, 0];
  }
  return circle(state, e, def);
}

/**
 * One tick round its orbit: it wants the tangent round the player (its side's way), turned toward them when outside
 * the radius and away when inside; its heading turns toward that by at most its turn rate, and it flies along it.
 */
function circle(state: SimState, e: EnemyState, def: HawkDef): [number, number] {
  const p = state.player;
  const dx = e.x - p.x;
  const dy = e.y - p.y;
  const r = Math.hypot(dx, dy) || 1;
  const ux = dx / r;
  const uy = dy / r;
  const side = sideOf(e);
  const miss = Math.max(-1, Math.min(1, (r - def.orbit.radius) / def.orbit.radius)) * def.orbit.pull;
  const want = Math.atan2(ux * side - uy * miss, -uy * side - ux * miss);
  const max = (def.orbit.turnDegPerSec * Math.PI) / 180 / TICK_RATE;
  const diff = Math.atan2(Math.sin(want - e.angle), Math.cos(want - e.angle));
  const a = e.angle + Math.max(-max, Math.min(max, diff));
  e.angle = Math.atan2(Math.sin(a), Math.cos(a));
  const step = def.walkSpeed / TICK_RATE;
  return [Math.cos(e.angle) * step, Math.sin(e.angle) * step];
}
