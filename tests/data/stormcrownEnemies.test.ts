import { describe, expect, it } from 'vitest';
import { CHAMPIONS } from '../../src/data/champions';
import { REGION_4_PART, SCHEMATIC_REGIONS } from '../../src/data/drops';
import { STORMCROWN_DROPS, STORMCROWN_ENEMIES } from '../../src/data/stormcrownEnemies';
import { attackOf, ENEMIES, MIN_TELEGRAPH_TICKS } from '../../src/data/enemies';
import { ARMOR_DROP_CHANCE } from '../../src/data/gear';
import { ITEMS } from '../../src/data/items';
import { ENEMY_REGIONS } from '../../src/data/sandbox';
import { STORMCROWN } from '../../src/data/stormcrown';
import { ENEMY_ANIMS } from '../../src/data/assets';
import { SOUNDS, WINDUP_SOUNDS } from '../../src/data/sounds';
import { ENEMY_RIGS } from '../../src/data/art/enemies';
import { ENEMY_CHOICES } from '../../src/render/sandboxRows';

// The Stormcrown's enemies (065) as data: in ENEMIES, none a boss, every wind-up past the telegraph minimum, their
// drops as the spec lists, and every reference resolving (anims, rigs, champion names, wind-up sounds).

const ALL = Object.values(STORMCROWN_ENEMIES);

describe("the Stormcrown's enemies", () => {
  it('are in ENEMIES, none a boss, each in Region 4 with its anims, rig, wind-up cue and champion names', () => {
    for (const def of ALL) {
      expect(ENEMIES[def.id], def.id).toBe(def);
      expect(def.boss, def.id).toBe(false);
      expect(ENEMY_REGIONS[def.id], def.id).toBe(STORMCROWN.region);
      expect(ENEMY_ANIMS[def.anims], def.id).toBeDefined();
      expect(ENEMY_RIGS.some((r) => r.id === def.anims), def.id).toBe(true);
      expect(Object.values(SOUNDS)).toContain(WINDUP_SOUNDS[def.kind]);
      expect(CHAMPIONS.names[def.id]?.length ?? 0, def.id).toBeGreaterThanOrEqual(3);
    }
  });

  it("are all on the sandbox's spawn panel (044)", () => {
    for (const def of ALL) expect(ENEMY_CHOICES, def.id).toContain(def.id);
  });

  it('each telegraphs for at least MIN_TELEGRAPH_TICKS', () => {
    for (const def of ALL) expect(attackOf(def).windupTicks, def.id).toBeGreaterThanOrEqual(MIN_TELEGRAPH_TICKS);
  });

  it('always drop 1 stormglass, with a 20% cinderite, the storm coil at 4% and gear at 10%; the schematic roll reaches Region 4', () => {
    expect(REGION_4_PART).toEqual({ itemId: 'storm-coil', chance: 0.04, championChance: 0.12 });
    expect(STORMCROWN_DROPS).toEqual({ always: [{ itemId: 'stormglass', min: 1, max: 1 }], chance: 0.2, oneOf: ['cinderite'], rare: [REGION_4_PART] });
    for (const def of ALL) {
      expect(def.drops, def.id).toBe(STORMCROWN_DROPS);
      expect(ARMOR_DROP_CHANCE[def.id], def.id).toBe(0.1);
    }
    for (const item of ['stormglass', 'cinderite', 'storm-coil']) expect(ITEMS[item], item).toBeDefined();
    expect(SCHEMATIC_REGIONS['schematic-machine-speed']).toContain(STORMCROWN.region);
  });

  it('the thunderhawk flies', () => {
    expect(STORMCROWN_ENEMIES.thunderhawk.flies).toBe(true);
  });
});
