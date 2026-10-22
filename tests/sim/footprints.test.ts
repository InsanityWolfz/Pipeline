import { describe, expect, it } from 'vitest';
import { TERRAIN_SPRITES } from '../../src/data/art/terrain';
import { HOLLOWS_SPRITES_VECTOR } from '../../src/data/art/hollows';
import { LANDMARK_SPRITES_VECTOR } from '../../src/data/art/landmarks';
import { HIVE_SPRITES_VECTOR } from '../../src/data/art/hive';
import type { VectorSprite } from '../../src/data/art/types';
import { TILE_SIZE } from '../../src/data/config';
import { FOOTPRINTS } from '../../src/data/footprints';
import { inHollows } from '../../src/data/hollows';
import { OVERWORLD_ROOM } from '../../src/data/overworld';
import { FEET_BOX } from '../../src/data/player';
import { TILE, WALKABLE, type Room } from '../../src/data/rooms';
import { createArrow, stepArrows } from '../../src/sim/arrows';
import { boxHitsSolid, moveBox } from '../../src/sim/collision';
import { footprintAt } from '../../src/sim/footprints';
import { pieceFrame } from '../../src/sim/tileLook';
import { WORLD } from '../../src/sim/world';

// 059 (059.3): a tile-drawn terrain piece smaller than its tile (a rock, rubble, a ruin stone or column, a cut block, a
// nest stone, an aqueduct pillar or fallen span) blocks feet only over its drawn base, its shadow's box, in every
// region; anything that fills its tile blocks all of it, as before.

const T = TILE_SIZE;
const SPRITES: readonly VectorSprite[] = [...TERRAIN_SPRITES, ...HOLLOWS_SPRITES_VECTOR, ...LANDMARK_SPRITES_VECTOR, ...HIVE_SPRITES_VECTOR];
const world = (id: string): Room => {
  const r = WORLD[id];
  if (!r) throw new Error(`no ${id}`);
  return r;
};
const OW = world(OVERWORLD_ROOM);
const walkable = (room: Room, tx: number, ty: number): boolean => WALKABLE.includes(room.rows[ty]?.[tx] ?? '#');

/** The first overworld tile whose piece is drawn with `frame`, with floor left, right and above it. */
function tileDrawn(frame: string, where: (tx: number, ty: number) => boolean = () => true): { tx: number; ty: number } {
  for (let ty = 1; ty < OW.rows.length - 1; ty++) {
    const row = OW.rows[ty] ?? '';
    for (let tx = 1; tx < row.length - 1; tx++) {
      if (pieceFrame(OW, tx, ty) !== frame || !where(tx, ty)) continue;
      if (walkable(OW, tx - 1, ty) && walkable(OW, tx + 1, ty) && walkable(OW, tx, ty - 1) && walkable(OW, tx - 1, ty - 1) && walkable(OW, tx + 1, ty - 1)) return { tx, ty };
    }
  }
  throw new Error(`no open ${frame}`);
}

describe('footprints as data (059.3)', () => {
  it("each is its sprite's shadow ellipse, rounded outward to whole px", () => {
    for (const [key, f] of Object.entries(FOOTPRINTS)) {
      const sprite = SPRITES.find((s) => s.key === key);
      const shadow = sprite?.frames[0]?.[0];
      if (!shadow || shadow.kind !== 'ellipse') throw new Error(`${key}: no shadow ellipse first`);
      expect(f, key).toEqual({ x0: Math.floor(shadow.x - shadow.rx), y0: Math.floor(shadow.y - shadow.ry), x1: Math.ceil(shadow.x + shadow.rx), y1: Math.ceil(shadow.y + shadow.ry) });
    }
  });

  it('cover every look a small piece can take in the overworld', () => {
    const seen = new Set<string>();
    for (let ty = 0; ty < OW.rows.length; ty++) {
      for (let tx = 0; tx < (OW.rows[ty]?.length ?? 0); tx++) {
        const f = pieceFrame(OW, tx, ty);
        if (f) seen.add(f);
      }
    }
    for (const f of seen) expect(FOOTPRINTS[f], f).toBeDefined();
    for (const f of ['ow-rock-0', 'ow-rock-1', 'ow-rubble-0', 'ow-rubble-1', 'ow-ruin-stone', 'ow-column']) expect(seen, f).toContain(f);
  });
});

describe('a small piece blocks only its footprint (059)', () => {
  it("a small Hollows rock lets the player walk past it through the top of its tile, and stops them at its base", () => {
    const t = tileDrawn('ow-rubble-1', inHollows);
    // Feet in the tile's upper half, walking from the tile on its left to the one on its right.
    const p = { x: (t.tx - 0.5) * T, y: t.ty * T + 10 };
    expect(boxHitsSolid(OW, p.x, p.y, FEET_BOX)).toBe(false);
    for (let i = 0; i < 40; i++) moveBox(OW, p, FEET_BOX, 2, 0);
    expect(p.x).toBeCloseTo((t.tx - 0.5) * T + 80);
    // Down into the tile from above: stopped flush on the footprint's top edge, inside the tile.
    const q = { x: (t.tx + 0.5) * T, y: (t.ty - 0.5) * T };
    const { hitY } = (() => {
      let hit = { hitX: false, hitY: false };
      for (let i = 0; i < 40 && !hit.hitY; i++) hit = moveBox(OW, q, FEET_BOX, 0, 2);
      return hit;
    })();
    expect(hitY).toBe(true);
    const f = footprintAt(OW, t.tx, t.ty);
    expect(f).not.toBeNull();
    expect(q.y + FEET_BOX.h / 2).toBeCloseTo((f?.y ?? 0) - (f?.h ?? 0) / 2);
    expect(q.y).toBeGreaterThan(t.ty * T);
  });

  it("is the footprint clipped to its tile: a wide boulder's never reaches past its tile's sides or bottom", () => {
    const t = tileDrawn('ow-rock-0');
    const f = footprintAt(OW, t.tx, t.ty);
    expect(f).toEqual({ x: (t.tx + 0.5) * T, y: (t.ty + 1) * T - 3, w: T, h: 6 });
  });

  it('anything that fills its tile still blocks all of it: walls, cliffs, trees and water', () => {
    for (const symbol of [TILE.wall, TILE.cliff, TILE.tree, TILE.water]) {
      const room: Room = { id: 'test', rows: ['...', `.${symbol}.`, '...'], spawn: { tx: 0, ty: 0 } };
      expect(footprintAt(room, 1, 1), symbol).toBeNull();
      expect(boxHitsSolid(room, 1.5 * T, T + 6, FEET_BOX), symbol).toBe(true);
    }
  });

  it("still stops shots at its whole tile (059.5)", () => {
    const t = tileDrawn('ow-rubble-1', inHollows);
    const over = createArrow(1, 'arrow', OVERWORLD_ROOM, (t.tx - 0.5) * T, t.ty * T + 6, 1, 0);
    const arrows = [over];
    for (let i = 0; i < 30 && arrows.length > 0; i++) stepArrows(arrows, () => OW);
    expect(arrows).toEqual([]);
    expect(over.x).toBeLessThan((t.tx + 1) * T);
  });
});
