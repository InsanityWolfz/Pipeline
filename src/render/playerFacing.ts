import { aimFacing } from '../sim/direction';
import type { Facing } from '../sim/player';

// Which way the player's sprite faces for the aim (016), steady near a 45° tie.

/**
 * The facing the sprite shows for an aim of (`x`, `y`) from the player: the aim's dominant axis (`aimFacing`), but it
 * keeps the axis of `shown` (the facing drawn last frame) until the other axis leads by more than `band` px, so an aim near a 45° tie doesn't
 * flip it back and forth.
 */
export function shownFacing(x: number, y: number, shown: Facing, band: number): Facing {
  const next = aimFacing(x, y, shown);
  const wasSide = shown === 'left' || shown === 'right';
  if ((next === 'left' || next === 'right') === wasSide) return next;
  const lead = wasSide ? Math.abs(y) - Math.abs(x) : Math.abs(x) - Math.abs(y);
  if (lead > band) return next;
  if (wasSide) return x > 0 ? 'right' : x < 0 ? 'left' : shown;
  return y > 0 ? 'down' : y < 0 ? 'up' : shown;
}
