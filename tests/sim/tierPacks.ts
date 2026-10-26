import { withTier } from '../../src/data/tags';
import type { Tier } from '../../src/data/tiers';
import { decentBuild, lines } from './builds';
import { arena } from './fight';
import { EMBER_PACK, fightPack, PACK_LIMIT, PACKS, placePack, type PackFight } from './packBot';

// 062's measurement: the same pack fights as 041.8's ring 3 pack (its own volley, no talents) and 061's ring 4 pack
// (the decent four-entrance Fire build), with every line's round at its material tier (steel arrows and bombs) against
// stone. Recorded, not tuned (tests/measure/tiers.measure.ts).

/** A line's round at a tier: a family the tier doesn't take keeps its stone round. */
function atTier(round: string, tier: Tier): string {
  try {
    return withTier(round, tier);
  } catch {
    return round;
  }
}

/** The ring 3 pack fight on a seed, its lines' rounds at `tier`. */
export function ringThreeClear(seed: number, tier: Tier): PackFight {
  const def = PACKS[3];
  const s = arena(seed, def.start);
  lines(s, ...def.lines.map((r) => atTier(r, tier)));
  return fightPack(s, placePack(s, def.ids, def.centre), def.start, PACK_LIMIT);
}

/** The ring 4 pack fight on a seed with the decent Fire build, its lines' rounds at `tier`. */
export function ringFourClear(seed: number, tier: Tier): PackFight {
  const s = arena(seed, EMBER_PACK.start);
  decentBuild(s);
  lines(s, ...EMBER_PACK.lines.map((r) => atTier(r, tier)));
  return fightPack(s, placePack(s, EMBER_PACK.ids, EMBER_PACK.centre), EMBER_PACK.start, PACK_LIMIT);
}
