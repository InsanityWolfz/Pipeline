import { OVERWORLD, SPRING_CLEARING, type Feature, type TilePos, type TileRect } from '../data/overworld';
import { TILE, type Doorway, type Pond, type Room } from '../data/rooms';
import { createRng, nextFloat, nextInt, type RngState } from './rng';

// Generates the overworld (017) from its fixed seed: grass, groves of trees, rock
// fields, ponds with shallow edges, scattered ruin stones and a forest edge, then
// the hand-placed landmarks and clearings on top. The same seed always gives the
// same map, so it can be built once at load.

type Grid = string[][];

const inRect = (r: TileRect, tx: number, ty: number): boolean => tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1;

function open(tx: number, ty: number): boolean {
  return !OVERWORLD.clearings.some((r) => inRect(r, tx, ty));
}

function set(grid: Grid, tx: number, ty: number, symbol: string): void {
  const row = grid[ty];
  if (row && tx >= 0 && tx < row.length) row[tx] = symbol;
}

/** Fills a rough disc of `symbol` around a random centre outside the clearings. */
function cluster(grid: Grid, rng: RngState, def: { radius: readonly [number, number]; density: number; rim: number }, symbol: string): void {
  const { radius, density, rim } = def;
  const r = nextInt(rng, radius[0], radius[1]);
  const cx = nextInt(rng, 2, OVERWORLD.width - 3);
  const cy = nextInt(rng, 2, OVERWORLD.height - 3);
  for (let ty = cy - r; ty <= cy + r; ty++) {
    for (let tx = cx - r; tx <= cx + r; tx++) {
      const d = Math.hypot(tx - cx, ty - cy) / r;
      if (d > 1 || !open(tx, ty)) continue;
      // Thicker in the middle, thinning to the rim.
      if (grid[ty]?.[tx] === TILE.floor && nextFloat(rng) < density * (1 - d * rim)) set(grid, tx, ty, symbol);
    }
  }
}

function pond(grid: Grid, rng: RngState): Pond | null {
  const rx = nextInt(rng, OVERWORLD.ponds.radius[0], OVERWORLD.ponds.radius[1]);
  const ry = Math.max(2, rx - 1);
  const m = OVERWORLD.ponds.edgeMargin;
  const cx = nextInt(rng, rx + m, OVERWORLD.width - rx - m - 1);
  const cy = nextInt(rng, ry + m, OVERWORLD.height - ry - m - 1);
  // A pond keeps a tile of grass between itself and any clearing in OVERWORLD.clearings or path. The springs'
  // clearings (030) are stamped later and don't steer this; tests/data/springs.test.ts checks no pond reaches them.
  for (let ty = cy - ry - 2; ty <= cy + ry + 2; ty++) {
    for (let tx = cx - rx - 2; tx <= cx + rx + 2; tx++) if (!open(tx, ty) || grid[ty]?.[tx] === TILE.path) return null;
  }
  for (let ty = cy - ry - 1; ty <= cy + ry + 1; ty++) {
    for (let tx = cx - rx - 1; tx <= cx + rx + 1; tx++) {
      const d = Math.hypot((tx - cx) / rx, (ty - cy) / ry);
      if (d <= 1) set(grid, tx, ty, TILE.water);
      else if (d <= OVERWORLD.ponds.shore) set(grid, tx, ty, TILE.shallow);
    }
  }
  return { cx, cy, rx, ry };
}

/** Lays a two-tile-wide path along a tile polyline. */
function path(grid: Grid, points: readonly TilePos[]): void {
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;
    const steps = Math.max(Math.abs(b.tx - a.tx), Math.abs(b.ty - a.ty));
    for (let s = 0; s <= steps; s++) {
      const tx = Math.round(a.tx + ((b.tx - a.tx) * s) / steps);
      const ty = Math.round(a.ty + ((b.ty - a.ty) * s) / steps);
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) set(grid, tx + dx, ty + dy, TILE.path);
    }
  }
}

function edge(grid: Grid, rng: RngState): void {
  const { depth, ragged, raggedChance } = OVERWORLD.edge;
  for (let ty = 0; ty < OVERWORLD.height; ty++) {
    for (let tx = 0; tx < OVERWORLD.width; tx++) {
      const d = Math.min(tx, ty, OVERWORLD.width - 1 - tx, OVERWORLD.height - 1 - ty);
      if (d < depth || (d < depth + ragged && nextFloat(rng) < raggedChance / (d - depth + 1))) set(grid, tx, ty, TILE.tree);
    }
  }
}

/** Tiles a feature never covers: the landmarks' paths, walls and door. */
const KEEP: readonly string[] = [TILE.path, TILE.wall, TILE.ruinBlock, TILE.door];

/**
 * Stamps a hand-placed feature round its node (018). A grove or rock field fills
 * the back half of its disc, the rows up to its centre, so its node stays open
 * from the front, and leaves a pocket of grass one tile round every node; a pond's
 * water reaches up to a reed node, which stands in its shallows.
 */
