import { describe, expect, it } from 'vitest';
import { GROTTO } from '../../src/data/grotto';
import { OVERWORLD, type TilePos } from '../../src/data/overworld';
import { NODES, nodeDef, type Placement } from '../../src/data/nodes';
import { SAFE_RADIUS } from '../../src/data/population';
import { TILE } from '../../src/data/rooms';
import { WORLD } from '../../src/sim/world';
import { landmarkDef } from '../../src/data/landmarks';
import { RUIN_AREA } from '../../src/data/home';
import type { TileRect } from '../../src/data/tiles';

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

const HIVE = landmarkDef('husk-hive');
const VENTS = landmarkDef('cinder-vents');
const RODS = landmarkDef('rod-field');
const inside = (r: TileRect, t: TilePos): boolean => t.tx >= r.x0 && t.tx <= r.x1 && t.ty >= r.y0 && t.ty <= r.y1;

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
  // In the Frozen Grotto's frosted clearing (029).
  'frozen-grotto': (t) => t.tx >= GROTTO.area.x0 && t.tx <= GROTTO.area.x1 && t.ty >= GROTTO.area.y0 && t.ty <= GROTTO.area.y1 && at(t.tx, t.ty) === TILE.floor,
  // At the foot of a cliff or quarry face (034): open ground with the cliff right behind it, to the north.
  'cliff-seam': (t) => at(t.tx, t.ty) === TILE.floor && at(t.tx, t.ty - 1) === TILE.cliff,
  // In the Husk Hive's nest (049), on its open floor.
  hive: (t) => inside(HIVE.area, t) && at(t.tx, t.ty) === TILE.floor,
  // 060: at the Cinder Vents, on their open ash.
  vent: (t) => inside(VENTS.area, t) && at(t.tx, t.ty) === TILE.floor,
  // 064: in the Rod Field, on its open slate.
  'rod-field': (t) => inside(RODS.area, t) && at(t.tx, t.ty) === TILE.floor,
};

describe('where nodes stand', () => {
  it('every node type has a placement rule', () => {
    for (const def of Object.values(NODES)) expect(Object.keys(RULES)).toContain(def.placement);
  });

  it.each(OVERWORLD.nodes.map((n, i) => [i, n] as const))('node %i keeps its type\'s rule', (_i, n) => {
    const rule = nodeDef(n.nodeId).placement;
    expect(RULES[rule](n), `${n.nodeId} at ${n.tx},${n.ty} breaks '${rule}'`).toBe(true);
  });

  it("every ley line leads to the foundry's ruin, directly or through another line", () => {
    // 053: a line home ends on the edge of the ruin over the stairs (RUIN_AREA, half a tile out).
    const r = RUIN_AREA;
    for (const line of LINES) {
      const end = line[line.length - 1];
      if (!end) throw new Error('empty ley line');
      const atDoor = end.tx >= r.x0 - 0.51 && end.tx <= r.x1 + 0.51 && end.ty >= r.y0 - 0.51 && end.ty <= r.y1 + 0.51;
      const joins = LINES.some((other) => other !== line && other[0]?.tx === end.tx && other[0]?.ty === end.ty);
      expect(atDoor || joins, `line ending ${end.tx},${end.ty}`).toBe(true);
    }
  });

  it("the shrine's safe zone holds one node of each type but the Grotto's rime, the Hollows' ley-iron, the Hive's resin, the Emberworks' cinder vents and the Stormcrown's storm rods (029, 034, 049, 060, 064: gathered in their own places)", () => {
    const pylon = OVERWORLD.shrine.pylon;
    const inZone = OVERWORLD.nodes.filter((n) => Math.hypot(n.tx - pylon.tx, n.ty - pylon.ty) <= SAFE_RADIUS);
    for (const def of Object.values(NODES)) {
      if (def.placement !== 'frozen-grotto' && def.placement !== 'cliff-seam' && def.placement !== 'hive' && def.placement !== 'vent' && def.placement !== 'rod-field') expect(inZone.some((n) => n.nodeId === def.id), def.id).toBe(true);
    }
  });
});
