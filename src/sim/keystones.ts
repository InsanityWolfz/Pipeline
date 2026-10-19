import { roundBase } from '../data/tags';
import { BLASTFLETCH, OVERPRESSURE, SHATTERPOINT } from '../data/talents';
import { COLD } from '../data/tags';
import { createShard, type ArrowState } from './arrows';
import { blastArea } from './bombs';
import type { EnemyState } from './enemies';
import type { Command } from './input';
import type { SimState } from './state';
import { hasKeystone } from './talentEffects';
import { rotate } from './volley';

// The keystones (037): Blastfletch (a bomb's blast charges its ground for arrows),
// Shatterpoint (a ley bolt shatters a frozen enemy) and Overpressure (held fire ramps the
// fire rate). Rules over 029's ammo systems; their numbers are in src/data/talents.ts.

/** A bomb blast's charged ground (Blastfletch): its room, centre and radius, px, and the ticks it has left. */
export interface BlastCharge {
  id: number;
  roomId: string;
  x: number;
  y: number;
  radius: number;
  ticks: number;
}

/** With Blastfletch, a player bomb's blast leaves its area charged for BLASTFLETCH.chargeTicks, with an event. */
export function chargeGround(state: SimState, blast: { roomId: string; x: number; y: number; radius: number }): void {
  if (!hasKeystone(state, 'blastfletch')) return;
  const { roomId, x, y, radius } = blast;
  const id = state.nextChargeId++;
  state.blastCharges.push({ id, roomId, x, y, radius, ticks: BLASTFLETCH.chargeTicks });
  state.events.blastCharges.push({ id, x, y, radius });
}

/** Once a tick, before arrows fly: spent charges go, the rest count down (a charge is live for its whole chargeTicks). */
export function stepCharges(state: SimState): void {
  state.blastCharges = state.blastCharges.filter((c) => c.ticks > 0);
  for (const c of state.blastCharges) c.ticks -= 1;
}

/** An arrow (not a ley bolt or a shard) inside a live charged area it hasn't drawn from yet takes its charge. */
export function takeCharge(state: SimState, arrow: ArrowState): void {
  if (arrow.charged || roundBase(arrow.ammoId) !== 'arrow') return;
  const c = state.blastCharges.find((b) => b.roomId === arrow.roomId && !arrow.chargedBy.includes(b.id) && Math.hypot(arrow.x - b.x, arrow.y - b.y) <= b.radius);
  if (!c) return;
  arrow.charged = true;
  arrow.chargedBy.push(c.id);
}

/** How a straight shot's hit lands with the keystones: its damage scale, and whether it bursts (charged) or shatters. */
export interface KeystoneHit {
  scale: number;
  charged: boolean;
  shatter: boolean;
}

/**
 * Before a straight shot's damage lands on `e`: a charged arrow hits BLASTFLETCH.damageScale harder; with Shatterpoint a
 * ley bolt (not a shard) on a frozen enemy thaws it (a normal thaw: its refreeze window starts) and hits
 * SHATTERPOINT.damageScale harder.
 */
export function keystoneHit(state: SimState, arrow: ArrowState, e: EnemyState): KeystoneHit {
  const shatter = e.frozen > 0 && roundBase(arrow.ammoId) === 'ley-bolt' && hasKeystone(state, 'shatterpoint');
  if (shatter) {
    e.frozen = 0;
    e.refreeze = COLD.refreezeTicks;
    state.events.thaws.push({ id: e.id, x: e.x, y: e.y });
  }
  const scale = (arrow.charged ? BLASTFLETCH.damageScale : 1) * (shatter ? SHATTERPOINT.damageScale : 1);
  return { scale, charged: arrow.charged, shatter };
}

/**
 * After the hit lands: a charged arrow bursts BLASTFLETCH.burstRadius px round its point for its charged damage (every
 * enemy but the struck one, like a bomb's blast) and its charge is spent; a shatter sends SHATTERPOINT.shards ice
 * shards from the struck enemy, the first along the bolt's flight, each for shardScale of the bolt's damage.
 */
export function afterKeystoneHit(state: SimState, arrow: ArrowState, e: EnemyState, hit: KeystoneHit, spawned: ArrowState[]): void {
  if (hit.charged) {
    blastArea(state, arrow.roomId, arrow.x, arrow.y, BLASTFLETCH.burstRadius, arrow.damage * hit.scale, BLASTFLETCH.damageType, e.id);
    state.events.chargedBursts.push({ x: arrow.x, y: arrow.y, radius: BLASTFLETCH.burstRadius });
    arrow.charged = false;
  }
  if (!hit.shatter) return;
  const S = SHATTERPOINT;
  for (let k = 0; k < S.shards; k++) {
    const [dx, dy] = rotate(arrow.dx, arrow.dy, (k * 360) / S.shards);
    spawned.push(createShard(state.nextArrowId++, arrow.roomId, e.x, e.y, dx, dy, e.id, { projectile: S.projectile, speed: S.speed, range: S.range, damage: arrow.damage * S.shardScale, damageType: S.damageType }));
  }
  state.events.shatters.push({ id: e.id, x: e.x, y: e.y });
}

/** Overpressure's ramp, after the tube this tick: held fire while really firing counts up to its ramp; released fire resets it. */
export function rampOverpressure(state: SimState, cmd: Command): void {
  const tube = state.tube;
  if (!cmd.fire || !hasKeystone(state, 'overpressure')) tube.overpressure = 0;
  else if (tube.firing) tube.overpressure = Math.min(OVERPRESSURE.rampTicks, tube.overpressure + 1);
}

/** Overpressure's fire-rate bonus now: up to OVERPRESSURE.maxBonus over rampTicks of held fire; 0 without the keystone. */
export function overpressureBonus(state: Pick<SimState, 'tube' | 'talents'>): number {
  if (!hasKeystone(state, 'overpressure')) return 0;
  return (OVERPRESSURE.maxBonus * Math.min(state.tube.overpressure, OVERPRESSURE.rampTicks)) / OVERPRESSURE.rampTicks;
}
