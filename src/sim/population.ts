import { TILE_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { FEET_BOX } from '../data/player';
import { OVERWORLD, ringOf } from '../data/overworld';
import { POPULATION, type PopulatedRing } from '../data/population';
import { HOLLOWS } from '../data/hollows';
import { LANDMARK_LIST } from '../data/landmarks';
import { TILE, WALKABLE } from '../data/rooms';
import { createEnemy, type EnemyState } from './enemies';
import { nextInt } from './rng';
import { rollChampions } from './champions';
import type { SimState } from './state';
import { tileCentre } from './tiles';
import { WORLD } from './world';

// The living population (017). Once the first line fills the tube, every ring
// of the overworld but the calm ring 0 keeps its packs alive: a pack wiped out
// comes back after a delay, out of view, never in a claimed pylon's safe zone and
// never while the screen is already full. Claimed ground stays safe for good.

export interface PackSlot {
  /** The group its members carry: `pop-<ring>-<n>`. */
  group: string;
  ring: PopulatedRing;
  /** The tick it may spawn again; it waits while its pack lives. */
  respawnAt: number;
  alive: boolean;
}

export interface PopulationState {
  slots: PackSlot[];
}

export function createPopulation(): PopulationState {
  const slots: PackSlot[] = [];
  for (const ring of [1, 2, 3] as const) {
    for (let i = 0; i < POPULATION.rings[ring].packs; i++) slots.push({ group: `pop-${ring}-${i}`, ring, respawnAt: 0, alive: false });
  }
  return { slots };
}

/** A claimed pylon's safe zone, px. */
export interface SafeZone {
  roomId: string;
  x: number;
  y: number;
  r: number;
}

/** Every claimed pylon's safe zone, each at its own radius (032: a resource site's is smaller than the shrine's). */
export function safeZones(state: Pick<SimState, 'claims'>): SafeZone[] {
  return Object.values(WORLD).flatMap((room) =>
    (room.pylons ?? []).flatMap((p) => {
      if (!state.claims.includes(p.site)) return [];
      const c = tileCentre(p);
      return [{ roomId: room.id, x: c.x, y: c.y, r: p.safeRadius * TILE_SIZE }];
    }),
  );
}

/** The claimed pylon's safe zone holding a point, or null. */
export function safeZoneAt(state: Pick<SimState, 'claims'>, roomId: string, x: number, y: number): SafeZone | null {
  return safeZones(state).find((z) => z.roomId === roomId && Math.hypot(x - z.x, y - z.y) <= z.r) ?? null;
}

export function inSafeZone(state: Pick<SimState, 'claims'>, roomId: string, x: number, y: number): boolean {
  return safeZoneAt(state, roomId, x, y) !== null;
}

/** An enemy's move, stopped short if it would carry it into a safe zone it isn't already in. */
export function keepOut(state: Pick<SimState, 'claims'>, e: EnemyState, mx: number, my: number): [number, number] {
  if (mx === 0 && my === 0) return [0, 0];
  if (inSafeZone(state, e.roomId, e.x, e.y)) return [mx, my];
  return inSafeZone(state, e.roomId, e.x + mx, e.y + my) ? [0, 0] : [mx, my];
}

/** True if (x, y) is within a screen of the player, in the player's room. */
function nearPlayer(state: SimState, roomId: string, x: number, y: number): boolean {
  const p = state.player;
  return roomId === state.roomId && Math.abs(x - p.x) <= POPULATION.screen.x && Math.abs(y - p.y) <= POPULATION.screen.y;
}

/** Enemies within a screen of the player. */
export function enemiesNearPlayer(state: SimState): number {
  return state.enemies.filter((e) => nearPlayer(state, e.roomId, e.x, e.y)).length;
}

/**
 * What the camera shows, px: centred on the player's sprite (the bottom of the feet box) and clamped to the room,
 * as GameScene's follow camera is once it settles.
 */
export function viewRect(state: SimState): { x0: number; y0: number; x1: number; y1: number } {
  const room = WORLD[state.roomId];
  const w = (room?.rows[0]?.length ?? 0) * TILE_SIZE;
  const h = (room?.rows.length ?? 0) * TILE_SIZE;
  const clamp = (v: number, hi: number) => Math.min(Math.max(v, 0), Math.max(hi, 0));
  const x0 = clamp(state.player.x - VIEW_WIDTH / 2, w - VIEW_WIDTH);
  const y0 = clamp(state.player.y + FEET_BOX.h / 2 - VIEW_HEIGHT / 2, h - VIEW_HEIGHT);
  return { x0, y0, x1: x0 + VIEW_WIDTH, y1: y0 + VIEW_HEIGHT };
}

/** True if a point in the player's room is within the camera's view grown by `margin` px. */
function inView(state: SimState, roomId: string, x: number, y: number, margin = 0): boolean {
  if (roomId !== state.roomId) return false;
  const v = viewRect(state);
  return x >= v.x0 - margin && x <= v.x1 + margin && y >= v.y0 - margin && y <= v.y1 + margin;
}

/** Enemies the camera shows (017: the spec's "on screen"). */
export function enemiesOnScreen(state: SimState): number {
  return state.enemies.filter((e) => inView(state, e.roomId, e.x, e.y)).length;
}

/** Where packs never stand: the clearings (the meadow, the ruin field, the shrine site), the landmarks' areas (032) and the Sunken Forum (034). */
const KEEP_OUT = [...OVERWORLD.clearings, ...LANDMARK_LIST.map((l) => l.area), HOLLOWS.arena.bounds];

/** Hollows ground a pack can walk to from the gap (034): the generated cliffs can wall off a pocket, and nothing spawns in one. */
const fromGap = ((): Set<number> => {
  const rows = WORLD[OVERWORLD.id]?.rows ?? [];
  const key = (tx: number, ty: number) => ty * OVERWORLD.width + tx;
  const seen = new Set<number>([key(HOLLOWS.start.tx, HOLLOWS.start.ty)]);
  const queue: [number, number][] = [[HOLLOWS.start.tx, HOLLOWS.start.ty]];
  for (let i = 0; i < queue.length; i++) {
    const [tx, ty] = queue[i] ?? [0, 0];
    for (const [nx, ny] of [[tx + 1, ty], [tx - 1, ty], [tx, ty + 1], [tx, ty - 1]] as const) {
      const symbol = rows[ny]?.[nx];
      if (symbol === undefined || !WALKABLE.includes(symbol) || ringOf(nx, ny) !== HOLLOWS.ring || seen.has(key(nx, ny))) continue;
      seen.add(key(nx, ny));
      queue.push([nx, ny]);
    }
  }
  return seen;
})();

const walkableOpen = (tx: number, ty: number): boolean => {
  const room = WORLD[OVERWORLD.id];
  const symbol = room?.rows[ty]?.[tx];
  if (symbol !== TILE.floor && symbol !== TILE.path) return false;
  if (ringOf(tx, ty) === HOLLOWS.ring && !fromGap.has(ty * OVERWORLD.width + tx)) return false;
  return !KEEP_OUT.some((r) => tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1);
};

/** Open ground each ring offers a pack's centre, found once from the generated map. */
const candidates: Record<PopulatedRing, { tx: number; ty: number }[]> = { 1: [], 2: [], 3: [] };
for (let ty = 1; ty < OVERWORLD.height - 1; ty++) {
  for (let tx = 1; tx < OVERWORLD.width - 1; tx++) {
    const ring = ringOf(tx, ty);
    if (ring !== 0 && walkableOpen(tx, ty)) candidates[ring].push({ tx, ty });
  }
}

/** Tries to place a slot's pack on open ground in its ring, far enough from the player. */
function spawn(state: SimState, slot: PackSlot): boolean {
  const def = POPULATION.rings[slot.ring];
  const pool = candidates[slot.ring];
  for (let t = 0; t < POPULATION.tries; t++) {
    const pick = pool[nextInt(state.rng, 0, pool.length - 1)];
    if (!pick) return false;
    const { tx, ty } = pick;
    const c = tileCentre({ tx, ty });
    const p = state.player;
    if (state.roomId === OVERWORLD.id && Math.hypot(c.x - p.x, c.y - p.y) < POPULATION.spawnDistance) continue;
    const size = nextInt(state.rng, def.size[0], def.size[1]);
    const spots: { tx: number; ty: number }[] = [];
    // Every member stands in the pack's own ring (so ring 0 stays calm), out of any safe zone and out of view.
    const fits = (s: { tx: number; ty: number }): boolean => {
      const m = tileCentre(s);
      return (
        walkableOpen(s.tx, s.ty) &&
        ringOf(s.tx, s.ty) === slot.ring &&
        !inSafeZone(state, OVERWORLD.id, m.x, m.y) &&
        !inView(state, OVERWORLD.id, m.x, m.y, POPULATION.viewMargin) &&
        !spots.some((o) => o.tx === s.tx && o.ty === s.ty)
      );
    };
    for (let k = 0; k < size * POPULATION.memberTries && spots.length < size; k++) {
      const s = { tx: tx + nextInt(state.rng, -POPULATION.spread, POPULATION.spread), ty: ty + nextInt(state.rng, -POPULATION.spread, POPULATION.spread) };
      if (fits(s)) spots.push(s);
    }
    if (spots.length < size) continue;
    const members = spots.map((s) => {
      const enemyId = def.enemies[nextInt(state.rng, 0, def.enemies.length - 1)];
      if (!enemyId) throw new Error(`Ring ${slot.ring} has no enemies to spawn`);
      return createEnemy(state.nextEnemyId++, enemyId, tileCentre(s), OVERWORLD.id, slot.group);
    });
    // The pack may hold a champion (032).
    rollChampions(state.rng, members, slot.ring);
    state.enemies.push(...members);
    return true;
  }
  return false;
}

/** Once per tick: keeps every ring's packs alive while the land is populated. */
export function stepPopulation(state: SimState): void {
  if (!state.populated) return;
  for (const slot of state.population.slots) {
    // The Hollows (034) fill once their barrier is down; before that nobody can reach them.
    if (slot.ring === HOLLOWS.ring && !state.gates.hollows) continue;
    if (state.enemies.some((e) => e.group === slot.group)) {
      slot.alive = true;
      continue;
    }
    if (slot.alive) {
      slot.alive = false;
      slot.respawnAt = state.tick + POPULATION.respawnTicks;
    }
    if (state.tick < slot.respawnAt) continue;
    // A whole pack could land within a screen: only spawn if even the largest keeps it at the cap.
    if (enemiesNearPlayer(state) + POPULATION.rings[slot.ring].size[1] > POPULATION.screenCap) continue;
    slot.alive = spawn(state, slot);
  }
}

/** A new claim (017): packs whose home is inside its safe zone are gone, and the ground stays clear. */
export function clearSafeZones(state: SimState): void {
  state.enemies = state.enemies.filter((e) => !inSafeZone(state, e.roomId, e.homeX, e.homeY));
}

/** After a death the land fills again straight away; claims stay. */
export function resetPopulation(state: SimState): void {
  state.population = createPopulation();
}
