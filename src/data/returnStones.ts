import { BOSS_ARENAS, type BossArena } from './arenas';
import { TILE_SIZE } from './config';
import type { TilePos } from './tiles';

// Boss return points (072: "a KO means foundry, fast travel, door"): a return waystone just outside each boss
// arena's door. Dormant until the player first walks within reach of it outside the arena, then woken for good and in
// fast travel's destinations, named after its arena. A travel point only: no safe zone, deposit or supply, and no XP.
// The rules are in src/sim/returnStones.ts and src/sim/claims.ts. Tiles throughout.

/** One return waystone: its arena, where it stands (solid, on open floor) and the tile travel lands the player on. */
export interface ReturnStoneDef {
  readonly id: string;
  /** Its arena's id (src/data/arenas.ts). */
  readonly arena: string;
  /** Its name in the travel menus: its arena's and "door" (072: "Sunken Forum door"). */
  readonly name: string;
  readonly tx: number;
  readonly ty: number;
  /**
   * Where travel to it stands the player: the floor tile beside it on the side away from its door (west), out of the
   * door's E reach so E there is the stone's, and never behind the stone's sprite. (A pylon's travel lands one below the
   * pylon; below the Forum's stone is in its door's reach, and above it the stone hides the player.)
   */
  readonly arrive: TilePos;
}

/** The stones' tuning values. */
export const RETURN_STONE = {
  /** How close the player's feet box must come to the stone to wake it, px: 2.5 tiles, so walking out of the door wakes it. */
  wakeReach: TILE_SIZE * 2.5,
  /** Packs never spawn within this many tiles of a stone (072: arriving isn't an ambush). */
  packMargin: 5,
} as const;

/** A stone outside an arena's door, `dx` tiles across from the door's `leaveTo` (west), on its row. */
function stoneBy(arena: BossArena, dx: number): ReturnStoneDef {
  const tx = arena.door.leaveTo.tx + dx;
  const ty = arena.door.leaveTo.ty;
  return { id: `${arena.id}-waystone`, arena: arena.id, name: `${arena.name} door`, tx, ty, arrive: { tx: tx - 1, ty } };
}

/**
 * The three return stones, in BOSS_ARENAS order (the Warden's shrine has none): each three tiles west of its door's
 * `leaveTo`, off the door's span and off the road that comes to it (the Forum's from the north-east, the Anvil Hall's
 * and the Crown Spire's from the south-west).
 */
export const RETURN_STONES: readonly ReturnStoneDef[] = BOSS_ARENAS.map((a) => stoneBy(a, -3));

/** A return stone by id; throws for an unknown one. */
export function returnStoneDef(id: string): ReturnStoneDef {
  const def = RETURN_STONES.find((s) => s.id === id);
  if (!def) throw new Error(`Unknown return stone '${id}'`);
  return def;
}
