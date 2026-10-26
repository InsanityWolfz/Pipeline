// The rare drops that feed research (033): machine parts and schematics. Starting
// values from spec 033 and Shaun's decisions (B, F); tune in playtest. The rules are
// in src/sim/drops.ts and src/sim/schematics.ts.

/**
 * How far out, in tiles, a corpse over solid ground looks for open ground to drop its loot on (065: a flier killed
 * over a rock or a chasm, 065.3); past it, the loot lands where it fell.
 */
export const LANDING_REACH = 8;

/**
 * A drop table's rare entry naming this item means "one schematic", picked when it lands from those still lost
 * (not revealed, carried, on the ground or in the stash) whose regions allow the room it lands in; nothing when
 * none is (no duplicates).
 */
export const ANY_SCHEMATIC = 'any-schematic';

/** A separate roll on every enemy's death (champions at their own rate); the Ruined Cache uses its own table's 20%. */
export const SCHEMATIC_CHANCE = { enemy: 0.01, champion: 0.05 } as const;

/** The regions each schematic can drop in: Reservoir II only in Region 2 (034, Stonefall Hollows); 061: machine speed in the Emberworks (Region 3) too, and (065) the Stormcrown (Region 4). */
export const SCHEMATIC_REGIONS: Readonly<Record<string, readonly number[]>> = {
  'schematic-reservoir-2': [2],
  'schematic-machine-speed': [1, 2, 3, 4],
};

/** Which region a room is in; a room not listed is in DEFAULT_REGION. The overworld's west columns are Region 2 (034: src/sim/regions.ts). */
export const ROOM_REGIONS: Readonly<Record<string, number>> = { overworld: 1, foundry: 1 };
export const DEFAULT_REGION = 1;

/** A rare entry rolled once per death (032), at `championChance` for a champion. */
export interface RarePart {
  itemId: string;
  chance: number;
  championChance?: number;
}

/** Region 1's machine part: Husks and Wisps drop it at 4%, a champion rolls it once at 12% (3×). */
export const REGION_1_PART: RarePart = { itemId: 'ancient-gear', chance: 0.04, championChance: 0.12 };

/** Region 2's machine part (033, 035): Stonefall Hollows' enemies drop it at 4%, a champion rolls it once at 12% (3×, as Region 1's). */
export const REGION_2_PART: RarePart = { itemId: 'aqueduct-valve', chance: 0.04, championChance: 0.12 };

/** Region 3's machine part (060, 061): the Emberworks' enemies drop the forge rivet at 4%, a champion rolls it once at 12% (3×, as the others'). */
export const REGION_3_PART: RarePart = { itemId: 'forge-rivet', chance: 0.04, championChance: 0.12 };

/** Region 4's machine part (064, 065): the Stormcrown's enemies drop the storm coil at 4%, a champion rolls it once at 12% (3×, as the others'). */
export const REGION_4_PART: RarePart = { itemId: 'storm-coil', chance: 0.04, championChance: 0.12 };

/** The Ruined Cache's rare entries (032's empty slot): its part at 50%, and a schematic at 20%. */
export const CACHE_RARE: readonly RarePart[] = [
  { itemId: 'ancient-gear', chance: 0.5 },
  { itemId: ANY_SCHEMATIC, chance: 0.2 },
];
