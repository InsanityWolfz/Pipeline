import { ammoDef } from '../data/ammo';
import { STASH_CAP } from '../data/blueprints';
import { TILE_SIZE } from '../data/config';
import { INTAKE, INTAKE_REACH } from '../data/foundry';
import { INVENTORY_CAP } from '../data/items';
import { FEET_BOX } from '../data/player';
import { FOUNDRY_ROOM } from '../data/rooms';
import { stashTotal } from './area';
import { count } from './inventory';
import { diagramInReach } from './research';
import type { SimState } from './state';
import { tileCentre } from './tiles';

// 069: purging an intake entrance. E at an open entrance holding rounds offers "Purge" (render's menu); the choice moves
// its whole reservoir into the stash, or the inventory for what the stash can't take, so a new round kind can flow in.
// Refused whole if the two can't hold it all. E's target is the entrance under the cursor (as 050's hoppers), else the
// nearest in reach holding rounds, unless a restore diagram (033: the capped entrances' sit beside it) is nearer.

/** Where purged rounds may go: each store's most items (STASH_CAP and INVENTORY_CAP, both unbounded today). */
export interface PurgeCaps {
  stash: number;
  inventory: number;
}

const CAPS: PurgeCaps = { stash: STASH_CAP, inventory: INVENTORY_CAP };

type Reach = Pick<SimState, 'roomId' | 'player' | 'link'>;

/** Gap between the player's feet box and an entrance's mouth tile, px; 0 when they touch. */
function gapTo(state: Pick<SimState, 'player'>, i: number): number {
  const m = INTAKE.entrances[i];
  if (!m) return Infinity;
  const c = tileCentre(m);
  const gapX = Math.max(0, Math.abs(c.x - state.player.x) - (FEET_BOX.w + TILE_SIZE) / 2);
  const gapY = Math.max(0, Math.abs(c.y - state.player.y) - (FEET_BOX.h + TILE_SIZE) / 2);
  return Math.hypot(gapX, gapY);
}

/**
 * An entrance can be purged by the player now: in the foundry, open, holding rounds, its mouth in INTAKE_REACH. (Its
 * menu stays open while this holds, wherever the cursor goes.)
 */
export function purgeable(state: Reach, i: number): boolean {
  const e = state.link.entrances[i];
  return state.roomId === FOUNDRY_ROOM && e !== undefined && e.open && e.ammoId !== null && e.count > 0 && gapTo(state, i) <= INTAKE_REACH;
}

/** Centre distance from the player to an entrance's mouth tile. */
function distTo(state: Pick<SimState, 'player'>, i: number): number {
  const c = tileCentre(INTAKE.entrances[i] ?? { tx: 0, ty: 0 });
  return Math.hypot(c.x - state.player.x, c.y - state.player.y);
}

/** The entrance whose mouth column (its tile, or the pipe above it) the cursor is on, if any (as the intake's hover). */
function hovered(state: Pick<SimState, 'player'>): number {
  const tx = Math.floor(state.player.aimX / TILE_SIZE);
  const ty = Math.floor(state.player.aimY / TILE_SIZE);
  return INTAKE.entrances.findIndex((m) => m.tx === tx && ty <= m.ty);
}

/**
 * The entrance E would offer to purge, or null: the purgeable one under the cursor; else the nearest purgeable one, as
 * long as no restore diagram in reach is nearer (the first on a tie stays with the diagram, as before 069).
 */
export function entranceTakesE(state: Parameters<typeof diagramInReach>[0] & Reach): number | null {
  const over = hovered(state);
  if (over >= 0 && purgeable(state, over)) return over;
  let best: number | null = null;
  for (let i = 0; i < INTAKE.entrances.length; i++) if (purgeable(state, i) && (best === null || distTo(state, i) < distTo(state, best))) best = i;
  if (best === null) return null;
  const d = diagramInReach(state);
  return d && Math.hypot(d.rect.x - state.player.x, d.rect.y - state.player.y) <= distTo(state, best) ? null : best;
}

/** Moves entrance `i`'s reservoir to the stash, then the inventory for the rest. Returns whether it did. */
export function purge(state: SimState, i: number, caps: PurgeCaps = CAPS): boolean {
  const e = state.link.entrances[i];
  if (!e || !purgeable(state, i) || e.ammoId === null) return false;
  const itemId = ammoDef(e.ammoId).itemId;
  const n = e.count;
  const toStash = Math.min(n, Math.max(0, caps.stash - stashTotal(state.stash)));
  const toInventory = n - toStash;
  if (toInventory > Math.max(0, caps.inventory - stashTotal(state.inventory))) return false;
  if (toStash > 0) state.stash[itemId] = count(state.stash, itemId) + toStash;
  if (toInventory > 0) state.inventory[itemId] = count(state.inventory, itemId) + toInventory;
  e.count = 0;
  e.ammoId = null;
  state.events.purges.push({ entrance: i, itemId, stash: toStash, inventory: toInventory });
  return true;
}
