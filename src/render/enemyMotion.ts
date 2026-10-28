import { ENEMY_MOTION as M } from '../data/art/enemyMotion';
import type { EnemyPoseName } from '../data/art/enemyRig';
import { attackOf, type EnemyDef } from '../data/enemies';
import { windupsOf } from '../sim/bulwarkPhases';
import { defOf } from '../sim/champions';
import type { EnemyState } from '../sim/enemies';

// 076: how an enemy's art moves inside the sim's timing, as pure functions of its state and clocks, so tests and the
// contact sheet sample them at fixed times. Wind-ups are strips of gather, coil and peak picked by progress; the peak
// trembles; an attack's first frames stretch; hits flinch or stagger (enemyReaction.ts).

export type WindupPhase = 'gather' | 'coil' | 'peak';

/** An attack's wind-up strip: its pose and its wind-up ticks. */
export interface Strip {
  pose: EnemyPoseName;
  ticks: number;
}

/** Every attack an enemy winds up, with its strip's pose: one for most, three for each late boss. */
export function stripsOf(def: EnemyDef): Strip[] {
  if (def.kind === 'bulwark') return [{ pose: 'windup', ticks: def.pound.windupTicks }, { pose: 'lob', ticks: def.lob.windupTicks }, { pose: 'brace', ticks: def.stomp.windupTicks }];
  if (def.kind === 'forgewright') return [{ pose: 'windup', ticks: def.slam.windupTicks }, { pose: 'spray', ticks: def.spray.windupTicks }, { pose: 'flood', ticks: def.flood.windupTicks }];
  if (def.kind === 'conductor') return [{ pose: 'windup', ticks: def.lash.windupTicks }, { pose: 'call', ticks: def.call.windupTicks }, { pose: 'chain', ticks: def.chain.windupTicks }];
  return [{ pose: 'windup', ticks: attackOf(def).windupTicks }];
}

/** The wind-up an enemy is in now, its strip and length (the Bulwark's shorter ones while enraged), or null. */
export function windupOf(e: EnemyState): Strip | null {
  const def = defOf(e);
  if (def.kind === 'bulwark') {
    const w = windupsOf(e, def);
    if (e.mode === 'windup') return { pose: 'windup', ticks: w.pound };
    if (e.mode === 'lob') return { pose: 'lob', ticks: w.lob };
    if (e.mode === 'stomp-windup') return { pose: 'brace', ticks: w.stomp };
    return null;
  }
  const strips = stripsOf(def);
  if (def.kind === 'forgewright') {
    const i = e.mode === 'windup' ? 0 : e.mode === 'spray-windup' ? 1 : e.mode === 'flood-windup' ? 2 : -1;
    return strips[i] ?? null;
  }
  if (e.mode !== 'windup') return null;
  return def.kind === 'conductor' ? (strips[e.conductor.attack] ?? null) : (strips[0] ?? null);
}

/** The first tick (counting from 1) of a wind-up's peak: from `peakAt` of it (85%, or an override), and at least the last 5. */
export function peakStart(ticks: number, peakAt: number = M.phases.peak): number {
  return Math.min(Math.floor(peakAt * ticks + 1e-9) + 1, ticks - M.phases.minPeakTicks + 1);
}

/** The phase `modeTicks` (1 on its first tick) into a wind-up of `ticks` shows. */
export function windupPhase(modeTicks: number, ticks: number, peakAt?: number): WindupPhase {
  if (modeTicks >= peakStart(ticks, peakAt)) return 'peak';
  return modeTicks / ticks < M.phases.gather ? 'gather' : 'coil';
}

/** The strip's frame for a phase: gather first, the coil (its two frames alternating at walk pace), peak last. */
export function stripIndex(phase: WindupPhase, coilFrames: number, nowMs: number): number {
  if (phase === 'gather') return 0;
  if (phase === 'peak') return coilFrames + 1;
  return 1 + (coilFrames > 1 ? Math.floor((nowMs * M.phases.coilFps) / 1000) % coilFrames : 0);
}

/** The peak's tremble: the sprite's own offset, world px (none outside the peak). */
export function tremble(phase: WindupPhase | null, nowMs: number, boss: boolean): { dx: number; dy: number } {
  if (phase !== 'peak') return { dx: 0, dy: 0 };
  const px = boss ? M.tremble.bossPx : M.tremble.px;
  const a = (nowMs / 1000) * M.tremble.hz * Math.PI * 2;
  return { dx: px * Math.sin(a), dy: px * 0.5 * Math.cos(a * 1.5) };
}

/**
 * The release snap `ticks` (1 on its first) into an attack: a stretch settling to nothing over 4 ticks. With `key`
 * (`enemyId:mode`), none for a slam or stomp (`ENEMY_MOTION.release.none`), whose baked impact squash lands as drawn.
 */
export function releaseSquash(ticks: number, key?: string): number {
  if (ticks < 1 || ticks > M.release.ticks) return 0;
  if (key !== undefined && M.release.none.includes(key)) return 0;
  return M.release.squash * (1 - (ticks - 1) / M.release.ticks);
}

/** Modes that are an attack's release (the swipe and its kin), whose first frames snap. */
export const RELEASE_MODES: readonly string[] = ['swipe', 'throw', 'stomp', 'spray', 'flood'];
