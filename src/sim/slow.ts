import type { PlayerState } from './player';

// The player's slow (065, the first: a gale ram's gust): a status that takes a share of walk and roll speed for a while.
// It lowers how far a roll carries but never stops one (a roll keeps its ticks). A new slow takes the stronger share
// and the longer time left. The step (step.ts) reads `slowScale` into the player's move; stepPlayer counts it down.

/** Slows the player by `amount` (a share, 0..1) for `ticks`, keeping any stronger or longer slow already running. */
export function slowPlayer(p: PlayerState, amount: number, ticks: number): void {
  p.slow = p.slowTicks > 0 ? Math.max(p.slow, amount) : amount;
  p.slowTicks = Math.max(p.slowTicks, ticks);
}

/** The multiplier the slow puts on walk and roll speed now (1: not slowed). */
export const slowScale = (p: Pick<PlayerState, 'slow' | 'slowTicks'>): number => (p.slowTicks > 0 ? 1 - p.slow : 1);

/** One tick of it: it runs out after its ticks. */
export function tickSlow(p: PlayerState): void {
  if (p.slowTicks <= 0) return;
  p.slowTicks -= 1;
  if (p.slowTicks === 0) p.slow = 0;
}
