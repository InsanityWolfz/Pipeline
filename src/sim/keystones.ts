import { BLASTFLETCH, SHATTERPOINT } from '../data/talents';
import { COLD } from '../data/tags';
import { createShard, isShard, type ArrowState } from './arrows';
import { blastArea } from './blast';
import type { EnemyState } from './enemies';
import { poolBurstEmission, shotEmission } from './emissions';
import type { Command } from './input';
import type { SimState } from './state';
import { ruleFor, statOf, statusEmission, type Emission, type Statted } from './statResolve';
import { rotate } from './volley';

// The keystones (037), each a rule line in data (039) read here: Blastfletch (a Bomb Burst
// leaves a Pool; an Arrow through it hits harder and Bursts), Shatterpoint (a Ley hit on a
// Frozen enemy ends the Freeze for more and sends Shards) and Overpressure (held fire ramps
// the fire rate). A rule reaches what its line's scope reaches.

/** A Pool (037's Blastfletch, 039): a circle on the ground, its room, centre and radius, px, and the ticks it has left. */
export interface Pool {
  id: number;
  roomId: string;
  x: number;
  y: number;
  radius: number;
  ticks: number;
}

/** A Burst leaves a Pool over its area when a pool-on-burst line reaches it (Blastfletch: Bomb Bursts), with an event. */
export function leavePool(state: SimState, burst: { roomId: string; x: number; y: number; radius: number }, e: Emission): void {
  const line = ruleFor(state, 'pool-on-burst', e);
  if (!line) return;
  const { roomId, x, y, radius } = burst;
  const id = state.nextPoolId++;
  state.pools.push({ id, roomId, x, y, radius, ticks: statOf(state, 'duration', statusEmission('pool'), line.params.duration ?? 0) });
  state.events.pools.push({ id, x, y, radius });
}

/** Once a tick, before arrows fly: spent Pools go, the rest count down (a Pool is live for its whole duration). */
export function stepPools(state: SimState): void {
  state.pools = state.pools.filter((c) => c.ticks > 0);
  for (const c of state.pools) c.ticks -= 1;
}

/** A round (never a Shard) a pool-strike line reaches (Blastfletch: an Arrow), inside a live Pool it hasn't drawn from yet, takes it. */
export function takePool(state: SimState, arrow: ArrowState): void {
  if (arrow.pooled || isShard(arrow) || !ruleFor(state, 'pool-strike', shotEmission(arrow))) return;
  const c = state.pools.find((b) => b.roomId === arrow.roomId && !arrow.pooledBy.includes(b.id) && Math.hypot(arrow.x - b.x, arrow.y - b.y) <= b.radius);
  if (!c) return;
  arrow.pooled = true;
  arrow.pooledBy.push(c.id);
}

/** How a straight shot's hit lands with the keystones: its damage scale, and whether it bursts (pooled) or shatters. */
export interface KeystoneHit {
  scale: number;
  pooled: boolean;
  shatter: boolean;
}

/**
 * Before a straight shot's damage lands on `e`: a pooled arrow hits its pool-strike's × harder; a round (not a Shard) a
 * shatter line reaches (Shatterpoint: Ley) on a Frozen enemy ends the Freeze (a normal thaw: its immunity starts) and
 * hits its shatter's × harder.
 */
export function keystoneHit(state: SimState, arrow: ArrowState, e: EnemyState): KeystoneHit {
  const emission = shotEmission(arrow);
  const strike = arrow.pooled ? ruleFor(state, 'pool-strike', emission) : null;
  const shatterLine = e.frozen > 0 && !isShard(arrow) ? ruleFor(state, 'shatter', emission) : null;
  if (shatterLine) {
    e.frozen = 0;
    e.refreeze = statOf(state, 'immunity', statusEmission('freeze'), COLD.refreezeTicks);
    state.events.thaws.push({ id: e.id, x: e.x, y: e.y });
  }
  const scale = (strike?.params.damage ?? 1) * (shatterLine?.params.damage ?? 1);
  return { scale, pooled: arrow.pooled, shatter: shatterLine !== null };
}

/**
 * After the hit lands: a pooled arrow Bursts round its point for its pooled hit (every enemy but the struck one, as a
 * bomb's Burst; Burst content reaches its radius) and the Pool it took is spent; a shatter sends its Shards from the
 * struck enemy, the first along the bolt's flight, each for its share of the bolt's damage.
 */
export function afterKeystoneHit(state: SimState, arrow: ArrowState, e: EnemyState, hit: KeystoneHit, spawned: ArrowState[]): void {
  const emission = shotEmission(arrow);
  const strike = hit.pooled ? ruleFor(state, 'pool-strike', emission) : null;
  if (strike) {
    const radius = statOf(state, 'radius', poolBurstEmission(arrow.ammoId), strike.params.radius ?? BLASTFLETCH.burstRadius);
    blastArea(state, arrow.roomId, arrow.x, arrow.y, radius, arrow.damage * hit.scale, BLASTFLETCH.damageType, e.id);
    state.events.poolBursts.push({ x: arrow.x, y: arrow.y, radius });
    arrow.pooled = false;
  }
  const shatter = hit.shatter ? ruleFor(state, 'shatter', emission) : null;
  if (!shatter) return;
  const { count = 0, share = 0, range = 0, speed = 0 } = shatter.params;
  const def = { speed, range, damage: arrow.damage * share, damageType: SHATTERPOINT.damageType, fromSplit: false };
  for (let k = 0; k < count; k++) {
    const [dx, dy] = rotate(arrow.dx, arrow.dy, (k * 360) / count);
    spawned.push(createShard(state.nextArrowId++, arrow, e.x, e.y, dx, dy, e.id, def));
  }
  state.events.shatters.push({ id: e.id, x: e.x, y: e.y });
}

/** The ramp rule in play (Overpressure), or null. */
const rampLine = (state: Statted) => ruleFor(state, 'ramp');

/** Overpressure's ramp, after the tube this tick: held fire while really firing counts up to its ramp; released fire resets it. */
export function rampOverpressure(state: SimState, cmd: Command): void {
  const tube = state.tube;
  const line = rampLine(state);
  if (!cmd.fire || !line) tube.overpressure = 0;
  else if (tube.firing) tube.overpressure = Math.min(line.params.ramp ?? 0, tube.overpressure + 1);
}

/** The ramp's fire-rate multiplier now (039: a × after the +% pool): 1 up to its rate over its ramp of held fire; 1 without it. */
export function rampRate(state: Statted & Pick<SimState, 'tube'>): number {
  const line = rampLine(state);
  if (!line) return 1;
  const { rate = 1, ramp = 1 } = line.params;
  return 1 + ((rate - 1) * Math.min(state.tube.overpressure, ramp)) / ramp;
}

/** How far the ramp is up, 0..1 (render's heat over the tube); 0 without it. */
export function rampShare(state: Statted & Pick<SimState, 'tube'>): number {
  const line = rampLine(state);
  return line ? Math.min(state.tube.overpressure, line.params.ramp ?? 1) / (line.params.ramp ?? 1) : 0;
}
