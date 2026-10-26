import { arenaOf, type BossArena } from '../data/arenas';
import { TICK_RATE, TILE_SIZE } from '../data/config';
import type { ForgewrightDef } from '../data/enemies';
import { enter, hold, startWindup, stepAttack, toward, walkHome } from './aiCommon';
import { engaged, inArena } from './bulwarkAi';
import { chillScale, chillSlow } from './cold';
import { aggro, type EnemyState } from './enemies';
import { floodOut } from './floodPools';
import { createBellows } from './forgewrightParts';
import { unit } from './direction';
import { damagePlayer } from './health';
import { castOrb } from './orbs';
import { angleDiff } from './shield';
import type { SimState } from './state';
import { insideTiles } from './tiles';
import { rotate } from './volley';

// The Forgewright (060): it stands in the Anvil Hall and wakes when the player's feet enter it (the Bulwark's rule,
// 034, 055). Engaged, it turns to face the player and walks slowly at them; up close it slams its hammer into a red
// circle ahead of it; at range it sprays a fan of slow embers. Beside all that its heat fills (slowed by Chill as its
// walk is, faster once enraged below half health); at full heat it raises its hammer while the half of the hall the
// player stands in is shaded red, then floods it with fire pools (floodPools.ts). A vent (forgewrightParts.ts) staggers
// it where it stands, its heat still filling (068). It never leaves the hall, and walks home to heal after the player
// has been out of it a while.

const RAD = Math.PI / 180;

/** True once walking home has brought it home (it idles, healed). */
const isIdle = (e: Pick<EnemyState, 'mode'>): boolean => e.mode === 'idle';

/** Turns its facing toward a world point by at most a tick's `turnDegPerSec`, never snapping (its bellows turn with it). */
function turnTo(e: EnemyState, def: ForgewrightDef, x: number, y: number): void {
  if (x === e.x && y === e.y) return;
  const step = (def.turnDegPerSec * RAD) / TICK_RATE;
  const d = angleDiff(e.angle, Math.atan2(y - e.y, x - e.x));
  e.angle += Math.max(-step, Math.min(step, d));
}

/** True once its heat is full (to float error). */
export const heatFull = (e: Pick<EnemyState, 'heat'>, def: ForgewrightDef): boolean => e.heat >= def.heat.max - 1e-6;

/** Its heat's rise this tick: the gauge over `fillTicks`, each Chill stack slowing it as it slows a walk, ×`heatRate` enraged. */
export const heatRise = (state: SimState, e: EnemyState, def: ForgewrightDef): number =>
  (def.heat.max / def.heat.fillTicks) * chillScale(e, chillSlow(state)) * (e.enraged ? def.enrage.heatRate : 1);

/** Its heat fills beside whatever else it does, a vent too (068), but not through its flood (the wind-up, the blow, or its pools still out). */
function stepHeat(state: SimState, e: EnemyState, def: ForgewrightDef): void {
  if (e.mode === 'flood-windup' || e.mode === 'flood' || floodOut(state, e.id)) return;
  e.heat = Math.min(def.heat.max, e.heat + heatRise(state, e, def));
}

/** The half of its hall a flood on `side` covers, px: west (-1) or east (1) of the hall's middle, its full depth. */
export function floodRect(arena: Pick<BossArena, 'inside'>, side: number): { x0: number; y0: number; x1: number; y1: number } {
  const r = arena.inside;
  const mid = ((r.x0 + r.x1 + 1) / 2) * TILE_SIZE;
  const [x0, x1] = side < 0 ? [r.x0 * TILE_SIZE, mid] : [mid, (r.x1 + 1) * TILE_SIZE];
  return { x0, y0: r.y0 * TILE_SIZE, x1, y1: (r.y1 + 1) * TILE_SIZE };
}

/** Its hammer comes down: fire pools cover the locked half for `floodTicks`. */
function landFlood(state: SimState, e: EnemyState, def: ForgewrightDef): void {
  const arena = arenaOf(e.enemyId);
  if (!arena) return;
  const rect = floodRect(arena, e.floodSide);
  const { damage, everyTicks, floodTicks } = def.flood;
  state.floodPools.push({ ownerId: e.id, enemyId: e.enemyId, roomId: e.roomId, shape: 'rect', ...rect, r: 0, damage, everyTicks, age: 0, ticks: floodTicks });
  state.events.floods.push({ id: e.id, ...rect });
}

/** Runs a flood in progress (wind-up, then the blow's pose and recovery), none of it turning. Null once it's back to chasing. */
function stepFlood(state: SimState, e: EnemyState, def: ForgewrightDef): [number, number] | null {
  const { flood } = def;
  if (e.mode === 'flood-windup') {
    if (e.modeTicks < flood.windupTicks) return hold(e);
    enter(e, 'flood');
    landFlood(state, e, def);
    return [0, 0];
  }
  if (e.mode === 'flood') {
    if (e.modeTicks < flood.swipeTicks + flood.recoverTicks) return hold(e);
    e.mode = 'chase';
    e.modeTicks = 0;
  }
  return null;
}

/** Its embers leave the hammer: `count` of them fanned evenly over `coneDegrees` about the locked aim. */
function landSpray(state: SimState, e: EnemyState, def: ForgewrightDef): void {
  const { spray } = def;
  const step = spray.count > 1 ? spray.coneDegrees / (spray.count - 1) : 0;
  for (let i = 0; i < spray.count; i++) {
    const [dx, dy] = rotate(e.swipeDirX, e.swipeDirY, (i - (spray.count - 1) / 2) * step);
    castOrb(state, e, dx, dy);
  }
  state.events.sprays.push({ id: e.id, x: e.x, y: e.y, count: spray.count });
}

