// Blueprints and area pick-up (063): the area tool's box, the release menu, the blueprint slots and how a blueprint is
// named, and their words. Rules are in src/sim/area.ts, src/sim/blueprints.ts and src/sim/stamp.ts. Tuning values.

/**
 * How many items the stash can hold before an area pick-up is refused whole (063; 069: with the inventory's
 * INVENTORY_CAP, src/data/items.ts, the two together). The stash has no practical limit
 * (052), so this is unbounded: the refusal can't fire today, but the rule is there for a stash that one day fills.
 */
export const STASH_CAP = Number.POSITIVE_INFINITY;

/** The research node whose restoring unlocks saving and placing blueprints (063). */
export const BLUEPRINT_TABLE = 'blueprint-table';

/** Blueprint slots (063: 8). With every slot full, saving asks which to overwrite. */
export const BLUEPRINT_SLOTS = 8;

/** The release menu's rows, top to bottom (063). Save rows show only once the Blueprint table is restored. */
export const AREA_MENU = {
  pickUp: 'Pick up',
  save: 'Save blueprint',
  saveAndPickUp: 'Save and pick up',
  cancel: 'Cancel',
} as const;

/** The rows' order in the release menu. */
export const AREA_ACTIONS = ['pickUp', 'save', 'saveAndPickUp', 'cancel'] as const;
export type AreaMenuRow = (typeof AREA_ACTIONS)[number];

/** Naming a blueprint (063): its round's or item's plural, or this when it makes nothing. */
export const BLUEPRINT_NAMING = {
  /** A blueprint with no machine in it. */
  logistics: 'Logistics',
  /** Item names whose plural isn't the name with an "s". */
  plurals: { 'ley-dust': 'Ley dust', rope: 'Rope' } as Readonly<Record<string, string>>,
  /** A name already used gets this number after it, counting up from `firstNumber`. */
  numbered: (name: string, n: number): string => `${name} ${n}`,
  firstNumber: 2,
  /** The machines whose round names a blueprint with no stage machine (063: assembler, packer or mine packer). */
  finishers: ['assembler', 'packer', 'mine-packer'] as readonly string[],
} as const;

/** What the player reads (063). */
export const BLUEPRINT_TEXT = {
  /** An area pick-up the inventory and the stash can't hold between them (069), refused whole: the hint over the build bar. */
  stashFull: 'The inventory and the stash are full',
  /** The build bar's Tools group label and its cells' hover lines. */
  tools: 'Tools',
  /** The cells' hover lines, with the bound key (the build strip has no room for two more entries). */
  areaTool: (key: string): string => `Area tool (${key}): drag a box`,
  listTool: (key: string): string => `Blueprints (${key})`,
  locked: 'Restore the Blueprint table',
  /** The blueprint list's title, a row's piece count, and the delete question's rows. */
  listTitle: 'Blueprints',
  empty: 'No blueprints saved',
  pieces: (n: number): string => (n === 1 ? '1 piece' : `${n} pieces`),
  deleteRow: (name: string): string => `Delete ${name}`,
  overwriteRow: (name: string): string => `Overwrite ${name}`,
  /** A ghost piece the player hasn't unlocked: its hover line. */
  notUnlocked: 'Not unlocked',
} as const;
