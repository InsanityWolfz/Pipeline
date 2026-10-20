import type { SaveEnvelope } from './save';

// Save version 2 → 3 (046: foundry onboarding). The Splitter is on the build bar from the start, so its research
// node and its schematic are gone: a version 2 save's `research.splitter` and every `schematic-splitter` it holds
// are dropped, with nothing refunded (046.5).

/** The item and the node 046 removed. */
const GONE_ITEM = 'schematic-splitter';
const GONE_NODE = 'splitter';

type Json = Record<string, unknown>;

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
  if (Array.isArray(out.groundItems)) out.groundItems = out.groundItems.filter((g: unknown) => !isRecord(g) || g.itemId !== GONE_ITEM);
  return out;
}

/** Version 2 → 3. */
export function migrateV2(env: SaveEnvelope): SaveEnvelope {
  return { ...env, version: 3, state: isRecord(env.state) ? upgradeState(env.state) : env.state };
}
