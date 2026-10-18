import { describe, expect, it } from 'vitest';
import { OVERWORLD, type TilePos } from '../../src/data/overworld';
import { NODES, nodeDef, type Placement } from '../../src/data/nodes';
import { SAFE_RADIUS } from '../../src/data/population';
import { TILE } from '../../src/data/rooms';
import { WORLD } from '../../src/sim/world';

// Believable resources (018): every node stands where its material comes from.

const rows = WORLD[OVERWORLD.id]?.rows ?? [];
const at = (tx: number, ty: number): string | undefined => rows[ty]?.[tx];

/** Tiles of a symbol within `r` tiles (straight-line) of a tile. */
function around(t: TilePos, r: number, symbol: string): number {
  let n = 0;
  for (let ty = t.ty - r; ty <= t.ty + r; ty++) for (let tx = t.tx - r; tx <= t.tx + r; tx++) if (Math.hypot(tx - t.tx, ty - t.ty) <= r && at(tx, ty) === symbol) n++;
  return n;
}

/** Distance from a tile's centre to a polyline of tile points, in tiles. */
function toLine(t: TilePos, line: readonly TilePos[]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i];
    const b = line[i + 1];
    if (!a || !b) continue;
    const dx = b.tx - a.tx;
    const dy = b.ty - a.ty;
    const k = Math.max(0, Math.min(1, ((t.tx - a.tx) * dx + (t.ty - a.ty) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(t.tx - (a.tx + k * dx), t.ty - (a.ty + k * dy)));
  }
  return best;
}

const LINES = Object.values(OVERWORLD.leyLines);

/** The node sits in a hand-placed feature of this kind (a grove or rock field's disc, a pond's shore), not just near stray terrain. */
const inFeature = (t: TilePos, kind: 'grove' | 'rocks' | 'pond'): boolean =>
  OVERWORLD.features.some((f) =>
    f.kind !== kind ? false : f.kind === 'pond' ? Math.hypot((t.tx - f.cx) / f.rx, (t.ty - f.cy) / f.ry) <= OVERWORLD.ponds.shore : Math.hypot(t.tx - f.cx, t.ty - f.cy) <= f.r,
  );

const RULES: Record<Placement, (t: TilePos) => boolean> = {
  // In a grove: on grass in its pocket, with trees round about.
  grove: (t) => inFeature(t, 'grove') && at(t.tx, t.ty) === TILE.floor && around(t, 3, TILE.tree) >= 4,
  // In a rock field, among boulders.
  'rock-field': (t) => inFeature(t, 'rocks') && around(t, 3, TILE.rock) >= 2,
  // In a pond's shallows, touching its water.
  'pond-edge': (t) => inFeature(t, 'pond') && at(t.tx, t.ty) === TILE.shallow && around(t, 1, TILE.water) >= 1,
  // On a ley line.
  'ley-line': (t) => LINES.some((l) => toLine(t, l) <= 0.5),
};

describe('where nodes stand', () => {
  it('every node type has a placement rule', () => {
    for (const def of Object.values(NODES)) expect(Object.keys(RULES)).toContain(def.placement);
  });

  it.each(OVERWORLD.nodes.map((n, i) => [i, n] as const))('node %i keeps its type\'s rule', (_i, n) => {
    const rule = nodeDef(n.nodeId).placement;
    expect(RULES[rule](n), `${n.nodeId} at ${n.tx},${n.ty} breaks '${rule}'`).toBe(true);
  });

  it('every ley line leads to the foundry stairs, directly or through another line', () => {
    const door = OVERWORLD.entrance.door;
    for (const line of LINES) {
      const end = line[line.length - 1];
      if (!end) throw new Error('empty ley line');
      const atDoor = Math.hypot(end.tx - door.tx, end.ty - door.ty) <= 3;
      const joins = LINES.some((other) => other !== line && other[0]?.tx === end.tx && other[0]?.ty === end.ty);
      expect(atDoor || joins, `line ending ${end.tx},${end.ty}`).toBe(true);
    }
  });

  it("the shrine's safe zone holds one node of each type", () => {
    const pylon = OVERWORLD.shrine.pylon;
    const inZone = OVERWORLD.nodes.filter((n) => Math.hypot(n.tx - pylon.tx, n.ty - pylon.ty) <= SAFE_RADIUS);
    for (const id of Object.keys(NODES)) expect(inZone.some((n) => n.nodeId === id), id).toBe(true);
  });
});
