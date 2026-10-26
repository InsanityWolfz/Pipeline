import type { GameObjects } from 'phaser';
import { ENEMY_FX } from '../data/assets';
import { CONDUCTOR_LOOK } from '../data/conductorAssets';
import type { ConductorDef } from '../data/enemies';
import { chainSegments, lashLine } from '../sim/conductorAi';
import type { EnemyState } from '../sim/enemies';
import { colorOf } from './color';

// How the Conductor reads on screen (064), for EnemyView and telegraphs.ts: its pose for what it does (gathering
// before a blink, the lash's draw-back and whip, the staff raised for the storm call, its arms spread for the rod
// chain), and its telegraphs on the ground, each filling as its wind-up runs: the lash's red line from its rod, and
// the rod chain's red lines between neighbouring standing rods. The storm call's circles and the lightning itself are
// ConductorView's.

export type ConductorPose = 'idle' | 'windup' | 'swipe' | 'recover' | 'hit' | 'blink' | 'call' | 'chain';

/** Its pose for its attack and mode. */
export function conductorPose(e: EnemyState): ConductorPose {
  if (e.conductor.blinkTo >= 0) return 'blink';
  if (e.conductor.attack >= 0 && e.mode === 'recover') return 'recover';
  if (e.conductor.attack === 0 && (e.mode === 'windup' || e.mode === 'swipe')) return e.mode;
  if (e.conductor.attack === 1 && (e.mode === 'windup' || e.mode === 'swipe')) return 'call';
  if (e.conductor.attack === 2 && (e.mode === 'windup' || e.mode === 'swipe')) return 'chain';
  return e.flash > 0 ? 'hit' : 'idle';
}

/** A red band along a segment, `width` px across, filled out from its start to `k` (0..1) of its length. */
function band(g: GameObjects.Graphics, s: { x0: number; y0: number; x1: number; y1: number }, width: number, k: number, alpha: number, fillAlpha: number): void {
  const color = colorOf(ENEMY_FX.telegraphColor);
  g.lineStyle(width, color, alpha).lineBetween(s.x0, s.y0, s.x1, s.y1);
  g.lineStyle(width, color, fillAlpha).lineBetween(s.x0, s.y0, s.x0 + (s.x1 - s.x0) * k, s.y0 + (s.y1 - s.y0) * k);
}

/** Draws its telegraph for the frame: the lash's line or the chain's lines through their wind-ups. */
export function drawConductorTelegraph(g: GameObjects.Graphics, e: EnemyState, def: ConductorDef): void {
  if (e.mode !== 'windup') return;
  if (e.conductor.attack === 0) {
    const L = CONDUCTOR_LOOK.lash;
    band(g, lashLine(e, def), def.lash.width, Math.min(1, e.modeTicks / def.lash.windupTicks), L.alpha, L.fillAlpha);
  }
  if (e.conductor.attack === 2) {
    const C = CONDUCTOR_LOOK.chain;
    const k = Math.min(1, e.modeTicks / def.chain.windupTicks);
    for (const s of chainSegments(e)) band(g, s, def.chain.width, k, C.alpha, C.fillAlpha);
  }
}
