import { ammoDef } from '../data/ammo';
import { DRY_FIRE_TICKS, LOAD_TICKS, MUZZLE_OFFSET, SLOT_AMMOS, STARTING_AMMO, TUBE_CAPACITY } from '../data/tube';
import { createArrow } from './arrows';
import { throwBomb } from './bombs';
import { aimFacing, facingVector, unit } from './direction';
import type { Command } from './input';
import { count, take } from './inventory';
import { isRolling } from './movement';
import type { SimState } from './state';

// The dormant tube: picking the slot's ammo, hand-loading rounds from the
// inventory and firing them.

export interface TubeState {
  /** The ammo hotbar slot 1 loads and fires. */
  ammoId: string;
  /** Rounds loaded and ready to fire. */
  loaded: number;
  loading: boolean;
  /** Ticks spent on the round being loaded, 0..LOAD_TICKS-1. */
  loadProgress: number;
  /** Ticks before the next shot or dry fire can happen. */
  fireCooldown: number;
  /** Ticks left on the dry-fire flag. */
  dryFire: number;
  /** Fire was held this tick and the player could fire (not rolling). */
  firing: boolean;
}

export function createTube(): TubeState {
  return { ammoId: STARTING_AMMO, loaded: 0, loading: false, loadProgress: 0, fireCooldown: 0, dryFire: 0, firing: false };
}

/** The item a round of the slot's ammo is loaded from. */
export function slotItem(tube: Pick<TubeState, 'ammoId'>): string {
  return ammoDef(tube.ammoId).itemId;
}

/**
 * Switches the slot to another ammo: loaded rounds go back to the inventory as
 * the old ammo's item and loading stops. The current ammo, or one the slot
 * can't take, does nothing.
 */
export function selectAmmo(state: SimState, ammoId: string): void {
  const { tube } = state;
  if (ammoId === tube.ammoId || !SLOT_AMMOS.includes(ammoId)) return;
  const item = slotItem(tube);
  state.inventory[item] = count(state.inventory, item) + tube.loaded;
  tube.loaded = 0;
  stopLoading(state);
  tube.ammoId = ammoId;
  state.events.selects.push({ ammoId });
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
  if (isRolling(player)) {
    stopLoading(state);
    return;
  }
  if (cmd.fire) {
    tube.firing = true;
    stopLoading(state);
    fire(state, cmd);
    return;
  }
  if (cmd.load && canLoad(state)) {
    tube.loading = true;
    tube.loadProgress = 0;
  }
  if (tube.loading) advanceLoading(state);
}

function fire(state: SimState, cmd: Command): void {
  const { tube, player } = state;
  const aim = unit(cmd.aimX - player.x, cmd.aimY - player.y);
  const [dx, dy] = aim[0] === 0 && aim[1] === 0 ? facingVector(player.facing) : aim;
  player.facing = aimFacing(dx, dy, player.facing);
  if (tube.fireCooldown > 0) return;
  const ammo = ammoDef(tube.ammoId);
  tube.fireCooldown = ammo.fireTicks;
  if (tube.loaded === 0) {
    tube.dryFire = DRY_FIRE_TICKS;
    return;
  }
  tube.loaded -= 1;
  const muzzle = { x: player.x + dx * MUZZLE_OFFSET, y: player.y + dy * MUZZLE_OFFSET };
  if (ammo.kind === 'lob') {
    throwBomb(state, ammo.id, muzzle, player, { x: cmd.aimX, y: cmd.aimY }, [dx, dy]);
    return;
  }
  state.arrows.push(createArrow(state.nextArrowId++, ammo.id, muzzle.x, muzzle.y, dx, dy));
}

function canLoad(state: SimState): boolean {
  const { tube } = state;
  return !tube.loading && tube.loaded < TUBE_CAPACITY && count(state.inventory, slotItem(tube)) > 0;
}

function advanceLoading(state: SimState): void {
  const { tube } = state;
  tube.loadProgress += 1;
  if (tube.loadProgress < LOAD_TICKS) return;
  tube.loadProgress = 0;
  if (take(state.inventory, slotItem(tube))) tube.loaded += 1;
  if (tube.loaded >= TUBE_CAPACITY || count(state.inventory, slotItem(tube)) === 0) tube.loading = false;
}

/** Ends loading; partial progress on the next round is lost and that round stays in the inventory. */
export function stopLoading(state: SimState): void {
  state.tube.loading = false;
  state.tube.loadProgress = 0;
}
