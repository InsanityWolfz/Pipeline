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

/** Each attack's telegraph now, ticks (041.16: the enrage's shorter ones while enraged): wind-ups and its bombs' fuse. */
export function windupsOf(e: Pick<EnemyState, 'enraged'>, def: BulwarkDef): BulwarkDef['enrage']['windups'] {
  if (e.enraged) return def.enrage.windups;
  return { pound: def.pound.windupTicks, lob: def.lob.windupTicks, stomp: def.stomp.windupTicks, wave: def.wave.windupTicks, fuse: def.lob.fuseTicks };
}

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
    if (e.modeTicks < windupsOf(e, def).stomp) return hold(e);
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
 * Below the adds' share, and every `everyTicks` after (041.16): each add rises at its tile, or at the first other tile at least `minDistance`
 * from the player's feet if its own is closer (its own if none is). They're normal enemies of their ring once up.
 */
export function riseAddsIfDue(state: SimState, e: EnemyState, def: BulwarkDef): void {
  const arena = arenaOf(e.enemyId);
  if (!arena) return;
  if (!e.addsRisen) {
    if (e.health >= def.maxHealth * def.adds.below) return;
    e.addsRisen = true;
  } else {
    // 041.16: they keep coming, a pair every `everyTicks` it fights; 041.17: once due, a pair waits while it would
    // take the living adds past `maxAlive`.
    e.addsCooldown = Math.max(0, e.addsCooldown - 1);
    if (e.addsCooldown > 0) return;
    const alive = state.enemies.filter((x) => x.group === ADDS_GROUP && x.roomId === e.roomId && x.health > 0).length;
    if (alive + def.adds.enemies.length > def.adds.maxAlive) return;
  }
  e.addsCooldown = def.adds.everyTicks;
  const spots = arena.addTiles.map(tileCentre);
  const far = (at: { x: number; y: number }) => Math.hypot(at.x - state.player.x, at.y - state.player.y) >= def.adds.minDistance;
  const used = new Set<number>();
  const risen = def.adds.enemies.flatMap((enemyId, i) => {
    const mine = i % spots.length;
    // Its own tile if it's clear of the player and free; else the first other tile that is (041.17: never two on one);
    // else its own.
    const pick = [mine, ...spots.map((_, j) => j).filter((j) => j !== mine)].find((j) => !used.has(j) && far(spots[j] ?? { x: Infinity, y: Infinity })) ?? mine;
    used.add(pick);
    const at = spots[pick];
    if (!at) return [];
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
  e.addsCooldown = 0;
  e.waveTicks = 0;
  e.waveCooldown = def.wave.everyTicks;
  e.lobCooldown = def.lob.cooldownTicks;
  if (e.addsRisen) state.enemies = state.enemies.filter((x) => x.group !== ADDS_GROUP || x.roomId !== e.roomId);
  e.addsRisen = false;
}

/**
 * Its back wave (041.16), beside whatever else it does: every `everyTicks` it fights, a wave builds off its back (locked
 * as it starts) for its wind-up, then breaks on feet inside its rear arc.
 */
export function stepWave(state: SimState, e: EnemyState, def: BulwarkDef): void {
  const { wave } = def;
  // 041.17: the roar attacks nothing; the wave and its countdown wait it out.
  if (e.mode === 'roar') return;
  // The countdown runs through a wave's wind-up too: one starts every `everyTicks`.
  if (e.waveCooldown > 0) e.waveCooldown -= 1;
  if (e.waveTicks > 0) {
    if (e.waveTicks < windupsOf(e, def).wave) {
      e.waveTicks += 1;
      return;
    }
    e.waveTicks = 0;
    landWave(state, e, def);
    return;
  }
  if (e.waveCooldown > 0) return;
  e.waveCooldown = wave.everyTicks;
  e.waveTicks = 1;
  e.waveDirX = -Math.cos(e.angle);
  e.waveDirY = -Math.sin(e.angle);
  state.events.waveStarts.push({ id: e.id });
}

/** The wave breaks: damage and knockback away from it on feet inside the rear arc. */
function landWave(state: SimState, e: EnemyState, def: BulwarkDef): void {
  const { wave } = def;
  state.events.backWaves.push({ id: e.id, x: e.x, y: e.y, radius: wave.radius, dirX: e.waveDirX, dirY: e.waveDirY });
  if (e.roomId !== state.roomId) return;
  const dx = state.player.x - e.x;
  const dy = state.player.y - e.y;
  if (!inArc(dx, dy, e.waveDirX, e.waveDirY, wave.radius, wave.arcDegrees)) return;
  const dist = Math.hypot(dx, dy);
  const [kx, ky] = dist > 0 ? [dx / dist, dy / dist] : [e.waveDirX, e.waveDirY];
  damagePlayer(state, wave.damage, kx, ky, wave.knockback, wave.knockTicks, wave.rollProof);
}
