import { describe, expect, it } from 'vitest';
import { lobAmmo, mineAmmo } from '../../src/data/ammo';
import { CLUSTER, COLD } from '../../src/data/tags';
import { BLASTFLETCH, OVERPRESSURE, TALENT_START } from '../../src/data/talents';
import { bombletEmission, fireRate, poolBurstEmission, roundEmission } from '../../src/sim/emissions';
import { leavePool } from '../../src/sim/keystones';
import { createArrow } from '../../src/sim/arrows';
import type { SimState } from '../../src/sim/state';
import { activeLines, resolveStat, statOf, statusEmission, YOU } from '../../src/sim/statResolve';
import { arena, fireAt, HUSK, placeHusk, PLAYER_AT, run, runUntil } from './fight';
import { piece, wear } from '../fixtures/gear';

// One stat path (039): resolveStat gives any stat of any emission, with every add, mul and
// flat and its source, and `final = (base + Σflats) × (1 + Σadds) × Πmuls`. A scope reaches
// every emission that carries it.

const taking = (s: SimState, ...ids: string[]): SimState => {
  s.talents = [TALENT_START, ...ids];
  return s;
};

describe('resolveStat', () => {
  it('an arrow with Fletcher’s Eye and Hard Bore: 10 × (1 + 0.10 + 0.06) = 11.6, each add with its source', () => {
    const r = resolveStat(taking(arena(), 'a1', 't3'), 'damage', roundEmission('arrow'), 10);
    expect(r.base).toBe(10);
    expect(r.adds).toEqual([
      { source: "Fletcher's Eye", value: 0.1 },
      { source: 'Hard Bore', value: 0.06 },
    ]);
    expect(r.muls).toEqual([]);
    expect(r.flats).toEqual([]);
    expect(r.final).toBeCloseTo(11.6, 9);
  });

  it('Overpressure at full ramp multiplies after the add pool: Quick Nock + Oiled Breech arrows reach 4 × 1.18 × 1.25 = 5.9/s', () => {
    const s = taking(arena(), 'a2', 't1', 'k3');
    s.tube.overpressure = OVERPRESSURE.rampTicks;
    const r = resolveStat(s, 'fire-rate', roundEmission('arrow'), 4);
    expect(r.adds.map((a) => a.value)).toEqual([0.1, 0.08]);
    expect(r.muls).toEqual([{ source: 'Overpressure', value: OVERPRESSURE.rate }]);
    expect(r.final).toBeCloseTo(5.9, 9);
    expect(fireRate(s, 'arrow')).toBeCloseTo(5.9, 9);
    // Half way up the ramp it's ×1.125; with fire released (no ramp) no × at all.
    s.tube.overpressure = OVERPRESSURE.rampTicks / 2;
    expect(fireRate(s, 'arrow')).toBeCloseTo(4 * 1.18 * 1.125, 9);
    s.tube.overpressure = 0;
    expect(fireRate(s, 'arrow')).toBeCloseTo(4 * 1.18, 9);
  });

  it('Rimecraft: flat −1 stack to Freeze, +30 ticks of Freeze (a boss’s 45 becomes 75)', () => {
    const s = taking(arena(), 'a3');
    const chill = resolveStat(s, 'stacks-to-freeze', statusEmission('chill'), COLD.stacksToFreeze);
    expect(chill.flats).toEqual([{ source: 'Rimecraft', value: -1 }]);
    expect(chill.final).toBe(3);
    expect(statOf(s, 'duration', statusEmission('freeze'), COLD.freezeTicks)).toBe(120);
    expect(statOf(s, 'duration', statusEmission('freeze'), COLD.bossFreezeTicks)).toBe(75);
    // Its Freeze line doesn't reach Chill's own duration.
    expect(statOf(s, 'duration', statusEmission('chill'), COLD.stackTicks)).toBe(COLD.stackTicks);
  });

  it('player stats: You lines reach the player and nothing else; gear affixes are You lines', () => {
    const s = wear(taking(arena(), 's1'), piece(0, 'helm', { affixes: [{ kind: 'max-health', value: 12 }] }));
    const r = resolveStat(s, 'max-health', YOU, 100);
    expect(r.flats).toEqual([
      { source: 'Tough Hide', value: 15 },
      { source: 'Test helm', value: 12 },
    ]);
    expect(r.final).toBe(127);
    expect(statOf(s, 'max-health', roundEmission('arrow'), 100)).toBe(100);
  });

  it('gear’s move speed adds are capped at +15% (a cap entry), talents add past it', () => {
    const s = wear(taking(arena(), 's4'), piece(0, 'boots', { affixes: [{ kind: 'move-speed', value: 0.06 }] }), piece(1, 'trinket', { affixes: [{ kind: 'move-speed', value: 0.06 }] }), piece(2, 'helm', { affixes: [{ kind: 'move-speed', value: 0.06 }] }));
    const r = resolveStat(s, 'move-speed', YOU, 1);
    expect(r.adds.map((a) => a.source)).toEqual(['Test helm', 'Test boots', 'Test trinket', 'gear cap', 'Fleet']);
    expect(r.final).toBeCloseTo(1.2, 9);
  });
});

