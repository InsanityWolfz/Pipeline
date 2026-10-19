import { HOLLOWS } from '../data/hollows';
import type { LandmarkDef } from '../data/landmarks';
import { TILE } from '../data/rooms';
import { inRect, set, type Grid } from './genGrid';
import { createRng, nextFloat, nextInt, type RngState } from './rng';

// Stonefall Hollows' terrain (034), generated into its own columns of the overworld's grid
// after Region 1's, from the map's seed mixed with the region's salt, so Region 1's stream
// is untouched: grey-blue stone ground with a cliff edge, cliff runs, loose rubble and
// quarry-cut terraces. The road, the forum, the aqueduct and the quarry faces are stamped
// over it afterwards (`stampHollows`). Same seed, same Hollows, every run.

const B = HOLLOWS.bounds;

/** Ground generation may use: in the Hollows, clear of the kept-open rects. */
function free(tx: number, ty: number, areas: readonly { x0: number; y0: number; x1: number; y1: number }[]): boolean {
  return inRect(B, tx, ty) && !areas.some((r) => inRect(r, tx, ty));
}

/** The map edge in cliffs: `depth` deep on every side of the region (its east side is the wall the gap cuts), ragged inward. */
function edge(grid: Grid, rng: RngState): void {
  const { depth, ragged, raggedChance } = HOLLOWS.edge;
  for (let ty = B.y0; ty <= B.y1; ty++) {
    for (let tx = B.x0; tx <= B.x1; tx++) {
      const d = Math.min(tx - B.x0, ty - B.y0, B.x1 - tx, B.y1 - ty);
      if (d < depth || (d < depth + ragged && nextFloat(rng) < raggedChance / (d - depth + 1))) set(grid, tx, ty, TILE.cliff);
    }
  }
}

/** Straight runs of cliff, across or down, one or two tiles deep. Every run draws the same numbers, placed or not. */
function cliffRuns(grid: Grid, rng: RngState, keep: readonly { x0: number; y0: number; x1: number; y1: number }[]): void {
  const { count, length, thick } = HOLLOWS.cliffRuns;
  for (let i = 0; i < count; i++) {
    const tx0 = nextInt(rng, B.x0 + 3, B.x1 - 3);
    const ty0 = nextInt(rng, B.y0 + 3, B.y1 - 3);
    const across = nextFloat(rng) < 0.5;
    const len = nextInt(rng, length[0], length[1]);
    const deep = nextInt(rng, thick[0], thick[1]);
    for (let a = 0; a < len; a++) {
      for (let b = 0; b < deep; b++) {
        const tx = across ? tx0 + a : tx0 + b;
        const ty = across ? ty0 + b : ty0 + a;
        if (free(tx, ty, keep) && grid[ty]?.[tx] === TILE.floor) set(grid, tx, ty, TILE.cliff);
      }
    }
  }
}

/** Fills the Hollows' columns from the seed: ground, edge, cliff runs, terraces and rubble. */
export function generateHollows(grid: Grid, seed: number): void {
  const rng = createRng((seed ^ HOLLOWS.salt) >>> 0);
  // Landmark areas are cleared after, so they needn't steer this.
  const keep = HOLLOWS.keepOpen;
  edge(grid, rng);
  cliffRuns(grid, rng, keep);
  const { terraces } = HOLLOWS;
  for (let i = 0; i < terraces.count; i++) {
    const tx0 = nextInt(rng, B.x0 + 3, B.x1 - 3);
    const ty0 = nextInt(rng, B.y0 + 3, B.y1 - 3);
    const w = nextInt(rng, terraces.w[0], terraces.w[1]);
    const h = nextInt(rng, terraces.h[0], terraces.h[1]);
    for (let ty = ty0; ty < ty0 + h; ty++) for (let tx = tx0; tx < tx0 + w; tx++) if (free(tx, ty, keep) && grid[ty]?.[tx] === TILE.floor) set(grid, tx, ty, TILE.terrace);
  }
  for (let i = 0; i < HOLLOWS.rubble; i++) {
    const tx = nextInt(rng, B.x0 + 3, B.x1 - 3);
    const ty = nextInt(rng, B.y0 + 3, B.y1 - 3);
    if (free(tx, ty, keep) && grid[ty]?.[tx] === TILE.floor) set(grid, tx, ty, TILE.rock);
  }
}

/** The Hollows' hand-placed structure over the generated ground: the forum's walls and columns, the second quarry wall, the landmarks' own tiles. */
export function stampHollows(grid: Grid, landmarks: readonly LandmarkDef[]): void {
  for (const t of [...HOLLOWS.arena.walls, ...HOLLOWS.quarryWall, ...landmarks.flatMap((l) => l.stamps ?? [])]) set(grid, t.tx, t.ty, t.symbol);
}
