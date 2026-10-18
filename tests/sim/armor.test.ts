import { describe, expect, it } from 'vitest';
import { ARMOR_DROP_CHANCE, ARMOR_WEIGHTS, MIN_DAMAGE, UNIDENTIFIED_ARMOR } from '../../src/data/armor';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { ROLL_TICKS } from '../../src/data/player';
import { afterArmor, rollArmorDrop, walkScale } from '../../src/sim/armor';
import { claim } from '../../src/sim/claims';
import { fixtureDef } from '../../src/sim/fixtures';
import { createSim, type SimState } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { arena, atPylon, command, HALL, HUSK, movePlayer, placeHusk, PLAYER_AT, run, SEED } from './fight';

/** The foundry with the player beside the identification bench, carrying `n` unidentified pieces. */
function atBench(n = 1, seed = SEED): SimState {
  const s = createSim(seed);
  s.roomId = FOUNDRY_ROOM;
  s.link.attuned = true;
  const bench = fixtureDef('identification-bench');
  const at = tileCentre({ tx: bench.tx + 1, ty: bench.ty });
  movePlayer(s, at.x, at.y);
  s.inventory[UNIDENTIFIED_ARMOR] = n;
  return s;
}

describe('armor drops', () => {
  it('the first Husk ever killed always drops a bundle, and a KO keeps that it has', () => {
    const s = arena();
    const e = placeHusk(s, PLAYER_AT.x + 200, PLAYER_AT.y);
    e.health = 0;
    run(s, 1);
    expect(s.groundItems.filter((g) => g.itemId === UNIDENTIFIED_ARMOR)).toHaveLength(1);
    expect(s.firstHuskDropped).toBe(true);
    s.player.health = 0;
    stepSim(s);
    expect(s.firstHuskDropped).toBe(true);
  });

  it('after that, drops follow each enemy chance from the seed', () => {
    const rate = (enemyId: string, seed: number) => {
      const s = createSim(seed);
      s.firstHuskDropped = true;
      let n = 0;
      for (let i = 0; i < 2000; i++) if (rollArmorDrop(s, enemyId)) n += 1;
      return n / 2000;
    };
    expect(rate('husk', 3)).toBeCloseTo(ARMOR_DROP_CHANCE.husk ?? 0, 1);
    expect(rate('wisp', 3)).toBeCloseTo(ARMOR_DROP_CHANCE.wisp ?? 0, 1);
    expect(rate('pylon-warden', 3)).toBe(1);
    expect(rate('husk', 9)).toBe(rate('husk', 9));
  });

  it('walking over a bundle carries it as unidentified armor', () => {
    const s = arena();
    s.groundItems.push({ id: 0, itemId: UNIDENTIFIED_ARMOR, roomId: HALL, x: PLAYER_AT.x, y: PLAYER_AT.y });
    run(s, 1);
    expect(s.inventory[UNIDENTIFIED_ARMOR]).toBe(1);
  });
});

describe('the identification bench', () => {
  it('identifies every carried piece into light or heavy armor with a name', () => {
    const s = atBench(6);
    run(s, 1, { identify: true });
    expect(s.inventory[UNIDENTIFIED_ARMOR]).toBe(0);
    expect(s.armor).toHaveLength(6);
    expect(s.events.identifies).toHaveLength(6);
    for (const a of s.armor) {
      const w = ARMOR_WEIGHTS[a.weight];
      expect(a.armor).toBeGreaterThanOrEqual(w.min);
      expect(a.armor).toBeLessThanOrEqual(w.max);
      const [adj, noun] = a.name.split(' ');
      expect(w.adjectives).toContain(adj);
      expect(w.nouns).toContain(noun);
    }
    expect(atBench(6).armor).toEqual([]);
    const again = atBench(6);
    run(again, 1, { identify: true });
    expect(again.armor).toEqual(s.armor);
  });

  it('only works within reach', () => {
    const s = atBench(2);
    movePlayer(s, 400, 300);
    run(s, 1, { identify: true });
    expect(s.armor).toEqual([]);
  });

  it('wears, swaps and takes off a piece', () => {
    const s = atBench(2);
    run(s, 1, { identify: true });
    const [a, b] = s.armor;
    if (!a || !b) throw new Error('two pieces');
    run(s, 1, { equip: { id: a.id } });
    expect(s.equipped).toBe(a.id);
    run(s, 1, { equip: { id: b.id } });
    expect(s.equipped).toBe(b.id);
    run(s, 1, { equip: { id: b.id } });
    expect(s.equipped).toBeNull();
    expect(s.events.equips).toEqual([{ id: null }]);
    expect(summarize(s).armorPieces).toHaveLength(2);
    run(s, 1, { equip: { id: 99 } });
    expect(s.equipped).toBeNull();
    run(s, 1, { equip: { id: a.id } });
    run(s, 1, { equip: { id: 99 } });
    expect(s.equipped).toBe(a.id);
  });

  it('a deposit at a claimed pylon stashes unidentified armor too', () => {
    const s = createSim(SEED);
    claim(s, 'shrine');
    atPylon(s);
    s.inventory = { [UNIDENTIFIED_ARMOR]: 2 };
    stepSim(s, command({ pylon: 'deposit' }));
    expect(s.stash[UNIDENTIFIED_ARMOR]).toBe(2);
  });
});

describe('wearing armor', () => {
  const wear = (weight: 'light' | 'heavy', armor: number): SimState => {
    const s = arena();
    s.armor = [{ id: 0, weight, armor, name: 'Test Plate' }];
    s.equipped = 0;
    return s;
  };

  it('takes the armor off every hit, never below MIN_DAMAGE', () => {
    expect(afterArmor(wear('heavy', 6), 20)).toBe(14);
    expect(afterArmor(wear('heavy', 8), 5)).toBe(MIN_DAMAGE);
    const s = wear('light', 3);
    placeHusk(s, PLAYER_AT.x + 20, PLAYER_AT.y);
    run(s, HUSK.swipe.windupTicks + 1);
    expect(s.player.health).toBe(100 - (HUSK.swipe.damage - 3));
  });

  it('heavy armor walks slower; the roll covers the same ground', () => {
    const walked = (s: SimState) => {
      const x = s.player.x;
      run(s, 60, { moveX: 1 });
      return s.player.x - x;
    };
    const plain = walked(arena());
    expect(walked(wear('light', 3))).toBeCloseTo(plain);
    // Top speed scales exactly; the short speed-up at the start makes the distance a hair off.
    expect(Math.abs(walked(wear('heavy', 6)) - plain * ARMOR_WEIGHTS.heavy.walkScale)).toBeLessThan(1.5);
    expect(walkScale(wear('heavy', 6))).toBe(ARMOR_WEIGHTS.heavy.walkScale);
    const rolled = (s: SimState) => {
      const x = s.player.x;
      run(s, 1, { moveX: 1, dodge: true });
      run(s, ROLL_TICKS);
      return s.player.x - x;
    };
    // The roll itself is unchanged; only the walk speed it settles back to differs.
    expect(Math.abs(rolled(wear('heavy', 6)) - rolled(arena()))).toBeLessThan(2);
  });
});
