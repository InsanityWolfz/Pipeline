import { describe, expect, it } from 'vitest';
import { AMMO, ammoDef } from '../../src/data/ammo';
import { ITEMS } from '../../src/data/items';
import { BUILD_BAR, PIECES, pieceDef } from '../../src/data/pieces';
import { recipeDef } from '../../src/data/recipes';
import { STAGE_RECIPES, STAGES } from '../../src/data/stages';
import { COLD, HOMING, ROUNDS, roundBase, roundId, roundTags, STAR, TAGS, withTag, type TagDef } from '../../src/data/tags';

// Tags and stages as data (029): a round is its base ammo plus at most one element
// tag and one shape tag; every legal combination's item and ammo are derived.

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe('tags', () => {
  it("are Milestone 1's three and 038's cluster, each with a slot, prefix, base and numbers", () => {
    expect(Object.values(TAGS).map(({ id, slot, prefix, appliesTo }) => ({ id, slot, prefix, appliesTo }))).toEqual([
      { id: 'frost', slot: 'element', prefix: 'Frost', appliesTo: 'arrow' },
      { id: 'homing', slot: 'shape', prefix: 'Homing', appliesTo: 'ley-bolt' },
      { id: 'star', slot: 'shape', prefix: 'Star', appliesTo: 'ley-bolt' },
      { id: 'cluster', slot: 'shape', prefix: 'Cluster', appliesTo: 'bomb' },
    ]);
    for (const [key, t] of Object.entries(TAGS)) {
      expect(t.id).toBe(key);
      expect(t.id).toMatch(KEBAB);
      expect(AMMO[t.appliesTo]).toBeDefined();
    }
    expect(COLD).toEqual({ slowPerStack: 0.15, stacksToFreeze: 4, stackTicks: 120, freezeTicks: 90, bossFreezeTicks: 45, refreezeTicks: 120 });
    expect(HOMING).toEqual({ lockRadius: 64, turnDegrees: 4 });
    expect(STAR).toMatchObject({ shards: 5, damage: 4, range: 64, speed: 360 });
  });

  it('derive every legal round, each in AMMO and ITEMS', () => {
    expect([...ROUNDS]).toEqual(['arrow+frost', 'ley-bolt+homing', 'ley-bolt+star', 'bomb+cluster']);
    for (const id of ROUNDS) {
      const ammo = ammoDef(id);
      expect(ammo.itemId).toBe(id);
      expect(ITEMS[id]?.kind).toBe('ammo');
      expect(ammo.base).toBe(roundBase(id));
      expect(ammo.tags).toEqual(roundTags(id));
      for (const part of id.split('+')) expect(part).toMatch(KEBAB);
    }
    expect(ammoDef('arrow')).toMatchObject({ base: 'arrow', tags: [] });
  });

  it('name each round from its prefixes', () => {
    expect(ITEMS['arrow+frost']?.name).toBe('Frost arrow');
    expect(ITEMS['ley-bolt+homing']?.name).toBe('Homing ley bolt');
    expect(ITEMS['ley-bolt+star']?.name).toBe('Star ley bolt');
    expect(ITEMS['ley-bolt']?.name).toBe('Ley bolt');
    expect(ITEMS['ley-crystal']?.name).toBe('Ley crystal');
  });

  it("set the damage type from the element, and keep the base's other numbers", () => {
    const frost = ammoDef('arrow+frost');
    const arrow = ammoDef('arrow');
    expect(frost.damageType).toBe('cold');
    expect({ ...frost, id: 'arrow', itemId: 'arrow', damageType: 'physical', tags: [] }).toEqual(arrow);
    expect(ammoDef('ley-bolt+homing').damageType).toBe('physical');
    expect({ ...ammoDef('ley-bolt+star'), id: 'ley-bolt', itemId: 'ley-bolt', tags: [] }).toEqual(ammoDef('ley-bolt'));
  });

  it('put elements first in a round id', () => {
    const table: Record<string, TagDef> = {
      ...TAGS,
      heavy: { id: 'heavy', slot: 'shape', prefix: 'Heavy', appliesTo: 'arrow', behaviour: 'star' },
    };
    expect(roundId('arrow', ['heavy', 'frost'], table)).toBe('arrow+frost+heavy');
    expect(withTag('arrow+heavy', 'frost', table)).toBe('arrow+frost+heavy');
  });

  it('refuse a second element or a second shape, and a tag the base does not take', () => {
    const table: Record<string, TagDef> = {
      ...TAGS,
      fire: { id: 'fire', slot: 'element', prefix: 'Fire', appliesTo: 'arrow', behaviour: 'cold', damageType: 'fire' },
    };
    expect(withTag('arrow+frost', 'fire', table)).toBeNull();
    expect(withTag('arrow+frost', 'frost')).toBeNull();
    expect(withTag('ley-bolt+homing', 'star')).toBeNull();
    expect(withTag('ley-bolt+star', 'homing')).toBeNull();
    expect(withTag('ley-bolt', 'frost')).toBeNull();
    expect(withTag('bomb', 'star')).toBeNull();
    expect(withTag('arrow', 'frost')).toBe('arrow+frost');
    expect(() => roundId('ley-bolt', ['homing', 'star'])).toThrow();
  });
});