describe('scope reach (039: a scope reaches every emission that carries it)', () => {
  it('Wide Casing (Burst) reaches a bomb, a Bomblet, a landmine and a Pool-burst', () => {
    const s = taking(arena(), 'b2');
    expect(statOf(s, 'radius', roundEmission('bomb'), lobAmmo('bomb').burstRadius)).toBeCloseTo(55.2, 9);
    expect(statOf(s, 'radius', bombletEmission('bomb+cluster'), CLUSTER.radius)).toBeCloseTo(23, 9);
    expect(statOf(s, 'radius', roundEmission('landmine'), mineAmmo('landmine').radius)).toBeCloseTo(27.6, 9);
    expect(statOf(s, 'radius', poolBurstEmission('arrow'), BLASTFLETCH.burstRadius)).toBeCloseTo(27.6, 9);
  });

  it('Black Powder (Bomb) reaches a bomb and its Bomblets, not a landmine', () => {
    const s = taking(arena(), 'b1');
    expect(statOf(s, 'damage', roundEmission('bomb+cluster'), 15)).toBeCloseTo(16.5, 9);
    expect(statOf(s, 'damage', bombletEmission('bomb+cluster'), CLUSTER.damage)).toBeCloseTo(8.8, 9);
    expect(statOf(s, 'damage', roundEmission('landmine'), 60)).toBe(60);
  });

  it('Swift Arc (Lob) reaches bombs, not landmines (their delivery is Mine)', () => {
    const s = taking(arena(), 'b3');
    expect(statOf(s, 'flight-time', roundEmission('bomb'), 40)).toBeCloseTo(30, 9);
    expect(statOf(s, 'flight-time', roundEmission('landmine'), 40)).toBe(40);
  });

  it('in play: a landmine bursts 27.6 px round with Wide Casing (039: it was 24)', () => {
    const s = taking(arena(), 'b2');
    s.inventory = { landmine: 2 };
    const near = placeHusk(s, PLAYER_AT.x + 100 + 26, PLAYER_AT.y);
    near.frozen = 10_000;
    run(s, 1, { selectAmmo: 'landmine' });
    run(s, 1, fireAt(PLAYER_AT.x + 100, PLAYER_AT.y));
    runUntil(s, () => s.events.mineBursts.length > 0, 400);
    expect(s.events.mineBursts[0]?.radius).toBeCloseTo(27.6, 9);
    expect(near.health).toBeLessThan(HUSK.maxHealth);
  });

  it('in play: a Pool-burst reaches 27.6 px with Wide Casing (039: it was 24)', () => {
    const s = taking(arena(), 'k1', 'b2');
    leavePool(s, { roomId: s.roomId, x: PLAYER_AT.x + 40, y: PLAYER_AT.y, radius: 48 }, roundEmission('bomb'));
    const first = placeHusk(s, PLAYER_AT.x + 160, PLAYER_AT.y);
    first.frozen = 10_000;
    const a = createArrow(s.nextArrowId++, 'arrow', s.roomId, PLAYER_AT.x + 10, PLAYER_AT.y, 1, 0);
    s.arrows.push(a);
    runUntil(s, () => s.events.poolBursts.length > 0, 40);
    expect(s.events.poolBursts[0]?.radius).toBeCloseTo(27.6, 9);
  });
});

describe('the lines in play are built once per loadout (039: a perf guard)', () => {
  it('reuses them while the talents and worn pieces stay, and rebuilds when either changes', () => {
    const s = taking(arena(), 'a1');
    const first = activeLines(s);
    expect(activeLines(s)).toBe(first);
    s.talents.push('a2');
    const more = activeLines(s);
    expect(more).not.toBe(first);
    expect(more.map((l) => l.source)).toEqual(["Fletcher's Eye", 'Quick Nock']);
    wear(s, piece(0, 'helm', { affixes: [{ kind: 'armor', value: 2 }] }));
    expect(activeLines(s).map((l) => l.source)).toEqual(["Fletcher's Eye", 'Quick Nock', 'Test helm']);
    // Another sim with the same ids but its own pieces never reads this one's lines.
    const t = wear(taking(arena(), 'a1', 'a2'), piece(0, 'helm', { affixes: [{ kind: 'armor', value: 3 }] }));
    expect(resolveStat(t, 'armor', YOU, 0).final).toBe(3);
  });
});
