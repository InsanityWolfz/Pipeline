import { SITE_SAFE_RADIUS, SITE_WAKES } from '../data/claims';
import { EMBERWORKS_GATE } from '../data/emberworks';
import { ANVIL_HALL } from '../data/emberworksSites';
import { HOLLOWS } from '../data/hollows';
import { LANDMARK_LIST, type LandmarkDef } from '../data/landmarks';
import { OVERWORLD, type Feature, type TileRect } from '../data/overworld';
import { TILE, type Doorway, type PylonDef, type Pond, type Room } from '../data/rooms';
import { springClearing } from '../data/springs';
import { fill, inRect, path, set, type Grid } from './genGrid';
import { fromCentre, WORLD_SHAPE } from '../data/worldShape';
import { generateEmberworks, stampEmberworks } from './emberworksGen';
import { generateStormcrown, stampStormcrown } from './stormcrownGen';
import { STORMCROWN_GATE } from '../data/stormcrown';
import { CROWN_SPIRE } from '../data/stormcrownSites';
import { generateHollows, stampHollows } from './hollowsGen';
import { createRng, nextFloat, nextInt, type RngState } from './rng';

// Generates the overworld (017) from its fixed seed: grass, groves of trees, rock fields, ponds with shallow edges
// and scattered ruin stones, then the hand-placed landmarks, roads and clearings on top. The same seed always gives
// the same map, so it can be built once at load. Since 053 the map is round: Region 1's terrain fills the disc
// inside the barrier's circle, keeping `keepOff` tiles clear of it; the Hollows' ring and the cliff edge past it are
// generated after it from their own stream (hollowsGen.ts), and since 060 the Emberworks past that (emberworksGen.ts).

const C = WORLD_SHAPE.centre;
/** Region 1's generated ground: inside this radius. */
const R1 = WORLD_SHAPE.region1 - OVERWORLD.keepOff;

const inRegion1 = (tx: number, ty: number): boolean => fromCentre(tx, ty) < R1;

function open(tx: number, ty: number): boolean {
  return !OVERWORLD.clearings.some((r) => inRect(r, tx, ty));
}

/** Fills a rough disc of `symbol` around a random centre outside the clearings. */
function cluster(grid: Grid, rng: RngState, def: { radius: readonly [number, number]; density: number; rim: number }, symbol: string): void {
  const { radius, density, rim } = def;
  const r = nextInt(rng, radius[0], radius[1]);
  const cx = C.tx + nextInt(rng, -R1, R1);
  const cy = C.ty + nextInt(rng, -R1, R1);
  for (let ty = cy - r; ty <= cy + r; ty++) {
    for (let tx = cx - r; tx <= cx + r; tx++) {
      const d = Math.hypot(tx - cx, ty - cy) / r;
      // Tiles outside Region 1's disc are the Hollows' or the barrier's: no draw.
      if (d > 1 || !open(tx, ty) || !inRegion1(tx, ty)) continue;
      // Thicker in the middle, thinning to the rim.
      if (grid[ty]?.[tx] === TILE.floor && nextFloat(rng) < density * (1 - d * rim)) set(grid, tx, ty, symbol);
    }
  }
}

function pond(grid: Grid, rng: RngState): Pond | null {
  const rx = nextInt(rng, OVERWORLD.ponds.radius[0], OVERWORLD.ponds.radius[1]);
  const ry = Math.max(2, rx - 1);
  const m = OVERWORLD.ponds.edgeMargin;
  const cx = C.tx + nextInt(rng, -R1, R1);
  const cy = C.ty + nextInt(rng, -R1, R1);
  // The whole pond, shallows and margin, inside Region 1's disc.
  if (fromCentre(cx, cy) + Math.max(rx, ry) * OVERWORLD.ponds.shore + m > R1) return null;
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
    const tx = C.tx + nextInt(rng, -R1, R1);
    const ty = C.ty + nextInt(rng, -R1, R1);
    if (inRegion1(tx, ty) && open(tx, ty) && grid[ty]?.[tx] === TILE.floor) set(grid, tx, ty, TILE.ruinBlock);
  }
  generateHollows(grid, seed);
  // 060: the Emberworks past the Hollows' cliff edge, from its own stream.
  generateEmberworks(grid, seed);
  // 064: the Stormcrown past the Emberworks' cliff edge, from its own stream.
  generateStormcrown(grid, seed);

  // Landmarks override the terrain: clearings, roads, walls, the ruin and the door. The landmarks' areas (032)
  // and the springs' clearings (030) are stamped here rather than steering the generator, so its stream is unchanged.
  const areas = landmarks.map((l) => l.area);
  // 053: and any reaching a spring's clearing (030), which on the round map the generator can now reach.
  const kept = dropPonds(grid, ponds, [...areas, ...OVERWORLD.springs.map(springClearing)]);
  for (const r of [...OVERWORLD.clearings, ...OVERWORLD.springs.map(springClearing), ...areas, ...HOLLOWS.clears, ANVIL_HALL.bounds, CROWN_SPIRE.bounds]) fill(grid, r, TILE.floor);
  for (const p of OVERWORLD.paths) path(grid, p);
  for (const t of [...OVERWORLD.ruinField.walls, ...OVERWORLD.entrance.mound, ...landmarks.flatMap((l) => l.blocks ?? [])]) set(grid, t.tx, t.ty, TILE.ruinBlock);
  for (const t of OVERWORLD.shrine.walls) set(grid, t.tx, t.ty, TILE.wall);
  // 055: the Warden's arena's door, in its front wall (the forum's is in its walls, stamped with the Hollows').
  for (const t of OVERWORLD.shrine.door) set(grid, t.tx, t.ty, TILE.arenaDoor);
  // The Hollows' cliffs, aqueduct and forum (034), over the road where they cross it.
  stampHollows(grid, landmarks);
  // 060: the ramps up into the Emberworks, over the roads that climb them.
  stampEmberworks(grid);
  // 064: the ramps up into the Stormcrown.
  stampStormcrown(grid);
  const pylons = overworldPylons(landmarks);
  const caches = landmarks.flatMap((l) => (l.cache ? [{ id: l.id, ...l.cache }] : []));
  const altar = HOLLOWS.arena.altar;
  const anvilAltar = ANVIL_HALL.altar;
  for (const t of [...pylons, ...caches, altar, anvilAltar, OVERWORLD.startStone, ...OVERWORLD.nodes, ...HOLLOWS.gate]) set(grid, t.tx, t.ty, TILE.floor);
  for (const f of OVERWORLD.features) {
    const p = feature(grid, f);
    if (p) kept.push(p);
  }
  // A feature never buries a pylon, a reliquary or the altar.
  for (const t of [...pylons, ...caches, altar, anvilAltar]) set(grid, t.tx, t.ty, TILE.floor);
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
    // 055: the shrine's gate has no tiles any more; its door (TILE.arenaDoor) stands where they were.
    gateTiles: [
      ...HOLLOWS.gate.map((t) => ({ ...t, gate: 'hollows' as const })), ...EMBERWORKS_GATE.map((t) => ({ ...t, gate: 'emberworks' as const })),
      ...STORMCROWN_GATE.map((t) => ({ ...t, gate: 'stormcrown' as const })),
    ],
    altars: [
      { ...altar, boss: HOLLOWS.arena.boss },
      { ...anvilAltar, boss: ANVIL_HALL.boss },
    ],
    terrain: { ponds: kept, paths: OVERWORLD.paths },
  };
}
