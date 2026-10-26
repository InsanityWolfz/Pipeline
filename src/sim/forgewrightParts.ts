import { enemyDef, type ForgewrightDef } from '../data/enemies';
import { FIRE } from '../data/tags';
import { chillEnemy } from './cold';
import { aggro, type EnemyState, type HitStyle } from './enemies';
import { igniteEnemy } from './fire';
import type { SimState } from './state';

// The Forgewright's plating and bellows (060). Its body is plated: every hit on it is blocked until it vents (no
// damage and no status: a shot, a Burst, a punch, a burn's beat), recorded as the Shield's block (034). Its two bellows,
// one each side of it `offset` px out, square to its facing, are parts with their own hurtbox and health. A hit on a
// bellows damages the bellows and passes a Cold hit's chill and a Fire hit's burn to the Forgewright. A broken one
// stays broken for `patchTicks`, then patches itself back to full; both broken at the same moment vents it: it
// staggers for `ventTicks`, its plating open, and both come back whole as the vent ends. 068: a vent leaves its heat
// alone (it goes on filling; only the Forge Flood resets it).

/** One bellows: its health, and ticks left broken (0 while whole). */
export interface BellowsState {
  health: number;
  patch: number;
}

/** The Forgewright's def if this enemy is one. */
export function forgeDefOf(e: Pick<EnemyState, 'enemyId'>): ForgewrightDef | null {
  const def = enemyDef(e.enemyId);
  return def.kind === 'forgewright' ? def : null;
}

/** Fresh bellows for an enemy: two whole ones for the Forgewright, none for anything else. */
export function createBellows(enemyId: string): BellowsState[] {
  const def = forgeDefOf({ enemyId });
  return def ? [0, 1].map(() => ({ health: def.bellows.health, patch: 0 })) : [];
}

/** True while its plating holds: the Forgewright, not venting. */
export const plated = (e: Pick<EnemyState, 'enemyId' | 'vent'>): boolean => e.vent <= 0 && forgeDefOf(e) !== null;

/** A bellows' ground point, px: 0 on its left as it faces, 1 on its right, `offset` px out square to its facing. */
export function bellowsPoint(e: Pick<EnemyState, 'x' | 'y' | 'angle'>, def: ForgewrightDef, part: number): { x: number; y: number } {
  const side = part === 0 ? -1 : 1;
  // Square to the facing: the facing turned a quarter turn, clockwise on screen for the right.
  return { x: e.x - Math.sin(e.angle) * side * def.bellows.offset, y: e.y + Math.cos(e.angle) * side * def.bellows.offset };
}

/** A bellows' hurtbox, centred above its ground point as an enemy's is above its feet. */
export function bellowsBox(e: Pick<EnemyState, 'x' | 'y' | 'angle'>, def: ForgewrightDef, part: number): { x: number; y: number; w: number; h: number } {
  const p = bellowsPoint(e, def, part);
  const b = def.bellows.hurtbox;
  return { x: p.x, y: p.y + b.offsetY, w: b.w, h: b.h };
}

/** The whole bellows whose hurtbox holds a point, if any (a broken one is shot through). */
export function partAt(e: EnemyState, x: number, y: number): number | null {
  const def = forgeDefOf(e);
  if (!def) return null;
  for (const [i, b] of e.bellows.entries()) {
    if (b.patch > 0) continue;
    const box = bellowsBox(e, def, i);
    if (Math.abs(x - box.x) <= box.w / 2 && Math.abs(y - box.y) <= box.h / 2) return i;
  }
  return null;
}

/** The whole bellows whose ground point is within `radius` of a point (a Burst's reach). */
export function partsNear(e: EnemyState, x: number, y: number, radius: number): number[] {
  const def = forgeDefOf(e);
  if (!def) return [];
  return e.bellows.flatMap((b, i) => {
    if (b.patch > 0) return [];
    const p = bellowsPoint(e, def, i);
    return Math.hypot(p.x - x, p.y - y) <= radius ? [i] : [];
  });
}

/**
 * A hit on a bellows: it takes the damage (a hit number at it, marked as a part's), and a Cold hit chills, a Fire hit
 * burns, the Forgewright. At 0 it breaks; both broken at once, it vents.
 */
export function hitPart(state: SimState, e: EnemyState, part: number, amount: number, style: HitStyle): void {
  const def = forgeDefOf(e);
  const b = e.bellows[part];
  if (!def || !b || b.patch > 0) return;
  b.health = Math.max(0, b.health - amount);
  if (style.damageType === 'cold' && e.health > 0) chillEnemy(state, e);
  if (style.damageType === 'fire' && !style.burn) igniteEnemy(state, e, amount * FIRE.burnShare);
  if (e.mode === 'idle' || e.mode === 'return') aggro(e);
  const at = bellowsBox(e, def, part);
  state.events.hits.push({ target: 'enemy', id: e.id, x: at.x, y: at.y, damage: amount, damageType: style.damageType, part });
  if (b.health > 0) return;
  b.patch = def.bellows.patchTicks;
  state.events.bellowsBreaks.push({ id: e.id, part, x: at.x, y: at.y });
  if (e.bellows.every((x) => x.patch > 0)) startVent(state, e, def);
}

/** Both bellows broken: it vents, staggering where it stands, any attack it was making dropped; its heat is kept (068). */
function startVent(state: SimState, e: EnemyState, def: ForgewrightDef): void {
  e.vent = def.ventTicks;
  e.mode = 'vent';
  e.modeTicks = 1;
  state.events.vents.push({ id: e.id, x: e.x, y: e.y });
}

/** Every tick, frozen or not: a vent counts down (both bellows whole again as it ends), else each broken bellows patches. */
export function stepBellows(state: SimState, e: EnemyState, def: ForgewrightDef): void {
  if (e.vent > 0) {
    e.vent -= 1;
    if (e.vent > 0) return;
    for (const b of e.bellows) Object.assign(b, { health: def.bellows.health, patch: 0 });
    if (e.mode === 'vent') {
      e.mode = 'chase';
      e.modeTicks = 0;
    }
    state.events.ventEnds.push({ id: e.id });
    return;
  }
  for (const [part, b] of e.bellows.entries()) {
    if (b.patch <= 0) continue;
    b.patch -= 1;
    if (b.patch > 0) continue;
    b.health = def.bellows.health;
    state.events.bellowsPatches.push({ id: e.id, part });
  }
}
