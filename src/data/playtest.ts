import { ITEMS } from './items';
import type { StartDef } from './player';
import { RECIPES } from './recipes';

// The `?playtest` start (spec 007): plenty of everything and every machine
// unlocked, so playtests skip the gathering. Counts are tuning values.

const AMMO_COUNT = 99;
const RAW_COUNT = 99;
const PART_COUNT = 20;

const COUNTS = { ammo: AMMO_COUNT, raw: RAW_COUNT, part: PART_COUNT } as const;

/** Items with their own count: warden cores are rare, enough for a few gravity stagers (008). */
const OVERRIDES: Readonly<Record<string, number>> = { 'warden-core': 5 };

export const PLAYTEST_START: StartDef = {
  inventory: Object.fromEntries(Object.values(ITEMS).map((it) => [it.id, OVERRIDES[it.id] ?? COUNTS[it.kind]])),
  crafted: [...new Set(Object.values(RECIPES).map((r) => r.output.itemId))].sort(),
};
