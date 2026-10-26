import { describe, expect, it } from 'vitest';
import { AMMO, ammoDef } from '../../src/data/ammo';
import { STAGE_SPRITES_VECTOR } from '../../src/data/art/stages';
import { TIER_ART } from '../../src/data/art/tiers';
import { ENTRANCE_GAUGE_COLORS } from '../../src/data/art/intake';
import { ITEMS } from '../../src/data/items';
import { roundKeywords } from '../../src/data/roundKeywords';
import { ROUND_ICONS } from '../../src/data/stageAssets';
import { ROUNDS, roundBase, roundTags, roundTier, withoutTag, withTag, withTier } from '../../src/data/tags';
import { TIER_ARMED, TIER_PROJECTILES } from '../../src/data/tierAssets';
import { TIER_DAMAGE, TIERS } from '../../src/data/tiers';
import { vectorFrames } from '../../src/render/vector/catalog';

// 066: the third rung of 062's material ladder. Two more tiers, stormsteel (arrows, bombs, landmines) and storm glass
// (ley bolts), each ×2.56 over stone (×1.6 over steel), with every round derived as 062's: name, icon, look in flight
// and gauge colour.

const STONE = ROUNDS.filter((r) => roundTier(r) === 'stone');
const BASES = ['arrow', 'bomb', 'ley-bolt', 'landmine'];
const STORM = ROUNDS.filter((r) => roundTier(r) === 'stormsteel' || roundTier(r) === 'storm-glass');
const frames = new Map(vectorFrames().map((f) => [f.name, f]));
const icons = new Map(STAGE_SPRITES_VECTOR.map((s) => [s.key, s]));

describe('the storm tiers (066)', () => {
  it('are stormsteel for arrows, bombs and landmines and storm glass for ley bolts, each ×2.56 over stone (×1.6 over steel)', () => {
    expect(TIERS.stormsteel).toEqual({ id: 'stormsteel', prefix: 'Stormsteel', appliesTo: ['arrow', 'bomb', 'landmine'] });
    expect(TIERS['storm-glass']).toEqual({ id: 'storm-glass', prefix: 'Storm glass', appliesTo: ['ley-bolt'] });
    expect(TIER_DAMAGE.stormsteel).toBe(2.56);
    expect(TIER_DAMAGE['storm-glass']).toBe(2.56);
    expect(TIER_DAMAGE.stormsteel / TIER_DAMAGE.steel).toBeCloseTo(1.6, 9);
    expect(TIER_DAMAGE['storm-glass'] / TIER_DAMAGE.glass).toBeCloseTo(1.6, 9);
  });

  it('give every stone round, plain or tagged, its storm version in ROUNDS, AMMO and ITEMS', () => {
    for (const stone of [...BASES, ...STONE]) {
      const tier = roundBase(stone) === 'ley-bolt' ? 'storm-glass' : 'stormsteel';
      const id = withTier(stone, tier);
      expect(ROUNDS).toContain(id);
      expect(roundTier(id)).toBe(tier);
      expect(roundTags(id)).toEqual(roundTags(stone));
      expect(AMMO[id], id).toBeDefined();
      expect(ITEMS[id]?.kind).toBe('ammo');
      expect(withTier(id, 'stone')).toBe(stone);
      expect(roundKeywords(id)).toEqual(roundKeywords(stone));
    }
    expect(STORM).toHaveLength(BASES.length + STONE.length);
    expect(() => withTier('arrow', 'storm-glass')).toThrow();
    expect(() => withTier('ley-bolt', 'stormsteel')).toThrow();
  });

  it('keep the tier through tagging and untagging', () => {
    expect(withTag('arrow+stormsteel', 'frost')).toBe('arrow+stormsteel+frost');
    expect(withTag('ley-bolt+storm-glass+fire', 'homing')).toBe('ley-bolt+storm-glass+fire+homing');
    expect(withoutTag('bomb+stormsteel+fire+cluster', 'cluster')).toBe('bomb+stormsteel+fire');
    expect(roundBase('ley-bolt+storm-glass+split')).toBe('ley-bolt');
    expect(roundTags('ley-bolt+storm-glass+split')).toEqual(['split']);
  });

  it('name a storm round after 062’s casing: the tier first, then its tags', () => {
    expect(ITEMS['arrow+stormsteel']?.name).toBe('Stormsteel arrow');
    expect(ITEMS['arrow+stormsteel+frost']?.name).toBe('Stormsteel Frost arrow');
    expect(ITEMS['ley-bolt+storm-glass']?.name).toBe('Storm glass ley bolt');
    expect(ITEMS['ley-bolt+storm-glass+homing']?.name).toBe('Storm glass Homing ley bolt');
    expect(ITEMS['bomb+stormsteel+fire+cluster']?.name).toBe('Stormsteel Fire Cluster bomb');
    expect(ITEMS['landmine+stormsteel+lightning']?.name).toBe('Stormsteel Lightning landmine');
  });

  it('give each storm round its own icon: its stone icon in the tier’s colours, unlike the steel one', () => {
    for (const id of STORM) {
      const key = ROUND_ICONS[id] ?? '';
      expect(ITEMS[id]?.icon, id).toBe(key);
      expect(frames.has(key), key).toBe(true);
      const steel = ROUND_ICONS[withTier(id, roundBase(id) === 'ley-bolt' ? 'glass' : 'steel')] ?? '';
      expect(JSON.stringify(icons.get(key)?.frames), id).not.toBe(JSON.stringify(icons.get(steel)?.frames));
    }
    expect(Object.keys(TIER_ART)).toEqual(['steel', 'glass', 'stormsteel', 'storm-glass']);
  });

  it('fly each storm round as its stone projectile recoloured; a stormsteel landmine lies armed in stormsteel', () => {
    for (const id of STORM) {
      const plain = withTier(roundBase(id), roundTier(id));
      const own = TIER_PROJECTILES[plain];
      expect(own, id).toBeDefined();
      expect(ammoDef(id).sprite).toBe(own?.key);
      expect(frames.has(own?.key ?? ''), own?.key).toBe(true);
      expect(own?.key).not.toBe(TIER_PROJECTILES[withTier(roundBase(id), roundBase(id) === 'ley-bolt' ? 'glass' : 'steel')]?.key);
    }
    const armed = TIER_ARMED['landmine+stormsteel'];
    expect(frames.has(armed?.key ?? '')).toBe(true);
    for (const id of STORM.filter((r) => roundBase(r) === 'landmine')) {
      const def = ammoDef(id);
      expect(def.kind === 'mine' ? def.armed : null, id).toBe(armed?.key);
    }
  });

  it('light each entrance gauge as its stone round does', () => {
    for (const id of STORM) expect(ENTRANCE_GAUGE_COLORS[id], id).toBe(ENTRANCE_GAUGE_COLORS[withTier(id, 'stone')]);
  });
});
