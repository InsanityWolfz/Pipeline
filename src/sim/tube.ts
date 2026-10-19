import { FOUNDRY_ROOM } from '../data/rooms';
import { FIRING_WALK_MULTIPLIER } from '../data/player';
import { ammoDef } from '../data/ammo';
import { MUZZLE_OFFSET, SLOT_AMMOS, STARTING_AMMO } from '../data/tube';
import { createArrow } from './arrows';
import { throwBomb } from './bombs';
import { aimFacing, facingVector, unit } from './direction';
import type { Command } from './input';
import { count, take } from './inventory';
import { takeFromReservoir } from './link';
import { punch } from './melee';
import { isRolling } from './movement';
import { intakeStreams, rotate } from './spread';
import type { SimState } from './state';

// The tube: picking the slot's ammo and firing it. Carried rounds fire straight
// from the inventory; once they run out, the linked tube fires from its reservoir.
// With no tube, or nothing to fire, fire punches instead (023).

export interface TubeState {
  /** The ammo hotbar slot 1 fires. */
  ammoId: string;
  /** Ticks before the next shot can happen (a punch waits for it too). */
  fireCooldown: number;
  /** Ticks before the next punch can happen (023). */
  meleeCooldown: number;
  /** Fire was held this tick with a round to fire, and the player could fire (not rolling): a punch isn't firing. */
  firing: boolean;
  /** This tick's shot came from the reservoir. */
  fromReservoir: boolean;
  /** Projectiles this tick's shot fired: more than 1 for a spread (008), 0 with no shot. */
  shotCount: number;
}

export function createTube(): TubeState {
  return { ammoId: STARTING_AMMO, fireCooldown: 0, meleeCooldown: 0, firing: false, fromReservoir: false, shotCount: 0 };
}

/** The item a round of the slot's ammo is. */
export function slotItem(tube: Pick<TubeState, 'ammoId'>): string {
  return ammoDef(tube.ammoId).itemId;
}

/** Switches the slot to another ammo. The current ammo, or one the slot can't take, does nothing. */
export function selectAmmo(state: SimState, ammoId: string): void {
  const { tube } = state;
  if (ammoId === tube.ammoId || !SLOT_AMMOS.includes(ammoId)) return;
  tube.ammoId = ammoId;
  state.events.selects.push({ ammoId });
}

/**
 * What the hotbar slot shows: the carried count while any is carried, else the
 * reservoir's count if it holds the slot's ammo (fired from the foundry), else 0.
 */
export function slotCount(state: Pick<SimState, 'tube' | 'inventory' | 'link'>): { count: number; fromReservoir: boolean } {
  const item = slotItem(state.tube);
  const carried = count(state.inventory, item);
  if (carried > 0) return { count: carried, fromReservoir: false };
  const { reservoir } = state.link;
  if (reservoir.itemId === item && reservoir.count > 0) return { count: reservoir.count, fromReservoir: true };
  return { count: 0, fromReservoir: false };
}

/**
 * The next fire press has something to fire (023): the tube is in hand and a
 * round of the slot's ammo is carried or in the reservoir. Without one, fire punches.
 */
export function hasRoundToFire(state: Pick<SimState, 'hasTube' | 'tube' | 'inventory' | 'link'>): boolean {
  return state.hasTube && slotCount(state).count > 0;
}

/** The walk multiplier from the tube (016): slower while it really fires, by last tick's state. */
export function firingWalkScale(state: Pick<SimState, 'tube'>): number {
  return isFiringHeavy(state.tube) ? FIRING_WALK_MULTIPLIER : 1;
}

/** The tube is really firing (016): fire held with a round to fire; not a punch, the foundry or a roll. */
export function isFiringHeavy(tube: Pick<TubeState, 'firing'>): boolean {
  return tube.firing;
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

/** Takes one round of the slot's ammo: carried first, then the reservoir. Returns where it came from. */
function takeRound(state: SimState): 'inventory' | 'reservoir' | null {
  const item = slotItem(state.tube);
  if (take(state.inventory, item)) return 'inventory';
  if (takeFromReservoir(state.link, item)) return 'reservoir';
  return null;
}

/** Fires a round along the unit aim (dx, dy) once the interval has passed. The caller has checked there's one to fire. */
function fire(state: SimState, cmd: Command, dx: number, dy: number): void {
  const { tube } = state;
  if (tube.fireCooldown > 0) return;
  const ammo = ammoDef(tube.ammoId);
  const source = takeRound(state);
  if (!source) return;
  tube.fireCooldown = ammo.fireTicks;
  tube.fromReservoir = source === 'reservoir';
  // A reservoir shot fires one projectile per stream, each costing a round; carried rounds never spread.
  const streams = tube.fromReservoir ? intakeStreams(state.foundry) : [];
  const angles = streams.length > 0 ? streams : [0];
  let fired = 0;
  for (const angle of angles) {
    if (fired > 0 && !takeFromReservoir(state.link, slotItem(tube))) break;
    launch(state, ammo.id, rotate(dx, dy, angle), cmd);
    fired += 1;
  }
  tube.shotCount = fired;
}

/** Sends one projectile of the ammo along `dir` from the tube's mouth. A bomb lands at the aim's distance. */
function launch(state: SimState, ammoId: string, [dx, dy]: [number, number], cmd: Command): void {
  const { player } = state;
  const muzzle = { x: player.x + dx * MUZZLE_OFFSET, y: player.y + dy * MUZZLE_OFFSET };
  state.events.shots.push({ ...muzzle, ammoId });
  if (ammoDef(ammoId).kind === 'lob') {
    throwBomb(state, ammoId, muzzle, player, { x: cmd.aimX, y: cmd.aimY }, [dx, dy]);
    return;
  }
  state.arrows.push(createArrow(state.nextArrowId++, ammoId, state.roomId, muzzle.x, muzzle.y, dx, dy));
}
