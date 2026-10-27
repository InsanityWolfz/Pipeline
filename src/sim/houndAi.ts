import type { HoundDef } from '../data/emberworksEnemies';
import { engage, enter, hold, inAggroBox, leash, mayStart, startWindup, toward } from './aiCommon';
import type { EnemyState } from './enemies';
import { layPool } from './floodPools';
import { laneRun } from './laneRun';
import { clearGround } from './sightLine';
import { roomById, type SimState } from './state';

// The bellows hound (061): a lean forge-hound construct with a bellows chest. It walks at the player like the Charger
// (035); with them in range along a clear ground line and its cooldown ready, it plants and shows its lane (the
// Charger's red lane, locked from its feet), then dashes down it, striking the player once if they're still in it and
// passing through other enemies. It stops at the lane's end or at a wall, with no stun (unlike the Charger), then
// recovers. Its dash leaves a burning trail (a capsule pool, floodPools.ts) along the ground it covered.

/** Advances a hound's mode and returns this tick's own move, px. */
export function houndThink(state: SimState, e: EnemyState, def: HoundDef): [number, number] {
  const { dash } = def;
  const p = state.player;
  const idle = engage(state, e, inAggroBox(e, p));
  if (idle) return idle;
  if (e.mode === 'windup') {
    if (e.modeTicks < dash.windupTicks) return hold(e);
    enter(e, 'swipe');
    e.struck = false;
    state.events.dashes.push({ id: e.id, x: e.x, y: e.y, dx: e.swipeDirX, dy: e.swipeDirY, length: dash.distance });
    layPool(state, e, 'capsule', { x0: e.x, y0: e.y, x1: e.x, y1: e.y, r: def.trail.width / 2 }, def.trail);
  }
  if (e.mode === 'swipe') return run(state, e, def);
  if (e.mode === 'recover') {
    if (e.modeTicks < dash.recoverTicks) return hold(e);
    e.mode = 'chase';
    e.modeTicks = 0;
  }
  const home = leash(e, def);
  if (home) return home;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  if (Math.hypot(dx, dy) > dash.triggerRange || e.roomId !== state.roomId || !clearGround(roomById(e.roomId), e.x, e.y, p.x, p.y)) return toward(dx, dy, def);
  // 073: only on screen; held, it stands off as while its cooldown runs.
  if (e.cooldown === 0 && mayStart(state, e)) {
    startWindup(e, def, dx, dy);
    e.spotX = e.x;
    e.spotY = e.y;
  }
  return [0, 0];
}

/** One tick of the dash: its trail drawn up to its feet, then the shared lane run (laneRun.ts), where a wall only ends it, with no stun. */
function run(state: SimState, e: EnemyState, def: HoundDef): [number, number] {
  extendTrail(state, e);
  return laneRun(state, e, def.dash, def.feetBox, () => enter(e, 'recover'));
}

/** Its trail's far end follows its feet while it dashes. */
function extendTrail(state: SimState, e: EnemyState): void {
  for (let i = state.floodPools.length - 1; i >= 0; i--) {
    const pool = state.floodPools[i];
    if (pool?.ownerId !== e.id || pool.shape !== 'capsule') continue;
    pool.x1 = e.x;
    pool.y1 = e.y;
    return;
  }
}
