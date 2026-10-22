import { GROUND } from '../../data/art/ground';
import { TILE_SIZE } from '../../data/config';
import type { TilePos } from '../../data/tiles';

// The dirt roads' strokes (017, 053), in draw order. 059 (Shaun: "the paths read as one shape, an X or a Y"): every
// road's dark edge goes down before any road's dirt, so where two roads cross or join (a branch starts on its parent's
// waypoint) the dirt of each covers the other's edge and round end cap, and only the outer edges show.

/** One polyline stroke: its points in world px, width px and palette colour. */
export interface PathStroke {
  readonly pts: readonly (readonly [number, number])[];
  readonly width: number;
  readonly color: string;
}

/** Each road's edge, then each road's dirt, along the line through its tiles' bottom-right corners (two tiles wide). */
export function pathStrokes(paths: readonly (readonly TilePos[])[]): PathStroke[] {
  const lines = paths.map((p) => p.map((t) => [(t.tx + 1) * TILE_SIZE, (t.ty + 1) * TILE_SIZE] as const));
  return [...lines.map((pts) => ({ pts, width: GROUND.pathWidth + 6, color: GROUND.pathEdge })), ...lines.map((pts) => ({ pts, width: GROUND.pathWidth, color: GROUND.path }))];
}
