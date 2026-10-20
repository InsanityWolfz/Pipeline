import { ammoDef } from '../data/ammo';
import { INTAKE, SPREAD_STEP } from '../data/foundry';
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

/**
 * One round of a volley: its ammo, how many its entrance holds, which entrance (an index into INTAKE.entrances), and
 * its lane: the degrees off the aim it fires at (048).
 */
export interface VolleyRound {
  ammoId: string;
  count: number;
  entrance: number;
  lane: number;
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

/**
 * The lanes of a volley from `fed` entrances, degrees off the aim, west to east (048.1): fanned symmetrically about the
 * cursor, SPREAD_STEP apart. One fires at the cursor, two 7.5° either side, three left, centre and right.
 */
export function laneAngles(fed: number): number[] {
  return Array.from({ length: fed }, (_, i) => (i - (fed - 1) / 2) * SPREAD_STEP);
}

/**
 * One round from every open entrance that holds any (the fed entrances), in lane order west to east, each with its
 * lane (048): the fed entrances share the fan, whatever their ammo and whether or not they're ready to fire this tick.
 */
export function volleyRounds(state: Pick<SimState, 'link'>): VolleyRound[] {
  const fed = state.link.entrances
    .flatMap((e, entrance) => (e.open && e.ammoId !== null && e.count > 0 ? [{ ammoId: e.ammoId, count: e.count, entrance }] : []))
    .sort((a, b) => laneOf(a.entrance) - laneOf(b.entrance));
  const lanes = laneAngles(fed.length);
  return fed.map((r, i) => ({ ...r, lane: lanes[i] ?? 0 }));
}

/** An entrance's place in the fan, from data (048). */
const laneOf = (entrance: number): number => INTAKE.entrances[entrance]?.lane ?? entrance;

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

/** What the HUD's intake bar shows (025, 047): the next press, as `nextPress` says, without the entrance indexes; a volley's rounds in lane order with their lanes (048). */
export type HudActive = { kind: 'volley'; rounds: { ammoId: string; count: number; lane: number }[] } | CarriedPress | { kind: 'melee' };

/** The intake bar's content, straight from `nextPress`, so the HUD can't disagree with what fires. Before attuning that's the selected carried round (047.9). */
export function hudActive(state: PressState): HudActive {
  const press = nextPress(state);
  return press.kind === 'volley' ? { kind: 'volley', rounds: press.rounds.map(({ ammoId, count, lane }) => ({ ammoId, count, lane })) } : press;
}

/** One projectile: its ammo and its direction (unit). A bomb or landmine lands at the cursor's distance along it. */
export interface VolleyShot {
  ammoId: string;
  dir: [number, number];
}

/**
 * The projectiles these rounds fire along the unit aim (dx, dy) (048): each down its own lane, the aim turned by the
 * lane's degrees, whatever its ammo. A lobbed round (bomb, landmine) keeps the cursor's distance, so lobbed rounds
 * fired together land on an arc around the aim point.
 */
export function volleyShots(rounds: readonly Pick<VolleyRound, 'ammoId' | 'lane'>[], dx: number, dy: number): VolleyShot[] {
  return rounds.map(({ ammoId, lane }) => ({ ammoId, dir: lane === 0 ? [dx, dy] : rotate(dx, dy, lane) }));
}

/** A direction turned by `degrees` (clockwise on screen, where y points down). */
export function rotate(dx: number, dy: number, degrees: number): [number, number] {
  const r = (degrees * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [dx * c - dy * s, dx * s + dy * c];
}
