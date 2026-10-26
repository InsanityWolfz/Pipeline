import { describe, expect, it, vi } from 'vitest';
import { straightAmmo } from '../../src/data/ammo';
import type { RelicDef } from '../../src/data/relics';
import { TIER_DAMAGE } from '../../src/data/tiers';
import { roundEmission } from '../../src/sim/emissions';
import { resolveStat, statOf } from '../../src/sim/statResolve';
import { piece, wear } from '../fixtures/gear';
import { arena, fireAt, hold, PLAYER_AT, run, runUntil } from './fight';
import { still } from './fireKit';

// 062: a tiered round is reached by relics exactly as its stone round is, by family: a relic's line scoped to a
// family reaches every tier of it, and its × stacks with the tier's. No shipped relic scopes a family yet (each bends a
// rule of You), so this one is a test relic, beside the real ones.

const TEST_RELIC: RelicDef = {
  id: 'test-family-relic',
  name: 'Test Family Relic',
  slot: 'trinket',
  weight: null,
  rule: 'feather',
  lines: [
    { scope: 'arrow', stat: 'damage', op: 'mul', value: 1.25 },
    { scope: 'bomb', stat: 'damage', op: 'mul', value: 1.5 },
    { scope: 'ley', stat: 'fire-rate', op: 'add', value: 0.2 },
    { scope: 'landmine', stat: 'radius', op: 'add', value: 0.3 },
  ],
  icon: 'test',
  sound: null,
};

vi.mock('../../src/data/relics', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/data/relics')>();
  return { ...real, relicDef: (id: string): RelicDef => (id === TEST_RELIC.id ? TEST_RELIC : real.relicDef(id)) };
});

/** The arena with the test relic worn. */
function wearing() {
  return wear(arena(), piece(0, 'trinket', { rarity: 'relic', relic: TEST_RELIC.id, name: TEST_RELIC.name }));
}

describe('a relic reaching a family reaches its tiered rounds (062)', () => {
  it('its stat lines reach each tier as they reach the stone round, its × before the tier’s', () => {
    const s = wearing();
    for (const [stone, tier, stat, base] of [
      ['arrow', 'arrow+steel+frost', 'damage', 10],
      ['bomb+cluster', 'bomb+steel+cluster', 'damage', 10],
      ['ley-bolt', 'ley-bolt+glass', 'fire-rate', 3],
      ['landmine', 'landmine+steel', 'radius', 40],
    ] as const) {
      const before = statOf(arena(), stat, roundEmission(stone), base);
      const withRelic = statOf(s, stat, roundEmission(stone), base);
      expect(withRelic, stone).not.toBe(before);
      const mul = stat === 'damage' ? TIER_DAMAGE.steel : 1;
      expect(statOf(s, stat, roundEmission(tier), base), tier).toBeCloseTo(withRelic * mul, 9);
    }
    expect(resolveStat(s, 'damage', roundEmission('arrow+steel'), 10).muls).toEqual([
      { source: TEST_RELIC.name, value: 1.25 },
      { source: 'Steel', value: TIER_DAMAGE.steel },
    ]);
  });

  it('a steel arrow’s hit takes the relic’s × and the tier’s', () => {
    const s = wearing();
    const e = still(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    s.inventory = { 'arrow+steel': 2 };
    hold(s, 'arrow+steel');
    run(s, 1, fireAt(PLAYER_AT.x + 400, PLAYER_AT.y));
    runUntil(s, () => e.health < 10_000, 30);
    expect(10_000 - e.health).toBeCloseTo(straightAmmo('arrow').damage * 1.25 * TIER_DAMAGE.steel, 9);
  });
});
