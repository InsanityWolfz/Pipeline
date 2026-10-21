import { INTAKE, INTAKE_REACH } from '../data/foundry';
import { FEET_BOX } from '../data/player';
import { FOUNDRY_ROOM } from '../data/rooms';
import { TILE_SIZE } from '../data/config';
import { frontTile, sameTile, sideTile, splitSide, type FoundryState } from './pieces';
import type { SimState } from './state';

// The foundry intake (019): which lines feed it, and whether the player is near its
// mouth. Its capped entrances are restored at their caps (033: src/sim/research.ts).

const isEntrance = (t: { tx: number; ty: number }): boolean => INTAKE.entrances.some((m) => sameTile(t, m));

/** A line feeds the intake: some piece that hands items on (not a hopper or crate) has a mouth tile as its front, or a splitter's side exit. */
export function feedsIntake(foundry: FoundryState): boolean {
  return foundry.pieces.some((p) => {
    if (p.kind === 'hopper' || p.kind === 'crate') return false;
    if (isEntrance(frontTile(p))) return true;
    return p.kind === 'splitter' && isEntrance(sideTile(p, splitSide(p)));
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
