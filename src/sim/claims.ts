import { ACTIVATE_TICKS, CLAIM_TICKS, FIXTURE_REACH, FIXTURES, PYLON_REACH, SITE_SUPPLY, SUPPLY_TICKS, type FixtureDef } from '../data/claims';
import { TICK_RATE } from '../data/config';
import { FEET_BOX } from '../data/player';
import { FOUNDRY_ROOM, type Room } from '../data/rooms';
import type { Command } from './input';
import { count } from './inventory';
import { isRolling } from './movement';
import type { Tile } from './pieces';
import { arrived, bank } from './banking';
import { removePieceAt } from './placement';
import { fixtureDef, portFront, tileRect, type FixtureState } from './fixtures';
import { roomById, roomOf, type SimState } from './state';
import { tileCentre } from './tiles';
import { clearSafeZones } from './population';
import { WORLD } from './world';

// Claiming (009). Clear a site's guards (017: a site is a part of a room, its
// pylon carries the site id), then stand at the pylon holding E
// (started like a harvest) to claim it for good. A claim adds the foundry's
// waystone and a supply port for each raw the site sends that has none yet (028);
// a claimed pylon sends the haul to the stash and
// carries the player home, and the waystone carries them back. Fixtures are the
// foundry's fixed furniture: kept apart from the placed pieces.

/** The claim in progress at a pylon. */
export interface ClaimHold {
  /** The site being claimed (017). */
  site: string;
  progress: number;
}

/** Gap between the player's feet box and a tile's box, px; 0 when they touch. */
function gapTo(state: SimState, t: Tile): number {
  const r = tileRect(t);
  const p = state.player;
  const gapX = Math.max(0, Math.abs(r.x - p.x) - (FEET_BOX.w + r.w) / 2);
  const gapY = Math.max(0, Math.abs(r.y - p.y) - (FEET_BOX.h + r.h) / 2);
  return Math.hypot(gapX, gapY);
}

/** The pylon in the player's room within reach, if any. */
export function pylonInReach(state: SimState): NonNullable<Room['pylon']> | undefined {
  const pylon = roomOf(state).pylon;
  return pylon && gapTo(state, pylon) <= PYLON_REACH ? pylon : undefined;
}

/** The fixture of a kind in reach, if the player is in the foundry. */
export function fixtureInReach(state: SimState, kind: FixtureDef['kind']): FixtureState | undefined {
  if (state.roomId !== FOUNDRY_ROOM) return undefined;
  return state.fixtures.find((f) => fixtureDef(f.id).kind === kind && gapTo(state, fixtureDef(f.id)) <= FIXTURE_REACH);
}

export const isClaimed = (state: Pick<SimState, 'claims'>, site: string): boolean => state.claims.includes(site);

/** A claimed pylon is in reach: E opens its deposit and travel menu. */
export function claimedPylonInReach(state: SimState): boolean {
  const pylon = pylonInReach(state);
  return pylon !== undefined && isClaimed(state, pylon.site);
}

/** True while any of a site's guards (enemies in its group) lives. */
export const occupied = (state: SimState, site: string): boolean => state.enemies.some((e) => e.group === site);

/** The site of the pylon in reach, if any. */
const siteInReach = (state: SimState): string | undefined => pylonInReach(state)?.site;

/** Ends a claim in progress; its progress is lost. */
export function cancelClaim(state: SimState): void {
  state.claimHold = null;
}

/** Moves the player to a tile's centre in a room, standing still, out of build mode. */
export function travelTo(state: SimState, roomId: string, tile: Tile): void {
  const from = state.roomId;
  state.roomId = roomId;
  const at = tileCentre(tile);
  state.player.x = at.x;
  state.player.y = at.y;
  state.player.vx = 0;
  state.player.vy = 0;
  state.building = false;
  state.harvest = null;
  state.claimHold = null;
  state.events.roomChanges.push({ from, to: roomId });
  arrived(state, roomId);
  state.events.travels.push({ from, to: roomId });
}

/**
 * Pylon and fixture use, before harvesting. Returns the command the rest of the
 * tick sees: an E spent on a pylon or fixture doesn't also harvest.
 */
export function stepClaims(state: SimState, cmd: Command): Command {
  if (state.activatePulse > 0) state.activatePulse -= 1;
  advanceHold(state, cmd);
  if (cmd.pylon) usePylon(state, cmd.pylon);
  if (cmd.takeStash) takeStash(state, cmd.takeStash.itemId);
  if (!cmd.interact) return cmd;
  const site = siteInReach(state);
  if (site) {
    if (occupied(state, site)) state.events.sealed.push({ site });
    else if (!isClaimed(state, site) && !state.claimHold) state.claimHold = { site, progress: 1 };
    // E on a claimed pylon opens render's menu, whose choice comes back as `pylon`.
    return { ...cmd, interact: false };
  }
  if (fixtureInReach(state, 'waystone')) {
    travelToPylon(state);
    return { ...cmd, interact: false };
  }
  // E on the stash or the bench opens render's menu, whose choice comes back as a command.
  if (fixtureInReach(state, 'stash') || fixtureInReach(state, 'bench')) return { ...cmd, interact: false };
  return cmd;
}

