import { SITE_SAFE_RADIUS, SITE_WAKES } from '../data/claims';
import { HOLLOWS, REGION_1_X } from '../data/hollows';
import { LANDMARK_LIST, type LandmarkDef } from '../data/landmarks';
import { OVERWORLD, type Feature, type TileRect } from '../data/overworld';
import { TILE, type Doorway, type PylonDef, type Pond, type Room } from '../data/rooms';
import { springClearing } from '../data/springs';
import { fill, inRect, path, set, type Grid } from './genGrid';
import { generateHollows, stampHollows } from './hollowsGen';
import { createRng, nextFloat, nextInt, type RngState } from './rng';

// Generates the overworld (017) from its fixed seed: grass, groves of trees, rock
// fields, ponds with shallow edges, scattered ruin stones and a forest edge, then
// the hand-placed landmarks and clearings on top. The same seed always gives the
// same map, so it can be built once at load. Region 1 (the old map) takes the columns
// from REGION_1_X on and is generated exactly as it was before Region 2 (034) grew the
// map west: the same draws, offset, never spilling into the Hollows. The Hollows are
// generated after it from their own stream (hollowsGen.ts).

/** Region 1's columns: the old map, generated as before at an offset. */
const R1 = { x0: REGION_1_X, w: OVERWORLD.width - REGION_1_X } as const;

const inRegion1 = (tx: number): boolean => tx >= R1.x0 && tx < R1.x0 + R1.w;

function open(tx: number, ty: number): boolean {
  return !OVERWORLD.clearings.some((r) => inRect(r, tx, ty));
}

/** Fills a rough disc of `symbol` around a random centre outside the clearings. */
function cluster(grid: Grid, rng: RngState, def: { radius: readonly [number, number]; density: number; rim: number }, symbol: string): void {
  const { radius, density, rim } = def;
  const r = nextInt(rng, radius[0], radius[1]);
  const cx = R1.x0 + nextInt(rng, 2, R1.w - 3);
  const cy = nextInt(rng, 2, OVERWORLD.height - 3);
  for (let ty = cy - r; ty <= cy + r; ty++) {
    for (let tx = cx - r; tx <= cx + r; tx++) {
      const d = Math.hypot(tx - cx, ty - cy) / r;
      // Tiles west of Region 1 were off the old map's grid: no draw, as before.
      if (d > 1 || !open(tx, ty) || !inRegion1(tx)) continue;
      // Thicker in the middle, thinning to the rim.
      if (grid[ty]?.[tx] === TILE.floor && nextFloat(rng) < density * (1 - d * rim)) set(grid, tx, ty, symbol);
    }
  }
}