function feature(grid: Grid, f: Feature): Pond | null {
  const node = (tx: number, ty: number) => OVERWORLD.nodes.some((n) => n.tx === tx && n.ty === ty);
  const pocket = (tx: number, ty: number) => OVERWORLD.nodes.some((n) => Math.abs(n.tx - tx) <= 1 && Math.abs(n.ty - ty) <= 1);
  const rx = f.kind === 'pond' ? f.rx * OVERWORLD.ponds.shore : f.r;
  const ry = f.kind === 'pond' ? f.ry * OVERWORLD.ponds.shore : f.r;
  for (let ty = Math.floor(f.cy - ry); ty <= Math.ceil(f.cy + ry); ty++) {
    for (let tx = Math.floor(f.cx - rx); tx <= Math.ceil(f.cx + rx); tx++) {
      const here = grid[ty]?.[tx];
      if (here === undefined || KEEP.includes(here)) continue;
      if (f.kind === 'pond') {
        const d = Math.hypot((tx - f.cx) / f.rx, (ty - f.cy) / f.ry);
        if (d <= 1 && !node(tx, ty)) set(grid, tx, ty, TILE.water);
        else if (d <= OVERWORLD.ponds.shore) set(grid, tx, ty, TILE.shallow);
        continue;
      }
      if (Math.hypot(tx - f.cx, ty - f.cy) > f.r) continue;
      if (pocket(tx, ty)) set(grid, tx, ty, TILE.floor);
      else if (ty <= f.cy) set(grid, tx, ty, f.kind === 'grove' ? TILE.tree : TILE.rock);
    }
  }
  return f.kind === 'pond' ? { cx: f.cx, cy: f.cy, rx: f.rx, ry: f.ry } : null;
}

/** A Ley Spring's clearing (030): a square of open ground round its pool. */
export function springClearing(s: { tx: number; ty: number }): TileRect {
  return { x0: s.tx - SPRING_CLEARING, y0: s.ty - SPRING_CLEARING, x1: s.tx + SPRING_CLEARING, y1: s.ty + SPRING_CLEARING };
}

/** Builds the overworld room from `seed` (the data's by default). */
export function generateOverworld(seed: number = OVERWORLD.seed): Room {
  const rng = createRng(seed);
  const grid: Grid = Array.from({ length: OVERWORLD.height }, () => Array.from({ length: OVERWORLD.width }, () => TILE.floor as string));
  // Paths first, so ponds, groves and rocks keep off them.
  for (const p of OVERWORLD.paths) path(grid, p);
  const ponds: Pond[] = [];
  for (let i = 0; i < OVERWORLD.ponds.count; i++) {
    // A few tries each, since a pond won't sit near a clearing.
    for (let t = 0; t < OVERWORLD.ponds.tries; t++) {
      const p = pond(grid, rng);
      if (p) {
        ponds.push(p);
        break;
      }
    }
  }
  for (let i = 0; i < OVERWORLD.groves.count; i++) cluster(grid, rng, OVERWORLD.groves, TILE.tree);
  for (let i = 0; i < OVERWORLD.rockFields.count; i++) cluster(grid, rng, OVERWORLD.rockFields, TILE.rock);
  for (let i = 0; i < OVERWORLD.ruinStones; i++) {
    const tx = nextInt(rng, 3, OVERWORLD.width - 4);
    const ty = nextInt(rng, 3, OVERWORLD.height - 4);
    if (open(tx, ty) && grid[ty]?.[tx] === TILE.floor) set(grid, tx, ty, TILE.ruinBlock);
  }
  edge(grid, rng);

  // Landmarks override the terrain: clearings, paths, walls, the mound and the door.
  for (const r of [...OVERWORLD.clearings, ...OVERWORLD.springs.map(springClearing)]) {
    for (let ty = r.y0; ty <= r.y1; ty++) for (let tx = r.x0; tx <= r.x1; tx++) set(grid, tx, ty, TILE.floor);
  }
  for (const p of OVERWORLD.paths) path(grid, p);
  for (const t of [...OVERWORLD.ruinField.walls, ...OVERWORLD.entrance.mound]) set(grid, t.tx, t.ty, TILE.ruinBlock);
  for (const t of OVERWORLD.shrine.walls) set(grid, t.tx, t.ty, TILE.wall);
  for (const t of [OVERWORLD.shrine.pylon, OVERWORLD.startStone, ...OVERWORLD.nodes, ...OVERWORLD.shrine.gate]) set(grid, t.tx, t.ty, TILE.floor);
  for (const f of OVERWORLD.features) {
    const p = feature(grid, f);
    if (p) ponds.push(p);
  }
  const door = OVERWORLD.entrance.door;
  set(grid, door.tx, door.ty, TILE.door);
  set(grid, OVERWORLD.entrance.arrive.tx, OVERWORLD.entrance.arrive.ty, TILE.path);

  const doorway: Doorway = { tx: door.tx, ty: door.ty, to: 'foundry', toDoor: 0, gate: 'foundry', arrive: OVERWORLD.entrance.arrive };
  return {
    id: OVERWORLD.id,
    rows: grid.map((r) => r.join('')),
    spawn: OVERWORLD.field,
    enemies: OVERWORLD.packs,
    nodes: OVERWORLD.nodes,
    doorways: [doorway],
    tubeStone: OVERWORLD.startStone,
    pylon: { ...OVERWORLD.shrine.pylon, site: OVERWORLD.shrine.site },
    gateTiles: OVERWORLD.shrine.gate.map((t) => ({ ...t, gate: 'shrine' as const })),
    terrain: { ponds, paths: OVERWORLD.paths },
  };
}
