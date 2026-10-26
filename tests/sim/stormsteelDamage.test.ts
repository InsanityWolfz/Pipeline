import { describe, expect, it } from 'vitest';
import { ammoDef, straightAmmo } from '../../src/data/ammo';
import { CLUSTER, FIRE, LIGHTNING, SPLIT } from '../../src/data/tags';
import { TALENT_START } from '../../src/data/talents';
import type { EnemyState } from '../../src/sim/enemies';
import { fireInterval, roundEmission } from '../../src/sim/emissions';
import type { SimState } from '../../src/sim/state';
import { resolveStat, statOf } from '../../src/sim/statResolve';
import { arena, fireAt, hold, PLAYER_AT, run, runUntil } from './fight';
import { still } from './fireKit';

// 066: a stormsteel or storm glass round's every hit is ×2.56 its stone round's, through 062's one tier step: direct
// hits, Shards, Bursts, Bomblets and mines, with burn and Lightning arcs following the hit. Each scenario runs with the
// stone round and with its storm one.

const STORM = 2.56;
const FULL = 10_000;
const lost = (e: EnemyState): number => FULL - e.health;

/** Fires one carried round from the player at a point, and returns the state. */
function shoot(round: string, at: { x: number; y: number }): SimState {
  const s = arena();
  s.inventory = { [round]: 2 };
  hold(s, round);
  run(s, 1, fireAt(at.x, at.y));
  return s;
}

describe('a storm round hits ×2.56 (066)', () => {
  it('a stormsteel arrow’s direct hit, and a storm glass bolt’s', () => {
    for (const [stone, storm] of [['arrow', 'arrow+stormsteel'], ['ley-bolt', 'ley-bolt+storm-glass']] as const) {
      const hits = [stone, storm].map((round) => {
        const s = arena();
        const e = still(s, PLAYER_AT.x + 100, PLAYER_AT.y);
        s.inventory = { [round]: 2 };
        hold(s, round);
        run(s, 1, fireAt(PLAYER_AT.x + 400, PLAYER_AT.y));
        runUntil(s, () => e.health < FULL, 30);
        return lost(e);
      });
      expect(hits[0]).toBeCloseTo(straightAmmo(stone).damage, 9);
      expect(hits[1]).toBeCloseTo(straightAmmo(stone).damage * STORM, 9);
    }
  });

  it('a storm glass Split bolt’s Shards', () => {
    const s = arena();
    still(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    s.inventory = { 'ley-bolt+storm-glass+split': 2 };
    hold(s, 'ley-bolt+storm-glass+split');
    run(s, 1, fireAt(PLAYER_AT.x + 400, PLAYER_AT.y));
    runUntil(s, () => s.arrows.some((a) => a.ammoId === 'shard'), 60);
    const shards = s.arrows.filter((a) => a.ammoId === 'shard');
    expect(shards).toHaveLength(SPLIT.shards);
    for (const a of shards) expect(a.damage).toBeCloseTo(9 * SPLIT.damageShare * STORM, 9);
  });

  it('a stormsteel bomb’s Burst, a stormsteel cluster bomb’s Bomblets and a stormsteel landmine’s Burst', () => {
    const at = { x: PLAYER_AT.x + 100, y: PLAYER_AT.y };
    const burst = shoot('bomb+stormsteel', at);
    const e = still(burst, at.x, at.y);
    runUntil(burst, () => burst.events.bursts.length > 0, 60);
    expect(lost(e)).toBeCloseTo(12 * STORM, 9);
    const cluster = shoot('bomb+stormsteel+cluster', at);
    const b = still(cluster, at.x + CLUSTER.distance + 12, at.y);
    runUntil(cluster, () => cluster.events.bombletBursts.length > 0, 120);
    expect(lost(b)).toBeCloseTo(CLUSTER.damage * STORM, 9);
    const mine = shoot('landmine+stormsteel', at);
    const m = still(mine, at.x, at.y);
    runUntil(mine, () => mine.events.mineBursts.length > 0, 400);
    expect(lost(m)).toBeCloseTo(60 * STORM, 9);
  });

  it('burn: a stormsteel fire arrow burns 25% of its ×2.56 hit a second, multiplied once', () => {
    const s = arena();
    const e = still(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    s.inventory = { 'arrow+stormsteel+fire': 2 };
    hold(s, 'arrow+stormsteel+fire');
    run(s, 1, fireAt(PLAYER_AT.x + 400, PLAYER_AT.y));
    runUntil(s, () => e.burnTicks > 0, 30);
    expect(e.burnDps).toBeCloseTo(14 * STORM * FIRE.burnShare, 9);
  });

  it('a Lightning arc takes its share of the ×2.56 hit, multiplied once', () => {
    const s = arena();
    const a = still(s, PLAYER_AT.x + 60, PLAYER_AT.y);
    const near = still(s, PLAYER_AT.x + 60, PLAYER_AT.y + 64);
    s.inventory = { 'arrow+stormsteel+lightning': 2 };
    hold(s, 'arrow+stormsteel+lightning');
    run(s, 1, fireAt(PLAYER_AT.x + 400, PLAYER_AT.y));
    runUntil(s, () => s.events.arcs.length > 0, 30);
    expect(lost(a)).toBeCloseTo(14 * STORM, 9);
    expect(lost(near)).toBeCloseTo(14 * STORM * LIGHTNING.chainShare, 9);
  });

  it('is one ×2.56 step named for the tier, never steel’s ×1.6 as well', () => {
    const s = arena();
    expect(resolveStat(s, 'damage', roundEmission('arrow+stormsteel+frost'), 14).muls).toEqual([{ source: 'Stormsteel', value: STORM }]);
    expect(resolveStat(s, 'damage', roundEmission('ley-bolt+storm-glass'), 9).muls).toEqual([{ source: 'Storm glass', value: STORM }]);
  });
});

describe('a storm round is otherwise its stone version (066)', () => {
  it('has the stone round’s range, speed, radius, arm time and fire rate', () => {
    for (const [stone, storm] of [['arrow', 'arrow+stormsteel'], ['ley-bolt+homing', 'ley-bolt+storm-glass+homing'], ['bomb+cluster', 'bomb+stormsteel+cluster'], ['landmine+frost', 'landmine+stormsteel+frost']] as const) {
      const def = ammoDef(storm);
      const st = ammoDef(stone);
      expect({ ...def, id: stone, itemId: stone, sprite: st.sprite, ...(def.kind === 'mine' && st.kind === 'mine' ? { armed: st.armed } : {}) }).toEqual(st);
      const s = arena();
      expect(fireInterval(s, storm)).toBe(fireInterval(s, stone));
      for (const stat of ['range', 'speed', 'radius', 'arm-time', 'fire-rate'] as const) expect(statOf(s, stat, roundEmission(storm), 100)).toBe(statOf(s, stat, roundEmission(stone), 100));
    }
  });

  it('is reached by talents through its family, exactly as the stone round is', () => {
    const s = arena();
    s.talents = [TALENT_START, 'a1', 'b1', 'l1', 't3'];
    for (const [stone, storm] of [['arrow', 'arrow+stormsteel+frost'], ['bomb', 'bomb+stormsteel'], ['ley-bolt+split', 'ley-bolt+storm-glass+split'], ['landmine', 'landmine+stormsteel']] as const) {
      expect(statOf(s, 'damage', roundEmission(storm), 10)).toBeCloseTo(statOf(s, 'damage', roundEmission(stone), 10) * STORM, 9);
    }
  });
});
