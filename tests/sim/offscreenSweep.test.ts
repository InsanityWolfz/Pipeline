import { describe, expect, it } from 'vitest';
import { linkTrios } from '../../src/sim/miteAi';
import type { EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { decentBuild, lines } from './builds';
import { arena } from './fight';
import { stepWatch } from './offscreen';
import { EMBER_PACK, fightPack, PACK_LIMIT, PACKS, placePack, type PackStep } from './packBot';
import { STORM_PACK } from './stormPackBot';

// 073's invariant: in the pack fights of every region (041.8's rings 1 to 3, 061's Emberworks pack and 065's
// Stormcrown pack, none in a boss arena), the bot kiting near and far over several seeds, no enemy ever starts a
// wind-up off screen.

type Pack = { ids: readonly string[]; lines: readonly string[]; centre: { tx: number; ty: number }; start: { x: number; y: number }; decent?: boolean };

/** Each region's packs: the meadow's two rings (its Husks rarely reach the bot, so they count together), the Hollows', the Emberworks' and the Stormcrown's. */
const REGIONS: Record<string, readonly Pack[]> = {
  'the meadow (rings 1 and 2)': [PACKS[1], PACKS[2]],
  'the Hollows (ring 3)': [PACKS[3]],
  'the Emberworks': [{ ...EMBER_PACK, decent: true }],
  'the Stormcrown': [{ ...STORM_PACK, decent: true }],
};

/** The bot's keep from the nearest member: its usual 150 px, and far enough that others are often off screen. */
const KEEPS = [150, 260];
const SEEDS = [1, 2, 3];

/** A pack fight watched tick by tick: how many wind-ups started, failing on any that started off screen. */
function sweep(pack: Pack, seed: number, keep: number): number {
  const s: SimState = arena(seed, pack.start);
  if (pack.decent) decentBuild(s);
  lines(s, ...pack.lines);
  const placed: EnemyState[] = placePack(s, pack.ids, pack.centre);
  linkTrios(placed);
  let starts = 0;
  const step: PackStep = (x, c) => {
    for (const [e, w] of stepWatch(x, c)) {
      if (!w.started) continue;
      if (!w.seen) throw new Error(`${e.enemyId} ${e.id} started a wind-up off screen at tick ${x.tick}`);
      starts += 1;
    }
  };
  fightPack(s, placed, pack.start, PACK_LIMIT, keep, step);
  return starts;
}

describe('no wind-up starts off screen in any region’s pack fights (073)', () => {
  it.each(Object.keys(REGIONS))('%s, seeds 1–3, the bot near and far', (region) => {
    const packs = REGIONS[region] ?? [];
    const starts = packs.flatMap((pack) => KEEPS.flatMap((keep) => SEEDS.map((seed) => sweep(pack, seed, keep))));
    // Wind-ups did start (on screen), so the sweep watched real fights.
    expect(starts.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });
});
