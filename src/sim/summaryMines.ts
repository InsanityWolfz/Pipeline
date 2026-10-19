import type { SimState } from './state';
import { round } from './summaryParts';

// 038's part of `getState()`: armed landmines with their fuse, a cluster bomb's bomblets
// on their way, and the revealing items found (the landmine chain's recipes show once
// ley-iron has been carried).

export interface MinesSummary {
  /** Armed landmines in every room: id, room, spot, the fuse burnt and its length, and the burst's damage and radius. */
  mines: { id: number; room: string; x: number; y: number; fuse: number; fuseTicks: number; damage: number; radius: number }[];
  /** Bomblets on their way: id, room, where they land and from where, and ticks left before they burst. */
  bomblets: { id: number; room: string; x: number; y: number; from: { x: number; y: number }; ticks: number; radius: number }[];
  /** Items whose carrying reveals recipes, found so far (ley-iron). */
  found: string[];
}

export function minesSummary(state: SimState): MinesSummary {
  return {
    mines: state.mines.armed.map((m) => ({ id: m.id, room: m.roomId, x: round(m.x), y: round(m.y), fuse: m.fuse, fuseTicks: m.fuseTicks, damage: round(m.damage), radius: m.radius })),
    bomblets: state.mines.bomblets.map((b) => ({ id: b.id, room: b.roomId, x: round(b.x), y: round(b.y), from: { x: round(b.fromX), y: round(b.fromY) }, ticks: b.ticks, radius: b.radius })),
    found: [...state.found],
  };
}
