import { ammoDef } from '../data/ammo';
import { DRY_FIRE_TICKS, MUZZLE_OFFSET, SLOT_AMMOS, STARTING_AMMO } from '../data/tube';
import { createArrow } from './arrows';
import { throwBomb } from './bombs';
import { aimFacing, facingVector, unit } from './direction';
import type { Command } from './input';
import { count, take } from './inventory';
import { takeFromReservoir } from './link';
import { isRolling } from './movement';
import type { SimState } from './state';

// The tube: picking the slot's ammo and firing it. Carried rounds fire straight
// from the inventory; once they run out, the linked tube fires from its reservoir.

export interface TubeState {
  /** The ammo hotbar slot 1 fires. */
  ammoId: string;
  /** Ticks before the next shot or dry fire can happen. */
  fireCooldown: number;
  /** Ticks left on the dry-fire flag. */
  dryFire: number;
  /** Fire was held this tick and the player could fire (not rolling). */
  firing: boolean;
  /** This tick's shot came from the reservoir. */
  fromReservoir: boolean;
}

export function createTube(): TubeState {
  return { ammoId: STARTING_AMMO, fireCooldown: 0, dryFire: 0, firing: false, fromReservoir: false };
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
  const carried = count(state.inventory, slotItem(state.tube));
  if (carried > 0) return { count: carried, fromReservoir: false };
  const { reservoir } = state.link;
  if (reservoir.ammoId === state.tube.ammoId && reservoir.count > 0) return { count: reservoir.count, fromReservoir: true };
  return { count: 0, fromReservoir: false };
}

/** Runs after the player has moved this tick, so shots leave from where they stand now. */
export function stepTube(state: SimState, cmd: Command): void {
  const { tube, player } = state;
  player.aimX = cmd.aimX;
  player.aimY = cmd.aimY;
  if (tube.fireCooldown > 0) tube.fireCooldown -= 1;
  if (tube.dryFire > 0) tube.dryFire -= 1;
  if (cmd.selectAmmo !== null) selectAmmo(state, cmd.selectAmmo);

  tube.firing = false;
  tube.fromReservoir = false;
  if (isRolling(player) || !cmd.fire) return;
  tube.firing = true;
  fire(state, cmd);
}

/** Takes one round of the slot's ammo: carried first, then the reservoir. Returns where it came from. */
function takeRound(state: SimState): 'inventory' | 'reservoir' | null {
  if (take(state.inventory, slotItem(state.tube))) return 'inventory';
  if (takeFromReservoir(state.link, state.tube.ammoId)) return 'reservoir';
  return null;
}

function fire(state: SimState, cmd: Command): void {
  const { tube, player } = state;
  const aim = unit(cmd.aimX - player.x, cmd.aimY - player.y);
  const [dx, dy] = aim[0] === 0 && aim[1] === 0 ? facingVector(player.facing) : aim;
  player.facing = aimFacing(dx, dy, player.facing);
  if (tube.fireCooldown > 0) return;
  const ammo = ammoDef(tube.ammoId);
  tube.fireCooldown = ammo.fireTicks;
  const source = takeRound(state);
  if (!source) {
    tube.dryFire = DRY_FIRE_TICKS;
    return;
  }
  tube.fromReservoir = source === 'reservoir';
  const muzzle = { x: player.x + dx * MUZZLE_OFFSET, y: player.y + dy * MUZZLE_OFFSET };
  if (ammo.kind === 'lob') {
    throwBomb(state, ammo.id, muzzle, player, { x: cmd.aimX, y: cmd.aimY }, [dx, dy]);
    return;
  }
  state.arrows.push(createArrow(state.nextArrowId++, ammo.id, state.roomId, muzzle.x, muzzle.y, dx, dy));
}
