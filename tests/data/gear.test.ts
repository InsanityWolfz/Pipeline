import { describe, expect, it } from 'vitest';
import {
  AFFIXES,
  GEAR_NAMES,
  GEAR_SLOTS,
  HEAVY_CHANCE,
  MIN_DAMAGE_SHARE,
  MOVE_BONUS_CAP,
  RARITIES,
  RELIC_AFFIXES,
  RELIC_CHANCE,
  ROLL_COOLDOWN_FLOOR,
  SLOT_BASE,
  SLOT_WEIGHTS,
  type GearPiece,
} from '../../src/data/gear';
import { FEATHERPLATE, LAST_EMBER, RELICS, ROLLBREAKER, WARDSTONE, relicDef } from '../../src/data/relics';
import { PLAYTEST_GEAR, PLAYTEST_START } from '../../src/data/playtest';
import { DAYLIGHT_PALETTE } from '../../src/data/palette';

// Gear's data (036): the spec's starting tables, the four relics, and the playtest kit.

const inRange = (p: GearPiece): boolean => {
  const base = p.slot === 'body' ? SLOT_BASE.body[p.weight ?? 'light'] : SLOT_BASE[p.slot];
  return p.baseArmor >= base.min && p.baseArmor <= base.max;
};

describe('the starting tables', () => {
  it('base armor per slot and body weight, heavy walking at ×0.85', () => {
    expect(SLOT_BASE).toEqual({
      helm: { min: 1, max: 2 },
      boots: { min: 1, max: 2 },
      trinket: { min: 0, max: 0 },
      body: { light: { min: 5, max: 7, walkScale: 1 }, heavy: { min: 10, max: 13, walkScale: 0.85 } },
    });
    expect(GEAR_SLOTS).toEqual(['helm', 'body', 'boots', 'trinket']);
    expect(new Set(Object.values(SLOT_WEIGHTS)).size).toBe(1);
    expect(HEAVY_CHANCE).toBe(0.5);
  });

  it('affix ranges as the spec’s table', () => {
    const range = (k: keyof typeof AFFIXES) => [AFFIXES[k].min * AFFIXES[k].step, AFFIXES[k].max * AFFIXES[k].step].map((v) => Math.round(v * 100) / 100);
    expect(range('max-health')).toEqual([8, 20]);
    expect(range('armor')).toEqual([1, 3]);
    expect(range('regen')).toEqual([0.3, 0.8]);
    expect(range('move-speed')).toEqual([0.03, 0.06]);
    // 039.9: roll cooldown −10% to −20% and roll distance +8% to +16%, whole percents.
    expect(range('roll-cooldown')).toEqual([-0.2, -0.1]);
    expect(range('roll-distance')).toEqual([0.08, 0.16]);
    expect(MOVE_BONUS_CAP).toBe(0.15);
    expect(ROLL_COOLDOWN_FLOOR).toBe(-0.5);
    expect(MIN_DAMAGE_SHARE).toBe(0.25);
  });

  it('rarities: Common 1 at 60%, Fine 2 at 30%, Rare 3 at 10%, relics 3% with their rule and 2, each in a palette colour', () => {
    expect([RARITIES.common, RARITIES.fine, RARITIES.rare].map((r) => [r.affixes, r.chance])).toEqual([[1, 0.6], [2, 0.3], [3, 0.1]]);
    expect(RELIC_CHANCE).toBe(0.03);
    expect(RELIC_AFFIXES).toBe(2);
    expect(RARITIES.relic.affixes).toBe(RELIC_AFFIXES);
    const ids = DAYLIGHT_PALETTE.map((c) => c.id);
    for (const r of Object.values(RARITIES)) expect(ids).toContain(r.color);
    expect(new Set(Object.values(RARITIES).map((r) => r.color)).size).toBe(4);
  });

  it('every slot has names, the body’s by weight', () => {
    for (const parts of [GEAR_NAMES.helm, GEAR_NAMES.boots, GEAR_NAMES.trinket, GEAR_NAMES.body.light, GEAR_NAMES.body.heavy]) {
      expect(parts.adjectives.length).toBeGreaterThan(0);
      expect(parts.nouns.length).toBeGreaterThan(0);
    }
  });
});

describe('the relics', () => {
  it('are the four, with kebab-case ids, a slot each and a body relic’s weight, and the spec’s tuning', () => {
    expect(RELICS.map((r) => r.id)).toEqual(['rollbreaker-greaves', 'wardstone-circlet', 'featherplate', 'last-ember']);
    for (const r of RELICS) {
      expect(r.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(GEAR_SLOTS).toContain(r.slot);
      expect(r.weight === null).toBe(r.slot !== 'body');
      expect(relicDef(r.id)).toBe(r);
      expect(r.lines.length).toBeGreaterThan(0);
    }
    expect([ROLLBREAKER.slot, WARDSTONE.slot, FEATHERPLATE.slot, LAST_EMBER.slot]).toEqual(['boots', 'helm', 'body', 'trinket']);
    expect(FEATHERPLATE.weight).toBe('heavy');
    expect(ROLLBREAKER.stunTicks).toBe(40);
    expect(WARDSTONE.wardTicks).toBe(360);
    // Its numbers live in its lines only: heavy armor's slow lifted to ×1, its roll distance ×0.75.
    expect(FEATHERPLATE.lines).toEqual([
      { scope: 'you', rule: 'no-heavy-slow', params: { walk: 1 } },
      { scope: 'you', stat: 'roll-distance', op: 'mul', value: 0.75 },
    ]);
    expect(LAST_EMBER).toMatchObject({ saveHealth: 1, saveInvulnTicks: 60 });
    expect(() => relicDef('nope')).toThrow();
  });
});

describe('the playtest kit', () => {
  it('carries 3 unidentified pieces, a Rare piece in each slot and one relic, none worn, all in range', () => {
    expect(PLAYTEST_START.inventory['unidentified-armor']).toBe(3);
    expect(PLAYTEST_START.gear).toBe(PLAYTEST_GEAR);
    const rares = PLAYTEST_GEAR.filter((p) => p.rarity === 'rare');
    expect(rares.map((p) => p.slot).sort()).toEqual([...GEAR_SLOTS].sort());
    const relics = PLAYTEST_GEAR.filter((p) => p.relic !== null);
    expect(relics).toHaveLength(1);
    expect(new Set(PLAYTEST_GEAR.map((p) => p.id)).size).toBe(PLAYTEST_GEAR.length);
    for (const p of PLAYTEST_GEAR) {
      expect(inRange(p), p.name).toBe(true);
      expect(p.weight === null).toBe(p.slot !== 'body');
      expect(p.affixes).toHaveLength(RARITIES[p.rarity].affixes);
      expect(new Set(p.affixes.map((a) => a.kind)).size).toBe(p.affixes.length);
      for (const a of p.affixes) {
        const d = AFFIXES[a.kind];
        expect(a.value).toBeGreaterThanOrEqual(d.min * d.step - 1e-9);
        expect(a.value).toBeLessThanOrEqual(d.max * d.step + 1e-9);
      }
      if (p.relic) {
        const def = relicDef(p.relic);
        expect([p.slot, p.weight, p.name]).toEqual([def.slot, def.weight, def.name]);
      }
    }
  });
});
