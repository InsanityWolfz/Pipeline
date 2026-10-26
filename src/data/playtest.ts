import { ITEMS } from './items';
import type { StartDef } from './player';
import { RECIPES } from './recipes';
import { STAGE_ROWS } from './stages';
import { ROUNDS } from './tags';
import { HOLLOWS } from './hollows';
import { OVERWORLD } from './overworld';
import { DEFAULT_ROOM } from './rooms';
import type { GearPiece } from './gear';
import { WARDSTONE } from './relics';

// The `?playtest` start (spec 007): plenty of everything and every machine
// unlocked, so playtests skip the gathering; since 012 it also holds the tube,
// already attuned, with every tutorial gate open. Since 029 every stage is unlocked
// too (its recipe counts as hand-made), and rimestone come with the other raws;
// tagged rounds aren't carried, so playtest fire stays plain until the bench or a stage makes them.
// Since 036 it carries identified gear too: a Rare piece per slot and a relic.
// Counts are tuning values.

const AMMO_COUNT = 99;
const RAW_COUNT = 99;
const PART_COUNT = 20;
const ARMOR_COUNT = 3;

const COUNTS = { ammo: AMMO_COUNT, raw: RAW_COUNT, part: PART_COUNT, armor: ARMOR_COUNT, schematic: 1 } as const;

/** 064: one stack of stormglass (a raw's is two), so its cores keep to the bag's first screen (062.15's rule). */
const KIT_STORMGLASS = { stormglass: 50 } as const;

/**
 * Items with their own count (033): enough cores, parts and one of each schematic to restore every node by hand.
 * Warden cores are rare; one restores an entrance, the rest are spares for testing.
 */
const OVERRIDES: Readonly<Record<string, number>> = { 'warden-core': 5, 'bulwark-core': 2, 'ancient-gear': 10, 'aqueduct-valve': 10, ...KIT_STORMGLASS };

/**
 * 062: the material tiers' parts stay out of the kit, which fills the inventory's first screen already (its cores would
 * scroll out of sight). They're smelted, fired and pressed from the raws it carries (ley-iron, cinderite, ley dust).
 * 064: and the storm coil, which nothing spends yet.
 */
export const LEFT_OUT_OF_KIT: readonly string[] = ['ley-steel', 'ley-glass', 'steel-arrowhead', 'steel-casing', 'steel-plate', 'storm-coil'];

/**
 * Identified gear the playtest carries (036), none worn: a Rare piece in each slot and a relic, so the bench's panel
 * and every effect can be tried at once. Values sit inside the spec's ranges.
 */
export const PLAYTEST_GEAR: readonly GearPiece[] = [
  { id: 0, slot: 'helm', rarity: 'rare', weight: null, baseArmor: 2, relic: null, name: 'Rune-cut Helm', affixes: [{ kind: 'max-health', value: 14 }, { kind: 'regen', value: 0.5 }, { kind: 'armor', value: 2 }] },
  { id: 1, slot: 'body', rarity: 'rare', weight: 'heavy', baseArmor: 12, relic: null, name: 'Granite Plate', affixes: [{ kind: 'armor', value: 3 }, { kind: 'max-health', value: 16 }, { kind: 'roll-distance', value: 0.12 }] },
  { id: 2, slot: 'boots', rarity: 'rare', weight: null, baseArmor: 1, relic: null, name: 'Supple Treads', affixes: [{ kind: 'move-speed', value: 0.05 }, { kind: 'roll-cooldown', value: -0.17 }, { kind: 'roll-distance', value: 0.1 }] },
  { id: 3, slot: 'trinket', rarity: 'rare', weight: null, baseArmor: 0, relic: null, name: 'Ley-touched Charm', affixes: [{ kind: 'regen', value: 0.6 }, { kind: 'max-health', value: 10 }, { kind: 'move-speed', value: 0.04 }] },
  { id: 4, slot: WARDSTONE.slot, rarity: 'relic', weight: WARDSTONE.weight, baseArmor: 1, relic: WARDSTONE.id, name: WARDSTONE.name, affixes: [{ kind: 'max-health', value: 10 }, { kind: 'roll-cooldown', value: -0.13 }] },
];

/** Every item a recipe or a bench stage row makes, sorted: counted as hand-made, so every machine and stage is unlocked (029). */
export const ALL_CRAFTED: readonly string[] = [...new Set([...Object.values(RECIPES), ...STAGE_ROWS.map((r) => r.recipe)].map((r) => r.output.itemId))].sort();

export const PLAYTEST_START: StartDef = {
  room: DEFAULT_ROOM,
  // At the start stone, with the land already full of packs (017).
  spawn: OVERWORLD.wake,
  populated: true,
  hasTube: true,
  attuned: true,
  gatesOpen: true,
  inventory: Object.fromEntries(Object.values(ITEMS).filter((it) => !ROUNDS.includes(it.id) && !LEFT_OUT_OF_KIT.includes(it.id)).map((it) => [it.id, OVERRIDES[it.id] ?? COUNTS[it.kind]])),
  crafted: ALL_CRAFTED,
  gear: PLAYTEST_GEAR,
};

/**
 * `?start=hollows` (034): the playtest kit, standing just inside Stonefall Hollows' gap with the shrine claimed (so the
 * barrier is down and the Cistern Terrace's pylon awake), and the land not yet populated, so tests start calm.
 */
export const HOLLOWS_START: StartDef = { ...PLAYTEST_START, spawn: HOLLOWS.start, populated: false, claims: ['shrine'] };
