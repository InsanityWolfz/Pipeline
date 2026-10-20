import { AMMO } from '../data/ammo';
import { ENTRANCE_CAPS, INTAKE } from '../data/foundry';
import { FOUNDRY_ROOM } from '../data/rooms';
import { ATTUNE_TICKS } from '../data/tube';
import type { SimState } from './state';
import { placeExampleLine } from './exampleLine';

// The tube's link to the foundry: it attunes the first time the player walks
// into the foundry, and from then on each open entrance of the foundry intake
// (019, 024) fills its own reservoir. All of it survives a KO.

/** One intake entrance (024): capped shut or open, and its reservoir of one ammo. */
export interface EntranceState {
  open: boolean;
  /** The one ammo it holds, or null when empty. */
  ammoId: string | null;
  count: number;
  /** Ticks before it can fire again (028): each entrance fires at its own ammo's rate. */
  cooldown: number;
}

export interface LinkState {
  attuned: boolean;
  /** Ticks left on the attune (019); the player is held still until it ends. */
  attunePulse: number;
  /** One per mouth tile, in INTAKE.entrances order (west, centre, east). */
  entrances: EntranceState[];
}

export function createLink(): LinkState {
  return {
    attuned: false,
    attunePulse: 0,
    entrances: INTAKE.entrances.map((e) => ({ open: e.startsOpen, ammoId: null, count: 0, cooldown: 0 })),
  };
}

/** Runs after doorways: the first entry into the foundry attunes the tube (and lays the example line, 046). Counts the pulse down. */
export function stepLink(state: SimState): void {
  const { link } = state;
  if (link.attunePulse > 0) link.attunePulse -= 1;
  if (link.attuned || state.roomId !== FOUNDRY_ROOM) return;
  link.attuned = true;
  link.attunePulse = ATTUNE_TICKS;
  state.events.attunes.push({});
  // 046: on the real game's start, the example line stands from this first entry and starts with the attune.
  if (state.start.exampleLine) placeExampleLine(state);
}

/** The ammo a round of this item is, if it is ammo at all. */
export function ammoOfItem(itemId: string): string | null {
  return Object.values(AMMO).find((a) => a.itemId === itemId)?.id ?? null;
}

/** The first reservoir tier's cap (30), before any reservoir node is restored (033). */
const BASE_CAP = ENTRANCE_CAPS[0] ?? 0;

/** Whether an entrance would take one of this item: open, ammo only, its own ammo (any while empty), under the current `cap` (033). */
export function entranceAccepts(e: EntranceState, itemId: string, cap = BASE_CAP): boolean {
  const ammoId = ammoOfItem(itemId);
  if (!e.open || ammoId === null) return false;
  if (e.ammoId !== null && e.ammoId !== ammoId) return false;
  return e.count < cap;
}

/** Puts one item in the entrance if it accepts it under `cap`. Returns whether it was taken. */
export function fillEntrance(e: EntranceState, itemId: string, cap = BASE_CAP): boolean {
  if (!entranceAccepts(e, itemId, cap)) return false;
  e.ammoId = ammoOfItem(itemId);
  e.count += 1;
  return true;
}

/** Takes one round from an entrance. It forgets its ammo at 0. */
export function takeFromEntrance(e: EntranceState): boolean {
  if (e.count < 1) return false;
  e.count -= 1;
  if (e.count === 0) e.ammoId = null;
  return true;
}
