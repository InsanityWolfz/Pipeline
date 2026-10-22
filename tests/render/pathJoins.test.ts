import { describe, expect, it } from 'vitest';
import { GROUND } from '../../src/data/art/ground';
import { ROADS } from '../../src/data/roads';
import { pathStrokes } from '../../src/render/overworld/pathStrokes';

// 059 (Shaun: "the paths read as one shape, an X or a Y"): every road's dark edge goes down before any road's dirt, so
// where two roads cross or join no edge (nor a road end's round cap) is drawn over the other's dirt. Each road's outer
// edge stays as it was: the same width and colour along the same line.

describe('path joins (059)', () => {
  const strokes = pathStrokes(ROADS);

  it("draws each road's edge and its dirt once, every edge before any dirt", () => {
    expect(strokes).toHaveLength(ROADS.length * 2);
    const edges = strokes.slice(0, ROADS.length);
    const dirt = strokes.slice(ROADS.length);
    for (const s of edges) expect(s).toMatchObject({ width: GROUND.pathWidth + 6, color: GROUND.pathEdge });
    for (const s of dirt) expect(s).toMatchObject({ width: GROUND.pathWidth, color: GROUND.path });
  });

  it('runs each road along its own line, through the corner of its waypoint tiles', () => {
    ROADS.forEach((road, i) => {
      const pts = road.map((t) => [(t.tx + 1) * 32, (t.ty + 1) * 32]);
      expect(strokes[i]?.pts).toEqual(pts);
      expect(strokes[ROADS.length + i]?.pts).toEqual(pts);
    });
  });
});
