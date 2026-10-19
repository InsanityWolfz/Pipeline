import { ammoDef } from '../data/ammo';
import { LOB_SPACING, SPREAD_STEP } from '../data/foundry';
import { count } from './inventory';
import type { SimState } from './state';

// What a fire press does (023, 024, 028), and the shape of a volley. In order: once
// any open entrance holds a round, the volley (each fed entrance fires at its own
// ammo's rate while fire is held); otherwise a carried round of the selected ammo
// fires alone; otherwise the press is a punch. The fire path and anything that shows
// what the next press does (025's HUD) both read `nextPress`, so they can't disagree.

/** One round of a volley: its ammo, how many its entrance holds, and which entrance (an index into INTAKE.entrances). */
export interface VolleyRound {
  ammoId: string;
  count: number;
  entrance: number;
}

export type NextPress =
  | { kind: 'carried'; ammoId: string; count: number }
  | { kind: 'volley'; rounds: VolleyRound[] }
  | { kind: 'melee' };

/** One round from every open entrance that holds any, west to east. */
export function volleyRounds(state: Pick<SimState, 'link'>): VolleyRound[] {
  return state.link.entrances.flatMap((e, entrance) => (e.open && e.ammoId !== null && e.count > 0 ? [{ ammoId: e.ammoId, count: e.count, entrance }] : []));
}

/** What the next fire press does, in the fire path's order: the volley, a carried round, the punch. Without the tube it's always a punch. */
export function nextPress(state: Pick<SimState, 'hasTube' | 'tube' | 'inventory' | 'link'>): NextPress {
  if (!state.hasTube) return { kind: 'melee' };
  // Entrances only fill once the tube is linked, so this is the linked tube's volley.
  const rounds = volleyRounds(state);
  if (rounds.length > 0) return { kind: 'volley', rounds };
  const ammoId = state.tube.ammoId;
  const carried = count(state.inventory, ammoDef(ammoId).itemId);
  return carried > 0 ? { kind: 'carried', ammoId, count: carried } : { kind: 'melee' };
}

/** What the HUD's tube slot shows (025): the next press, as `nextPress` says, without the entrance indexes. */
export type HudActive =
  | { kind: 'carried'; ammoId: string; count: number }
  | { kind: 'volley'; rounds: { ammoId: string; count: number }[] }
  | { kind: 'melee' };

/** The tube slot's content, straight from `nextPress`, so the HUD can't disagree with what fires. */
export function hudActive(state: Pick<SimState, 'hasTube' | 'tube' | 'inventory' | 'link'>): HudActive {
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
 * by ammo in order of first appearance. One round of an ammo flies straight at the aim;
 * several aimed rounds fan evenly about it, SPREAD_STEP degrees apart; several lobbed
 * rounds keep the aim's line and land side by side, LOB_SPACING px apart across it.
 */
export function volleyShots(ammoIds: readonly string[], dx: number, dy: number): VolleyShot[] {
  const groups = new Map<string, number>();
  for (const id of ammoIds) groups.set(id, (groups.get(id) ?? 0) + 1);
  return [...groups].flatMap(([ammoId, n]) =>
    Array.from({ length: n }, (_, i): VolleyShot => {
      const offset = i - (n - 1) / 2;
      if (ammoDef(ammoId).kind === 'lob') return { ammoId, dir: [dx, dy], across: offset * LOB_SPACING };
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
