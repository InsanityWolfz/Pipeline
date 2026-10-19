// The rare drops that feed research (033): machine parts and schematics. Starting
// values from spec 033 and Shaun's decisions (B, F); tune in playtest. The rules are
// in src/sim/drops.ts and src/sim/schematics.ts.

/**
 * A drop table's rare entry naming this item means "one schematic", picked when it lands from those still lost
 * (not revealed, carried, on the ground or in the stash) whose regions allow the room it lands in; nothing when
 * none is (no duplicates).
 */
export const ANY_SCHEMATIC = 'any-schematic';

/** A separate roll on every enemy's death (champions at their own rate); the Ruined Cache uses its own table's 20%. */
export const SCHEMATIC_CHANCE = { enemy: 0.01, champion: 0.05 } as const;

/** The regions each schematic can drop in: Reservoir II only in Region 2 (034, Stonefall Hollows). */
export const SCHEMATIC_REGIONS: Readonly<Record<string, readonly number[]>> = {
  'schematic-reservoir-2': [2],
  'schematic-machine-speed': [1, 2],
  'schematic-splitter': [1, 2],
  'schematic-merger': [1, 2],
};

/** Which region a room is in (034 adds Region 2's). */
export const ROOM_REGIONS: Readonly<Record<string, number>> = { overworld: 1, foundry: 1 };

/** A rare entry rolled once per death (032), at `championChance` for a champion. */
export interface RarePart {
  itemId: string;
  chance: number;
  championChance?: number;
}

/** Region 1's machine part: Husks and Wisps drop it at 4%, a champion rolls it once at 12% (3×). */
export const REGION_1_PART: RarePart = { itemId: 'ancient-gear', chance: 0.04, championChance: 0.12 };

/** The Ruined Cache's rare entries (032's empty slot): its part at 50%, and a schematic at 20%. */
export const CACHE_RARE: readonly RarePart[] = [
  { itemId: 'ancient-gear', chance: 0.5 },
  { itemId: ANY_SCHEMATIC, chance: 0.2 },
];
