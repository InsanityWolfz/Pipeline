import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies';
import { bossWindups, enemyWindups, type WindupRun } from './enemyWindups';

// 076: every enemy's and boss's wind-ups, counted tick by tick, are the ticks recorded on main before the art pass
// (windupTicks.json, written with RECORD_076=1 on main). The art never changes the sim.

const FILE = 'tests/sim/windupTicks.json';
const ENEMY_TICKS = 900;
const BOSS_TICKS = 2400;
const BOSSES = ['bulwark', 'forgewright', 'conductor'] as const;

function measure(): Record<string, WindupRun[]> {
  const out: Record<string, WindupRun[]> = {};
  for (const def of Object.values(ENEMIES)) if (!BOSSES.includes(def.id as (typeof BOSSES)[number])) out[def.id] = enemyWindups(def.id, ENEMY_TICKS);
  for (const b of BOSSES) out[b] = bossWindups(b, BOSS_TICKS);
  return out;
}

describe('076: wind-up ticks per attack', () => {
  it("count the same ticks for every enemy's and boss's wind-ups as main", () => {
    const now = measure();
    if (process.env.RECORD_076 === '1') writeFileSync(FILE, `{\n${Object.entries(now).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n')}\n}\n`);
    const main = JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, WindupRun[]>;
    expect(now).toEqual(main);
    // Every enemy and boss wound up at least once in its scenario, so the comparison means something.
    for (const [id, runs] of Object.entries(main)) expect(runs.length, id).toBeGreaterThan(0);
  }, 120_000);
});
