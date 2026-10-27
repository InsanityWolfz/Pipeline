import { DEATH_SIZE } from '../data/art/enemyFamilies';
import { ENEMY_MOTION } from '../data/art/enemyMotion';
import { DEATH_MOTES, PARTICLE_BUDGET } from '../data/juice';
import type { Quality } from '../data/settings';

// 076: a death's ley motes and the dissolve's curve, pure. The count comes from the enemy's size class, a champion and
// the Graphics quality, thinned hard to the per-death cap, the live death-mote cap and what the particle budget has
// left after every live particle; each wave is thinned again when it's thrown. DissolveView draws them.

const D = ENEMY_MOTION.dissolve;

/** What is flying when a death (or one of its waves) asks for motes. */
export interface MoteRoom {
  quality: Quality;
  liveMotes: number;
  liveParticles: number;
}

/** At most `want`, within the live death-mote cap and the particle budget's room. */
export function waveCount(want: number, r: MoteRoom): number {
  return Math.max(0, Math.min(want, DEATH_MOTES.liveCap[r.quality] - r.liveMotes, PARTICLE_BUDGET[r.quality] - r.liveParticles));
}

/** How many motes a death throws in all. */
export function deathMoteCount(enemyId: string, champion: boolean, r: MoteRoom): number {
  const base = DEATH_MOTES.count[DEATH_SIZE[enemyId] ?? 'medium'] * (champion ? DEATH_MOTES.champion : 1) * (DEATH_MOTES.perEnemy[enemyId] ?? 1);
  return waveCount(Math.min(Math.round(base * DEATH_MOTES.quality[r.quality]), DEATH_MOTES.perDeathCap[r.quality]), r);
}

/** `total` split into `waves` waves, the first ones taking any remainder. */
export function moteWaves(total: number, waves: number): number[] {
  return Array.from({ length: waves }, (_, i) => Math.floor(total / waves) + (i < total % waves ? 1 : 0));
}

/** A death's whole length, ms: the struck pose and the dissolve. */
export const dissolveMs = (boss: boolean): number => (boss ? D.bossStruckMs + D.bossFadeMs : D.struckMs + D.fadeMs);

export interface DissolveLook {
  phase: 'struck' | 'dissolve' | 'done';
  /** The body's alpha and scale about its feet. */
  alpha: number;
  sx: number;
  sy: number;
  /** The additive copy's alpha. */
  tint: number;
  /** How far through the dissolve, 0..1 (0 while struck). */
  u: number;
}

/** The death `ms` in: struck, then narrowing to 0.8×, stretching to 1.1× and fading, the tint rising to its peak and fading with it. */
export function dissolveAt(ms: number, boss: boolean, flashes: boolean): DissolveLook {
  const struck = boss ? D.bossStruckMs : D.struckMs;
  const fade = boss ? D.bossFadeMs : D.fadeMs;
  const top = flashes ? D.tintAlpha : D.dimTintAlpha;
  if (ms >= struck + fade) return { phase: 'done', alpha: 0, sx: D.narrow, sy: D.stretch, tint: 0, u: 1 };
  if (ms < struck) return { phase: 'struck', alpha: 1, sx: 1, sy: 1, tint: top * D.tintPeak * (ms / struck), u: 0 };
  const u = (ms - struck) / fade;
  const ease = u * (2 - u);
  // The tint carries on from the struck pose's rise to its peak, then falls with the body.
  const tint = u < D.tintPeak ? top * (D.tintPeak + (1 - D.tintPeak) * (u / D.tintPeak)) : top * ((1 - u) / (1 - D.tintPeak));
  return { phase: 'dissolve', alpha: 1 - u * u, sx: 1 + (D.narrow - 1) * ease, sy: 1 + (D.stretch - 1) * ease, tint, u };
}