function pond(grid: Grid, rng: RngState): Pond | null {
  const rx = nextInt(rng, OVERWORLD.ponds.radius[0], OVERWORLD.ponds.radius[1]);
  const ry = Math.max(2, rx - 1);
  const m = OVERWORLD.ponds.edgeMargin;
  const cx = R1.x0 + nextInt(rng, rx + m, R1.w - rx - m - 1);
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

/** Region 1's forest edge, all four sides of its own columns: its west side is now the border with the Hollows. */
function edge(grid: Grid, rng: RngState): void {
  const { depth, ragged, raggedChance } = OVERWORLD.edge;
  for (let ty = 0; ty < OVERWORLD.height; ty++) {
    for (let tx = R1.x0; tx < R1.x0 + R1.w; tx++) {
      const d = Math.min(tx - R1.x0, ty, R1.x0 + R1.w - 1 - tx, OVERWORLD.height - 1 - ty);
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

/** True if any tile of a pond's water or shallows lies in the rect. */
function pondReaches(p: Pond, r: TileRect): boolean {
  for (let ty = r.y0; ty <= r.y1; ty++) for (let tx = r.x0; tx <= r.x1; tx++) if (Math.hypot((tx - p.cx) / p.rx, (ty - p.cy) / p.ry) <= OVERWORLD.ponds.shore) return true;
  return false;
}

/**
 * Removes every generated pond reaching into a landmark's area (032), whole: its water and shallows go back to
 * grass. No randomness is drawn, so the rest of the map stays as the seed made it.
 */
function dropPonds(grid: Grid, ponds: Pond[], areas: readonly TileRect[]): Pond[] {
  return ponds.filter((p) => {
    if (!areas.some((r) => pondReaches(p, r))) return true;
    for (let ty = Math.floor(p.cy - p.ry * 2); ty <= Math.ceil(p.cy + p.ry * 2); ty++) {
      for (let tx = Math.floor(p.cx - p.rx * 2); tx <= Math.ceil(p.cx + p.rx * 2); tx++) {
        const here = grid[ty]?.[tx];
        if ((here === TILE.water || here === TILE.shallow) && Math.hypot((tx - p.cx) / p.rx, (ty - p.cy) / p.ry) <= OVERWORLD.ponds.shore) set(grid, tx, ty, TILE.floor);
      }
    }
    return false;
  });
}

/** Every pylon on the map (032): the shrine's, then each resource site's, dormant until the shrine is claimed. */
export function overworldPylons(landmarks: readonly LandmarkDef[] = LANDMARK_LIST): PylonDef[] {
  const { shrine } = OVERWORLD;
  return [
    { ...shrine.pylon, site: shrine.site, name: shrine.name, safeRadius: shrine.safeRadius },
    ...landmarks.flatMap((l) => (l.pylon ? [{ tx: l.pylon.tx, ty: l.pylon.ty, site: l.pylon.site, name: l.name, safeRadius: SITE_SAFE_RADIUS, wakes: SITE_WAKES }] : [])),
  ];
}

/** Builds the overworld room from `seed` (the data's by default), stamping `landmarks` (all of them unless a test passes fewer). */
export function generateOverworld(seed: number = OVERWORLD.seed, landmarks: readonly LandmarkDef[] = LANDMARK_LIST): Room {
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
    const tx = R1.x0 + nextInt(rng, 3, R1.w - 4);
    const ty = nextInt(rng, 3, OVERWORLD.height - 4);
    if (open(tx, ty) && grid[ty]?.[tx] === TILE.floor) set(grid, tx, ty, TILE.ruinBlock);
  }
  edge(grid, rng);
  generateHollows(grid, seed);

  // Landmarks override the terrain: clearings, paths, walls, the mound and the door. The landmarks' areas (032)
  // and the springs' clearings (030) are stamped here rather than steering the generator, so its stream is unchanged.
  const areas = landmarks.map((l) => l.area);
  const kept = dropPonds(grid, ponds, areas);
  for (const r of [...OVERWORLD.clearings, ...OVERWORLD.springs.map(springClearing), ...areas, ...HOLLOWS.clears]) fill(grid, r, TILE.floor);
  for (const p of [...OVERWORLD.paths, ...HOLLOWS.roads]) path(grid, p);
  for (const t of [...OVERWORLD.ruinField.walls, ...OVERWORLD.entrance.mound, ...landmarks.flatMap((l) => l.blocks ?? [])]) set(grid, t.tx, t.ty, TILE.ruinBlock);
  for (const t of OVERWORLD.shrine.walls) set(grid, t.tx, t.ty, TILE.wall);
  // The Hollows' cliffs, aqueduct and forum (034), over the road where they cross it.
  stampHollows(grid, landmarks);
  const pylons = overworldPylons(landmarks);
  const caches = landmarks.flatMap((l) => (l.cache ? [{ id: l.id, ...l.cache }] : []));
  const altar = HOLLOWS.arena.altar;
  for (const t of [...pylons, ...caches, altar, OVERWORLD.startStone, ...OVERWORLD.nodes, ...OVERWORLD.shrine.gate, ...HOLLOWS.gate]) set(grid, t.tx, t.ty, TILE.floor);
  for (const f of OVERWORLD.features) {
    const p = feature(grid, f);
    if (p) kept.push(p);
  }
  // A feature never buries a pylon, a reliquary or the altar.
  for (const t of [...pylons, ...caches, altar]) set(grid, t.tx, t.ty, TILE.floor);
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
    pylons,
    caches,
    gateTiles: [...OVERWORLD.shrine.gate.map((t) => ({ ...t, gate: 'shrine' as const })), ...HOLLOWS.gate.map((t) => ({ ...t, gate: 'hollows' as const }))],
    altars: [{ ...altar, boss: HOLLOWS.arena.boss }],
    terrain: { ponds: kept, paths: [...OVERWORLD.paths, ...HOLLOWS.roads] },
  };
}