describe('stages', () => {
  it("are Milestone 1's three and 038's Shard die, with the specs' starting values", () => {
    expect(Object.values(STAGES).map(({ id, tag, batch, material, materialCount, craftTicks }) => ({ id, tag, batch, material, materialCount, craftTicks }))).toEqual([
      { id: 'frost-rune', tag: 'frost', batch: 4, material: 'rime-shard', materialCount: 1, craftTicks: 60 },
      { id: 'ley-guide', tag: 'homing', batch: 4, material: 'ley-crystal', materialCount: 1, craftTicks: 60 },
      { id: 'shatter-lens', tag: 'star', batch: 4, material: 'ley-crystal', materialCount: 2, craftTicks: 60 },
      { id: 'shard-die', tag: 'cluster', batch: 4, material: 'ley-iron', materialCount: 1, craftTicks: 60 },
    ]);
    for (const [key, st] of Object.entries(STAGES)) {
      expect(st.id).toBe(key);
      expect(ITEMS[st.material]?.kind).toBe('raw');
      expect(TAGS[st.tag]).toBeDefined();
      expect(st.name.length).toBeGreaterThan(0);
      expect(st.description.length).toBeGreaterThan(0);
    }
  });

  it('each run their plain base into the tagged round, as a recipe', () => {
    expect(recipeDef('frost-rune')).toEqual({ id: 'frost-rune', inputs: { arrow: 4, 'rime-shard': 1 }, output: { itemId: 'arrow+frost', count: 4 } });
    expect(recipeDef('ley-guide')).toEqual({ id: 'ley-guide', inputs: { 'ley-bolt': 4, 'ley-crystal': 1 }, output: { itemId: 'ley-bolt+homing', count: 4 } });
    expect(recipeDef('shatter-lens')).toEqual({ id: 'shatter-lens', inputs: { 'ley-bolt': 4, 'ley-crystal': 2 }, output: { itemId: 'ley-bolt+star', count: 4 } });
    expect(Object.keys(STAGE_RECIPES)).toEqual(Object.keys(STAGES));
  });

  it('are 1x1 machines in their base ammo group on the build bar', () => {
    expect(pieceDef('frost-rune')).toMatchObject({ kind: 'machine', name: 'Frost rune', category: 'arrows', recipeId: 'frost-rune', footprint: '1x1', craftTicks: 60 });
    expect(pieceDef('ley-guide')).toMatchObject({ kind: 'machine', name: 'Ley guide', category: 'ley', footprint: '1x1' });
    expect(pieceDef('shatter-lens')).toMatchObject({ kind: 'machine', name: 'Shatter lens', category: 'ley', footprint: '1x1' });
    for (const id of Object.keys(STAGES)) expect(BUILD_BAR).toContain(id);
    expect(BUILD_BAR.indexOf('frost-rune')).toBeGreaterThan(BUILD_BAR.indexOf('assembler'));
    expect(BUILD_BAR.indexOf('frost-rune')).toBeLessThan(BUILD_BAR.indexOf('shaper'));
    expect(BUILD_BAR.slice(-4, -2)).toEqual(['ley-guide', 'shatter-lens']);
    expect(pieceDef('shard-die')).toMatchObject({ kind: 'machine', name: 'Shard die', category: 'bombs', footprint: '1x1' });
    expect(Object.keys(PIECES)).toContain('shatter-lens');
  });
});

describe('the rime shard (029)', () => {
  it('is a raw', () => {
    expect(ITEMS['rime-shard']).toMatchObject({ id: 'rime-shard', name: 'Rime shard', kind: 'raw' });
  });
});
