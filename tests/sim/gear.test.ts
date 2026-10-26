import { describe, expect, it } from 'vitest';
import { AFFIXES, ARMOR_DROP_CHANCE, GEAR_NAMES, GEAR_SLOTS, RARITIES, RELIC_AFFIXES, RELIC_CHANCE, SLOT_BASE, UNIDENTIFIED_ARMOR, type GearPiece } from '../../src/data/gear';
import { RELICS } from '../../src/data/relics';
import { MAX_HEALTH } from '../../src/data/player';
import { PLAYTEST_GEAR, PLAYTEST_START } from '../../src/data/playtest';
import { rollArmorDrop, rollPiece } from '../../src/sim/gear';
import { claim } from '../../src/sim/claims';
import { createRng } from '../../src/sim/rng';
import { createSim, type SimState } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { summarize } from '../../src/sim/summary';
import { arena, atPylon, command, HALL, movePlayer, placeHusk, PLAYER_AT, run, SEED } from './fight';
import { piece, standAtBench } from '../fixtures/gear';

/** The foundry with the player beside the identification bench, carrying `n` unidentified pieces. */
function atBench(n = 1, seed = SEED): SimState {
  const s = standAtBench(createSim(seed));
  s.inventory[UNIDENTIFIED_ARMOR] = n;
  return s;
}

/** Many rolled pieces, one per seed. */
const rolls = (n: number): GearPiece[] => Array.from({ length: n }, (_, seed) => rollPiece(createRng(seed), seed));

