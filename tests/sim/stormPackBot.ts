import { withTier } from '../../src/data/tags';
import type { Tier } from '../../src/data/tiers';
import { linkTrios } from '../../src/sim/miteAi';
import { decentBuild, lines } from './builds';
import { arena } from './fight';
import { at, fightPack, PACK_LIMIT, placePack, type PackFight } from './packBot';

// 065's ring 5 measurement (test code): one pack of the four at its largest, a hawk, a mite trio, a sentinel and a
// ram (6), on open slate in the Stormcrown's south (bearing 180°, 122 tiles out), the player 7 tiles off; the decent
// build (041.7's level-7 talents and gear) with all five entrances fed: three Lightning arrow lines and two Lightning
// bomb lines, at steel (062) or at stone. Recorded, not tuned (tests/measure/stormPacks.measure.ts).

export const STORM_PACK = {
  ids: ['thunderhawk', 'static-mite', 'static-mite', 'static-mite', 'storm-sentinel', 'gale-ram'],
  lines: ['arrow+lightning', 'bomb+lightning', 'arrow+lightning', 'bomb+lightning', 'arrow+lightning'],
  centre: { tx: 146, ty: 268 },
  start: at(153, 268),
} as const;

/** A line's round at a tier: a family the tier doesn't take keeps its stone round. */
function atTier(round: string, tier: Tier): string {
  try {
    return withTier(round, tier);
  } catch {
    return round;
  }
}

/** The ring 5 pack fight on a seed, with the decent five-entrance Lightning build at `tier`. */
export function stormPackClear(seed: number, tier: Tier): PackFight {
  const s = arena(seed, STORM_PACK.start);
  decentBuild(s);
  lines(s, ...STORM_PACK.lines.map((r) => atTier(r, tier)));
  const pack = placePack(s, STORM_PACK.ids, STORM_PACK.centre);
  linkTrios(pack);
  return fightPack(s, pack, STORM_PACK.start, PACK_LIMIT);
}
