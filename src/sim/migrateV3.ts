import { OBJECTIVES } from '../data/objectives';
import type { SaveEnvelope } from './save';

// Save version 2 → 3 (046: foundry onboarding). The Splitter is on the build bar from the start, so its research
// node and its schematic are gone: a version 2 save's `research.splitter` and every `schematic-splitter` it holds
// are dropped, with nothing refunded (046.5). The objectives, saved by index, are mapped from version 2's list onto
// this one by text: 027's build steps are gone, the refill goal counts as done where "Put wood in the hopper" was, and
// the second-line goal where "Feed two entrances" was. A save keeps its start, so it never gets the example line (046.1).

/** The item and the node 046 removed. */
const GONE_ITEM = 'schematic-splitter';
const GONE_NODE = 'splitter';

type Json = Record<string, unknown>;

/** Version 2's objectives, in order, as the save's `objectives` list indexes them. */
const V2_OBJECTIVES: readonly string[] = [
  'Pick up the tube (E)',
  'Gather wood, stone and fiber (E)',
  'Craft arrows (C)',
  'Clear the ruin field of Husks',
  'Enter the foundry',
  'Craft a bomb and a ley bolt (C)',
  'Press B and place a hopper',
  'Put wood in the hopper (E)',
  'Place a cutter in front of the hopper',
  'Make arrowheads: hopper of stone → knapper',
  'Make rope: hopper of fiber → spinner',
  'Feed all three into an assembler',
  'Run a conduit from the assembler into the intake',
  'Fill the tube from your line',
  'Identify your armor at the bench (E)',
  "Claim the shrine's pylon",
  'Restore a second intake entrance (E at a cap with the warden core)',
  'Feed two entrances to fire a spread',
  'Head back out — the foundry keeps running',
  'Run a supply port into your line',
  'Put a second kind of ammo in another entrance',
  'Gather rimestone at the Frozen Grotto',
  'Apply a frost rune to arrows at the bench',
  'Build a frost rune into your arrow line',
  'Try a ley stage at the bench: homing or split',
  'Claim a second pylon',
  'Breach Stonefall Hollows',
  "Claim the Cistern Terrace's pylon",
  'Defeat the Bulwark',
  "Restore the intake's third entrance (E with the Bulwark core)",
  'Feed all three entrances',
];

/** 046's new goals, each done in a version 2 save where the old goal it stands for was. */
const STANDS_FOR: Readonly<Record<string, string>> = {
  'Refill the hoppers with wood, stone and fiber (E)': 'Put wood in the hopper (E)',
  'Build a second arrow line into the new entrance': 'Feed two entrances to fire a spread',
};

/** Version 2's done-list as this version's, by each goal's text. */
function mapObjectives(old: unknown): unknown {
  if (!Array.isArray(old)) return old;
  const done = new Set(V2_OBJECTIVES.filter((_, i) => old[i] === true));
  return OBJECTIVES.map((o) => done.has(o.text) || done.has(STANDS_FOR[o.text] ?? ''));
}

const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A copy of an item-count record without the removed item (anything else as it is). */
function withoutItem(v: unknown): unknown {
  return isRecord(v) ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== GONE_ITEM)) : v;
}

/** The version 2 state, upgraded. Fields it doesn't know are left for the reader's checks. */
function upgradeState(state: Json): Json {
  const out: Json = { ...state };
  if (isRecord(out.research)) out.research = Object.fromEntries(Object.entries(out.research).filter(([k]) => k !== GONE_NODE));
  for (const key of ['inventory', 'banked', 'stash'] as const) out[key] = withoutItem(out[key]);
  if (isRecord(out.start)) out.start = { ...out.start, inventory: withoutItem(out.start.inventory) };
  out.objectives = mapObjectives(out.objectives);
  if (Array.isArray(out.groundItems)) out.groundItems = out.groundItems.filter((g: unknown) => !isRecord(g) || g.itemId !== GONE_ITEM);
  return out;
}

/** Version 2 → 3. */
export function migrateV2(env: SaveEnvelope): SaveEnvelope {
  return { ...env, version: 3, state: isRecord(env.state) ? upgradeState(env.state) : env.state };
}
