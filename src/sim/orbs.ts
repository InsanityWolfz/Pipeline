import { TICK_RATE, TILE_SIZE } from '../data/config';
import { enemyDef, type EnemyDef } from '../data/enemies';
import { defOf } from './champions';
import { FEET_BOX } from '../data/player';
import { blocksShot } from './collision';
import type { EnemyState } from './enemies';
import { damagePlayer } from './health';
import { roomById, type SimState } from './state';
import { shotSealed } from './tutorial';

// Enemy projectiles: Wisp orbs (009), slow, and the Sniper construct's bolts (035), fast.
// They fly straight from the shooter along its locked aim, end at a wall or their range,
// and hit the player once (a roll's i-frames let them through). Player shots don't touch them.

/** A projectile's numbers by the kind that fires it: speed px/s, damage, range px, its box px, knockback px over ticks. */
interface ShotNumbers {
  speed: number;
  damage: number;
  range: number;
  size: number;
  knockback: number;
  knockTicks: number;
}

function shotOf(def: EnemyDef): ShotNumbers | null {
  if (def.kind === 'caster') {
    const { cast: c } = def;
    return { speed: c.orbSpeed, damage: c.orbDamage, range: c.orbRange, size: c.orbSize, knockback: c.knockback, knockTicks: c.knockTicks };
  }
  if (def.kind === 'sniper') {
    const { snipe: s } = def;
    return { speed: s.boltSpeed, damage: s.damage, range: s.range, size: s.boltSize, knockback: s.knockback, knockTicks: s.knockTicks };
  }
  return null;
}

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
  /** A ring-scaled (041) or champion's (032) orb hits harder: its damage, or the caster kind's when unset. */
  damage?: number;
}

/** Casts an orb (or fires a bolt, 035) from the shooter's feet along its locked aim. */
export function castOrb(state: SimState, e: EnemyState): void {
  const damage = shotOf(defOf(e))?.damage ?? 0;
  const base = shotOf(enemyDef(e.enemyId))?.damage ?? 0;
  state.orbs.push({
    id: state.nextOrbId++,
    enemyId: e.enemyId,
    roomId: e.roomId,
    x: e.x,
    y: e.y,
    dx: e.swipeDirX,
    dy: e.swipeDirY,
    travelled: 0,
    ...(damage !== base ? { damage } : {}),
  });
}

/** Flies every orb one tick; it ends at a wall, past its range, or on hitting the player. */
export function stepOrbs(state: SimState): void {
  state.orbs = state.orbs.filter((o) => {
    const shot = shotOf(enemyDef(o.enemyId));
    if (!shot) return false;
    const step = shot.speed / TICK_RATE;
    o.x += o.dx * step;
    o.y += o.dy * step;
    o.travelled += step;
    const tx = Math.floor(o.x / TILE_SIZE);
    const ty = Math.floor(o.y / TILE_SIZE);
    if (o.travelled > shot.range || blocksShot(roomById(o.roomId), tx, ty) || shotSealed(state, o.roomId, tx, ty)) return false;
    if (o.roomId !== state.roomId) return true;
    const p = state.player;
    const near = Math.abs(o.x - p.x) <= (FEET_BOX.w + shot.size) / 2 && Math.abs(o.y - p.y) <= (FEET_BOX.h + shot.size) / 2;
    if (!near) return true;
    // A roll's i-frames let the orb pass straight through.
    return !damagePlayer(state, o.damage ?? shot.damage, o.dx, o.dy, shot.knockback, shot.knockTicks);
  });
}
