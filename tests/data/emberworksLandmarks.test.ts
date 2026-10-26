import { describe, expect, it } from 'vitest';
import { EMBERWORKS, inEmberworks } from '../../src/data/emberworks';
import { LANDMARK_LIST } from '../../src/data/landmarks';
import { OVERWORLD } from '../../src/data/overworld';
import { fromCentre } from '../../src/data/worldShape';
import { WORLD } from '../../src/sim/world';

// The Emberworks' landmarks as data (060), split from tests/data/landmarks.test.ts: their areas lie wholly in the
// ring, clear of both its edges, and its pylon and cache come last in the world's lists.

describe('the Emberworks’ landmarks', () => {
  it('lie wholly in it, clear of both its edges', () => {
    for (const { id, area: a } of LANDMARK_LIST) {
      if (!inEmberworks(Math.round((a.x0 + a.x1) / 2), Math.round((a.y0 + a.y1) / 2))) continue;
      for (const [tx, ty] of [[a.x0, a.y0], [a.x1, a.y0], [a.x0, a.y1], [a.x1, a.y1]] as const) {
        const d = fromCentre(tx, ty);
        expect(d, id).toBeGreaterThan(EMBERWORKS.radii.inner + EMBERWORKS.wall);
        expect(d, id).toBeLessThan(EMBERWORKS.radii.outer - EMBERWORKS.edge.ragged);
      }
    }
  });

  it('put its pylon (the Ash Kilns’, behind the barrier the Bulwark’s first kill drops) and its cache (the Outpost Forge’s) last (064: but the Stormcrown’s pylon)', () => {
    const world = WORLD[OVERWORLD.id];
    const pylon = world?.pylons?.at(-2);
    expect(pylon && [pylon.site, pylon.safeRadius, pylon.wakes ?? null]).toEqual(['ash-kilns', 7, 'shrine']);
    const forge = LANDMARK_LIST.find((l) => l.id === 'outpost-forge');
    expect(world?.caches?.at(-1)).toEqual({ id: 'outpost-forge', ...forge?.cache });
  });
});
