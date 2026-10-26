import { arenaOf } from '../data/arenas';
import type { ConductorAttack, ConductorDef } from '../data/conductor';
import { enter, hold } from './aiCommon';
import { engaged } from './bulwarkAi';
import { grounded, rodPoint, standing } from './conductorRods';
import { aggro, createEnemy, type EnemyState } from './enemies';
import { damagePlayer } from './health';
import { nextFloat, nextInt } from './rng';
import { callStrike, clearStrikes } from './strikes';
import type { SimState } from './state';
import { standPoint } from '../data/stormcrownSites';
import { insideTiles } from './tiles';

// The Conductor (064): it stands at one of the Crown Spire's six rods and wakes when the player's feet enter the
// spire (055's rule). Engaged, it faces the player and never walks. Every `blink.everyTicks` (enraged, the enrage's)
// it picks another standing rod by the seeded rng, which flashes `warnTicks`, then it vanishes and appears there;
// with fewer than `minRods` standing it is grounded until one regrows. Between blinks it makes its three attacks, in
// data order, each on its own cooldown: the arc lash, the storm call (strikes.ts) and the rod chain. It never leaves
// the spire; with the player out of it `leashTicks`, or down, its fight resets at once (it can't walk home).

/** Its attacks in data order: 0 the arc lash, 1 the storm call, 2 the rod chain. */
const ATTACKS = ['lash', 'call', 'chain'] as const;

const timingOf = (def: ConductorDef, attack: number): ConductorAttack => def[ATTACKS[attack] ?? 'lash'];

/** The six rods' neighbouring pairs (rod i and i + 1, round the ring) that both stand, a bit per pair. */
export function chainLines(e: Pick<EnemyState, 'rods'>): number {
  const n = e.rods.length;
  let mask = 0;
  for (let i = 0; i < n; i++) if (standing(e, i) && standing(e, (i + 1) % n)) mask |= 1 << i;
  return mask;
}

/** A rod chain's lines as segments between rod sockets, px. */
export function chainSegments(e: Pick<EnemyState, 'rods' | 'chainMask'>): { x0: number; y0: number; x1: number; y1: number }[] {
  const n = e.rods.length;
  return [...e.rods.keys()].flatMap((i) => {
    if ((e.chainMask & (1 << i)) === 0) return [];
    const a = rodPoint(i);
    const b = rodPoint((i + 1) % n);
    return [{ x0: a.x, y0: a.y, x1: b.x, y1: b.y }];
  });
}

/** The arc lash's line, px: from its rod along the locked aim, `length` long. */
export function lashLine(e: Pick<EnemyState, 'rod' | 'swipeDirX' | 'swipeDirY'>, def: ConductorDef): { x0: number; y0: number; x1: number; y1: number } {
  const o = rodPoint(e.rod);
  return { x0: o.x, y0: o.y, x1: o.x + e.swipeDirX * def.lash.length, y1: o.y + e.swipeDirY * def.lash.length };
}

/** The distance from a point to a segment, px. */
function toSegment(x: number, y: number, s: { x0: number; y0: number; x1: number; y1: number }): number {
  const dx = s.x1 - s.x0;
  const dy = s.y1 - s.y0;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - s.x0) * dx + (y - s.y0) * dy) / len2)) : 0;
  return Math.hypot(x - (s.x0 + dx * t), y - (s.y0 + dy * t));
}

/** Its fight reset where it stands: back at its start rod, full health, rods whole, its strikes gone. */
export function resetConductor(state: SimState, e: EnemyState): void {
  clearStrikes(state, e.id);
  Object.assign(e, createEnemy(e.id, e.enemyId, { x: e.homeX, y: e.homeY }, e.roomId, e.group));
}

/** The lash lands: 50 with knockback along the line to a player whose feet are within half its width of it. */
function landLash(state: SimState, e: EnemyState, def: ConductorDef): void {
  const line = lashLine(e, def);
  state.events.lashes.push({ id: e.id, ...line });
  if (e.roomId !== state.roomId || toSegment(state.player.x, state.player.y, line) > def.lash.width / 2) return;
  damagePlayer(state, def.lash.damage, e.swipeDirX, e.swipeDirY, def.lash.knockback, def.lash.knockTicks);
}

/** While the chain runs: its lines whose rods still stand strike a player on one, once a chain. */
function runChain(state: SimState, e: EnemyState, def: ConductorDef): void {
  e.chainMask &= chainLines(e);
  if (e.chainHit || e.roomId !== state.roomId) return;
  const p = state.player;
  if (!chainSegments(e).some((s) => toSegment(p.x, p.y, s) <= def.chain.width / 2)) return;
  e.chainHit = damagePlayer(state, def.chain.damage, 0, 0, 0, 0);
}

