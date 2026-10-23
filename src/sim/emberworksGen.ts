import { EMBERWORKS, rampTiles } from '../data/emberworks';
import { ANVIL_HALL } from '../data/emberworksSites';
import { ROADS } from '../data/roads';
import { TILE } from '../data/rooms';
import { fromCentre, WORLD_SHAPE } from '../data/worldShape';
import { nearRoads, set, type Grid } from './genGrid';
import { createRng, nextFloat, nextInt, type RngState } from './rng';

// The Emberworks' terrain (060), generated into the overworld's grid after the Hollows', from the map's seed mixed with
// the region's salt, so Region 1's and the Hollows' streams are untouched: ash ground past the Hollows' cliff edge,
// ragged at its foot and at its own outer edge (cliff out to the grid's edge past it), with kilns in terraced rows,
// chimney stacks and ash terraces. The ramps up through the cliffs are stamped over it afterwards (`stampEmberworks`),
// with the roads. Same seed, same Emberworks, every run.

const C = WORLD_SHAPE.centre;
const { inner, outer } = EMBERWORKS.radii;
/** Where the Emberworks' own ground starts: past the Hollows' cliff edge. */
const FOOT = inner + EMBERWORKS.wall;

const nearRoad = nearRoads(ROADS, EMBERWORKS.roadClear, WORLD_SHAPE.size);

/** Ground generation may use: in the ring, `inset` tiles in from its foot and its edge, clear of the roads. */
function free(tx: number, ty: number): boolean {
  const d = fromCentre(tx, ty);
  return d >= FOOT + EMBERWORKS.inset && d <= outer - EMBERWORKS.inset && !nearRoad.has(ty * WORLD_SHAPE.size + tx);
}

/** A random tile in the ring's bounding square. */
const anyTile = (rng: RngState): [number, number] => [C.tx + nextInt(rng, -outer, outer), C.ty + nextInt(rng, -outer, outer)];

/** Cliff by chance within `ragged` tiles of an edge, halving away from it (`e`: tiles from the edge, ≥ 0). */
const ragged = (rng: RngState, e: number): boolean => e < EMBERWORKS.edge.ragged && nextFloat(rng) < EMBERWORKS.edge.raggedChance / (Math.floor(e) + 1);

/** The ring's ground: open from the wall's foot out to `outer`, ragged at both; the Hollows' edge left it all cliff. */
function ground(grid: Grid, rng: RngState): void {
  for (let ty = 0; ty < WORLD_SHAPE.size; ty++) {
    for (let tx = 0; tx < WORLD_SHAPE.size; tx++) {
      const d = fromCentre(tx, ty);
      if (d < FOOT || d >= outer) continue;
      const cliff = ragged(rng, d - FOOT) || ragged(rng, outer - d);
      set(grid, tx, ty, cliff ? TILE.cliff : TILE.floor);
    }
  }
}

/** Blocks of `symbol`, `w` × `h` tiles, on free open ground. Every block draws the same numbers, placed or not. */
function blocks(grid: Grid, rng: RngState, def: { count: number; w: readonly [number, number]; h: readonly [number, number] }, symbol: string): void {
  for (let i = 0; i < def.count; i++) {
    const [tx0, ty0] = anyTile(rng);
    const w = nextInt(rng, def.w[0], def.w[1]);
    const h = nextInt(rng, def.h[0], def.h[1]);
    for (let ty = ty0; ty < ty0 + h; ty++) for (let tx = tx0; tx < tx0 + w; tx++) if (free(tx, ty) && grid[ty]?.[tx] === TILE.floor) set(grid, tx, ty, symbol);
  }
}

/** Fills the Emberworks' ring from the seed: its ground, terraces, kilns and chimneys. */
export function generateEmberworks(grid: Grid, seed: number): void {
  const rng = createRng((seed ^ EMBERWORKS.salt) >>> 0);
  ground(grid, rng);
  blocks(grid, rng, EMBERWORKS.terraces, TILE.terrace);
  blocks(grid, rng, EMBERWORKS.kilns, TILE.kiln);
  for (let i = 0; i < EMBERWORKS.chimneys; i++) {
    const [tx, ty] = anyTile(rng);
    if (free(tx, ty) && grid[ty]?.[tx] === TILE.floor) set(grid, tx, ty, TILE.chimney);
  }
}

/**
 * The Emberworks' hand-placed structure over the generated ground and the roads: the Hollows' cliff edge made whole
 * again where a road crossed it (only a ramp goes through), then the ramps up through the cliffs, and the Anvil Hall.
 */
export function stampEmberworks(grid: Grid): void {
  const ramps = EMBERWORKS.ramps.flatMap((r) => rampTiles(r));
  const r = Math.ceil(FOOT);
  for (let ty = C.ty - r; ty <= C.ty + r; ty++) {
    for (let tx = C.tx - r; tx <= C.tx + r; tx++) {
      const d = fromCentre(tx, ty);
      if (d >= inner && d < FOOT && grid[ty]?.[tx] === TILE.path) set(grid, tx, ty, TILE.cliff);
    }
  }
  for (const t of ramps) set(grid, t.tx, t.ty, TILE.ramp);
  // The Anvil Hall's walls and door (its floor is cleared with the landmarks').
  for (const t of ANVIL_HALL.walls) set(grid, t.tx, t.ty, t.symbol);
}