describe('gear drops (010, unchanged)', () => {
  it('the first Husk ever killed always drops a piece, and a KO keeps that it has', () => {
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

  it('walking over a drop carries it as one unidentified piece', () => {
    const s = arena();
    s.groundItems.push({ id: 0, itemId: UNIDENTIFIED_ARMOR, roomId: HALL, x: PLAYER_AT.x, y: PLAYER_AT.y });
    run(s, 1);
    expect(s.inventory[UNIDENTIFIED_ARMOR]).toBe(1);
  });

  it('the first unidentified piece picked up survives a KO, kept like a banked item; a second is still at risk (fix-playtest-ui)', () => {
    const s = arena();
    s.groundItems.push({ id: 0, itemId: UNIDENTIFIED_ARMOR, roomId: HALL, x: PLAYER_AT.x, y: PLAYER_AT.y });
    run(s, 1);
    expect(s.inventory[UNIDENTIFIED_ARMOR]).toBe(1);
    expect(summarize(s).atRisk[UNIDENTIFIED_ARMOR]).toBeUndefined();
    s.groundItems.push({ id: 1, itemId: UNIDENTIFIED_ARMOR, roomId: HALL, x: PLAYER_AT.x, y: PLAYER_AT.y });
    run(s, 1);
    expect(s.inventory[UNIDENTIFIED_ARMOR]).toBe(2);
    expect(summarize(s).atRisk[UNIDENTIFIED_ARMOR]).toBe(1);
    s.player.health = 0;
    for (let t = 0; t < 400 && !s.events.ko; t++) stepSim(s);
    expect(s.events.ko).toBe(true);
    expect(s.inventory[UNIDENTIFIED_ARMOR]).toBe(1);
    expect(s.events.lost[UNIDENTIFIED_ARMOR]).toBe(1);
  });

  it('once a piece has been identified, a picked-up piece is at risk as before (fix-playtest-ui)', () => {
    const s = arena();
    s.gear = [piece(0, 'helm')];
    s.groundItems.push({ id: 0, itemId: UNIDENTIFIED_ARMOR, roomId: HALL, x: PLAYER_AT.x, y: PLAYER_AT.y });
    run(s, 1);
    expect(summarize(s).atRisk[UNIDENTIFIED_ARMOR]).toBe(1);
  });

  it('a deposit at a claimed pylon stashes unidentified gear too', () => {
    const s = createSim(SEED);
    claim(s, 'shrine');
    atPylon(s);
    s.inventory = { [UNIDENTIFIED_ARMOR]: 2 };
    stepSim(s, command({ pylon: 'deposit' }));
    expect(s.stash[UNIDENTIFIED_ARMOR]).toBe(2);
  });
});

describe('rolling a piece', () => {
  it('is deterministic per seed', () => {
    expect(rollPiece(createRng(4), 0)).toEqual(rollPiece(createRng(4), 0));
    expect(rolls(40)).toEqual(rolls(40));
  });

  it('keeps every slot, weight, base armor, rarity, affix count and value in range, with no kind twice', () => {
    const all = rolls(3000);
    for (const p of all) {
      expect(GEAR_SLOTS).toContain(p.slot);
      if (p.relic) continue;
      const base = p.slot === 'body' ? SLOT_BASE.body[p.weight ?? 'light'] : SLOT_BASE[p.slot];
      expect(p.weight === null).toBe(p.slot !== 'body');
      expect(p.baseArmor).toBeGreaterThanOrEqual(base.min);
      expect(p.baseArmor).toBeLessThanOrEqual(base.max);
      expect(['common', 'fine', 'rare']).toContain(p.rarity);
      expect(p.affixes).toHaveLength(RARITIES[p.rarity].affixes);
      expect(new Set(p.affixes.map((a) => a.kind)).size).toBe(p.affixes.length);
      for (const a of p.affixes) {
        const d = AFFIXES[a.kind];
        expect(a.value).toBeGreaterThanOrEqual(d.min * d.step - 1e-9);
        expect(a.value).toBeLessThanOrEqual(d.max * d.step + 1e-9);
        // A whole number of steps.
        expect(Math.abs(a.value / d.step - Math.round(a.value / d.step))).toBeLessThan(1e-9);
      }
      const names = p.slot === 'body' ? GEAR_NAMES.body[p.weight ?? 'light'] : GEAR_NAMES[p.slot];
      const noun = names.nouns.find((n) => p.name.endsWith(` ${n}`));
      expect(noun, p.name).toBeDefined();
      expect(names.adjectives).toContain(p.name.slice(0, p.name.length - (noun?.length ?? 0) - 1));
    }
    // Every slot, both body weights, every rarity and every affix kind turn up.
    expect(new Set(all.map((p) => p.slot)).size).toBe(4);
    expect(new Set(all.filter((p) => p.slot === 'body').map((p) => p.weight)).size).toBe(2);
    expect(new Set(all.flatMap((p) => p.affixes.map((a) => a.kind))).size).toBe(Object.keys(AFFIXES).length);
  });

  it('rolls rarities near 60/30/10 and relics near 3%', () => {
    const all = rolls(6000);
    const share = (pred: (p: GearPiece) => boolean) => all.filter(pred).length / all.length;
    expect(share((p) => p.relic !== null)).toBeCloseTo(RELIC_CHANCE, 2);
    const plain = all.filter((p) => !p.relic);
    const rarity = (r: string) => plain.filter((p) => p.rarity === r).length / plain.length;
    expect(rarity('common')).toBeCloseTo(0.6, 1);
    expect(rarity('fine')).toBeCloseTo(0.3, 1);
    expect(rarity('rare')).toBeCloseTo(0.1, 1);
    // Slots evenly.
    for (const slot of GEAR_SLOTS) expect(share((p) => !p.relic && p.slot === slot) / share((p) => !p.relic)).toBeCloseTo(0.25, 1);
  });

  it('a relic fixes its slot, weight and name, and rolls RELIC_AFFIXES different affixes', () => {
    const relics = rolls(3000).filter((p) => p.relic !== null);
    for (const p of relics) {
      const def = RELICS.find((r) => r.id === p.relic);
      if (!def) throw new Error(`unknown relic ${p.relic}`);
      expect(p.rarity).toBe('relic');
      expect(p.slot).toBe(def.slot);
      expect(p.weight).toBe(def.weight);
      expect(p.name).toBe(def.name);
      expect(p.affixes).toHaveLength(RELIC_AFFIXES);
      expect(new Set(p.affixes.map((a) => a.kind)).size).toBe(RELIC_AFFIXES);
      const base = p.slot === 'body' ? SLOT_BASE.body[p.weight ?? 'light'] : SLOT_BASE[p.slot];
      expect(p.baseArmor).toBeGreaterThanOrEqual(base.min);
      expect(p.baseArmor).toBeLessThanOrEqual(base.max);
    }
    // Each of the four turns up, picked evenly.
    expect(new Set(relics.map((p) => p.relic)).size).toBe(RELICS.length);
  });
});

describe('the identification bench', () => {
  it('identifies every carried piece, its events carrying each whole piece', () => {
    const s = atBench(6);
    run(s, 1, { identify: true });
    expect(s.inventory[UNIDENTIFIED_ARMOR]).toBe(0);
    expect(s.gear).toHaveLength(6);
    expect(s.events.identifies).toEqual(s.gear);
    expect(s.gear.map((p) => p.id)).toEqual([0, 1, 2, 3, 4, 5]);
    const again = atBench(6);
    run(again, 1, { identify: true });
    expect(again.gear).toEqual(s.gear);
  });

  it('only works within reach', () => {
    const s = atBench(2);
    movePlayer(s, 400, 300);
    run(s, 1, { identify: true });
    expect(s.gear).toEqual([]);
  });
});

describe('equipping', () => {
  /** At the bench with a helm, two body pieces and boots identified. */
  const kit = (): SimState => {
    const s = atBench(0);
    s.gear = [piece(0, 'helm', { baseArmor: 1 }), piece(1, 'body', { baseArmor: 5 }), piece(2, 'body', { baseArmor: 11, weight: 'heavy' }), piece(3, 'boots', { baseArmor: 2 })];
    s.nextGearId = 4;
    return s;
  };

  it('wears one piece per slot, and a piece replaces whatever its slot wore', () => {
    const s = kit();
    expect(s.equipped).toEqual({ helm: null, body: null, boots: null, trinket: null });
    run(s, 1, { equip: { id: 0 } });
    run(s, 1, { equip: { id: 1 } });
    run(s, 1, { equip: { id: 3 } });
    expect(s.equipped).toEqual({ helm: 0, body: 1, boots: 3, trinket: null });
    run(s, 1, { equip: { id: 2 } });
    expect(s.equipped).toEqual({ helm: 0, body: 2, boots: 3, trinket: null });
    expect(s.events.equips).toEqual([{ slot: 'body', id: 2 }]);
  });

  it('equipping the worn piece takes it off, and so does { slot, id: null }', () => {
    const s = kit();
    run(s, 1, { equip: { id: 0 } });
    run(s, 1, { equip: { id: 1 } });
    run(s, 1, { equip: { id: 0 } });
    expect(s.equipped.helm).toBeNull();
    expect(s.events.equips).toEqual([{ slot: 'helm', id: null }]);
    run(s, 1, { equip: { slot: 'body', id: null } });
    expect(s.equipped.body).toBeNull();
    expect(s.events.equips).toEqual([{ slot: 'body', id: null }]);
    // Taking off an empty slot changes nothing.
    run(s, 1, { equip: { slot: 'body', id: null } });
    expect(s.events.equips).toEqual([]);
  });

  it('an unknown id does nothing, and equipping happens only at the bench', () => {
    const s = kit();
    run(s, 1, { equip: { id: 99 } });
    expect(s.equipped).toEqual({ helm: null, body: null, boots: null, trinket: null });
    run(s, 1, { equip: { id: 1 } });
    run(s, 1, { equip: { id: 99 } });
    expect(s.equipped.body).toBe(1);
    movePlayer(s, 400, 300);
    run(s, 1, { equip: { id: 2 } });
    expect(s.equipped.body).toBe(1);
    run(s, 1, { equip: { slot: 'body', id: null } });
    expect(s.equipped.body).toBe(1);
  });

  it('a start’s pieces (the playtest’s) are carried identified from the first tick, none worn, ids carrying on after them', () => {
    const s = standAtBench(createSim(SEED, { start: PLAYTEST_START }));
    expect(s.gear).toEqual(PLAYTEST_GEAR);
    expect(s.gear).not.toBe(PLAYTEST_GEAR);
    expect(s.equipped).toEqual({ helm: null, body: null, boots: null, trinket: null });
    s.inventory[UNIDENTIFIED_ARMOR] = 1;
    run(s, 1, { identify: true });
    expect(s.gear.map((p) => p.id)).toEqual([...PLAYTEST_GEAR.map((p) => p.id), PLAYTEST_GEAR.length]);
  });

  it('getState reports the gear, what each slot wears, the stats and the relic states', () => {
    const s = kit();
    run(s, 1, { equip: { id: 2 } });
    const sum = summarize(s);
    expect(sum.gear).toEqual(s.gear);
    expect(sum.equipped).toEqual({ helm: null, body: 2, boots: null, trinket: null });
    expect(sum.stats).toMatchObject({ armor: 11, maxHealth: MAX_HEALTH });
    expect(sum.relics).toEqual({ wardTicks: 0, wardReady: false, emberSpent: false });
    expect(sum.player.maxHealth).toBe(MAX_HEALTH);
  });
});
