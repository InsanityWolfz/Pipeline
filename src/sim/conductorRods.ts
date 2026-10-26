import { enemyDef, type ConductorDef } from '../data/enemies';
import { CROWN_SPIRE, standPoint } from '../data/stormcrownSites';
import { chillEnemy } from './cold';
import { aggro, type EnemyState, type HitStyle } from './enemies';
import type { SimState } from './state';

// The Conductor's rods (064): six iron rods ring the Crown Spire's middle, one at each socket. They are its parts: each
// has its own hurtbox and health, and takes the hits that land on it (a round's, a Shard's, a Burst's in reach, a
// punch's), as the Forgewright's bellows do (060). A broken rod is shot through and regrows, whole, after
// `regrowTicks`. The Conductor stands at one and blinks between the standing ones; with fewer than `minRods` standing,
// it is grounded and can't blink. 068: with `shieldRods` or more standing, its storm shield blocks every hit on its body
// (bossParts.ts's `plated`, the Forgewright's plating check).

/** One rod: its health, and ticks left until it regrows (0 while standing). */
export interface RodState {
  health: number;
  regrow: number;
}

/**
 * The Conductor's own state (064), nested as the Forgewright's bellows are: its six arena rods (none on anything else);
 * the rod it stands at and the rod a blink's warning names (-1: none); ticks to its next blink, and ticks left of a
 * blink's warning; the attack it is making (-1: none; 0 lash, 1 storm call, 2 rod chain) and each attack's own cooldown;
 * and its rod chain's lines, a bit per neighbouring pair of rods (rod i and i + 1), and whether the chain has struck.
 */
export interface ConductorState {
  rods: RodState[];
  rod: number;
  blinkTo: number;
  blinkCooldown: number;
  blinkWarn: number;
  attack: number;
  attackCooldowns: number[];
  chainMask: number;
  chainHit: boolean;
}

/** The Conductor's def if this enemy is one. */
export function conductorDefOf(e: Pick<EnemyState, 'enemyId'>): ConductorDef | null {
  const def = enemyDef(e.enemyId);
  return def.kind === 'conductor' ? def : null;
}

/** Fresh state for an enemy placed at `at`: for the Conductor, six standing rods, its rod the one nearest (its start: the spire's start rod), its blink a full wait off; for anything else, no rods. */
export function createConductor(enemyId: string, at: { x: number; y: number }): ConductorState {
  const def = conductorDefOf({ enemyId });
  return {
    rods: def ? CROWN_SPIRE.sockets.map(() => ({ health: def.rods.health, regrow: 0 })) : [],
    rod: def ? nearestRod(at) : -1,
    blinkTo: -1,
    blinkCooldown: def ? def.blink.everyTicks : 0,
    blinkWarn: 0,
    attack: -1,
    attackCooldowns: def ? [0, 0, 0] : [],
    chainMask: 0,
    chainHit: false,
  };
}

/** A rod's ground point (its socket), px. */
export const rodPoint = (rod: number): { x: number; y: number } => CROWN_SPIRE.sockets[rod] ?? { x: 0, y: 0 };

/** A rod's hurtbox, centred above its socket. */
export function rodBox(def: ConductorDef, rod: number): { x: number; y: number; w: number; h: number } {
  const p = rodPoint(rod);
  const b = def.rods.hurtbox;
  return { x: p.x, y: p.y + b.offsetY, w: b.w, h: b.h };
}

/** True while a rod stands (whole, not regrowing). */
export const standing = (e: Pick<EnemyState, 'conductor'>, rod: number): boolean => (e.conductor.rods[rod]?.regrow ?? 1) <= 0;

/** How many of its rods stand. */
export const standingRods = (e: Pick<EnemyState, 'conductor'>): number => e.conductor.rods.filter((r) => r.regrow <= 0).length;

/** 068: its storm shield holds: the Conductor with `shieldRods` or more of its rods standing (every hit on its body blocked, as the Forgewright's plating). */
export function stormShielded(e: Pick<EnemyState, 'enemyId' | 'conductor'>): boolean {
  const def = conductorDefOf(e);
  return def !== null && standingRods(e) >= def.shieldRods;
}

/** True while it can't blink: fewer than `minRods` of its rods stand. */
export function grounded(e: Pick<EnemyState, 'enemyId' | 'conductor'>): boolean {
  const def = conductorDefOf(e);
  return def !== null && standingRods(e) < def.blink.minRods;
}

/** The standing rod whose hurtbox holds a point, if any (a broken one is shot through). */
export function rodAt(e: EnemyState, x: number, y: number): number | null {
  const def = conductorDefOf(e);
  if (!def) return null;
  for (const i of e.conductor.rods.keys()) {
    if (!standing(e, i)) continue;
    const box = rodBox(def, i);
    if (Math.abs(x - box.x) <= box.w / 2 && Math.abs(y - box.y) <= box.h / 2) return i;
  }
  return null;
}

/** The standing rods whose socket is within `radius` of a point (a Burst's reach). */
export function rodsNear(e: EnemyState, x: number, y: number, radius: number): number[] {
  if (!conductorDefOf(e)) return [];
  return [...e.conductor.rods.keys()].filter((i) => standing(e, i) && Math.hypot(rodPoint(i).x - x, rodPoint(i).y - y) <= radius);
}

/** A hit on a rod: it takes the damage (a hit number at it, marked as a part's); a Cold hit chills the Conductor. At 0 it breaks. */
export function hitRod(state: SimState, e: EnemyState, rod: number, amount: number, style: HitStyle): void {
  const def = conductorDefOf(e);
  const r = e.conductor.rods[rod];
  if (!def || !r || r.regrow > 0) return;
  r.health = Math.max(0, r.health - amount);
  if (style.damageType === 'cold' && e.health > 0) chillEnemy(state, e);
  if (e.mode === 'idle' || e.mode === 'return') aggro(e);
  const at = rodBox(def, rod);
  state.events.hits.push({ target: 'enemy', id: e.id, x: at.x, y: at.y, damage: amount, damageType: style.damageType, part: rod });
  if (r.health > 0) return;
  r.regrow = def.rods.regrowTicks;
  const p = rodPoint(rod);
  state.events.rodBreaks.push({ id: e.id, rod, x: p.x, y: p.y });
}

/** Every tick, frozen or not: each broken rod regrows, back to full health as its time runs out. */
export function stepRods(state: SimState, e: EnemyState, def: ConductorDef): void {
  for (const [rod, r] of e.conductor.rods.entries()) {
    if (r.regrow <= 0) continue;
    r.regrow -= 1;
    if (r.regrow > 0) continue;
    r.health = def.rods.health;
    state.events.rodRegrows.push({ id: e.id, rod });
  }
}

/** The Conductor's starting rod, and where it stands there: by its spot, the rod whose stand point is nearest (its start, or wherever it was placed). */
export function nearestRod(at: { x: number; y: number }): number {
  let best = 0;
  let bestD = Infinity;
  for (const i of CROWN_SPIRE.sockets.keys()) {
    const p = standPoint(i);
    const d = Math.hypot(p.x - at.x, p.y - at.y);
    if (d < bestD) {
      best = i;
      bestD = d;
    }
  }
  return best;
}
