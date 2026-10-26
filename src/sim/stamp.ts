import { FOUNDRY_ROOM } from '../data/rooms';
import { blueprintsUnlocked, type BlueprintPiece } from './blueprints';
import { transformBlueprint } from './blueprintTransform';
import { wholeRefusal } from './guided';
import type { PieceState, PlaceFail } from './pieces';
import { canPlace, place } from './placement';
import { stageOf } from './stages';
import type { SimState } from './state';
import type { Command } from './input';
import { pairEnds, pairOnPlace, tunnelReach } from './tunnels';

// Placing a blueprint (063): the taken blueprint, mirrored and turned as its ghost shows, goes down with its box's
// top-left on a tile. Every piece that fits is placed at once, new and empty; the rest are skipped (a taken tile, a
// fixture, a wall or off the floor, a piece not unlocked, the player's feet under a solid piece: placing's own rules).
// Settings come with them: a conduit's corner, a splitter's side, a stage machine's round, and an underground pair's
// link (only while the exit is in the entrance's reach, so never under a wall; else, as for ends whose partner was
// skipped, the usual rule). Needs the Blueprint table; the build lock refuses it whole. Pieces are free, so nothing
// is spent.

/** A blueprint piece on the grid, and why it can't go there (null if it can). */
export interface StampPiece extends BlueprintPiece {
  tx: number;
  ty: number;
  fail: PlaceFail | null;
}

/**
 * Where each of a blueprint's pieces would go with the box's top-left on (tx, ty), mirrored and turned, and why any
 * can't; null with no table, outside the foundry, or no such blueprint.
 */
export function stampPlan(state: SimState, slot: number, tx: number, ty: number, turns: number, mirrored: boolean): StampPiece[] | null {
  const bp = state.blueprints[slot];
  if (!bp || !blueprintsUnlocked(state) || state.roomId !== FOUNDRY_ROOM) return null;
  return transformBlueprint(bp, turns, mirrored).pieces.map((p) => {
    const at = { tx: tx + p.dx, ty: ty + p.dy };
    return { ...p, ...at, fail: canPlace(state, p.pieceId, at.tx, at.ty, p.facing) };
  });
}

/** Stamps a blueprint: every piece that fits, at once. Returns whether anything was tried (refused whole otherwise). */
export function stamp(state: SimState, cmd: NonNullable<Command['stamp']>): boolean {
  const plan = stampPlan(state, cmd.slot, cmd.tx, cmd.ty, cmd.turns, cmd.mirrored);
  if (!plan) return false;
  const refused = wholeRefusal(state);
  const first = plan[0];
  if (refused) {
    if (first) state.events.placeFails.push({ pieceId: first.pieceId, tx: first.tx, ty: first.ty, reason: refused });
    return false;
  }
  // The placed piece for each blueprint piece, by its index (undefined where skipped).
  const placed: (PieceState | undefined)[] = plan.map((p) => {
    if (p.fail) return undefined;
    const shape = { ...(p.inFrom ? { inFrom: p.inFrom } : {}), ...(p.mirrored ? { mirrored: true } : {}) };
    const piece = place(state, p.pieceId, p.tx, p.ty, p.facing, shape, false) ?? undefined;
    if (piece?.kind === 'machine' && p.made !== undefined && stageOf(piece.pieceId)) piece.made = p.made;
    return piece;
  });
  // Linked ends pair with each other first, if the exit is in the entrance's reach (as building by hand needs); an end
  // whose partner was skipped or out of reach then pairs by the usual rule.
  const ends = placed.flatMap((piece, i) => (piece?.kind === 'tunnel-in' || piece?.kind === 'tunnel-out' ? [{ piece, link: plan[i]?.link }] : []));
  for (const { piece, link } of ends) {
    const partner = link !== undefined ? placed[link] : undefined;
    if (piece.kind !== 'tunnel-in' || piece.pair !== null || partner?.kind !== 'tunnel-out' || partner.pair !== null) continue;
    if (tunnelReach(piece).some((t) => t.tx === partner.tx && t.ty === partner.ty)) pairEnds(piece, partner);
  }
  for (const { piece } of ends) if (piece.pair === null) pairOnPlace(state.foundry, piece);
  const down = placed.filter((p) => p !== undefined).length;
  state.events.stamps.push({ slot: cmd.slot, placed: down, skipped: plan.length - down });
  return true;
}
