import { describe, expect, it } from 'vitest';
import { AMMO, ammoDef } from '../../src/data/ammo';
import { ITEMS } from '../../src/data/items';
import { roundKeywords } from '../../src/data/roundKeywords';
import { ROUND_ICONS } from '../../src/data/stageAssets';
import { elementOf, ROUNDS, roundBase, roundId, roundName, roundTags, roundTier, withoutTag, withTag, withTier } from '../../src/data/tags';
import { TIER_DAMAGE, TIERS } from '../../src/data/tiers';
import { FIRE_ROUNDS } from '../../src/data/objectives';
import { roundsByFamily } from '../../src/sim/knownRounds';
import { LEFT_OUT_OF_KIT, PLAYTEST_START } from '../../src/data/playtest';

// 062: material tiers as data. A round's tier is a third slot beside its element and shape, a `+` segment straight
// after its base, never a tag: every tiered round is derived alongside the stone ones.

const STONE = ROUNDS.filter((r) => roundTier(r) === 'stone');
const TIERED = ROUNDS.filter((r) => roundTier(r) !== 'stone');

/** A round's armed look, if it's a mine (062: a tier's look is its own; tests/data/tierArt.test.ts). */
const lookOf = (id: string): { armed?: string } => {
  const def = ammoDef(id);
  return def.kind === 'mine' ? { armed: def.armed } : {};
};

describe('material tiers (062)', () => {
  it('are steel for arrows, bombs and landmines, and glass for ley bolts, each ×1.6 (066: then the storm tiers, ×2.56)', () => {
    expect(Object.values(TIERS)).toEqual([
      { id: 'steel', prefix: 'Steel', appliesTo: ['arrow', 'bomb', 'landmine'] },
      { id: 'glass', prefix: 'Glass', appliesTo: ['ley-bolt'] },
      // 066: the storm tiers (tests/data/stormsteelTiers.test.ts).
      { id: 'stormsteel', prefix: 'Stormsteel', appliesTo: ['arrow', 'bomb', 'landmine'] },
      { id: 'storm-glass', prefix: 'Storm glass', appliesTo: ['ley-bolt'] },
    ]);
    expect(TIER_DAMAGE).toEqual({ steel: 1.6, glass: 1.6, stormsteel: 2.56, 'storm-glass': 2.56 });
  });

  it('give every stone round, plain or tagged, its tiered version in ROUNDS, AMMO and ITEMS', () => {
    const bases = ['arrow', 'bomb', 'ley-bolt', 'landmine'];
    for (const stone of [...bases, ...STONE]) {
      const tier = roundBase(stone) === 'ley-bolt' ? 'glass' : 'steel';
      const id = withTier(stone, tier);
      expect(ROUNDS).toContain(id);
      expect(roundTier(id)).toBe(tier);
      expect(roundTags(id)).toEqual(roundTags(stone));
      expect(AMMO[id]).toBeDefined();
      expect(ITEMS[id]?.kind).toBe('ammo');
      expect(ROUND_ICONS[id]).toBe(`icon-${id.replace(/\+/g, '-')}`);
      expect(withTier(id, 'stone')).toBe(stone);
    }
    // 066: each also at its storm tier.
    expect(TIERED).toHaveLength(2 * (bases.length + STONE.length));
    expect(TIERED.slice(0, 3)).toEqual(['arrow+steel', 'arrow+steel+frost', 'arrow+steel+fire']);
  });

  it('keep the tier through tagging and untagging, so a stage tags a tiered round like its stone one', () => {
    expect(roundId('arrow', ['frost'])).toBe('arrow+frost');
    expect(withTag('arrow+steel', 'frost')).toBe('arrow+steel+frost');
    expect(withTag('ley-bolt+glass+fire', 'split')).toBe('ley-bolt+glass+fire+split');
    expect(withTag('arrow+steel+frost', 'fire')).toBeNull();
    expect(withoutTag('arrow+steel+frost', 'frost')).toBe('arrow+steel');
    expect(withoutTag('bomb+steel+fire+cluster', 'cluster')).toBe('bomb+steel+fire');
    expect(roundBase('arrow+steel+frost')).toBe('arrow');
    expect(elementOf('arrow+steel+frost')?.id).toBe('frost');
    expect(roundTier('arrow')).toBe('stone');
    expect(roundTier('arrow+frost')).toBe('stone');
    // A tier applies only to its own families.
    expect(() => withTier('ley-bolt', 'steel')).toThrow();
    expect(() => withTier('arrow', 'glass')).toThrow();
  });

  it('name a tiered round with its tier first, then its tags, as roundName capitalises every prefix', () => {
    expect(ITEMS['arrow+steel']?.name).toBe('Steel arrow');
    expect(ITEMS['ley-bolt+glass']?.name).toBe('Glass ley bolt');
    expect(ITEMS['arrow+steel+frost']?.name).toBe('Steel Frost arrow');
    expect(ITEMS['ley-bolt+glass+homing']?.name).toBe('Glass Homing ley bolt');
    expect(ITEMS['bomb+steel+fire+cluster']?.name).toBe('Steel Fire Cluster bomb');
    expect(roundName('Landmine', 'landmine+steel')).toBe('Steel landmine');
  });

  it('give a tiered round its stone round’s numbers, type and keywords: the tier is no keyword', () => {
    for (const id of TIERED) {
      const stone = withTier(id, 'stone');
      expect({ ...ammoDef(id), id: stone, itemId: stone, sprite: ammoDef(stone).sprite, ...lookOf(stone) }).toEqual(ammoDef(stone));
      expect(roundKeywords(id)).toEqual(roundKeywords(stone));
    }
  });

  it('read correctly wherever a round id is parsed: by family, by tag', () => {
    const arrows = roundsByFamily().filter((r) => roundBase(r) === 'arrow');
    expect(arrows).toEqual([
      'arrow', 'arrow+frost', 'arrow+fire', 'arrow+lightning', 'arrow+steel', 'arrow+steel+frost', 'arrow+steel+fire', 'arrow+steel+lightning',
      // 066: stormsteel after steel.
      'arrow+stormsteel', 'arrow+stormsteel+frost', 'arrow+stormsteel+fire', 'arrow+stormsteel+lightning',
    ]);
    expect(roundsByFamily()).toHaveLength(4 + ROUNDS.length);
    expect(FIRE_ROUNDS).toContain('arrow+steel+fire');
    expect(FIRE_ROUNDS).toContain('ley-bolt+glass+fire+split');
  });
});

describe('the playtest kit (062)', () => {
  it('leaves the tier parts out, carrying the raws they are made from', () => {
    for (const id of LEFT_OUT_OF_KIT) expect(PLAYTEST_START.inventory[id], id).toBeUndefined();
    for (const id of ['ley-iron', 'cinderite', 'ley-dust']) expect(PLAYTEST_START.inventory[id], id).toBeGreaterThan(0);
  });
});
