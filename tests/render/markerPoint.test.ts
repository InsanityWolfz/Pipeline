import { REGION_1_X } from '../../src/data/hollows';
import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../../src/data/config';
import { TUTORIAL_LAYOUT } from '../../src/data/foundryAssets';
import { SHRINE_SITE } from '../../src/data/rooms';
import { claim } from '../../src/sim/claims';
import { createSim } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { markerPoint } from '../../src/render/markerPoint';
import { movePlayer, SEED } from '../sim/fight';

// "Claim a second pylon" (032): its marker floats over the nearest discovered resource-site pylon not yet claimed.

const over = (tx: number, ty: number) => ({ x: (tx + 0.5) * TILE_SIZE, y: (ty + 1) * TILE_SIZE - TUTORIAL_LAYOUT.marker.pylonLift });

describe('the site-pylon marker', () => {
  it('shows nothing until a resource site is discovered', () => {
    const s = createSim(SEED);
    claim(s, SHRINE_SITE);
    expect(markerPoint(s, 'sitePylon')).toBeNull();
    s.discovered.push('ruined-cache', 'west-spring');
    expect(markerPoint(s, 'sitePylon')).toBeNull();
  });

  it('marks the nearest discovered, unclaimed site pylon', () => {
    const s = createSim(SEED);
    claim(s, SHRINE_SITE);
    s.discovered.push('quarry', 'old-grove');
    // 032's tiles moved +40 (034).
    const X = REGION_1_X;
    const near = tileCentre({ tx: 12 + X, ty: 22 });
    movePlayer(s, near.x, near.y);
    expect(markerPoint(s, 'sitePylon')).toEqual(over(8 + X, 22));
    claim(s, 'old-grove');
    expect(markerPoint(s, 'sitePylon')).toEqual(over(21 + X, 20));
    claim(s, 'quarry');
    expect(markerPoint(s, 'sitePylon')).toBeNull();
  });
});
