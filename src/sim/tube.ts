import { ammoDef } from '../data/ammo';
import { DRY_FIRE_TICKS, MUZZLE_OFFSET, SLOT_AMMOS, STARTING_AMMO } from '../data/tube';
import { createArrow } from './arrows';
import { throwBomb } from './bombs';
import { aimFacing, facingVector, unit } from './direction';
import type { Command } from './input';
import { count, take } from './inventory';
import { takeFromReservoir } from './link';
import { isRolling } from './movement';
import { rotate, socketStreams } from './spread';
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
  /** Projectiles this tick's shot fired: more than 1 for a spread (008), 0 with no shot. */
  shotCount: number;
}

export function createTube(): TubeState {
  return { ammoId: STARTING_AMMO, fireCooldown: 0, dryFire: 0, firing: false, fromReservoir: false, shotCount: 0 };
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

/** Runs after the player has moved this tick, so shots leave from where they stand now. */
export function stepTube(state: SimState, cmd: Command): void {
  const { tube, player } = state;
  player.aimX = cmd.aimX;
  player.aimY = cmd.aimY;
  if (tube.fireCooldown > 0) tube.fireCooldown -= 1;
  if (tube.dryFire > 0) tube.dryFire -= 1;
  // Without the tube (012) there's nothing to switch or fire.
  if (!state.hasTube) {
    tube.firing = false;
    tube.fromReservoir = false;
    tube.shotCount = 0;
    return;
  }
  if (cmd.selectAmmo !== null) selectAmmo(state, cmd.selectAmmo);

  tube.firing = false;
  tube.fromReservoir = false;
  tube.shotCount = 0;
  if (isRolling(player) || !cmd.fire) return;
  tube.firing = true;
  fire(state, cmd);
}

/** Takes one round of the slot's ammo: carried first, then the reservoir. Returns where it came from. */
function takeRound(state: SimState): 'inventory' | 'reservoir' | null {
  const item = slotItem(state.tube);
  if (take(state.inventory, item)) return 'inventory';
  if (takeFromReservoir(state.link, item)) return 'reservoir';
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
  // A reservoir shot fires one projectile per stream, each costing a round; carried rounds never spread.
  const streams = tube.fromReservoir ? socketStreams(state.foundry) : [];
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
