import { TICK_RATE, TILE_SIZE } from '../data/config';
import { enemyDef } from '../data/enemies';
import { FEET_BOX } from '../data/player';
import { isSolid } from './collision';
import type { EnemyState } from './enemies';
import { damagePlayer } from './health';
import { roomById, type SimState } from './state';

// Wisp orbs (009): slow enemy projectiles. They fly straight from the caster
// along its locked aim, end at a wall or their range, and hit the player once.
// Player shots don't touch them.

export interface OrbState {
  id: number;
  /** The enemy kind that cast it, for its tuning. */
  enemyId: string;
  roomId: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  travelled: number;
}

/** Casts an orb from the caster's feet along its locked aim. */
export function castOrb(state: SimState, e: EnemyState): void {
  state.orbs.push({
    id: state.nextOrbId++,
    enemyId: e.enemyId,
    roomId: e.roomId,
    x: e.x,
    y: e.y,
    dx: e.swipeDirX,
    dy: e.swipeDirY,
    travelled: 0,
  });
}

/** Flies every orb one tick; it ends at a wall, past its range, or on hitting the player. */
export function stepOrbs(state: SimState): void {
  state.orbs = state.orbs.filter((o) => {
    const def = enemyDef(o.enemyId);
    if (def.kind !== 'caster') return false;
    const { cast } = def;
    const step = cast.orbSpeed / TICK_RATE;
    o.x += o.dx * step;
    o.y += o.dy * step;
    o.travelled += step;
    if (o.travelled > cast.orbRange || isSolid(roomById(o.roomId), Math.floor(o.x / TILE_SIZE), Math.floor(o.y / TILE_SIZE))) return false;
    if (o.roomId !== state.roomId) return true;
    const p = state.player;
    const near = Math.abs(o.x - p.x) <= FEET_BOX.w / 2 + cast.orbRadius / 2 && Math.abs(o.y - p.y) <= FEET_BOX.h / 2 + cast.orbRadius / 2;
    if (!near) return true;
    // A roll's i-frames let the orb pass straight through.
    return !damagePlayer(state, cast.orbDamage, o.dx, o.dy, cast.knockback, cast.knockTicks);
  });
}
