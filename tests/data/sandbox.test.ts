import { describe, expect, it } from 'vitest';
import { AMMO } from '../../src/data/ammo';
import { ENEMIES } from '../../src/data/enemies';
import { ENEMY_REGIONS, REGION_RINGS, SANDBOX, SANDBOX_PENS } from '../../src/data/sandbox';

// 044: the sandbox's data refers only to real content, and every non-boss enemy has a region with a pen ring.

describe('sandbox data (044)', () => {
  it('names a real enemy and real rounds for its defaults', () => {
    expect(ENEMIES[SANDBOX.spawnDefaults.enemyId]).toBeDefined();
    for (const round of SANDBOX.loadout) if (round !== null) expect(AMMO[round], round).toBeDefined();
    expect(SANDBOX.rings).toContain(SANDBOX.spawnDefaults.ring);
  });

  it('gives every non-boss enemy a region whose pens have a ring', () => {
    for (const e of Object.values(ENEMIES).filter((d) => !d.boss)) {
      const region = ENEMY_REGIONS[e.id];
      expect(region, e.id).toBeDefined();
      expect(REGION_RINGS[region ?? -1], e.id).toBeDefined();
    }
    for (const id of Object.keys(ENEMY_REGIONS)) expect(ENEMIES[id], id).toBeDefined();
    expect(SANDBOX_PENS.length).toBe(Object.values(ENEMIES).filter((d) => !d.boss).length);
  });
});
