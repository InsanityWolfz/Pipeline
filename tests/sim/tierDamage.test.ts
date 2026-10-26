import { describe, expect, it } from 'vitest';
import { ammoDef, straightAmmo } from '../../src/data/ammo';
import { CLUSTER, FIRE, SPLIT } from '../../src/data/tags';
import { BLASTFLETCH, SHATTERPOINT, TALENT_START } from '../../src/data/talents';
import { TIER_DAMAGE } from '../../src/data/tiers';
import { fireInterval, roundEmission } from '../../src/sim/emissions';
import { leavePool } from '../../src/sim/keystones';
import type { EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { statOf } from '../../src/sim/statResolve';
import { arena, fireAt, hold, PLAYER_AT, run, runUntil } from './fight';
import { still } from './fireKit';

// 062: a tiered round deals ×TIER_DAMAGE its stone version's damage on every hit it makes (direct hits, Shards,
// Bursts, Bomblets, mines), which flows into burn, and is otherwise the stone round. Each scenario runs once with the
// stone round and once with its tiered one.

const STEEL = TIER_DAMAGE.steel;
const GLASS = TIER_DAMAGE.glass;
const FULL = 10_000;

/** Fires one carried round from the player at a point (talents taken first), and returns the state. */
function shoot(round: string, at: { x: number; y: number }, talents: readonly string[] = []): SimState {
  const s = arena();
  s.talents = [TALENT_START, ...talents];
  s.inventory = { [round]: 2 };
  hold(s, round);
  run(s, 1, fireAt(at.x, at.y));
  return s;
}

const lost = (e: EnemyState): number => FULL - e.health;

/** A round's armed look, if it's a mine (062: a tier's look is its own; tests/data/tierArt.test.ts). */
const lookOf = (id: string): { armed?: string } => {
  const def = ammoDef(id);
  return def.kind === 'mine' ? { armed: def.armed } : {};
};

describe('a tiered round hits ×1.6 (062)', () => {
  it('is 1.6 for steel and for glass', () => {
    // 066: the storm tiers' ×2.56 (tests/sim/stormsteelDamage.test.ts).
    expect(TIER_DAMAGE).toEqual({ steel: 1.6, glass: 1.6, stormsteel: 2.56, 'storm-glass': 2.56 });
  });

  it('a steel arrow’s direct hit, and a glass bolt’s', () => {
    for (const [stone, tier, mul] of [['arrow', 'arrow+steel', STEEL], ['ley-bolt', 'ley-bolt+glass', GLASS]] as const) {
      const hits = [stone, tier].map((round) => {
        const s = arena();
        const e = still(s, PLAYER_AT.x + 100, PLAYER_AT.y);
        s.inventory = { [round]: 2 };
        hold(s, round);
        run(s, 1, fireAt(PLAYER_AT.x + 400, PLAYER_AT.y));
        runUntil(s, () => e.health < FULL, 30);
        return lost(e);
      });
      expect(hits[0]).toBeCloseTo(straightAmmo(stone).damage, 9);
      expect(hits[1]).toBeCloseTo(straightAmmo(stone).damage * mul, 9);
    }
  });

  it('a glass Split bolt’s Shards', () => {
    const shards = ['ley-bolt+split', 'ley-bolt+glass+split'].map((round) => {
      const s = arena();
      still(s, PLAYER_AT.x + 100, PLAYER_AT.y);
      s.inventory = { [round]: 2 };
      hold(s, round);
      run(s, 1, fireAt(PLAYER_AT.x + 400, PLAYER_AT.y));
      runUntil(s, () => s.arrows.some((a) => a.ammoId === 'shard'), 60);
      return s.arrows.filter((a) => a.ammoId === 'shard').map((a) => a.damage);
    });
    expect(shards[0]?.[0]).toBeCloseTo(9 * SPLIT.damageShare, 9);
    expect(shards[1]?.[0]).toBeCloseTo(9 * SPLIT.damageShare * GLASS, 9);
    expect(shards[1]).toHaveLength(SPLIT.shards);
  });

  it('a steel bomb’s Burst and a steel cluster bomb’s Bomblets', () => {
    const at = { x: PLAYER_AT.x + 100, y: PLAYER_AT.y };
    const bursts = ['bomb', 'bomb+steel'].map((round) => {
      const s = shoot(round, at);
      const e = still(s, at.x, at.y);
      runUntil(s, () => s.events.bursts.length > 0, 60);
      return lost(e);
    });
    expect(bursts[0]).toBeCloseTo(12, 9);
    expect(bursts[1]).toBeCloseTo(12 * STEEL, 9);
    const bomblets = ['bomb+cluster', 'bomb+steel+cluster'].map((round) => {
      const s = shoot(round, at);
      // Past the Burst's 48 px, on the first Bomblet's point along the flight.
      const e = still(s, at.x + CLUSTER.distance + 12, at.y);
      runUntil(s, () => s.events.bombletBursts.length > 0, 120);
      return lost(e);
    });
    expect(bomblets[0]).toBeCloseTo(CLUSTER.damage, 9);
    expect(bomblets[1]).toBeCloseTo(CLUSTER.damage * STEEL, 9);
  });

  it('a steel landmine’s Burst', () => {
    const at = { x: PLAYER_AT.x + 100, y: PLAYER_AT.y };
    const mines = ['landmine', 'landmine+steel'].map((round) => {
      const s = shoot(round, at);
      const e = still(s, at.x, at.y);
      runUntil(s, () => s.events.mineBursts.length > 0, 400);
      return lost(e);
    });
    expect(mines[0]).toBeCloseTo(60, 9);
    expect(mines[1]).toBeCloseTo(60 * STEEL, 9);
  });

  it('burn: a steel fire arrow burns 25% of its ×1.6 hit a second, multiplied once', () => {
    const s = arena();
    const e = still(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    s.inventory = { 'arrow+steel+fire': 2 };
    hold(s, 'arrow+steel+fire');
    run(s, 1, fireAt(PLAYER_AT.x + 400, PLAYER_AT.y));
    runUntil(s, () => e.burnTicks > 0, 30);
    expect(e.burnDps).toBeCloseTo(14 * STEEL * FIRE.burnShare, 9);
  });

  it('a Pool-burst (Blastfletch) and Shatter’s Shards take the tiered hit once, never twice', () => {
    const bursts = ['arrow', 'arrow+steel'].map((round) => {
      const s = arena();
      s.talents = [TALENT_START, 'k1'];
      leavePool(s, { roomId: s.roomId, x: PLAYER_AT.x + 40, y: PLAYER_AT.y, radius: 48 }, roundEmission('bomb'));
      still(s, PLAYER_AT.x + 160, PLAYER_AT.y);
      const beside = still(s, PLAYER_AT.x + 160, PLAYER_AT.y + 20);
      s.inventory = { [round]: 2 };
      hold(s, round);
      run(s, 1, fireAt(PLAYER_AT.x + 400, PLAYER_AT.y));
      runUntil(s, () => s.events.poolBursts.length > 0, 40);
      return lost(beside);
    });
    expect(bursts[0]).toBeCloseTo(14 * BLASTFLETCH.damageScale, 9);
    expect(bursts[1]).toBeCloseTo(14 * BLASTFLETCH.damageScale * STEEL, 9);
    const shards = ['ley-bolt', 'ley-bolt+glass'].map((round) => {
      const s = arena();
      s.talents = [TALENT_START, 'k2'];
      const e = still(s, PLAYER_AT.x + 100, PLAYER_AT.y);
      e.frozen = 60;
      s.inventory = { [round]: 2 };
      hold(s, round);
      run(s, 1, fireAt(PLAYER_AT.x + 400, PLAYER_AT.y));
      runUntil(s, () => s.events.shatters.length > 0, 40);
      return s.arrows.filter((a) => a.ammoId === 'shard').map((a) => a.damage);
    });
    expect(shards[0]?.[0]).toBeCloseTo(9 * SHATTERPOINT.shardScale, 9);
    expect(shards[1]?.[0]).toBeCloseTo(9 * SHATTERPOINT.shardScale * GLASS, 9);
  });
});

describe('a tiered round is otherwise its stone version (062)', () => {
  it('has the stone round’s range, speed, radius, arm time and fire rate', () => {
    for (const [stone, tier] of [['arrow', 'arrow+steel'], ['ley-bolt+homing', 'ley-bolt+glass+homing'], ['bomb+cluster', 'bomb+steel+cluster'], ['landmine+frost', 'landmine+steel+frost']] as const) {
      expect({ ...ammoDef(tier), id: stone, itemId: stone, sprite: ammoDef(stone).sprite, ...lookOf(stone) }).toEqual(ammoDef(stone));
      const s = arena();
      expect(fireInterval(s, tier)).toBe(fireInterval(s, stone));
      for (const stat of ['range', 'speed', 'radius', 'arm-time', 'fire-rate'] as const) expect(statOf(s, stat, roundEmission(tier), 100)).toBe(statOf(s, stat, roundEmission(stone), 100));
    }
  });

  it('is reached by talents through its family, exactly as the stone round is', () => {
    const s = arena();
    s.talents = [TALENT_START, 'a1', 'b1', 'l1', 't3'];
    for (const [stone, tier, mul] of [['arrow', 'arrow+steel+frost', STEEL], ['bomb', 'bomb+steel', STEEL], ['ley-bolt+split', 'ley-bolt+glass+split', GLASS], ['landmine', 'landmine+steel', STEEL]] as const) {
      expect(statOf(s, 'damage', roundEmission(tier), 10)).toBeCloseTo(statOf(s, 'damage', roundEmission(stone), 10) * mul, 9);
      expect(statOf(s, 'fire-rate', roundEmission(tier), 3)).toBe(statOf(s, 'fire-rate', roundEmission(stone), 3));
    }
  });
});
