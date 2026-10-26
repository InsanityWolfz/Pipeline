import { describe, expect, it } from 'vitest';
import { CHAMPIONS } from '../../src/data/champions';
import { REGION_3_PART } from '../../src/data/drops';
import { EMBERWORKS_DROPS, EMBERWORKS_ENEMIES } from '../../src/data/emberworksEnemies';
import { attackOf, ENEMIES, MIN_TELEGRAPH_TICKS } from '../../src/data/enemies';
import { ARMOR_DROP_CHANCE } from '../../src/data/gear';
import { ITEMS } from '../../src/data/items';
import { ENEMY_REGIONS } from '../../src/data/sandbox';
import { EMBERWORKS } from '../../src/data/emberworks';
import { ENEMY_ANIMS } from '../../src/data/assets';

// The Emberworks' enemies (061) as data: in ENEMIES, none a boss, every wind-up past the telegraph minimum, their
// drops as the spec lists (a whelp's none), and every reference resolving.

const ALL = Object.values(EMBERWORKS_ENEMIES);
/** The four that drop (the whelp drops nothing). */
const DROPPERS = ALL.filter((d) => !d.noLoot);

describe("the Emberworks' enemies", () => {
  it('are in ENEMIES, none a boss, each in Region 3 with its anims and champion names', () => {
    for (const def of ALL) {
      expect(ENEMIES[def.id], def.id).toBe(def);
      expect(def.boss, def.id).toBe(false);
      expect(ENEMY_REGIONS[def.id], def.id).toBe(EMBERWORKS.region);
      expect(ENEMY_ANIMS[def.anims], def.id).toBeDefined();
      expect(CHAMPIONS.names[def.id]?.length ?? 0, def.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('each telegraphs for at least MIN_TELEGRAPH_TICKS', () => {
    for (const def of ALL) expect(attackOf(def).windupTicks, def.id).toBeGreaterThanOrEqual(MIN_TELEGRAPH_TICKS);
  });

  it('always drop 1 cinderite, with a 20% ley-iron, the forge rivet at 4% and gear at 10%', () => {
    expect(REGION_3_PART).toEqual({ itemId: 'forge-rivet', chance: 0.04, championChance: 0.12 });
    expect(EMBERWORKS_DROPS).toEqual({ always: [{ itemId: 'cinderite', min: 1, max: 1 }], chance: 0.2, oneOf: ['ley-iron'], rare: [REGION_3_PART] });
    for (const def of DROPPERS) {
      expect(def.drops, def.id).toBe(EMBERWORKS_DROPS);
      expect(ARMOR_DROP_CHANCE[def.id], def.id).toBe(0.1);
    }
    for (const item of ['cinderite', 'ley-iron', 'forge-rivet']) expect(ITEMS[item], item).toBeDefined();
  });
});
