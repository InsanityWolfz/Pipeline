import { defOf } from './champions';
import { aggro, type EnemyState, type HitStyle } from './enemies';
import { bellowsBox, bellowsPoint, forgeDefOf, forgePlated, hitPart as hitBellows, partAt as bellowsAt, partsNear as bellowsNear } from './forgewrightParts';
import { conductorDefOf, hitRod, rodAt, rodBox, rodPoint, rodsNear, standing, stormShielded } from './conductorRods';
import { recordBlock } from './shield';
import type { SimState } from './state';

// A boss's parts (064): the hit routing the Forgewright's bellows (060) and the Conductor's rods share. A round, a
// Shard, a Burst in reach and a punch's arc find a part through here and hit it, before the body it belongs to;
// each boss's own file says what a hit on its part does.

/**
 * The plating check every hit on a boss's body asks (060): true while its body blocks every hit (shots, Shards, Bursts,
 * Bomblets, mines, punches, burn beats; Lightning arcs and spreading burns pass it by). The Forgewright not vented, or
 * (068) the Conductor with its storm shield up.
 */
export const plated = (e: Pick<EnemyState, 'enemyId' | 'vent' | 'conductor'>): boolean => forgePlated(e) || stormShielded(e);

/**
 * A hit on its body while `plated` (060: the Forgewright not vented; 068: the Conductor's storm shield, 3 or more rods
 * standing; its parts' hits never come here): blocked, with a spark and clang, and it aggros. True if it was blocked.
 */
export function blockPlated(state: SimState, e: EnemyState): boolean {
  if (!plated(e)) return false;
  recordBlock(state, e, e.x, e.y + defOf(e).hurtbox.offsetY);
  if (e.mode === 'idle' || e.mode === 'return') aggro(e);
  return true;
}

/** A key for a part in an arrow's hit list (never an enemy id, which is never negative), so a piercing shot hits each part once. */
export const partKey = (id: number, part: number): number => -(id * 8 + part) - 1;

/** The whole part whose hurtbox holds a point, if any (a broken one is shot through). */
export const partAt = (e: EnemyState, x: number, y: number): number | null => (conductorDefOf(e) ? rodAt(e, x, y) : bellowsAt(e, x, y));

/** The whole parts whose ground point is within `radius` of a point (a Burst's reach). */
export const partsNear = (e: EnemyState, x: number, y: number, radius: number): number[] => (conductorDefOf(e) ? rodsNear(e, x, y, radius) : bellowsNear(e, x, y, radius));

/** A hit on a part: its boss's own rule (a bellows' or a rod's). */
export function hitPart(state: SimState, e: EnemyState, part: number, amount: number, style: HitStyle): void {
  if (conductorDefOf(e)) hitRod(state, e, part, amount, style);
  else hitBellows(state, e, part, amount, style);
}

/** Each whole part: its index, hurtbox and ground point (a punch's arc tests them). */
export function wholeParts(e: EnemyState): { part: number; box: { x: number; y: number; w: number; h: number }; point: { x: number; y: number } }[] {
  const rods = conductorDefOf(e);
  if (rods) return e.conductor.rods.flatMap((_, part) => (standing(e, part) ? [{ part, box: rodBox(rods, part), point: rodPoint(part) }] : []));
  const forge = forgeDefOf(e);
  if (!forge) return [];
  return e.bellows.flatMap((b, part) => (b.patch === 0 ? [{ part, box: bellowsBox(e, forge, part), point: bellowsPoint(e, forge, part) }] : []));
}
