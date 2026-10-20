import { describe, expect, it } from 'vitest';
import { AMMO, ammoDef } from '../../src/data/ammo';
import { ITEMS } from '../../src/data/items';
import { BUILD_BAR, PIECES, pieceDef } from '../../src/data/pieces';
import { recipeDef } from '../../src/data/recipes';
import { STAGE_RECIPES, STAGES, stageLines } from '../../src/data/stages';
import { COLD, HOMING, ROUNDS, roundBase, roundId, roundTags, SPLIT, TAGS, withTag, type TagDef } from '../../src/data/tags';

// Tags and stages as data (029): a round is its base ammo plus at most one element
// tag and one shape tag; every legal combination's item and ammo are derived.

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe('tags', () => {
  it("are Milestone 1's three and 038's cluster, each with a slot, prefix, base and numbers", () => {
    expect(Object.values(TAGS).map(({ id, slot, prefix, appliesTo }) => ({ id, slot, prefix, appliesTo }))).toEqual([
      { id: 'frost', slot: 'element', prefix: 'Frost', appliesTo: ['arrow', 'bomb', 'ley-bolt', 'landmine'] },
      { id: 'homing', slot: 'shape', prefix: 'Homing', appliesTo: ['ley-bolt'] },
      { id: 'split', slot: 'shape', prefix: 'Split', appliesTo: ['ley-bolt'] },
      { id: 'cluster', slot: 'shape', prefix: 'Cluster', appliesTo: ['bomb'] },
    ]);
    for (const [key, t] of Object.entries(TAGS)) {
      expect(t.id).toBe(key);
      expect(t.id).toMatch(KEBAB);
      for (const base of t.appliesTo) expect(AMMO[base]).toBeDefined();
    }
    expect(COLD).toEqual({ chillPerHit: 1, slowPerStack: 0.15, stacksToFreeze: 4, stackTicks: 120, freezeTicks: 90, bossFreezeTicks: 45, refreezeTicks: 120 });
    expect(HOMING).toEqual({ lockRadius: 64, turnDegrees: 4 });
    expect(SPLIT).toMatchObject({ shards: 5, damage: 4, range: 64, speed: 360 });
  });

  it('derive every legal round, each in AMMO and ITEMS', () => {
    // 039: the frost tag on every family; shapes per family.
    expect([...ROUNDS]).toEqual(['arrow+frost', 'bomb+frost', 'bomb+cluster', 'bomb+frost+cluster', 'ley-bolt+frost', 'ley-bolt+homing', 'ley-bolt+split', 'ley-bolt+frost+homing', 'ley-bolt+frost+split', 'landmine+frost']);
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
    expect(ITEMS['ley-bolt+split']?.name).toBe('Split ley bolt');
    expect(ITEMS['ley-bolt']?.name).toBe('Ley bolt');
    expect(ITEMS['ley-crystal']?.name).toBe('Ley crystal');
  });

  it("set the damage type from the element, and keep the base's other numbers", () => {
    const frost = ammoDef('arrow+frost');
    const arrow = ammoDef('arrow');
    expect(frost.damageType).toBe('cold');
    expect({ ...frost, id: 'arrow', itemId: 'arrow', damageType: 'physical', tags: [] }).toEqual(arrow);
    expect(ammoDef('ley-bolt+homing').damageType).toBe('physical');
    expect({ ...ammoDef('ley-bolt+split'), id: 'ley-bolt', itemId: 'ley-bolt', tags: [] }).toEqual(ammoDef('ley-bolt'));
  });

  it('put elements first in a round id', () => {
    const table: Record<string, TagDef> = {
      ...TAGS,
      heavy: { id: 'heavy', slot: 'shape', prefix: 'Heavy', appliesTo: ['arrow'], keyword: 'split' },
    };
    expect(roundId('arrow', ['heavy', 'frost'], table)).toBe('arrow+frost+heavy');
    expect(withTag('arrow+heavy', 'frost', table)).toBe('arrow+frost+heavy');
  });

  it('refuse a second element or a second shape, and a tag the base does not take', () => {
    const table: Record<string, TagDef> = {
      ...TAGS,
      fire: { id: 'fire', slot: 'element', prefix: 'Fire', appliesTo: ['arrow'], keyword: 'fire', damageType: 'fire' },
    };
    expect(withTag('arrow+frost', 'fire', table)).toBeNull();
    expect(withTag('arrow+frost', 'frost')).toBeNull();
    expect(withTag('ley-bolt+homing', 'split')).toBeNull();
    expect(withTag('ley-bolt+split', 'homing')).toBeNull();
    expect(withTag('ley-bolt', 'frost')).toBe('ley-bolt+frost');
    expect(withTag('landmine', 'homing')).toBeNull();
    expect(withTag('bomb', 'split')).toBeNull();
    expect(withTag('arrow', 'frost')).toBe('arrow+frost');
    expect(() => roundId('ley-bolt', ['homing', 'split'])).toThrow();
  });
});

