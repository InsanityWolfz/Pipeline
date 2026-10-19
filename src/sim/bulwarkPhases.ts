import { ADDS_GROUP } from '../data/bulwark';
import type { BulwarkDef } from '../data/enemies';
import { arenaOf } from '../data/hollows';
import { enter, hold, inArc } from './aiCommon';
import { createEnemy, type EnemyState } from './enemies';
import { damagePlayer } from './health';
import { angleDiff } from './shield';
import type { SimState } from './state';
import { tileCentre } from './tiles';

// The Bulwark's fight beyond 034 (041): the rear stomp that punishes a player who stays
// behind it too long, the enrage below 30% (a roar, then a faster turn and faster lobs),
// the adds at half health, and the reset that clears all three when it walks home and
// heals. bulwarkAi.ts calls these from its think.

/** Its shield's turn rate now, °/s: the enrage's while enraged. */
export const turnRateOf = (e: EnemyState, def: BulwarkDef): number => (e.enraged ? def.enrage.turnDegPerSec : def.shield.turnDegPerSec);

/** Its lob cooldown now, ticks: the enrage's while enraged. */
export const lobCooldownOf = (e: EnemyState, def: BulwarkDef): number => (e.enraged ? def.enrage.lobCooldownTicks : def.lob.cooldownTicks);

/** True if the player's feet are behind it (outside its shield arc) and within the stomp's range. */
function playerBehind(state: SimState, e: EnemyState, def: BulwarkDef): boolean {
  const p = state.player;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  if (Math.hypot(dx, dy) > def.stomp.range) return false;
  return Math.abs(angleDiff(e.angle, Math.atan2(dy, dx))) > (def.shield.arcDegrees / 2) * (Math.PI / 180);
}

/** Once a tick while it fights: the behind counter fills 1 with the player behind it in range, else drains `behindDecay` (never below 0). */
export function countBehind(state: SimState, e: EnemyState, def: BulwarkDef, here: boolean): void {
  e.behind = here && playerBehind(state, e, def) ? e.behind + 1 : Math.max(0, e.behind - def.stomp.behindDecay);
}

/** At a decision point: the stomp is due (the counter full, its cooldown ready). */
export const stompReady = (e: EnemyState, def: BulwarkDef): boolean => e.behind >= def.stomp.behindTicks && e.stompCooldown === 0;

/** Starts the stomp's wind-up, its half-disc locked over its back as it stands now. */
export function startStomp(e: EnemyState, def: BulwarkDef): void {
  e.swipeDirX = -Math.cos(e.angle);
  e.swipeDirY = -Math.sin(e.angle);
  e.stompCooldown = def.stomp.cooldownTicks;
  enter(e, 'stomp-windup');
}

/** Stomps: damage and knockback away from it on feet inside the rear half-disc; the counter resets. */
function landStomp(state: SimState, e: EnemyState, def: BulwarkDef): void {
  const { stomp } = def;
  e.behind = 0;
  state.events.stomps.push({ id: e.id, x: e.x, y: e.y, radius: stomp.radius, dirX: e.swipeDirX, dirY: e.swipeDirY });
  if (e.roomId !== state.roomId) return;
  const dx = state.player.x - e.x;
  const dy = state.player.y - e.y;
  if (!inArc(dx, dy, e.swipeDirX, e.swipeDirY, stomp.radius, stomp.arcDegrees)) return;
  const dist = Math.hypot(dx, dy);
  const [kx, ky] = dist > 0 ? [dx / dist, dy / dist] : [e.swipeDirX, e.swipeDirY];
  damagePlayer(state, stomp.damage, kx, ky, stomp.knockback, stomp.knockTicks);
}

/** Runs a stomp in progress (wind-up, stomp, recovery, none turning). Returns the tick's move, or null once it's back to chasing (or wasn't stomping). */
export function stepStomp(state: SimState, e: EnemyState, def: BulwarkDef): [number, number] | null {
  const { stomp } = def;
  if (e.mode === 'stomp-windup') {
    if (e.modeTicks < stomp.windupTicks) return hold(e);
    enter(e, 'stomp');
    landStomp(state, e, def);
    return [0, 0];
  }
  if (e.mode === 'stomp') {
    if (e.modeTicks < stomp.swipeTicks) return hold(e);
    enter(e, 'stomp-recover');
    return [0, 0];
  }
  if (e.mode === 'stomp-recover') {
    if (e.modeTicks < stomp.recoverTicks) return hold(e);
    e.mode = 'chase';
    e.modeTicks = 0;
  }
  return null;
}

/** At a decision point: below the enrage's share for the first time this fight, it enrages and starts its roar. Returns whether it did. */
export function enrageIfDue(state: SimState, e: EnemyState, def: BulwarkDef): boolean {
  if (e.enraged || e.health >= def.maxHealth * def.enrage.below) return false;
  e.enraged = true;
  state.events.enrages.push({ id: e.id });
  enter(e, 'roar');
  return true;
}

/** Runs its roar: it starts no attack. Returns true while it roars. */
export function stepRoar(e: EnemyState, def: BulwarkDef): boolean {
  if (e.mode !== 'roar') return false;
  if (e.modeTicks < def.enrage.roarTicks) {
    hold(e);
    return true;
  }
  e.mode = 'chase';
  e.modeTicks = 0;
  return false;
}

/**
 * Once a fight, below the adds' share: each add rises at its tile, or at the first other tile at least `minDistance`
 * from the player's feet if its own is closer (its own if none is). They're normal enemies of their ring once up.
 */
export function riseAddsIfDue(state: SimState, e: EnemyState, def: BulwarkDef): void {
  const arena = arenaOf(e.enemyId);
  if (!arena || e.addsRisen || e.health >= def.maxHealth * def.adds.below) return;
  e.addsRisen = true;
  const spots = arena.addTiles.map(tileCentre);
  const far = (at: { x: number; y: number }) => Math.hypot(at.x - state.player.x, at.y - state.player.y) >= def.adds.minDistance;
  const risen = def.adds.enemies.flatMap((enemyId, i) => {
    const own = spots[i % spots.length];
    if (!own) return [];
    const at = far(own) ? own : (spots.find((t, j) => j !== i % spots.length && far(t)) ?? own);
    const add = createEnemy(state.nextEnemyId++, enemyId, at, e.roomId, ADDS_GROUP);
    add.rising = def.adds.riseTicks;
    return [add];
  });
  state.enemies.push(...risen);
  state.events.addsRise.push({ id: e.id, adds: risen.map((a) => ({ id: a.id, enemyId: a.enemyId, x: a.x, y: a.y })) });
}

/** Home and healed (a leash reset): the fight's enrage, counter and cooldowns clear, and its living adds sink back, gone. */
export function resetFight(state: SimState, e: EnemyState, def: BulwarkDef): void {
  e.enraged = false;
  e.behind = 0;
  e.stompCooldown = 0;
  e.lobCooldown = def.lob.cooldownTicks;
  if (e.addsRisen) state.enemies = state.enemies.filter((x) => x.group !== ADDS_GROUP || x.roomId !== e.roomId);
  e.addsRisen = false;
}
