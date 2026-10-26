import { TICK_RATE } from '../data/config';
import { FEET_BOX } from '../data/player';
import { boxHitsSolid, type Box } from './collision';
import { enter } from './aiCommon';
import type { EnemyState } from './enemies';
import { damagePlayer } from './health';
import { roomById, type SimState } from './state';

// A lane run (035's Charger, shared with 061's bellows hound): once it sets off down its locked lane, the runner
// strikes the player once if its body touches them, stops at a wall it ran into last tick (the caller says what a wall
// does: the Charger is stunned, the hound recovers), or at the lane's end to recover; otherwise it steps on down it.

/** A lane's shape and strike (the Charger's `charge`, the hound's `dash`). */
export interface LaneDef {
  distance: number;
  width: number;
  speed: number;
  swipeTicks: number;
  damage: number;
  knockback: number;
  knockTicks: number;
}

/** One tick of the run (`modeTicks` 1 on the tick it sets off), returning its move, px; `onWall` handles a wall stop. */
export function laneRun(state: SimState, e: EnemyState, lane: LaneDef, feetBox: Box, onWall: () => void): [number, number] {
  laneStrike(state, e, lane);
  // A solid tile ahead stops it (a node or a pylon in its way only stops its feet, and it runs out its lane).
  if (e.modeTicks > 1 && e.bumped && boxHitsSolid(roomById(e.roomId), e.x + e.swipeDirX, e.y + e.swipeDirY, feetBox)) {
    onWall();
    return [0, 0];
  }
  const step = lane.speed / TICK_RATE;
  const travelled = (e.modeTicks - 1) * step;
  if (travelled >= lane.distance || e.modeTicks > lane.swipeTicks) {
    enter(e, 'recover');
    return [0, 0];
  }
  e.modeTicks += 1;
  const go = Math.min(step, lane.distance - travelled);
  return [e.swipeDirX * go, e.swipeDirY * go];
}

/** The run's strike: once per run, on a player whose feet box touches the runner's body (a circle the lane's width across round its feet), knocking them along the lane. */
export function laneStrike(state: SimState, e: EnemyState, lane: Pick<LaneDef, 'width' | 'damage' | 'knockback' | 'knockTicks'>): void {
  if (e.struck || e.roomId !== state.roomId) return;
  const p = state.player;
  const gapX = Math.max(0, Math.abs(p.x - e.x) - FEET_BOX.w / 2);
  const gapY = Math.max(0, Math.abs(p.y - e.y) - FEET_BOX.h / 2);
  if (Math.hypot(gapX, gapY) > lane.width / 2) return;
  if (damagePlayer(state, lane.damage, e.swipeDirX, e.swipeDirY, lane.knockback, lane.knockTicks)) e.struck = true;
}

/** How far the run has gone down its lane, px. */
export const laneRunDone = (e: Pick<EnemyState, 'mode' | 'modeTicks'>, lane: Pick<LaneDef, 'distance' | 'speed'>): number =>
  e.mode === 'swipe' ? Math.min(lane.distance, (e.modeTicks - 1) * (lane.speed / TICK_RATE)) : 0;