function advanceHold(state: SimState, cmd: Command): void {
  const hold = state.claimHold;
  if (!hold) return;
  const moved = cmd.moveX !== 0 || cmd.moveY !== 0 || cmd.fire || cmd.dodge || isRolling(state.player);
  if (moved || hold.site !== siteInReach(state) || occupied(state, hold.site)) {
    cancelClaim(state);
    return;
  }
  hold.progress += 1;
  if (hold.progress < CLAIM_TICKS) return;
  state.claimHold = null;
  claim(state, hold.site);
}

/**
 * Claims a site for good: adds the fixtures its claim brings and the port of each raw it sends that isn't there yet
 * (028), clearing their tiles first, and makes its ground safe (017).
 */
export function claim(state: SimState, site: string): void {
  if (isClaimed(state, site)) return;
  state.claims.push(site);
  state.activatePulse = ACTIVATE_TICKS;
  state.events.claims.push({ site });
  clearSafeZones(state);
  const sends = SITE_SUPPLY[site] ?? [];
  const brought = FIXTURES.filter((f) => f.claim === site || (f.raw !== undefined && sends.includes(f.raw)));
  for (const def of brought) {
    if (state.fixtures.some((f) => f.id === def.id)) continue;
    removePieceAt(state, def.tx, def.ty);
    state.fixtures.push({ id: def.id, item: null, timer: 0 });
  }
}

/** The claimed pylon's menu: send the haul to the stash, or travel to the foundry. */
function usePylon(state: SimState, action: 'deposit' | 'travel'): void {
  const site = siteInReach(state);
  if (!site || !isClaimed(state, site)) return;
  if (action === 'travel') {
    const door = roomById(FOUNDRY_ROOM).spawn;
    travelTo(state, FOUNDRY_ROOM, door);
    return;
  }
  const items: Record<string, number> = {};
  for (const [itemId, n] of Object.entries(state.inventory)) {
    if (n <= 0) continue;
    items[itemId] = n;
    state.stash[itemId] = count(state.stash, itemId) + n;
  }
  state.inventory = {};
  if (Object.keys(items).length > 0) state.events.stashDeposits.push({ items });
  // A deposit banks what's left to carry, which is nothing, even when nothing moved.
  bank(state);
}

/** Takes one stack (or everything, for null) out of the stash, standing at it. */
function takeStash(state: SimState, itemId: string | null): void {
  if (!fixtureInReach(state, 'stash')) return;
  const ids = itemId === null ? Object.keys(state.stash) : [itemId];
  const items: Record<string, number> = {};
  for (const id of ids) {
    const n = count(state.stash, id);
    if (n <= 0) continue;
    state.inventory[id] = count(state.inventory, id) + n;
    items[id] = n;
  }
  // Emptied stacks leave the stash rather than sitting there at 0.
  state.stash = Object.fromEntries(Object.entries(state.stash).filter(([id]) => !(id in items)));
  if (Object.keys(items).length > 0) state.events.stashTakes.push({ items });
}

/** The waystone: to the first claimed pylon, standing one tile below it. */
function travelToPylon(state: SimState): void {
  const room = Object.values(WORLD).find((r) => r.pylon && isClaimed(state, r.pylon.site));
  if (!room?.pylon) return;
  travelTo(state, room.id, { tx: room.pylon.tx, ty: room.pylon.ty + 1 });
}

/** How many claimed sites supply a raw (028): its port's pylon count. `supply` defaults to the game's site table. */
export function portPylons(claims: readonly string[], raw: string, supply: Readonly<Record<string, readonly string[]>> = SITE_SUPPLY): number {
  return claims.filter((site) => supply[site]?.includes(raw)).length;
}

/** Ticks between a port's pushes with `pylons` supplying it (at least 1): round(SUPPLY_TICKS / N). */
export const portTicks = (pylons: number): number => Math.round(SUPPLY_TICKS / Math.max(1, pylons));

/** Raws a port sends a minute with `pylons` supplying it. */
export const portPerMinute = (pylons: number): number => Math.round((60 * TICK_RATE) / portTicks(pylons));

/** A port's pylon count (028): the claimed sites that supply its raw. */
export function pylonsOf(state: Pick<SimState, 'claims'>, f: FixtureState): number {
  const raw = fixtureDef(f.id).raw;
  return raw === undefined ? 0 : portPylons(state.claims, raw);
}

/**
 * Supply ports (028), once per tick: each one with no raw waiting counts up to its
 * rate, round(SUPPLY_TICKS / its pylons), then brings up one of its own raw; `offer`
 * tries to hand it to whatever is in front, and a refused raw waits.
 */
export function stepPorts(state: SimState, offer: (to: Tile, from: Tile, item: string) => boolean): void {
  for (const f of state.fixtures) {
    const def = fixtureDef(f.id);
    if (def.kind !== 'port' || def.raw === undefined) continue;
    if (f.item === null) {
      f.timer += 1;
      if (f.timer < portTicks(pylonsOf(state, f))) continue;
      f.item = def.raw;
      state.events.supplies.push({ id: f.id, itemId: f.item });
    }
    if (offer(portFront(f), def, f.item)) {
      state.events.portDeliveries.push({ id: f.id, itemId: f.item });
      f.item = null;
      f.timer = 0;
    }
  }
}
