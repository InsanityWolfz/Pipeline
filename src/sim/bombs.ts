import { lobAmmo, type DamageType } from '../data/ammo';
import { TICK_RATE, TILE_SIZE } from '../data/config';
import { damageEnemy, targetable } from './enemies';
import type { SimState } from './state';
import { shotSealed } from './tutorial';
import { ofBase, playerStats } from './stats';
import { chargeGround } from './keystones';

// Lobbed shots: a bomb arcs over everything to its target and bursts where it
// lands. Position is the ground point. (029: no burn until the fire rune.)

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
  /** Ticks flown; it lands when this reaches `flightTicks`. */
  tick: number;
  flightTicks: number;
  /** Height above the ground point, px (render only). */
  height: number;
  /** Its burst's damage and radius, px, after talents (037), fixed at the throw. */
  damage: number;
  radius: number;
}

/**
 * Throws a bomb from the muzzle `from` toward `aim` along the unit direction `dir`.
 * It lands on the aim point, or at the ammo's max range from the player's `feet`
 * if the aim is farther.
 */
export function throwBomb(
  state: SimState,
  ammoId: string,
  from: { x: number; y: number },
  feet: { x: number; y: number },
  aim: { x: number; y: number },
  dir: [number, number],
  across = 0,
): void {
  const ammo = lobAmmo(ammoId);
  const reach = Math.min(Math.hypot(aim.x - feet.x, aim.y - feet.y), ammo.maxRange);
  // Side by side in a volley (024): `across` px to the right of the line, clockwise on screen.
  const toX = feet.x + dir[0] * reach - dir[1] * across;
  const toY = feet.y + dir[1] * reach + dir[0] * across;
  const distance = Math.hypot(toX - from.x, toY - from.y);
  // Talents (037): Short Fuse shortens the flight, Black Powder and Wide Casing grow the burst.
  const stats = playerStats(state).ammo;
  const flightTicks = Math.max(1, Math.ceil((distance / (ammo.speed / TICK_RATE)) * stats.lobTime));
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
    damage: ammo.burstDamage * ofBase(stats.damage, ammoId),
    radius: stats.blastRadius,
  });
}

/** Flies every bomb one tick; those that land burst and are removed. */
export function stepBombs(state: SimState): void {
  let kept = 0;
  for (const b of state.bombs) {
    b.tick += 1;
    const t = b.tick / b.flightTicks;
    const ammo = lobAmmo(b.ammoId);
    if (t >= 1) {
      b.x = b.toX;
      b.y = b.toY;
      b.height = 0;
      burst(state, b);
      continue;
    }
    b.x = b.fromX + (b.toX - b.fromX) * t;
    b.y = b.fromY + (b.toY - b.fromY) * t;
    b.height = 4 * ammo.arcPeak * t * (1 - t);
    // A shut ley barrier (034) stops even a lob: the bomb drops and bursts against it.
    if (shotSealed(state, b.roomId, Math.floor(b.x / TILE_SIZE), Math.floor(b.y / TILE_SIZE))) {
      b.height = 0;
      burst(state, b);
      continue;
    }
    state.bombs[kept++] = b;
  }
  state.bombs.length = kept;
}

/**
 * Damages every live enemy whose feet are within the burst radius, flashing it without knockback. Never the player,
 * nor a Burrower underground (035). With Blastfletch (037) the blast leaves its ground charged.
 */
function burst(state: SimState, b: BombState): void {
  blastArea(state, b.roomId, b.x, b.y, b.radius, b.damage, lobAmmo(b.ammoId).damageType);
  state.events.bursts.push({ x: b.x, y: b.y, radius: b.radius });
  chargeGround(state, b);
}

/** Damages every live, targetable enemy in a room whose feet are within `radius` of (x, y), flashing it without knockback; `skip` is spared. */
export function blastArea(state: SimState, roomId: string, x: number, y: number, radius: number, damage: number, damageType: DamageType, skip: number | null = null): void {
  const style = { knock: false, flash: true, damageType } as const;
  for (const e of state.enemies) {
    if (e.roomId !== roomId || e.health <= 0 || !targetable(e) || e.id === skip) continue;
    if (Math.hypot(e.x - x, e.y - y) > radius) continue;
    damageEnemy(state, e, damage, e.x - x, e.y - y, style);
  }
}
