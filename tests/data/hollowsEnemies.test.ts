import { describe, expect, it } from 'vitest';
import { ARMOR_DROP_CHANCE } from '../../src/data/gear';
import { REGION_2_PART } from '../../src/data/drops';
import { attackOf, ENEMIES, MIN_TELEGRAPH_TICKS } from '../../src/data/enemies';
import { HOLLOWS_ENEMIES } from '../../src/data/hollowsEnemies';
import { ITEMS } from '../../src/data/items';

// Region 2's enemies (035) as data: every attack telegraphs for at least the minimum,
// their drops, and the old enemies held to the same rule.

const NEW = Object.keys(HOLLOWS_ENEMIES);

describe('the telegraph minimum', () => {
  it('is 30 ticks', () => {
    expect(MIN_TELEGRAPH_TICKS).toBe(30);
  });

  it('holds every enemy, old and new: each wind-up (and the Bulwark’s lob) at least MIN_TELEGRAPH_TICKS', () => {
    for (const def of Object.values(ENEMIES)) {
      expect(attackOf(def).windupTicks, def.id).toBeGreaterThanOrEqual(MIN_TELEGRAPH_TICKS);
      if (def.kind === 'bulwark') expect(def.lob.windupTicks, def.id).toBeGreaterThanOrEqual(MIN_TELEGRAPH_TICKS);
    }
  });
});

describe("Region 2's enemies", () => {
  it('are in ENEMIES, none a boss', () => {
    for (const id of NEW) expect(ENEMIES[id]?.boss, id).toBe(false);
  });

  it('always drop 1 ley-iron, with a chance at stone, the aqueduct valve at 4% and armor at the Husk’s 10%', () => {
    expect(REGION_2_PART).toEqual({ itemId: 'aqueduct-valve', chance: 0.04, championChance: 0.12 });
    for (const id of NEW) {
      const { drops } = ENEMIES[id] ?? { drops: null };
      expect(drops?.always, id).toEqual([{ itemId: 'ley-iron', min: 1, max: 1 }]);
      expect(drops?.oneOf, id).toEqual(['stone']);
      expect(drops?.chance, id).toBeGreaterThan(0);
      expect(drops?.rare, id).toEqual([REGION_2_PART]);
      expect(ARMOR_DROP_CHANCE[id], id).toBe(ARMOR_DROP_CHANCE.husk);
      for (const item of [...(drops?.always ?? []).map((d) => d.itemId), ...(drops?.oneOf ?? []), ...(drops?.rare ?? []).map((r) => r.itemId)]) expect(ITEMS[item], item).toBeDefined();
    }
  });
});