/** Runs a spray in progress (wind-up, then the throw's pose and recovery), none of it turning. Null once it's back to chasing. */
function stepSpray(state: SimState, e: EnemyState, def: ForgewrightDef): [number, number] | null {
  const { spray } = def;
  if (e.mode === 'spray-windup') {
    if (e.modeTicks < spray.windupTicks) return hold(e);
    enter(e, 'spray');
    landSpray(state, e, def);
    return [0, 0];
  }
  if (e.mode === 'spray') {
    if (e.modeTicks < spray.swipeTicks + spray.recoverTicks) return hold(e);
    e.mode = 'chase';
    e.modeTicks = 0;
  }
  return null;
}

/** The slam lands: damage and knockback out from the circle's centre on feet inside it. */
function landSlam(state: SimState, e: EnemyState, def: ForgewrightDef): void {
  const { slam } = def;
  const cx = e.x + e.swipeDirX * slam.reach;
  const cy = e.y + e.swipeDirY * slam.reach;
  state.events.slams.push({ id: e.id, x: cx, y: cy, radius: slam.radius });
  if (e.roomId !== state.roomId) return;
  const dx = state.player.x - cx;
  const dy = state.player.y - cy;
  const dist = Math.hypot(dx, dy);
  if (dist > slam.radius) return;
  const [kx, ky] = dist > 0 ? [dx / dist, dy / dist] : [e.swipeDirX, e.swipeDirY];
  damagePlayer(state, slam.damage, kx, ky, slam.knockback, slam.knockTicks);
}

/** Home and healed, or reset at its door: its heat, vent, bellows, enrage and pools all clear. */
export function resetForge(state: SimState, e: EnemyState, def: ForgewrightDef): void {
  e.heat = 0;
  e.vent = 0;
  e.bellows = createBellows(e.enemyId);
  e.enraged = false;
  e.floodSide = 0;
  e.lobCooldown = def.spray.cooldownTicks;
  state.floodPools = state.floodPools.filter((p) => p.ownerId !== e.id);
}

/** Advances the Forgewright's mode and returns this tick's own move, px. */
export function forgewrightThink(state: SimState, e: EnemyState, def: ForgewrightDef): [number, number] {
  const p = state.player;
  const arena = arenaOf(e.enemyId);
  const here = e.roomId === state.roomId && p.dying === 0;
  const playerIn = here && arena !== undefined && insideTiles(arena.inside, p.x, p.y);
  // A dying player is gone: it turns for home at once (as the Bulwark does).
  if (engaged(e) && !here && p.dying > 0) {
    e.mode = 'return';
    e.modeTicks = 0;
  }
  if (e.mode === 'idle' || e.mode === 'return') {
    if (!playerIn) {
      if (e.mode === 'idle') return [0, 0];
      turnTo(e, def, e.homeX, e.homeY);
      const move = walkHome(e, def);
      // Home and healed: the fight resets.
      if (isIdle(e)) resetForge(state, e, def);
      return move;
    }
    aggro(e);
    e.lobCooldown = def.spray.cooldownTicks;
  }
  if (e.lobCooldown > 0) e.lobCooldown -= 1;
  e.offScreenTicks = playerIn ? 0 : e.offScreenTicks + 1;
  if (!e.enraged && e.health < def.maxHealth * def.enrage.below) e.enraged = true;
  // 068: its heat fills through a vent too (only the flood resets it). Full mid-vent, the flood waits for the vent's end.
  stepHeat(state, e, def);
  // Venting it staggers where it stands, unable to attack (forgewrightParts.ts ends it).
  if (e.mode === 'vent') return hold(e);
  const flooding = stepFlood(state, e, def);
  if (flooding) return flooding;
  const spraying = stepSpray(state, e, def);
  if (spraying) return spraying;
  const slamming = stepAttack(e, def, () => landSlam(state, e, def));
  if (slamming) return slamming;
  if (e.offScreenTicks >= def.leashTicks) {
    e.mode = 'return';
    e.modeTicks = 0;
    return walkHome(e, def);
  }
  // A decision point: free of any attack.
  turnTo(e, def, p.x, p.y);
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const dist = Math.hypot(dx, dy);
  if (playerIn && arena && heatFull(e, def) && !floodOut(state, e.id)) {
    // The half the player stands in, locked as the hammer rises.
    e.floodSide = p.x < floodRect(arena, -1).x1 ? -1 : 1;
    enter(e, 'flood-windup');
    state.events.floodStarts.push({ id: e.id });
    return [0, 0];
  }
  if (playerIn && dist <= def.slam.triggerRange && e.cooldown === 0) {
    // The circle lies ahead of it, where it faces.
    startWindup(e, def, Math.cos(e.angle), Math.sin(e.angle));
    return [0, 0];
  }
  if (playerIn && dist > def.slam.triggerRange && e.lobCooldown === 0) {
    // Its aim locks toward the player as the wind-up starts.
    [e.swipeDirX, e.swipeDirY] = unit(dx, dy);
    e.lobCooldown = def.spray.cooldownTicks;
    enter(e, 'spray-windup');
    return [0, 0];
  }
  if (dist <= def.slam.triggerRange * def.standOff) return [0, 0];
  const [mx, my] = toward(dx, dy, def);
  return inArena(e, def, mx, my);
}
