import { ammoDef } from '../data/ammo';
import { LOB_SPACING, SPREAD_STEP } from '../data/foundry';
import { readyItem } from './hotbar';
import { count } from './inventory';
import type { SimState } from './state';

// What a fire press (left click) does (023, 024, 028; 047): once any open entrance holds a
// round, the volley (each fed entrance fires at its own ammo's rate while fire is held).
// Before the tube attunes (047.9, Shaun 2026-10-20: "left fires carried until attuned") there's
// no intake yet, so left click uses the carried bar's selected item, as right click does.
// Otherwise the press is a punch. Once attuned, carried items never fire on left click: right
// click uses the carried bar (src/sim/hotbar.ts). The fire path and anything that shows what
// the next press does (025's HUD) both read `nextPress`, so they can't disagree.

/** One round of a volley: its ammo, how many its entrance holds, and which entrance (an index into INTAKE.entrances). */
export interface VolleyRound {
  ammoId: string;
  count: number;
  entrance: number;
}

/** A carried round fired or thrown from the inventory (047.9: left click before the tube attunes): its ammo and how many are carried. */
export interface CarriedPress {
  kind: 'carried';
  ammoId: string;
  count: number;
}

export type NextPress = { kind: 'volley'; rounds: VolleyRound[] } | CarriedPress | { kind: 'melee' };

/** What a press needs to know: the tube, the intake, and the carried bar with what's carried. */
type PressState = Pick<SimState, 'hasTube' | 'link' | 'hotbar' | 'inventory'>;

/** One round from every open entrance that holds any, west to east. */
export function volleyRounds(state: Pick<SimState, 'link'>): VolleyRound[] {
  return state.link.entrances.flatMap((e, entrance) => (e.open && e.ammoId !== null && e.count > 0 ? [{ ammoId: e.ammoId, count: e.count, entrance }] : []));
}

/**
 * What the next fire press does: the volley; before the tube attunes, the carried bar's selected item if any is carried
 * (047.9); else the punch. Once attuned it's never a carried round (047). Without the tube it's always a punch.
 */
export function nextPress(state: PressState): NextPress {
  if (!state.hasTube) return { kind: 'melee' };
  // Entrances only fill once the tube is linked, so this is the linked tube's volley.
  const rounds = volleyRounds(state);
  if (rounds.length > 0) return { kind: 'volley', rounds };
  const carried = state.link.attuned ? null : readyItem(state);
  if (carried !== null) return { kind: 'carried', ammoId: carried, count: count(state.inventory, ammoDef(carried).itemId) };
  return { kind: 'melee' };
}

/** What the HUD's intake bar shows (025, 047): the next press, as `nextPress` says, without the entrance indexes. */
export type HudActive = { kind: 'volley'; rounds: { ammoId: string; count: number }[] } | CarriedPress | { kind: 'melee' };

/** The intake bar's content, straight from `nextPress`, so the HUD can't disagree with what fires. Before attuning that's the selected carried round (047.9). */
export function hudActive(state: PressState): HudActive {
  const press = nextPress(state);
  return press.kind === 'volley' ? { kind: 'volley', rounds: press.rounds.map(({ ammoId, count }) => ({ ammoId, count })) } : press;
}

/** One projectile of a volley: its ammo, its direction (unit), and for a lobbed round how far across the aim point it lands, px. */
export interface VolleyShot {
  ammoId: string;
  dir: [number, number];
  across: number;
}

/**
 * The projectiles a volley of these ammo ids fires along the unit aim (dx, dy), grouped
 * by base ammo (029: a plain and a frost arrow fan together) in order of first appearance.
 * One round of a base flies straight at the aim; several aimed rounds fan evenly about it,
 * SPREAD_STEP degrees apart; several lobbed rounds keep the aim's line and land side by
 * side, LOB_SPACING px apart across it (a bomb or a landmine, 038).
 */
export function volleyShots(ammoIds: readonly string[], dx: number, dy: number): VolleyShot[] {
  const groups = new Map<string, string[]>();
  for (const id of ammoIds) {
    const base = ammoDef(id).base;
    groups.set(base, [...(groups.get(base) ?? []), id]);
  }
  return [...groups.values()].flatMap((ids) =>
    ids.map((ammoId, i): VolleyShot => {
      const offset = i - (ids.length - 1) / 2;
      if (ammoDef(ammoId).kind !== 'straight') return { ammoId, dir: [dx, dy], across: offset * LOB_SPACING };
      return { ammoId, dir: rotate(dx, dy, offset * SPREAD_STEP), across: 0 };
    }),
  );
}

/** A direction turned by `degrees` (clockwise on screen, where y points down). */
export function rotate(dx: number, dy: number, degrees: number): [number, number] {
  const r = (degrees * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [dx * c - dy * s, dx * s + dy * c];
}
