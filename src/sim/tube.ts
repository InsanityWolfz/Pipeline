import { FOUNDRY_ROOM } from '../data/rooms';
import { FIRING_WALK_MULTIPLIER } from '../data/player';
import { ammoDef } from '../data/ammo';
import { MUZZLE_OFFSET, SLOT_AMMOS, STARTING_AMMO } from '../data/tube';
import { createArrow } from './arrows';
import { throwBomb } from './bombs';
import { aimFacing, facingVector, unit } from './direction';
import type { Command } from './input';
import { take } from './inventory';
import { takeFromEntrance } from './link';
import { punch } from './melee';
import { isRolling } from './movement';
import { nextPress, volleyShots, type VolleyShot } from './volley';
import type { SimState } from './state';

// The tube: picking the slot's ammo and firing it. Carried rounds fire straight
// from the inventory; once they run out, the linked tube fires a volley from the
// intake's fed entrances (024). With no tube, or nothing to fire, fire punches instead (023).

export interface TubeState {
  /** The ammo hotbar slot 1 fires. */
  ammoId: string;
  /** Ticks before the next shot can happen (a punch waits for it too). */
  fireCooldown: number;
  /** Ticks before the next punch can happen (023). */
  meleeCooldown: number;
  /** The tube is really firing (016): fire held this tick with a round to fire, not rolling or in the foundry. A punch isn't firing. */
  firing: boolean;
  /** This tick's shot was a volley from the intake's entrances (024). */
  fromReservoir: boolean;
  /** Projectiles this tick's shot fired: more than 1 for a volley of several rounds (024), 0 with no shot. */
  shotCount: number;
}

export function createTube(): TubeState {
  return { ammoId: STARTING_AMMO, fireCooldown: 0, meleeCooldown: 0, firing: false, fromReservoir: false, shotCount: 0 };
}

/** Switches the slot to another ammo. The current ammo, or one the slot can't take, does nothing. */
export function selectAmmo(state: SimState, ammoId: string): void {
  const { tube } = state;
  if (ammoId === tube.ammoId || !SLOT_AMMOS.includes(ammoId)) return;
  tube.ammoId = ammoId;
  state.events.selects.push({ ammoId });
}

/**
 * The next fire press has something to fire (023, 024): the tube is in hand and a
 * round of the slot's ammo is carried, or an open entrance holds a round. Without one, fire punches.
 */
export function hasRoundToFire(state: Pick<SimState, 'hasTube' | 'tube' | 'inventory' | 'link'>): boolean {
  return nextPress(state).kind !== 'melee';
}

/** The walk multiplier from the tube (016): slower while it really fires, by last tick's state. */
export function firingWalkScale(state: Pick<SimState, 'tube'>): number {
  return state.tube.firing ? FIRING_WALK_MULTIPLIER : 1;
}

/** Runs after the player has moved this tick, so shots leave from where they stand now. */
export function stepTube(state: SimState, cmd: Command): void {
  const { tube, player } = state;
  player.aimX = cmd.aimX;
  player.aimY = cmd.aimY;
  if (tube.fireCooldown > 0) tube.fireCooldown -= 1;
  if (tube.meleeCooldown > 0) tube.meleeCooldown -= 1;
  // Without the tube (012) there's nothing to switch.
  if (state.hasTube && cmd.selectAmmo !== null) selectAmmo(state, cmd.selectAmmo);

  tube.firing = false;
  tube.fromReservoir = false;
  tube.shotCount = 0;
  // The tube is quiet in the foundry (015): clicks there are for building and menus, never shots or punches.
  if (isRolling(player) || !cmd.fire || state.roomId === FOUNDRY_ROOM) return;
  const aim = unit(cmd.aimX - player.x, cmd.aimY - player.y);
  const [dx, dy] = aim[0] === 0 && aim[1] === 0 ? facingVector(player.facing) : aim;
  player.facing = aimFacing(dx, dy, player.facing);
  if (!hasRoundToFire(state)) {
    punch(state, dx, dy);
    return;
  }
  tube.firing = true;
  fire(state, cmd, dx, dy);
}

/**
 * Fires along the unit aim (dx, dy) once the interval has passed: a carried round of
 * the slot's ammo alone, else a volley of one round from every fed entrance (024),
 * each costing a round from its own entrance. The caller has checked there's one to fire.
 */
function fire(state: SimState, cmd: Command, dx: number, dy: number): void {
  const { tube } = state;
  if (tube.fireCooldown > 0) return;
  const press = nextPress(state);
  if (press.kind === 'carried') {
    take(state.inventory, ammoDef(press.ammoId).itemId);
    tube.fireCooldown = ammoDef(press.ammoId).fireTicks;
    launch(state, { ammoId: press.ammoId, dir: [dx, dy], across: 0 }, cmd);
    tube.shotCount = 1;
    return;
  }
  // Unreachable (the caller checked for a round), but it narrows the type.
  if (press.kind !== 'volley') return;
  for (const r of press.rounds) {
    const e = state.link.entrances[r.entrance];
    if (e) takeFromEntrance(e);
  }
  // The volley waits out the slowest ammo it fired.
  tube.fireCooldown = Math.max(...press.rounds.map((r) => ammoDef(r.ammoId).fireTicks));
  tube.fromReservoir = true;
  const shots = volleyShots(press.rounds.map((r) => r.ammoId), dx, dy);
  for (const shot of shots) launch(state, shot, cmd);
  tube.shotCount = shots.length;
}

/** Sends one projectile along its direction from the tube's mouth. A bomb lands at the aim's distance, `across` px off the line. */
function launch(state: SimState, { ammoId, dir: [dx, dy], across }: VolleyShot, cmd: Command): void {
  const { player } = state;
  const muzzle = { x: player.x + dx * MUZZLE_OFFSET, y: player.y + dy * MUZZLE_OFFSET };
  state.events.shots.push({ ...muzzle, ammoId });
  if (ammoDef(ammoId).kind === 'lob') {
    throwBomb(state, ammoId, muzzle, player, { x: cmd.aimX, y: cmd.aimY }, [dx, dy], across);
    return;
  }
  state.arrows.push(createArrow(state.nextArrowId++, ammoId, state.roomId, muzzle.x, muzzle.y, dx, dy));
}
