import { BOSS_ARENAS, ARENAS } from '../../data/arenas';
import { TILE_SIZE } from '../../data/config';
import { DECOR, DECOR_CLEAR, type DecorRegion, type PlantSet, type SwayKind } from '../../data/decor';
import { EMBERWORKS, rampTiles } from '../../data/emberworks';
import { GROTTO } from '../../data/grotto';
import { OVERWORLD } from '../../data/overworld';
import { TILE, type Room } from '../../data/rooms';
import { SET_PIECES } from '../../data/setPieces';
import { STORMCROWN, stormRampTiles } from '../../data/stormcrown';
import { onBarrier, WORLD_SHAPE, fromCentre } from '../../data/worldShape';
import { worldTileHash } from '../../sim/tileLook';

// 077: where the world's detail goes, as pure functions of the fixed map, data and `worldTileHash` salted per set, so
// a chunk's decor is the same however and whenever it's built. Plants stand only on open floor, scatter on walkable
// floor (floor and terraces), vines hang from a cliff face over open floor; none goes where DECOR_CLEAR keeps clear.

const T = TILE_SIZE;

/** A tile's hash for one set: `worldTileHash` mixed with the set's salt. */
export function saltedHash(tx: number, ty: number, salt: number): number {
  let x = (worldTileHash(tx, ty) ^ Math.imul(salt, 0x9e3779b1)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

/** The overworld's look at a tile, by its distance from the foundry's door (the ground's own edges). */
export function decorRegion(tx: number, ty: number): DecorRegion {
  const d = fromCentre(tx, ty);
  return d < WORLD_SHAPE.region1 ? 'meadow' : d < WORLD_SHAPE.hollows ? 'hollows' : d < WORLD_SHAPE.emberworks ? 'ember' : 'storm';
}

const masks = new WeakMap<Room, Uint8Array>();

/** The tiles DECOR_CLEAR keeps clear on a map, worked out once a map: 1 for kept clear. */
export function clearMask(room: Room): Uint8Array {
  const known = masks.get(room);
  if (known) return known;
  const w = room.rows[0]?.length ?? 0;
  const h = room.rows.length;
  const m = new Uint8Array(w * h);
  const mark = (tx: number, ty: number) => {
    if (tx >= 0 && ty >= 0 && tx < w && ty < h) m[ty * w + tx] = 1;
  };
  const around = (t: { tx: number; ty: number }, r: number) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) mark(t.tx + dx, t.ty + dy);
  };
  const C = DECOR_CLEAR;
  room.rows.forEach((row, ty) => {
    for (let tx = 0; tx < row.length; tx++) {
      const s = row[tx];
      if (s === TILE.path) around({ tx, ty }, C.pathMargin);
      if (s === TILE.ramp || s === TILE.arenaDoor || s === TILE.door) around({ tx, ty }, s === TILE.ramp ? 0 : C.pointMargin);
      if (onBarrier(tx, ty)) mark(tx, ty);
    }
  });
  for (const a of BOSS_ARENAS) for (let ty = a.bounds.y0; ty <= a.bounds.y1; ty++) for (let tx = a.bounds.x0; tx <= a.bounds.x1; tx++) mark(tx, ty);
  for (const t of [...EMBERWORKS.ramps.flatMap((r) => rampTiles(r)), ...STORMCROWN.ramps.flatMap((r) => stormRampTiles(r)), ...(room.gateTiles ?? [])]) mark(t.tx, t.ty);
  const points = [
    ...(room.pylons ?? []),
    ...OVERWORLD.nodes,
    ...(room.altars ?? []),
    ...ARENAS.flatMap((a) => a.door.tiles),
    // 072's return stones (three tiles west of each boss arena door's `leaveTo`).
    ...BOSS_ARENAS.map((a) => ({ tx: a.door.leaveTo.tx - C.returnStoneWest, ty: a.door.leaveTo.ty })),
    ...(room.caches ?? []),
    OVERWORLD.startStone,
    OVERWORLD.entrance.door,
    ...OVERWORLD.entrance.mound,
  ];
  for (const p of points) around(p, C.pointMargin);
  for (const s of OVERWORLD.springs) {
    const r = s.radius + C.springMargin;
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) if (Math.hypot(dx, dy) <= r + 0.5) mark(s.tx + dx, s.ty + dy);
  }
  const g = GROTTO.area;
  for (let ty = g.y0; ty <= g.y1; ty++) for (let tx = g.x0; tx <= g.x1; tx++) mark(tx, ty);
  masks.set(room, m);
  return m;
}

/** True if DECOR_CLEAR keeps a tile clear of plants and scatter. */
export function keptClear(room: Room, tx: number, ty: number): boolean {
  const w = room.rows[0]?.length ?? 0;
  return tx < 0 || ty < 0 || tx >= w || ty >= room.rows.length || clearMask(room)[ty * w + tx] === 1;
}

/** A plant as placed: its frame, how it sways, its foot (world px), its tile, its phase (0..1) and mirror. */
export interface PlacedPlant {
  frame: string;
  sway: SwayKind;
  x: number;
  y: number;
  tx: number;
  ty: number;
  phase: number;
  flip: boolean;
}

/** A scatter mark (painted into the ground), or a vine (hung from a cliff face), as placed. */
export interface PlacedMark {
  frame: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  flip: boolean;
  phase: number;
}

const near = (room: Room, tx: number, ty: number, symbols: readonly string[], diagonal: boolean): boolean => {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && (diagonal || !dx || !dy) && symbols.includes(room.rows[ty + dy]?.[tx + dx] ?? '')) return true;
  return false;
};

