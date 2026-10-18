import { describe, expect, it } from 'vitest';
import { FLOOR_VARIANTS, WALL_SPRITES } from '../../src/data/roomArt';
import { floorFrame, tileHash, wallPieces } from '../../src/render/roomTiles';

describe('floor variants', () => {
  it('come from a stable hash, so a tile always gets the same one', () => {
    expect(tileHash(3, 7)).toBe(tileHash(3, 7));
    expect(tileHash(3, 7)).not.toBe(tileHash(7, 3));
    for (let i = 0; i < 50; i++) expect(floorFrame('floor-flag', i, 2 * i)).toBe(floorFrame('floor-flag', i, 2 * i));
  });

  it('show on about the set share of tiles, using every variant', () => {
    const seen = new Map<string, number>();
    for (let ty = 0; ty < 60; ty++) {
      for (let tx = 0; tx < 60; tx++) {
        const f = floorFrame('floor-flag', tx, ty);
        seen.set(f, (seen.get(f) ?? 0) + 1);
      }
    }
    const varied = 3600 - (seen.get('floor-flag') ?? 0);
    const percent = FLOOR_VARIANTS.percent;
    expect(varied / 3600).toBeGreaterThan(percent / 100 - 0.05);
    expect(varied / 3600).toBeLessThan(percent / 100 + 0.05);
    for (const v of FLOOR_VARIANTS.tiles) expect(seen.get(v)).toBeGreaterThan(0);
  });
});

describe('walls in 3/4 view', () => {
  const rows = ['#####', '#...#', '#.#.#', '#####'];

  it('show their face over floor, and their top over more wall', () => {
    expect(wallPieces(rows, 2, 0)).toMatchObject({ kind: 'face', frame: WALL_SPRITES.face });
    expect(wallPieces(rows, 2, 2)).toMatchObject({ kind: 'top', edgeLeft: true, edgeRight: true, edgeTop: true });
    expect(wallPieces(rows, 0, 3)).toMatchObject({ kind: 'top', edgeLeft: false, edgeRight: false, edgeTop: false });
  });

  it('light the lips toward floor beside and above a top', () => {
    expect(wallPieces(rows, 0, 2)).toMatchObject({ kind: 'top', edgeLeft: false, edgeRight: true, edgeTop: false });
    expect(wallPieces(rows, 1, 3)).toMatchObject({ kind: 'top', edgeTop: true, edgeLeft: false });
  });
});