describe('stages', () => {
  it("are Milestone 1's three and 038's Cluster die, with the specs' starting values", () => {
    expect(Object.values(STAGES).map(({ id, tag, batch, material, materialCount, craftTicks }) => ({ id, tag, batch, material, materialCount, craftTicks }))).toEqual([
      { id: 'frost-rune', tag: 'frost', batch: 4, material: 'rimestone', materialCount: 1, craftTicks: 60 },
      { id: 'ley-guide', tag: 'homing', batch: 4, material: 'ley-crystal', materialCount: 1, craftTicks: 60 },
      { id: 'prism-lens', tag: 'split', batch: 4, material: 'ley-crystal', materialCount: 2, craftTicks: 60 },
      { id: 'cluster-die', tag: 'cluster', batch: 4, material: 'ley-iron', materialCount: 1, craftTicks: 60 },
    ]);
    for (const [key, st] of Object.entries(STAGES)) {
      expect(st.id).toBe(key);
      expect(ITEMS[st.material]?.kind).toBe('raw');
      expect(TAGS[st.tag]).toBeDefined();
      expect(st.name.length).toBeGreaterThan(0);
      expect(stageLines(st)).toHaveLength(1);
    }
  });

  it('each run their plain base into the tagged round, as a recipe', () => {
    expect(recipeDef('frost-rune')).toEqual({ id: 'frost-rune', inputs: { arrow: 4, 'rimestone': 1 }, output: { itemId: 'arrow+frost', count: 4 } });
    expect(recipeDef('ley-guide')).toEqual({ id: 'ley-guide', inputs: { 'ley-bolt': 4, 'ley-crystal': 1 }, output: { itemId: 'ley-bolt+homing', count: 4 } });
    expect(recipeDef('prism-lens')).toEqual({ id: 'prism-lens', inputs: { 'ley-bolt': 4, 'ley-crystal': 2 }, output: { itemId: 'ley-bolt+split', count: 4 } });
    expect(Object.keys(STAGE_RECIPES)).toEqual(Object.keys(STAGES));
  });

  it('are 1x1 machines in their base ammo group on the build bar', () => {
    expect(pieceDef('frost-rune')).toMatchObject({ kind: 'machine', name: 'Frost rune', category: 'arrows', recipeId: 'frost-rune', footprint: '1x1', craftTicks: 60 });
    expect(pieceDef('ley-guide')).toMatchObject({ kind: 'machine', name: 'Ley guide', category: 'ley', footprint: '1x1' });
    expect(pieceDef('prism-lens')).toMatchObject({ kind: 'machine', name: 'Prism lens', category: 'ley', footprint: '1x1' });
    for (const id of Object.keys(STAGES)) expect(BUILD_BAR).toContain(id);
    expect(BUILD_BAR.indexOf('frost-rune')).toBeGreaterThan(BUILD_BAR.indexOf('assembler'));
    expect(BUILD_BAR.indexOf('frost-rune')).toBeLessThan(BUILD_BAR.indexOf('shaper'));
    expect(BUILD_BAR.slice(-4, -2)).toEqual(['ley-guide', 'prism-lens']);
    expect(pieceDef('cluster-die')).toMatchObject({ kind: 'machine', name: 'Cluster die', category: 'bombs', footprint: '1x1' });
    expect(Object.keys(PIECES)).toContain('prism-lens');
  });
});

describe('rimestone (029)', () => {
  it('is a raw', () => {
    expect(ITEMS['rimestone']).toMatchObject({ id: 'rimestone', name: 'Rimestone', kind: 'raw' });
  });
});
