import { ROADS } from '../data/roads';
import { TILE } from '../data/rooms';
import { STORMCROWN, stormRampTiles } from '../data/stormcrown';
import { fromCentre, WORLD_SHAPE } from '../data/worldShape';
import { nearRoads, set, type Grid } from './genGrid';
import { createRng, nextFloat, nextInt, type RngState } from './rng';

// The Stormcrown's terrain (064), generated into the overworld's grid after the Emberworks', from the map's seed mixed
// with the region's salt, so every inner ring's stream is untouched: wind-scoured slate past the Emberworks' cliff
// edge, ragged at its foot and at its own outer edge (cliff out to the grid's edge past it), with iron rods, cairns and
// chasms. The ramps up through the cliffs are stamped over it afterwards (`stampStormcrown`), with the roads. Same
// seed, same Stormcrown, every run.

const C = WORLD_SHAPE.centre;
const { inner, outer } = STORMCROWN.radii;
/** Where the Stormcrown's own ground starts: past the Emberworks' cliff edge. */
const FOOT = inner + STORMCROWN.wall;

const nearRoad = nearRoads(ROADS, STORMCROWN.roadClear, WORLD_SHAPE.size);

/** Ground generation may use: in the ring, `inset` tiles in from its foot and its edge, clear of the roads. */
function free(tx: number, ty: number): boolean {
  const d = fromCentre(tx, ty);
  return d >= FOOT + STORMCROWN.inset && d <= outer - STORMCROWN.inset && !nearRoad.has(ty * WORLD_SHAPE.size + tx);
}

/** A random tile in the ring's bounding square. */
const anyTile = (rng: RngState): [number, number] => [C.tx + nextInt(rng, -outer, outer), C.ty + nextInt(rng, -outer, outer)];

/** Cliff by chance within `ragged` tiles of an edge, halving away from it (`e`: tiles from the edge, ≥ 0). */
const ragged = (rng: RngState, e: number): boolean => e < STORMCROWN.edge.ragged && nextFloat(rng) < STORMCROWN.edge.raggedChance / (Math.floor(e) + 1);

/** The ring's ground: open from the wall's foot out to `outer`, ragged at both; the rings inside left it all cliff. */
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

/** Fills the Stormcrown's ring from the seed: its ground, chasms, cairns and iron rods. */
export function generateStormcrown(grid: Grid, seed: number): void {
  const rng = createRng((seed ^ STORMCROWN.salt) >>> 0);
  ground(grid, rng);
  blocks(grid, rng, STORMCROWN.chasms, TILE.chasm);
  blocks(grid, rng, STORMCROWN.cairns, TILE.cairn);
  for (let i = 0; i < STORMCROWN.rods; i++) {
    const [tx, ty] = anyTile(rng);
    if (free(tx, ty) && grid[ty]?.[tx] === TILE.floor) set(grid, tx, ty, TILE.ironRod);
  }
}

/**
 * The Stormcrown's hand-placed structure over the generated ground and the roads: the Emberworks' cliff edge made whole
 * again where a road crossed it (only a ramp goes through), then the ramps up through the cliffs.
 */
export function stampStormcrown(grid: Grid): void {
  const r = Math.ceil(FOOT);
  for (let ty = C.ty - r; ty <= C.ty + r; ty++) {
    for (let tx = C.tx - r; tx <= C.tx + r; tx++) {
      const d = fromCentre(tx, ty);
      if (d >= inner && d < FOOT && grid[ty]?.[tx] === TILE.path) set(grid, tx, ty, TILE.cliff);
    }
  }
  for (const t of STORMCROWN.ramps.flatMap(stormRampTiles)) set(grid, t.tx, t.ty, TILE.ramp);
}
