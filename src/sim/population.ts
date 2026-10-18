import { TILE_SIZE } from '../data/config';
import { OVERWORLD, ringOf } from '../data/overworld';
import { POPULATION, SAFE_RADIUS } from '../data/population';
import { TILE } from '../data/rooms';
import { createEnemy, type EnemyState } from './enemies';
import { nextInt } from './rng';
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
  ring: 1 | 2;
  /** The tick it may spawn again; it waits while its pack lives. */
  respawnAt: number;
  alive: boolean;
}

export interface PopulationState {
  slots: PackSlot[];
}

export function createPopulation(): PopulationState {
  const slots: PackSlot[] = [];
  for (const ring of [1, 2] as const) {
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

export function safeZones(state: Pick<SimState, 'claims'>): SafeZone[] {
  return Object.values(WORLD).flatMap((room) => {
    const p = room.pylon;
    if (!p || !state.claims.includes(p.site)) return [];
    const c = tileCentre(p);
    return [{ roomId: room.id, x: c.x, y: c.y, r: SAFE_RADIUS * TILE_SIZE }];
  });
}

export function inSafeZone(state: Pick<SimState, 'claims'>, roomId: string, x: number, y: number): boolean {
  return safeZones(state).some((z) => z.roomId === roomId && Math.hypot(x - z.x, y - z.y) <= z.r);
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

/** Enemies within a screen of the player; `awake` counts only those not idle or heading home. */
export function enemiesNearPlayer(state: SimState, awake = false): number {
  return state.enemies.filter((e) => nearPlayer(state, e.roomId, e.x, e.y) && (!awake || (e.mode !== 'idle' && e.mode !== 'return'))).length;
}

/** No more than the cap may be awake near the player (017): further enemies stay asleep until some fall. */
export function screenFull(state: SimState): boolean {
  return enemiesNearPlayer(state, true) >= POPULATION.screenCap;
}

const walkableOpen = (tx: number, ty: number): boolean => {
  const room = WORLD[OVERWORLD.id];
  const symbol = room?.rows[ty]?.[tx];
  if (symbol !== TILE.floor && symbol !== TILE.path) return false;
  // Packs keep out of the landmarks' clearings (the meadow, the ruin field, the shrine site).
  return !OVERWORLD.clearings.some((r) => tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1);
};

/** Open ground each ring offers a pack's centre, found once from the generated map. */
const candidates: Record<1 | 2, { tx: number; ty: number }[]> = { 1: [], 2: [] };
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
    if (inSafeZone(state, OVERWORLD.id, c.x, c.y)) continue;
    const size = nextInt(state.rng, def.size[0], def.size[1]);
    const spots: { tx: number; ty: number }[] = [];
    for (let k = 0; k < size * 4 && spots.length < size; k++) {
      const s = { tx: tx + nextInt(state.rng, -POPULATION.spread, POPULATION.spread), ty: ty + nextInt(state.rng, -POPULATION.spread, POPULATION.spread) };
      // Every member stands in the pack's own ring, so ring 0 stays calm.
      if (walkableOpen(s.tx, s.ty) && ringOf(s.tx, s.ty) === slot.ring && !spots.some((o) => o.tx === s.tx && o.ty === s.ty)) spots.push(s);
    }
    if (spots.length < size) continue;
    for (const s of spots) {
      const enemyId = def.enemies[nextInt(state.rng, 0, def.enemies.length - 1)] ?? 'husk';
      state.enemies.push(createEnemy(state.nextEnemyId++, enemyId, tileCentre(s), OVERWORLD.id, slot.group));
    }
    return true;
  }
  return false;
}

/** Once per tick: keeps every ring's packs alive while the land is populated. */
export function stepPopulation(state: SimState): void {
  if (!state.populated) return;
  for (const slot of state.population.slots) {
    if (state.enemies.some((e) => e.group === slot.group)) {
      slot.alive = true;
      continue;
    }
    if (slot.alive) {
      slot.alive = false;
      slot.respawnAt = state.tick + POPULATION.respawnTicks;
    }
    if (state.tick < slot.respawnAt) continue;
    if (enemiesNearPlayer(state) >= POPULATION.screenCap) continue;
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
