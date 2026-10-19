import { ITEMS } from './items';
import type { StartDef } from './player';
import { RECIPES } from './recipes';
import { STAGE_RECIPES } from './stages';
import { ROUNDS } from './tags';
import { OVERWORLD } from './overworld';
import { DEFAULT_ROOM } from './rooms';

// The `?playtest` start (spec 007): plenty of everything and every machine
// unlocked, so playtests skip the gathering; since 012 it also holds the tube,
// already attuned, with every tutorial gate open. Since 029 every stage is unlocked
// too (its recipe counts as hand-made), and rime shards come with the other raws;
// tagged rounds aren't carried, so playtest fire stays plain until the bench or a stage makes them.
// Counts are tuning values.

const AMMO_COUNT = 99;
const RAW_COUNT = 99;
const PART_COUNT = 20;
const ARMOR_COUNT = 3;

const COUNTS = { ammo: AMMO_COUNT, raw: RAW_COUNT, part: PART_COUNT, armor: ARMOR_COUNT, schematic: 1 } as const;

/**
 * Items with their own count (033): enough cores, parts and one of each schematic to restore every node by hand.
 * Warden cores are rare; one restores an entrance, the rest are spares for testing.
 */
const OVERRIDES: Readonly<Record<string, number>> = { 'warden-core': 5, 'bulwark-core': 2, 'ancient-gear': 10, 'aqueduct-valve': 10 };

export const PLAYTEST_START: StartDef = {
  room: DEFAULT_ROOM,
  // At the start stone, with the land already full of packs (017).
  spawn: OVERWORLD.wake,
  populated: true,
  hasTube: true,
  attuned: true,
  gatesOpen: true,
  inventory: Object.fromEntries(Object.values(ITEMS).filter((it) => !ROUNDS.includes(it.id)).map((it) => [it.id, OVERRIDES[it.id] ?? COUNTS[it.kind]])),
  crafted: [...new Set([...Object.values(RECIPES), ...Object.values(STAGE_RECIPES)].map((r) => r.output.itemId))].sort(),
};
