import { HOLLOWS } from '../data/hollows';
import type { LandmarkDef } from '../data/landmarks';
import { ROADS } from '../data/roads';
import { TILE } from '../data/rooms';
import { fromCentre, WORLD_SHAPE } from '../data/worldShape';
import { inRect, nearRoads, set, type Grid } from './genGrid';
import { createRng, nextFloat, nextInt, type RngState } from './rng';

// Stonefall Hollows' terrain (034), generated into the overworld's grid after Region 1's, from the map's seed mixed
// with the region's salt, so Region 1's stream is untouched: grey-blue stone ground with cliff runs, loose rubble
// and quarry-cut terraces. Since 053 the region is the ring round Region 1, and past its outer circle the ground
// rises into a ragged cliff edge out to the grid's edge: the world's natural boundary. The roads, the forum, the
// aqueduct and the quarry faces are stamped over it afterwards (`stampHollows`). Same seed, same Hollows, every run.

const C = WORLD_SHAPE.centre;
const { inner, outer } = HOLLOWS.radii;

/** Tiles within `roadClear` of a road (roads.ts): generated cliffs, rubble and terraces keep off them. */
const nearRoad = nearRoads(ROADS, HOLLOWS.roadClear, WORLD_SHAPE.size);

/** Ground generation may use: in the ring, `inset` tiles in from both its circles, clear of the kept-open rects and the roads. */
function free(tx: number, ty: number): boolean {
  const d = fromCentre(tx, ty);
  return d >= inner + HOLLOWS.inset && d <= outer - HOLLOWS.inset && !HOLLOWS.keepOpen.some((r) => inRect(r, tx, ty)) && !nearRoad.has(ty * WORLD_SHAPE.size + tx);
}

/** A random tile in the ring's bounding square. */
const anyTile = (rng: RngState): [number, number] => [C.tx + nextInt(rng, -outer, outer), C.ty + nextInt(rng, -outer, outer)];

/** The world's edge (053): cliff past the outer circle out to the grid's edge, ragged inward like 017's forest edge. */
function edge(grid: Grid, rng: RngState): void {
  const { ragged, raggedChance } = HOLLOWS.edge;
  for (let ty = 0; ty < WORLD_SHAPE.size; ty++) {
    for (let tx = 0; tx < WORLD_SHAPE.size; tx++) {
      // How far inside the outer circle: none or less, cliff; within `ragged`, cliff by chance, halving inward.
      const e = outer - fromCentre(tx, ty);
      if (e <= 0 || (e < ragged && nextFloat(rng) < raggedChance / (Math.floor(e) + 1))) set(grid, tx, ty, TILE.cliff);
    }
  }
}

/** Straight runs of cliff, across or down, one or two tiles deep. Every run draws the same numbers, placed or not. */
function cliffRuns(grid: Grid, rng: RngState): void {
  const { count, length, thick } = HOLLOWS.cliffRuns;
  for (let i = 0; i < count; i++) {
    const [tx0, ty0] = anyTile(rng);
    const across = nextFloat(rng) < HOLLOWS.cliffRuns.acrossChance;
    const len = nextInt(rng, length[0], length[1]);
    const deep = nextInt(rng, thick[0], thick[1]);
    for (let a = 0; a < len; a++) {
      for (let b = 0; b < deep; b++) {
        const tx = across ? tx0 + a : tx0 + b;
        const ty = across ? ty0 + b : ty0 + a;
        if (free(tx, ty) && grid[ty]?.[tx] === TILE.floor) set(grid, tx, ty, TILE.cliff);
      }
    }
  }
}

/** Fills the Hollows' ring and the edge past it from the seed: edge, cliff runs, terraces and rubble. */
export function generateHollows(grid: Grid, seed: number): void {
  const rng = createRng((seed ^ HOLLOWS.salt) >>> 0);
  // Landmark areas are cleared after, so they needn't steer this.
  edge(grid, rng);
  cliffRuns(grid, rng);
  const { terraces } = HOLLOWS;
  for (let i = 0; i < terraces.count; i++) {
    const [tx0, ty0] = anyTile(rng);
    const w = nextInt(rng, terraces.w[0], terraces.w[1]);
    const h = nextInt(rng, terraces.h[0], terraces.h[1]);
    for (let ty = ty0; ty < ty0 + h; ty++) for (let tx = tx0; tx < tx0 + w; tx++) if (free(tx, ty) && grid[ty]?.[tx] === TILE.floor) set(grid, tx, ty, TILE.terrace);
  }
  for (let i = 0; i < HOLLOWS.rubble; i++) {
    const [tx, ty] = anyTile(rng);
    if (free(tx, ty) && grid[ty]?.[tx] === TILE.floor) set(grid, tx, ty, TILE.rock);
  }
}

/** The Hollows' hand-placed structure over the generated ground: the forum's walls and columns, the second quarry wall, the landmarks' own tiles. */
export function stampHollows(grid: Grid, landmarks: readonly LandmarkDef[]): void {
  for (const t of [...HOLLOWS.arena.walls, ...HOLLOWS.quarryWall, ...landmarks.flatMap((l) => l.stamps ?? [])]) set(grid, t.tx, t.ty, t.symbol);
}