const pick = <S extends { weight: number }>(sets: readonly S[], roll: number): S | undefined => {
  const total = sets.reduce((n, s) => n + s.weight, 0);
  let r = roll % Math.max(1, total);
  for (const s of sets) {
    if (r < s.weight) return s;
    r -= s.weight;
  }
  return sets[0];
};

const jitter = (hash: number, tx: number, ty: number) => {
  const J = DECOR.tile;
  return { x: (tx + 0.5) * T + ((hash >>> 4) % (2 * J.jitterX + 1)) - J.jitterX, y: (ty + 0.5) * T + ((hash >>> 10) % (2 * J.jitterY + 1)) - J.jitterY };
};

/** Set pieces' footprint tiles: they draw no standing sprite (the piece replaces them), and no vine hangs there. */
let pieceTiles: Map<string, string> | null = null;
export function setPieceOnTile(tx: number, ty: number): string | undefined {
  if (!pieceTiles) {
    pieceTiles = new Map();
    for (const p of SET_PIECES) for (let y = p.footprint.ty; y < p.footprint.ty + p.footprint.h; y++) for (let x = p.footprint.tx; x < p.footprint.tx + p.footprint.w; x++) pieceTiles.set(`${x},${y}`, p.id);
  }
  return pieceTiles.get(`${tx},${ty}`);
}

/** The plant on a tile, if one stands there. */
export function plantAt(room: Room, tx: number, ty: number): PlacedPlant | null {
  if (room.rows[ty]?.[tx] !== TILE.floor || keptClear(room, tx, ty)) return null;
  const region = DECOR.regions[decorRegion(tx, ty)];
  const h = saltedHash(tx, ty, DECOR.salts.plant);
  if (h % region.plantOneIn !== 0) return null;
  const k = saltedHash(tx, ty, DECOR.salts.kind);
  const open = region.plants.filter((p) => p.where === 'open');
  const special = (where: PlantSet['where']) => region.plants.filter((p) => p.where === where);
  let set: PlantSet | undefined;
  if (special('pondRim').length > 0 && near(room, tx, ty, [TILE.shallow, TILE.water], true)) set = pick(special('pondRim'), k);
  else if (special('groveEdge').length > 0 && near(room, tx, ty, [TILE.tree], false) && (k >>> 20) % 2 === 0) set = pick(special('groveEdge'), k);
  else set = pick(open, k);
  if (!set) return null;
  const frame = set.frames[(k >>> 8) % set.frames.length] ?? '';
  return { frame, sway: set.sway, ...jitter(h, tx, ty), tx, ty, phase: ((k >>> 14) % 1000) / 1000, flip: ((k >>> 24) & 1) === 1 };
}

/** The scatter mark on a tile, if one lies there. */
export function scatterAt(room: Room, tx: number, ty: number): PlacedMark | null {
  const s = room.rows[ty]?.[tx];
  if ((s !== TILE.floor && s !== TILE.terrace) || keptClear(room, tx, ty)) return null;
  const region = DECOR.regions[decorRegion(tx, ty)];
  const h = saltedHash(tx, ty, DECOR.salts.scatter);
  if (h % region.scatterOneIn !== 0) return null;
  const grove = near(room, tx, ty, [TILE.tree], false);
  const sets = region.scatter.filter((x) => x.where === 'open' || grove);
  const set = pick(sets, h >>> 16);
  if (!set) return null;
  return { frame: set.frames[(h >>> 22) % set.frames.length] ?? '', ...jitter(h, tx, ty), tx, ty, flip: ((h >>> 28) & 1) === 1, phase: 0 };
}

/** The vine hanging from a cliff tile's face over open floor (the Hollows'), if one does. */
export function vineAt(room: Room, tx: number, ty: number): PlacedMark | null {
  const vines = DECOR.regions[decorRegion(tx, ty)].vines;
  if (!vines || room.rows[ty]?.[tx] !== TILE.cliff || room.rows[ty + 1]?.[tx] !== TILE.floor || keptClear(room, tx, ty + 1) || setPieceOnTile(tx, ty)) return null;
  const h = saltedHash(tx, ty, DECOR.salts.vine);
  if (h % vines.oneIn !== 0) return null;
  // It hangs from the face's lit top edge (the cliff sprite's face is 22 px tall over the tile's bottom).
  return { frame: vines.frames[(h >>> 8) % vines.frames.length] ?? '', x: (tx + 0.5) * T + ((h >>> 12) % 13) - 6, y: (ty + 1) * T - 21, tx, ty, flip: ((h >>> 20) & 1) === 1, phase: ((h >>> 21) % 1000) / 1000 };
}

/** A chunk's plants and vines (`size` px square chunks): the plants capped at `maxPlantsPerChunk`, the nearest its centre kept. */
export function chunkDecor(room: Room, cx: number, cy: number, size: number): { plants: PlacedPlant[]; vines: PlacedMark[] } {
  const n = size / T;
  const plants: PlacedPlant[] = [];
  const vines: PlacedMark[] = [];
  for (let ty = cy * n; ty < (cy + 1) * n; ty++) {
    for (let tx = cx * n; tx < (cx + 1) * n; tx++) {
      const p = plantAt(room, tx, ty);
      if (p) plants.push(p);
      const v = vineAt(room, tx, ty);
      if (v) vines.push(v);
    }
  }
  if (plants.length > DECOR.maxPlantsPerChunk) {
    const mx = (cx + 0.5) * size;
    const my = (cy + 0.5) * size;
    const d = (p: PlacedPlant) => Math.hypot(p.x - mx, p.y - my);
    plants.sort((a, b) => d(a) - d(b) || a.ty - b.ty || a.tx - b.tx);
    plants.length = DECOR.maxPlantsPerChunk;
    plants.sort((a, b) => a.ty - b.ty || a.tx - b.tx);
  }
  return { plants, vines };
}
