import { describe, expect, it } from 'vitest';
import { GROUND_BLEND } from '../../src/data/art/ground';
import { TILE } from '../../src/data/rooms';
import { polar, WORLD_SHAPE } from '../../src/data/worldShape';
import { crackGround, crackOf, edgeBlobs, groundClass } from '../../src/render/overworld/groundBlend';
import { edgeRadius } from '../../src/render/overworld/circleEdge';
import { worldTileHash } from '../../src/render/roomTiles';

// 074: the ground's blending, baked per tile from its fixed hash: the same tile always gets the same edge and crack;
// cracks only on stone, paving, ash and slate.

const floor = () => TILE.floor;
const noPlateau = () => false;

describe('ground blending (074)', () => {
  it('reads each region’s ground by distance, and slag and chasms as their own', () => {
    const at = (b: number, r: number) => polar(b, r);
    const cls = (t: { tx: number; ty: number }, s = floor) => groundClass(t.tx, t.ty, s, noPlateau);
    expect(cls(at(90, 20))).toBe('grass');
    expect(cls(at(90, 60))).toBe('hollows');
    expect(cls(at(90, 95))).toBe('ember');
    expect(cls(at(90, 125))).toBe('storm');
    expect(cls(at(90, 95), () => TILE.slag)).toBe('slag');
    expect(cls(at(90, 125), () => TILE.chasm)).toBe('chasm');
    expect(groundClass(0, 0, floor, () => true)).toBe('plateau');
  });

  it('gives a tile the same edge blobs every time, inside its own tile, a few px deep', () => {
    const hash = worldTileHash(120, 140);
    expect(edgeBlobs(120, 140, -1, 0, hash)).toEqual(edgeBlobs(120, 140, -1, 0, hash));
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const blobs = edgeBlobs(120, 140, dx, dy, hash);
      expect(blobs).toHaveLength(GROUND_BLEND.edge.blobs);
      for (const b of blobs) {
        expect(b.x).toBeGreaterThanOrEqual(120 * 32);
        expect(b.x).toBeLessThanOrEqual(121 * 32);
        expect(b.y).toBeGreaterThanOrEqual(140 * 32);
        expect(b.y).toBeLessThanOrEqual(141 * 32);
        expect(b.r).toBeLessThanOrEqual(GROUND_BLEND.edge.radius[1]);
      }
    }
    expect(edgeBlobs(120, 140, -1, 0, hash)).not.toEqual(edgeBlobs(121, 140, -1, 0, worldTileHash(121, 140)));
  });

  it('cracks only stone, paving, ash and slate: none on Region 1’s grass, slag, chasms or plateau', () => {
    expect(crackGround('grass', false)).toBeNull();
    expect(crackGround('grass', true)).toBe('paving');
    for (const g of ['hollows', 'ember', 'storm'] as const) expect(crackGround(g, false)).toBe(g);
    for (const g of ['slag', 'chasm', 'plateau'] as const) expect(crackGround(g, false)).toBeNull();
    // A crack is the same for the same tile, and some tiles of each ground have one.
    let cracked = 0;
    for (let tx = 0; tx < 200; tx++) {
      const c = crackOf(tx, 7, worldTileHash(tx, 7), 'storm');
      expect(c).toEqual(crackOf(tx, 7, worldTileHash(tx, 7), 'storm'));
      if (c.length > 0) cracked += 1;
    }
    expect(cracked).toBeGreaterThan(10);
    expect(cracked).toBeLessThan(100);
  });

  it('bends Region 1’s edge along the true circle, a few px either way', () => {
    for (let a = 0; a < Math.PI * 2; a += 0.01) expect(Math.abs(edgeRadius(a) - WORLD_SHAPE.region1 * 32)).toBeLessThanOrEqual(GROUND_BLEND.circle.wobble[0] + GROUND_BLEND.circle.wobble[1]);
  });
});
