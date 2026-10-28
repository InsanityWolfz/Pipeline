import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { packFight } from './enemyWindups';

// 076: the same seed and commands play the same fight as on main, tick for tick: a scripted pack fight per region,
// its summary fingerprinted every 120 ticks, against the fingerprints recorded on main (regionHash.json, written with
// RECORD_076=1 on origin/main at efd53de; 080 re-recorded them with 073 merged, which holds off-screen attacks). The summary is main's: 075's `wornRarity`, which main's lacks and this fight
// never changes, is left out (enemyWindups.ts's mainSummary). The boss fights are covered by windupTicks.test.ts's runs.

const FILE = 'tests/sim/regionHash.json';
const TICKS = 1200;
const PACKS: Readonly<Record<string, readonly string[]>> = {
  region1: ['husk', 'husk', 'wisp', 'pylon-warden'],
  hollows: ['charger', 'burrower', 'shardback', 'sniper'],
  emberworks: ['cinder-mote', 'bellows-hound', 'slag-golem', 'slag-whelp', 'kiln-tender'],
  stormcrown: ['thunderhawk', 'static-mite', 'storm-sentinel', 'gale-ram'],
};

describe('076: a scripted fight per region', () => {
  it('fingerprints the same summaries as main', () => {
    const now = Object.fromEntries(Object.entries(PACKS).map(([region, ids]) => [region, packFight(ids, TICKS)]));
    if (process.env.RECORD_076 === '1') writeFileSync(FILE, `${JSON.stringify(now, null, 2)}\n`);
    expect(now).toEqual(JSON.parse(readFileSync(FILE, 'utf8')));
  }, 120_000);
});
