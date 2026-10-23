import { ANVIL_HALL } from './emberworksSites';
import { HOLLOWS } from './hollows';
import { SHRINE, SHRINE_DOOR, SHRINE_INSIDE } from './home';
import { OVERWORLD_ROOM } from './overworld';
import { SANDBOX_ROOM, type GateId } from './rooms';
import type { TilePos, TileRect } from './tiles';

// The boss arenas (055, D.5, Shaun: "block it off completely… with walls and then put a door… you go in, you can leave
// out the door if you'd like, but you gotta stay in there and kill him"): the Warden's walled shrine and the Bulwark's
// Sunken Forum, each walled all round with one door. A door is sealed until its gate opens; then E at it goes in, and
// from inside E leaves and the fight resets (043's lock, src/sim/arenaLock.ts). Tiles throughout.

/** An arena's door: tiles in its wall (TILE.arenaDoor, solid to feet and shots) and where E puts the player. */
export interface ArenaDoor {
  readonly tiles: readonly TilePos[];
  /**
   * The floor tile inside, by the door's middle: E from outside stands the player here. Behind a door in a south wall
   * (the shrine's) it is two tiles in, clear of the door's sprite standing over the row above it; behind a door in a
   * north wall (the forum's) it is the tile right below the door. `leaveTo` mirrors this: two tiles out north of a door,
   * one tile out south of it. src/sim/arenaLock.ts steps the player aside if something stands on the tile.
   */
  readonly enterTo: TilePos;
  /** The floor tile outside, by the door's middle: E from inside stands the player here (two tiles out north of the door). */
  readonly leaveTo: TilePos;
  /** How close the player's feet box must be to a door tile for E, px. */
  readonly reach: number;
  /** The gate whose opening unlocks it (src/sim/tutorial.ts). */
  readonly unlock: GateId;
  /** Its hover name, and its hover line while sealed (055.1; 059: "Sealed", and none once open). */
  readonly name: string;
  readonly sealed: string;
}

/** A boss arena. `rooms`: the rooms it stands in, at the same tiles (the forum is in the sandbox's room too, 044). */
export interface ArenaDef {
  readonly id: string;
  readonly name: string;
  /** Its boss's enemy id; the boss is the one in the arena's group (its id), or any in the sandbox. */
  readonly boss: string;
  readonly bounds: TileRect;
  /** The floor within its walls: the player here is inside. */
  readonly inside: TileRect;
  readonly door: ArenaDoor;
  readonly rooms: readonly string[];
}

/**
 * A region boss's arena (034, 060): an arena whose boss's first kill is a boss defeat, with an altar that summons it
 * again for `offering` (carried), rising at `start` after `summonTicks`. `addTiles`: where its adds rise (041: the
 * Bulwark's), if it has any.
 */
export interface BossArena extends ArenaDef {
  readonly start: TilePos;
  readonly altar: { readonly id: string; readonly tx: number; readonly ty: number };
  readonly offering: Readonly<Record<string, number>>;
  readonly summonTicks: number;
  readonly addTiles?: readonly TilePos[];
}

/** The middle tile of the shrine's door. */
const SHRINE_DOOR_MID: TilePos = SHRINE_DOOR[Math.floor(SHRINE_DOOR.length / 2)] ?? { tx: 0, ty: 0 };

/** The Pylon Warden's arena: the walled shrine round its pylon (009, 012, 017), its door where 012's gate was. */
export const SHRINE_ARENA: ArenaDef = {
  id: 'shrine',
  name: 'Shrine',
  boss: 'pylon-warden',
  bounds: SHRINE,
  inside: SHRINE_INSIDE,
  door: {
    tiles: SHRINE_DOOR,
    enterTo: { tx: SHRINE_DOOR_MID.tx, ty: SHRINE_DOOR_MID.ty - 2 },
    leaveTo: { tx: SHRINE_DOOR_MID.tx, ty: SHRINE_DOOR_MID.ty + 1 },
    reach: HOLLOWS.arena.door.reach,
    // 012's shrine gate: open once the first line fills the tube (see the spec's 055.3).
    unlock: 'shrine',
    name: 'Shrine door',
    sealed: 'Sealed',
  },
  rooms: [OVERWORLD_ROOM],
};

/** The Bulwark's Sunken Forum (034), in the Hollows and in the sandbox's room. */
export const FORUM_ARENA = { ...HOLLOWS.arena, rooms: [OVERWORLD_ROOM, SANDBOX_ROOM] as readonly string[] } satisfies BossArena;

/** 060: the Forgewright's Anvil Hall, in the Emberworks. */
export const ANVIL_ARENA = { ...ANVIL_HALL, rooms: [OVERWORLD_ROOM] as readonly string[] } satisfies BossArena;

/** Every arena with a door, the Warden's first. */
export const ARENAS: readonly ArenaDef[] = [SHRINE_ARENA, FORUM_ARENA, ANVIL_ARENA];

/** The region bosses' arenas (034, 060), each with its altar: the Warden's shrine has none. */
export const BOSS_ARENAS: readonly BossArena[] = [FORUM_ARENA, ANVIL_ARENA];

/** The arena whose boss is this enemy (034: the Bulwark's Sunken Forum; 060: the Forgewright's Anvil Hall), if any. */
export const arenaOf = (enemyId: string): BossArena | undefined => BOSS_ARENAS.find((a) => a.boss === enemyId);

/** The arena whose altar this is (034, 060), if any. */
export const arenaOfAltar = (altarId: string): BossArena | undefined => BOSS_ARENAS.find((a) => a.altar.id === altarId);
