import { INTAKE, INTAKE_REACH, OPEN_ENTRANCES_COST } from '../data/foundry';
import { FEET_BOX } from '../data/player';
import { FOUNDRY_ROOM } from '../data/rooms';
import { TILE_SIZE } from '../data/config';
import { count } from './inventory';
import { frontTile, sameTile, sideTile, sortSide, type FoundryState } from './pieces';
import type { SimState } from './state';

// The foundry intake (019, 024): which lines feed it, and opening its side
// entrances. E at the intake while carrying a warden core spends it and opens
// both capped side entrances for good.

const isEntrance = (t: { tx: number; ty: number }): boolean => INTAKE.entrances.some((m) => sameTile(t, m));

/** A line feeds the intake: some piece that hands items on (not a hopper or crate) has a mouth tile as its front, or a sorter as its side exit. */
export function feedsIntake(foundry: FoundryState): boolean {
  return foundry.pieces.some((p) => {
    if (p.kind === 'hopper' || p.kind === 'crate') return false;
    return isEntrance(frontTile(p)) || (p.kind === 'sorter' && isEntrance(sideTile(p, sortSide(p))));
  });
}

/** The player's feet box is within INTAKE_REACH of the intake's mouth (the three wall tiles), in the foundry. */
export function intakeInReach(state: Pick<SimState, 'roomId' | 'player'>): boolean {
  if (state.roomId !== FOUNDRY_ROOM) return false;
  const xs = INTAKE.entrances.map((e) => e.tx);
  const left = Math.min(...xs) * TILE_SIZE;
  const right = (Math.max(...xs) + 1) * TILE_SIZE;
  const top = Math.min(...INTAKE.entrances.map((e) => e.ty)) * TILE_SIZE;
  const bottom = (Math.max(...INTAKE.entrances.map((e) => e.ty)) + 1) * TILE_SIZE;
  const { x, y } = state.player;
  const gapX = Math.max(0, left - (x + FEET_BOX.w / 2), x - FEET_BOX.w / 2 - right);
  const gapY = Math.max(0, top - (y + FEET_BOX.h / 2), y - FEET_BOX.h / 2 - bottom);
  return Math.hypot(gapX, gapY) <= INTAKE_REACH;
}

/** A side entrance is still capped, and the player carries what opening them costs, once the tube is attuned. Reach aside. */
export function intakeCanOpen(state: Pick<SimState, 'roomId' | 'link' | 'inventory'>): boolean {
  if (state.roomId !== FOUNDRY_ROOM || !state.link.attuned) return false;
  if (state.link.entrances.every((e) => e.open)) return false;
  return Object.entries(OPEN_ENTRANCES_COST).every(([itemId, n]) => count(state.inventory, itemId) >= n);
}

/** E would open the side entrances right now. */
export function intakeOpenable(state: Pick<SimState, 'roomId' | 'link' | 'inventory' | 'player'>): boolean {
  return intakeCanOpen(state) && intakeInReach(state);
}

/** Spends the cost and opens every capped entrance for good, recording which. The caller has checked `intakeOpenable`. */
export function openSideEntrances(state: SimState): void {
  for (const [itemId, n] of Object.entries(OPEN_ENTRANCES_COST)) state.inventory[itemId] = count(state.inventory, itemId) - n;
  const opened = state.link.entrances.flatMap((e, i) => (e.open ? [] : [i]));
  for (const i of opened) {
    const e = state.link.entrances[i];
    if (e) e.open = true;
  }
  state.events.intakeOpens.push({ entrances: opened });
}
