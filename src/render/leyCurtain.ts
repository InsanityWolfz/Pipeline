import type { GameObjects } from 'phaser';
import { HOLLOWS_LOOK } from '../data/hollowsAssets';
import { colorOf } from './color';

// The ley barrier's curtain (034), shared by the Hollows barrier over the cliff gap and the
// Sunken Forum's seal across its way in (043): a translucent cyan wall standing up from
// its base line, its rim and ripples shimmering; `k` > 0 while it collapses (it flashes,
// shards fall and it fades).

const B = HOLLOWS_LOOK.barrier;

/** The curtain's box, world px: its left and right, its top (with its standing height) and its base. */
export interface CurtainBox {
  x0: number;
  x1: number;
  top: number;
  bottom: number;
}

/** Draws a curtain into `g` (cleared by the caller) at `alpha`, `timeMs` on the shimmer clock, `k` its collapse 0..1 (0: standing). */
export function drawCurtain(g: GameObjects.Graphics, box: CurtainBox, timeMs: number, k: number, alpha: number): void {
  const color = colorOf(B.color);
  const shimmer = (Math.sin((timeMs / B.shimmerMs) * Math.PI * 2) + 1) / 2;
  const { x0, x1, top, bottom } = box;
  const w = x1 - x0;
  g.fillStyle(color, B.fill * alpha * (1 - B.shimmerDip + B.shimmerDip * shimmer)).fillRect(x0, top, w, bottom - top);
  if (k > 0) g.fillStyle(colorOf(B.glow), B.flash * Math.max(0, 1 - k * B.flashFade)).fillRect(x0, top, w, bottom - top);
  g.lineStyle(B.rimWidth, color, B.rim * alpha).strokeRect(x0, top, w, bottom - top);
  // Ripples climbing the curtain; while it collapses, shards of it fall.
  for (let i = 0; i < B.ripples; i++) {
    const f = ((timeMs / B.shimmerMs + i / B.ripples) % 1 + 1) % 1;
    const R = B.ripple;
    const y = bottom - f * (bottom - top) + (k > 0 ? k * k * B.shardFall * ((i % 2) + 1) : 0);
    g.lineStyle(R.width, colorOf(B.glow), (R.alpha - R.fade * f) * alpha).lineBetween(x0 + R.inset, y, x1 - R.inset, y - R.slant);
  }
}
