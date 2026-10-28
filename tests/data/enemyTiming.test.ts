import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies';

// 076: the art pass is visual only. Every timing field of every enemy's and boss's def (each attack's wind-up,
// attack, recovery and cooldown ticks, the Sniper's track and lock, the bosses' other clocks) equals the table
// recorded on main before it (enemyTiming.json, written with RECORD_076=1 on main).

const FILE = 'tests/data/enemyTiming.json';

/** Every numeric field named `…Ticks` (or `ticks`) in a def, by its dotted path. */
function ticksOf(v: unknown, path: string, out: Record<string, number>): void {
  if (!v || typeof v !== 'object') return;
  for (const [k, x] of Object.entries(v)) {
    const at = path ? `${path}.${k}` : k;
    if (typeof x === 'number' && /(^t|T)icks$/.test(k)) out[at] = x;
    else ticksOf(x, at, out);
  }
}

describe('076: enemy timing', () => {
  it("matches main's table for every attack", () => {
    const now: Record<string, Record<string, number>> = {};
    for (const def of Object.values(ENEMIES)) {
      const t: Record<string, number> = {};
      ticksOf(def, '', t);
      now[def.id] = t;
    }
    if (process.env.RECORD_076 === '1') writeFileSync(FILE, `{\n${Object.entries(now).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n')}\n}\n`);
    const main = JSON.parse(readFileSync(FILE, 'utf8')) as typeof now;
    expect(now).toEqual(main);
    // The table holds every attack's four timings.
    expect(main.husk).toMatchObject({ 'swipe.windupTicks': 36, 'swipe.swipeTicks': 6, 'swipe.recoverTicks': 24, 'swipe.cooldownTicks': 60 });
    expect(main.sniper).toMatchObject({ 'snipe.windupTicks': 84, 'snipe.trackTicks': 60 });
    expect(main.conductor).toMatchObject({ 'lash.windupTicks': 45, 'call.windupTicks': 60, 'chain.windupTicks': 60 });
  });
});
