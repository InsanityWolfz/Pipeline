import type { GameObjects } from 'phaser';
import { ENEMY_FX } from '../data/assets';
import { paletteHex } from '../data/palette';

// 076: what every ground telegraph shares so it reads on any ground (Shaun: enemies and their wind-ups stay bright and
// readable in every region): a near-opaque `danger` rim round its full extent, and its fill strengthening toward the
// wind-up's peak. Each family's telegraph keeps its own shape and phases.

/** A fill's alpha `progress` (0..1) through its wind-up: its own at the start, the peak's at the end (never weaker). */
export function fillAt(fillAlpha: number, progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return fillAlpha + Math.max(0, ENEMY_FX.telegraphFillPeak - fillAlpha) * p;
}

const R = ENEMY_FX.telegraphRim;
const RIM_COLOR = Number.parseInt(paletteHex(R.color).slice(1), 16);

/** Sets the graphics' line to the telegraph rim; stroke the telegraph's full outline with it. */
export const rimStyle = (g: GameObjects.Graphics): GameObjects.Graphics => g.lineStyle(R.width, RIM_COLOR, R.alpha);
