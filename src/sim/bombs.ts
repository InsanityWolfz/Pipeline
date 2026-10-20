import { lobbedAmmo } from '../data/ammo';
import { TICK_RATE, TILE_SIZE } from '../data/config';
import { blastArea } from './blast';
import type { SimState } from './state';
import { shotSealed } from './tutorial';
import { roundEmission } from './emissions';
import { statOf } from './statResolve';
import { leavePool } from './keystones';
import { armMine, scatterBomblets } from './mines';

// Lobbed shots: a bomb arcs over everything to its target and bursts where it
// lands. Position is the ground point. (029: no burn until the fire rune.) A landmine
// (038) flies the same way but lands armed (mines.ts); a cluster bomb's burst scatters bomblets.

export interface BombState {
  id: number;
  ammoId: string;
  /** The room it was thrown in; it only bursts on enemies there. */
  roomId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  x: number;
  y: number;
  /** Ticks flown; it lands on the first tick this reaches `flightTicks` (039: a flight time isn't rounded, so it may be fractional). */
  tick: number;
  flightTicks: number;
  /** Height above the ground point, px (render only). */
  height: number;
  /** Its burst's damage and radius, px, after talents (037), fixed at the throw. */
  damage: number;
  radius: number;
}

/**
 * Throws a bomb from the muzzle `from` along the unit direction `dir`, landing as far
 * from the player's `feet` as `aim` is, or at the ammo's max range if the aim is
 * farther. Along the aim that's the aim point; down a volley's side lane (048) it's on
 * the arc through it.
 */
export function throwBomb(
  state: SimState,
  ammoId: string,
  from: { x: number; y: number },
  feet: { x: number; y: number },
  aim: { x: number; y: number },
  dir: [number, number],
): void {
  const ammo = lobbedAmmo(ammoId);
  const e = roundEmission(ammoId);
  const reach = Math.min(Math.hypot(aim.x - feet.x, aim.y - feet.y), statOf(state, 'range', e, ammo.maxRange));
  const toX = feet.x + dir[0] * reach;
  const toY = feet.y + dir[1] * reach;
  const distance = Math.hypot(toX - from.x, toY - from.y);
  // Its stats through resolveStat (039), by scope: Swift Arc (Lob) shortens a bomb's flight, not a landmine's (Mine);
  // Black Powder (Bomb) grows a bomb's damage, not a landmine's; Wide Casing (Burst) grows both bursts. Never rounded.
  const bomb = ammo.kind === 'lob';
  const flightTicks = Math.max(1, statOf(state, 'flight-time', e, distance / (ammo.speed / TICK_RATE)));
  state.bombs.push({
    id: state.nextBombId++,
    ammoId,
    roomId: state.roomId,
    fromX: from.x,
    fromY: from.y,
    toX,
    toY,
    x: from.x,
    y: from.y,
    tick: 0,
    flightTicks,
    height: 0,
    damage: statOf(state, 'damage', e, bomb ? ammo.burstDamage : ammo.damage),
    radius: statOf(state, 'radius', e, bomb ? ammo.burstRadius : ammo.radius),
  });
}

/** Flies every bomb one tick; those that land burst and are removed. */
export function stepBombs(state: SimState): void {
  let kept = 0;
  for (const b of state.bombs) {
    b.tick += 1;
    const t = b.tick / b.flightTicks;
    const ammo = lobbedAmmo(b.ammoId);
    if (t >= 1) {
      b.x = b.toX;
      b.y = b.toY;
      b.height = 0;
      land(state, b);
      continue;
    }
    b.x = b.fromX + (b.toX - b.fromX) * t;
    b.y = b.fromY + (b.toY - b.fromY) * t;
    b.height = 4 * ammo.arcPeak * t * (1 - t);
    // A shut ley barrier (034) stops even a lob: the bomb drops and bursts against it (a landmine arms there).
    if (shotSealed(state, b.roomId, Math.floor(b.x / TILE_SIZE), Math.floor(b.y / TILE_SIZE))) {
      b.height = 0;
      land(state, b);
      continue;
    }
    state.bombs[kept++] = b;
  }
  state.bombs.length = kept;
}

/** Where a lobbed round comes down: a landmine arms (038), a bomb bursts. */
function land(state: SimState, b: BombState): void {
  const ammo = lobbedAmmo(b.ammoId);
  if (ammo.kind === 'mine') armMine(state, b, ammo);
  else burst(state, b);
}

/**
 * Damages every live enemy whose feet are within the burst radius, flashing it without knockback. Never the player,
 * nor a Burrower underground (035). With Blastfletch (037) the Burst leaves a Pool (039); a cluster bomb (038)
 * scatters its Bomblets.
 */
function burst(state: SimState, b: BombState): void {
  blastArea(state, b.roomId, b.x, b.y, b.radius, b.damage, lobbedAmmo(b.ammoId).damageType);
  state.events.bursts.push({ x: b.x, y: b.y, radius: b.radius, damageType: lobbedAmmo(b.ammoId).damageType });
  leavePool(state, b, roundEmission(b.ammoId));
  scatterBomblets(state, b);
}
