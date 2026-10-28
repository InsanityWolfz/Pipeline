import { describe, expect, it } from 'vitest';
import { LIGHT_SOURCES } from '../../src/data/lights';
import { firesOf } from '../../src/render/lighting/fixedLights';
import { worldTileHash } from '../../src/render/roomTiles';

// 074.7: the Emberworks' kiln mouths and chimney tops give light, as fires: one light per row of kilns side by side
// (only the front row, where the mouths are), one at each chimney's lip, worked out once from the map's tiles.

const F = LIGHT_SOURCES.fire;

describe('kiln and chimney fires (074.7)', () => {
  it('lights a row of kilns side by side once, at its middle, wider for each kiln past the first', () => {
    const fires = firesOf(['.KKK..', '......']);
    expect(fires).toEqual([{ x: 2.5 * 32, y: 32 - F.kiln.rise, radius: F.radii.kiln + 2 * F.kiln.perTile, intensity: F.intensity }]);
  });

  it('lights only the front kilns (a kiln with another in front of it shows its top, not its mouth)', () => {
    const fires = firesOf(['.K.', '.K.', '...']);
    expect(fires.map((f) => f.y)).toEqual([2 * 32 - F.kiln.rise]);
  });

  it('caps a long row’s radius', () => {
    expect(firesOf(['KKKKKKKKKK', '..........'])[0]?.radius).toBe(F.kiln.max);
  });

  it('lights each chimney at its lip, by the look its tile shows', () => {
    const fires = firesOf(['....', '..H.']);
    const rise = F.chimney.rises[worldTileHash(2, 1) % F.chimney.rises.length];
    expect(fires).toEqual([{ x: 2.5 * 32, y: 2 * 32 - (rise ?? 0), radius: F.radii.chimney, intensity: F.chimney.intensity }]);
  });
});
