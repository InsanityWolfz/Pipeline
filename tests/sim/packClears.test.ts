import { describe, expect, it } from 'vitest';
import { lines } from './builds';
import { arena } from './fight';
import { at, fightPack, placePack, type PackFight } from './packBot';

// 041.8: a ring-matched pack cleared with a fitting volley, timed from the first round
// fired at the pack to its last death, on seeds 1–5: ring 3 in 8–18 s (041.13, Shaun),
// rings 1 and 2 within 15 s and recorded (no floor). Damage taken is printed (041.11). The player is as the spec's
// arithmetic has it: no talents, nothing worn, only the volley's lines. Each pack stands
// on open ground in its ring (packBot.ts), the player 6 to 7 tiles off.

const SEEDS = [1, 2, 3, 4, 5] as const;
const LIMIT = 60 * 60;

const PACKS = {
  1: { ids: ['husk', 'husk', 'husk', 'husk'], lines: ['arrow'], centre: { tx: 61, ty: 32 }, start: at(67, 32) },
  2: { ids: ['husk', 'husk', 'husk', 'husk', 'wisp'], lines: ['arrow', 'arrow'], centre: { tx: 49, ty: 30 }, start: at(56, 30) },
  3: { ids: ['shardback', 'charger', 'charger', 'burrower', 'sniper'], lines: ['bomb', 'arrow'], centre: { tx: 22, ty: 12 }, start: at(28, 12) },
} as const;

/** One ring's five fights. */
function clears(ring: 1 | 2 | 3): PackFight[] {
  const def = PACKS[ring];
  return SEEDS.map((seed) => {
    const s = arena(seed, def.start);
    lines(s, ...def.lines);
    return fightPack(s, placePack(s, def.ids, def.centre), def.start, LIMIT);
  });
}

const runs = new Map<number, PackFight[]>();
const of = (ring: 1 | 2 | 3): PackFight[] => {
  const got = runs.get(ring) ?? clears(ring);
  runs.set(ring, got);
  return got;
};
const seconds = (r: PackFight): number => Math.round((r.ticks / 60) * 10) / 10;
/** Each fight's time and the damage taken (041.11: recorded for Shaun). */
const shown = (r: readonly PackFight[]): string => r.map((f) => `${seconds(f)} s, took ${f.taken}`).join(' | ');

describe('ring-matched packs (041.8)', () => {
  it('ring 1, four Husks, one arrow line: cleared in at most 15 s, never KO’d', () => {
    // Measured: 2.5 / 2.5 / 2.9 / 2.2 / 2.5 s (148, 151, 176, 133, 147 ticks).
    const r = of(1);
    console.log('041 ring 1 pack:', shown(r));
    for (const [i, f] of r.entries()) expect(f, `seed ${SEEDS[i]}`).toMatchObject({ cleared: true, ko: false });
    for (const f of r) expect(f.ticks).toBeLessThanOrEqual(15 * 60);
  });

  it('ring 2, four Husks and a Wisp, two arrow lines: cleared in at most 15 s, never KO’d', () => {
    // Measured: 2.5 / 3.9 / 3.2 / 3.4 / 4.2 s (151, 233, 193, 206, 250 ticks).
    const r = of(2);
    console.log('041 ring 2 pack:', shown(r));
    for (const [i, f] of r.entries()) expect(f, `seed ${SEEDS[i]}`).toMatchObject({ cleared: true, ko: false });
    for (const f of r) expect(f.ticks).toBeLessThanOrEqual(15 * 60);
  });

  // Five fights of up to about 1,000 ticks, no idle time: about 2 s on a quiet machine.
  it('ring 3, a Shardback, two Chargers, a Burrower and a Sniper, an arrow and a bomb line: cleared in 8–18 s, never KO’d', () => {
    // 041.13 (Shaun): the band is 8–18 s. Measured: 11.5 / 16.3 / 10.1 / 13.1 / 13.5 s; seed 2's lone Shardback, its
    // shield turned to the player, falls to bombs alone.
    const r = of(3);
    console.log('041 ring 3 pack:', shown(r));
    for (const [i, f] of r.entries()) {
      expect(f, `seed ${SEEDS[i]}`).toMatchObject({ cleared: true, ko: false });
      expect(f.ticks, `seed ${SEEDS[i]}`).toBeGreaterThanOrEqual(8 * 60);
      expect(f.ticks, `seed ${SEEDS[i]}`).toBeLessThanOrEqual(18 * 60);
    }
  }, 20_000);
});
