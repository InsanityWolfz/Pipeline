import { describe, expect, it } from 'vitest';
import { HOLLOWS } from '../../src/data/hollows';
import { HOLLOWS_START } from '../../src/data/playtest';
import { altarInReach, altarState } from '../../src/sim/altar';
import { createSim, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { die, movePlayer, run } from './fight';

// Boss refights at an altar (034, round 11): after the first kill, an offering at the
// Sunken Forum's altar summons the Bulwark again for its drops.

const A = HOLLOWS.arena;
const ALTAR = A.altar.id;
const OFFERING = A.offering['ley-iron'] ?? 0;
const SEED = 5;

/** The hollows start standing beside the altar (east of it, in reach), every other enemy gone, carrying `ironCount` ley-iron. */
function atAltar(ironCount = OFFERING): SimState {
  const s = createSim(SEED, { start: HOLLOWS_START });
  s.enemies = s.enemies.filter((e) => e.enemyId === 'bulwark');
  const by = tileCentre({ tx: A.altar.tx + 1, ty: A.altar.ty });
  movePlayer(s, by.x, by.y);
  s.inventory = { 'ley-iron': ironCount };
  return s;
}

/** Kills the live Bulwark this tick. */
function kill(s: SimState): void {
  const b = s.enemies.find((e) => e.enemyId === 'bulwark');
  if (!b) throw new Error('no Bulwark');
  b.health = 0;
  run(s, 1);
}

describe('the altar', () => {
  it('stands solid by the forum wall with an 8 ley-iron offering and a 120-tick summon', () => {
    expect(A.offering).toEqual({ 'ley-iron': 8 });
    expect(A.summonTicks).toBe(120);
    const s = atAltar();
    expect(altarInReach(s)?.id).toBe(ALTAR);
  });

  it('is dim before the first kill: E at it does nothing, and an offering is refused', () => {
    const s = atAltar();
    expect(altarState(s, ALTAR)).toBe('dim');
    run(s, 1, { interact: true });
    run(s, 1, { summon: ALTAR });
    expect(s.inventory['ley-iron']).toBe(OFFERING);
    expect(s.events.summons).toEqual([]);
    expect(summarize(s).altars).toEqual([{ id: ALTAR, boss: 'bulwark', state: 'dim', summonTicks: 0 }]);
  });

  it('wakes on the first kill', () => {
    const s = atAltar();
    kill(s);
    expect(altarState(s, ALTAR)).toBe('awake');
  });

  it('takes the offering, records a summons, and raises the Bulwark at its start point after 120 ticks', () => {
    const s = atAltar(OFFERING + 2);
    kill(s);
    s.groundItems = [];
    run(s, 1, { summon: ALTAR });
    expect(s.inventory['ley-iron']).toBe(2);
    expect(s.events.summons).toEqual([{ altar: ALTAR, boss: 'bulwark' }]);
    expect(altarState(s, ALTAR)).toBe('summoning');
    run(s, A.summonTicks - 2);
    expect(s.enemies.some((e) => e.enemyId === 'bulwark')).toBe(false);
    expect(summarize(s).altars[0]?.summonTicks).toBe(A.summonTicks - 1);
    run(s, 1);
    const b = s.enemies.find((e) => e.enemyId === 'bulwark');
    expect({ x: b?.x, y: b?.y }).toEqual(tileCentre(A.start));
    expect(altarState(s, ALTAR)).toBe('spent');
  });

  it('is spent while the summoned one lives: a second offering is refused and not taken', () => {
    const s = atAltar(OFFERING * 2);
    kill(s);
    run(s, 1, { summon: ALTAR });
    run(s, A.summonTicks);
    run(s, 1, { summon: ALTAR });
    expect(s.inventory['ley-iron']).toBe(OFFERING);
    expect(s.events.summons).toEqual([]);
  });

  it('refuses an offering the player can\'t pay', () => {
    const s = atAltar(OFFERING - 1);
    kill(s);
    run(s, 1, { summon: ALTAR });
    expect(s.inventory['ley-iron']).toBe(OFFERING - 1);
    expect(altarState(s, ALTAR)).toBe('awake');
  });

  it('gives the same fight and the same drops, and wakes again once it falls', () => {
    const s = atAltar();
    kill(s);
    s.groundItems = [];
    run(s, 1, { summon: ALTAR });
    run(s, A.summonTicks);
    kill(s);
    const by = (id: string) => s.groundItems.filter((g) => g.itemId === id).length;
    expect(by('bulwark-core')).toBe(1);
    expect(by('ley-iron')).toBeGreaterThanOrEqual(4);
    expect(s.events.bossDefeats).toEqual([]);
    expect(altarState(s, ALTAR)).toBe('awake');
  });

  it("waits, healed, if the player leaves, with no refund; and a KO doesn't eat the offering", () => {
    const s = atAltar();
    kill(s);
    run(s, 1, { summon: ALTAR });
    run(s, A.summonTicks);
    const b = s.enemies.find((e) => e.enemyId === 'bulwark');
    if (!b) throw new Error('no Bulwark');
    b.health = 300;
    die(s);
    run(s, 1);
    const back = s.enemies.find((e) => e.enemyId === 'bulwark');
    expect(back?.health).toBe(900);
    expect(altarState(s, ALTAR)).toBe('spent');
    expect(s.inventory['ley-iron'] ?? 0).toBe(0);
  });
});
