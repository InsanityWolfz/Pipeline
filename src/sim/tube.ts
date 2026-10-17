import { AMMO } from '../data/ammo';
import { DRY_FIRE_TICKS, FIRE_TICKS, LOAD_TICKS, MUZZLE_OFFSET, SLOT_AMMO, TUBE_CAPACITY } from '../data/tube';
import { createArrow } from './arrows';
import { aimFacing, facingVector, unit } from './direction';
import type { Command } from './input';
import { count, take } from './inventory';
import { isRolling } from './movement';
import type { SimState } from './state';

// The dormant tube: hand-loading rounds from the inventory and firing them.

export interface TubeState {
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
  return { loaded: 0, loading: false, loadProgress: 0, fireCooldown: 0, dryFire: 0, firing: false };
}

/** The item a slot-1 round is loaded from. */
export function slotItem(): string {
  const ammo = AMMO[SLOT_AMMO];
  if (!ammo) throw new Error(`Unknown slot ammo '${SLOT_AMMO}'`);
  return ammo.itemId;
}

/** Runs after the player has moved this tick, so shots leave from where they stand now. */
export function stepTube(state: SimState, cmd: Command): void {
  const { tube, player } = state;
  player.aimX = cmd.aimX;
  player.aimY = cmd.aimY;
  if (tube.fireCooldown > 0) tube.fireCooldown -= 1;
  if (tube.dryFire > 0) tube.dryFire -= 1;

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
  tube.fireCooldown = FIRE_TICKS;
  if (tube.loaded === 0) {
    tube.dryFire = DRY_FIRE_TICKS;
    return;
  }
  tube.loaded -= 1;
  const x = player.x + dx * MUZZLE_OFFSET;
  const y = player.y + dy * MUZZLE_OFFSET;
  state.arrows.push(createArrow(state.nextArrowId++, SLOT_AMMO, x, y, dx, dy));
}

function canLoad(state: SimState): boolean {
  const { tube } = state;
  return !tube.loading && tube.loaded < TUBE_CAPACITY && count(state.inventory, slotItem()) > 0;
}

function advanceLoading(state: SimState): void {
  const { tube } = state;
  tube.loadProgress += 1;
  if (tube.loadProgress < LOAD_TICKS) return;
  tube.loadProgress = 0;
  if (take(state.inventory, slotItem())) tube.loaded += 1;
  if (tube.loaded >= TUBE_CAPACITY || count(state.inventory, slotItem()) === 0) tube.loading = false;
}

/** Ends loading; partial progress on the next round is lost and that round stays in the inventory. */
function stopLoading(state: SimState): void {
  state.tube.loading = false;
  state.tube.loadProgress = 0;
}
