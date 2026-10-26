import { CONDUIT_TICKS, TUNNEL_REACH } from '../data/foundry';
import { FOUNDRY_ROOM, TILE } from '../data/rooms';
import { facingVector, opposite } from './direction';
import { count, type Inventory } from './inventory';
import { pieceAt, type FoundryState, type PieceState, type Tile, type TunnelInState, type TunnelOutState } from './pieces';
import type { Facing } from './player';
import { roomById } from './state';

// The underground pair (052, C.1): an entrance sends items under the floor to its
// exit, which faces the same way, up to TUNNEL_REACH tiles ahead in a straight line;
// anything can stand on the tiles between. Placing either end pairs it with the
// nearest free other end in reach. The tunnel is a slot per tile between, each
// crossed in CONDUIT_TICKS, so a pair spanning n tiles holds n items (052.1).
// Picking up an end leaves the other unpaired (052.2). flow.ts asks these rules.

type TunnelEnd = TunnelInState | TunnelOutState;

const isFloor = (t: Tile): boolean => roomById(FOUNDRY_ROOM).rows[t.ty]?.[t.tx] === TILE.floor;

/** The tiles an entrance at `p` reaches, nearest first: the TUNNEL_REACH + 1 ahead of it (its exit's farthest spot), up to the first that isn't floor. */
export function tunnelReach(p: Tile & { facing: Facing }): Tile[] {
  const [dx, dy] = facingVector(p.facing);
  const out: Tile[] = [];
  for (let k = 1; k <= TUNNEL_REACH + 1; k++) {
    const t = { tx: p.tx + k * dx, ty: p.ty + k * dy };
    if (!isFloor(t)) break;
    out.push(t);
  }
  return out;
}

/** The free other end a tunnel end at `p` would pair with: the nearest along its line (ahead of an entrance, behind an exit), facing the same way. */
export function partnerFor(foundry: FoundryState, p: Pick<TunnelEnd, 'kind' | 'tx' | 'ty' | 'facing'> & { id?: number }): TunnelEnd | undefined {
  const along = p.kind === 'tunnel-in' ? p.facing : opposite(p.facing);
  const want = p.kind === 'tunnel-in' ? 'tunnel-out' : 'tunnel-in';
  for (const t of tunnelReach({ tx: p.tx, ty: p.ty, facing: along })) {
    const q = pieceAt(foundry, t.tx, t.ty);
    if (q && q.id !== p.id && q.kind === want && q.facing === p.facing && q.pair === null) return q;
  }
  return undefined;
}

/** Tiles between two ends in a line. */
const between = (a: Tile, b: Tile): number => Math.abs(a.tx - b.tx) + Math.abs(a.ty - b.ty) - 1;

/** A just-placed tunnel end pairs with its partner in reach, if there is one; the entrance's tunnel gets a slot per tile between. */
export function pairOnPlace(foundry: FoundryState, p: PieceState): void {
  if (p.kind !== 'tunnel-in' && p.kind !== 'tunnel-out') return;
  const q = partnerFor(foundry, p);
  if (q) pairEnds(p, q);
}

/** Pairs two tunnel ends (an entrance and its exit): each names the other, and the entrance's tunnel gets a slot per tile between. */
export function pairEnds(p: TunnelEnd, q: TunnelEnd): void {
  p.pair = q.id;
  q.pair = p.id;
  const entrance = p.kind === 'tunnel-in' ? p : q.kind === 'tunnel-in' ? q : undefined;
  if (entrance) entrance.tunnel = Array.from({ length: between(p, q) }, () => null);
}

/**
 * A tunnel end is being picked up: its partner is left unpaired (052.2). Returns what was under the floor, which goes
 * back with it; an entrance's tunnel is its own, so only an exit's pick-up empties its entrance's.
 */
export function unpair(foundry: FoundryState, p: PieceState): Inventory {
  const items: Inventory = {};
  if (p.kind !== 'tunnel-in' && p.kind !== 'tunnel-out') return items;
  const q = foundry.pieces.find((o) => o.id === p.pair);
  if (q?.kind === 'tunnel-in') {
    for (const slot of q.tunnel) if (slot) items[slot.item] = count(items, slot.item) + 1;
    q.tunnel = [];
  }
  if (q?.kind === 'tunnel-in' || q?.kind === 'tunnel-out') q.pair = null;
  return items;
}

/** What an entrance holds under the floor, as items. */
export function tunnelContents(p: TunnelInState): Inventory {
  const items: Inventory = {};
  for (const slot of p.tunnel) if (slot) items[slot.item] = count(items, slot.item) + 1;
  return items;
}

/** Items under the floor cross their tiles, a tick at a time. */
export function advanceTunnel(p: TunnelInState): void {
  for (const slot of p.tunnel) if (slot && slot.progress < CONDUIT_TICKS) slot.progress += 1;
}

/**
 * Moves what's under the floor one hop, exit side first: the last slot up into the exit once it's empty, each slot
 * into the next, and the entrance's crossed item down into the first slot (or straight up into the exit, with no tiles
 * between). An item that moves starts its new tile from zero, so nothing moves two hops in a tick.
 */
export function transferTunnel(p: TunnelInState, exit: TunnelOutState): void {
  const slots = p.tunnel;
  const done = (s: { progress: number } | null): s is { item: string; progress: number } => s !== null && s.progress >= CONDUIT_TICKS;
  const last = slots.length - 1;
  const tail = slots[last] ?? null;
  if (done(tail) && exit.item === null) {
    exit.item = tail.item;
    exit.progress = 0;
    slots[last] = null;
  }
  for (let j = last - 1; j >= 0; j--) {
    const s = slots[j] ?? null;
    if (done(s) && slots[j + 1] === null) {
      slots[j + 1] = { item: s.item, progress: 0 };
      slots[j] = null;
    }
  }
  if (!p.item || p.progress < CONDUIT_TICKS) return;
  if (slots.length === 0) {
    if (exit.item !== null) return;
    exit.item = p.item;
    exit.progress = 0;
  } else {
    if (slots[0] !== null) return;
    slots[0] = { item: p.item, progress: 0 };
  }
  p.item = null;
  p.progress = 0;
}