/** Starts an attack's wind-up: the lash locks its aim, the storm call calls its strikes down, the chain picks its lines. */
function startAttack(state: SimState, e: EnemyState, def: ConductorDef, attack: number): void {
  const p = state.player;
  e.attack = attack;
  e.attackCooldowns[attack] = timingOf(def, attack).cooldownTicks;
  enter(e, 'windup');
  state.events.conductorWindups.push({ id: e.id, attack });
  if (attack === 0) {
    const o = rodPoint(e.rod);
    const d = Math.hypot(p.x - o.x, p.y - o.y) || 1;
    e.swipeDirX = (p.x - o.x) / d;
    e.swipeDirY = (p.y - o.y) / d;
  } else if (attack === 1) {
    // One on the player, the others `spread` px off it either side, at a seeded angle.
    const { call } = def;
    const a = nextFloat(state.rng) * 2 * Math.PI;
    for (let i = 0; i < call.count; i++) {
      const off = i === 0 ? 0 : call.spread;
      const at = a + ((i - 1) * 2 * Math.PI) / Math.max(1, call.count - 1);
      callStrike(state, e, p.x + Math.cos(at) * off, p.y + Math.sin(at) * off, call.radius, call.damage, call.windupTicks);
    }
  } else {
    e.chainMask = chainLines(e);
    e.chainHit = false;
  }
}

/** Runs an attack in progress (its wind-up, the strike held `activeTicks`, its recovery). False once it's done or none is. */
function stepConductorAttack(state: SimState, e: EnemyState, def: ConductorDef): boolean {
  if (e.attack < 0) return false;
  const t = timingOf(def, e.attack);
  if (e.attack === 2 && e.mode !== 'recover') e.chainMask &= chainLines(e);
  if (e.mode === 'windup') {
    if (e.modeTicks < t.windupTicks) return (hold(e), true);
    enter(e, 'swipe');
    if (e.attack === 0) landLash(state, e, def);
    if (e.attack === 2) {
      state.events.chains.push({ id: e.id });
      runChain(state, e, def);
    }
    return true;
  }
  if (e.mode === 'swipe') {
    if (e.attack === 2) runChain(state, e, def);
    if (e.modeTicks < t.activeTicks) return (hold(e), true);
    enter(e, 'recover');
    e.chainMask = 0;
    return true;
  }
  if (e.mode === 'recover' && e.modeTicks < t.recoverTicks) return (hold(e), true);
  e.mode = 'chase';
  e.modeTicks = 0;
  e.attack = -1;
  return false;
}

/**
 * Its blink: the next pick waits out `blinkCooldown` and any attack; grounded, it waits for a rod to regrow. A pick
 * names another standing rod (never its own) and warns `warnTicks`, then it moves there. A named rod broken during
 * the warning calls the blink off, and it picks again. True while a warning runs (it doesn't attack then).
 */
function stepBlink(state: SimState, e: EnemyState, def: ConductorDef): boolean {
  if (e.blinkCooldown > 0) e.blinkCooldown -= 1;
  if (e.blinkTo >= 0 && !standing(e, e.blinkTo)) {
    e.blinkTo = -1;
    e.blinkCooldown = 0;
  }
  if (e.blinkTo >= 0) {
    e.blinkWarn -= 1;
    if (e.blinkWarn > 0) return true;
    const from = { x: e.x, y: e.y };
    const to = standPoint(e.blinkTo);
    Object.assign(e, { x: to.x, y: to.y, rod: e.blinkTo, blinkTo: -1, vx: 0, vy: 0 });
    state.events.blinks.push({ id: e.id, rod: e.rod, fromX: from.x, fromY: from.y, toX: to.x, toY: to.y });
    return false;
  }
  if (e.blinkCooldown > 0 || e.attack >= 0 || grounded(e)) return false;
  const others = [...e.rods.keys()].filter((i) => i !== e.rod && standing(e, i));
  const pick = others[nextInt(state.rng, 0, others.length - 1)];
  if (pick === undefined) return false;
  e.blinkTo = pick;
  e.blinkWarn = def.blink.warnTicks;
  e.blinkCooldown = e.enraged ? def.enrage.blinkTicks : def.blink.everyTicks;
  state.events.blinkWarns.push({ id: e.id, rod: pick });
  return true;
}

/** The first attack in data order off its cooldown that has something to hit (the chain needs two neighbouring rods). */
function nextAttack(e: EnemyState): number {
  return ATTACKS.findIndex((_, i) => (e.attackCooldowns[i] ?? 0) <= 0 && (i !== 2 || chainLines(e) !== 0));
}

/** Advances the Conductor's mode and returns this tick's own move, px (it never walks). */
export function conductorThink(state: SimState, e: EnemyState, def: ConductorDef): [number, number] {
  const p = state.player;
  const arena = arenaOf(e.enemyId);
  const here = e.roomId === state.roomId && p.dying === 0;
  const playerIn = here && arena !== undefined && insideTiles(arena.inside, p.x, p.y);
  if (e.mode === 'idle') {
    if (!playerIn) return [0, 0];
    aggro(e);
  }
  e.offScreenTicks = playerIn ? 0 : e.offScreenTicks + 1;
  // A downed player, or one out of the spire too long: the fight resets at once.
  if ((engaged(e) && p.dying > 0) || e.offScreenTicks >= def.leashTicks) {
    resetConductor(state, e);
    return [0, 0];
  }
  if (playerIn) e.angle = Math.atan2(p.y - e.y, p.x - e.x);
  if (!e.enraged && e.health < def.maxHealth * def.enrage.below) e.enraged = true;
  e.attackCooldowns = e.attackCooldowns.map((c) => Math.max(0, c - 1));
  if (stepConductorAttack(state, e, def)) {
    if (e.blinkCooldown > 0) e.blinkCooldown -= 1;
    return [0, 0];
  }
  if (stepBlink(state, e, def) || !playerIn) return [0, 0];
  const attack = nextAttack(e);
  if (attack >= 0) startAttack(state, e, def, attack);
  return [0, 0];
}
