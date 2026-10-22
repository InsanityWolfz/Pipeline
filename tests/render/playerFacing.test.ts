import { describe, expect, it } from 'vitest';
import { WANDERER_FEEL } from '../../src/data/art/wanderer';
import { aimFacing } from '../../src/sim/direction';
import type { Facing } from '../../src/sim/player';
import { shownFacing } from '../../src/render/playerFacing';

const BAND = WANDERER_FEEL.facingBand;

describe('the player sprite facing (fix: diagonal flicker)', () => {
  it('stays put while the aim swings across the 45° tie by a tick or two of walking', () => {
    // Walking up-right with the cursor on the down-right diagonal: the aim leads on x, then on y, by ~2.8 px a frame.
    const aims: [number, number][] = [
      [60, 58.6],
      [58.6, 60],
      [60, 57.2],
      [57.2, 60],
      [60, 60],
    ];
    let shown: Facing = 'right';
    const seen = aims.map(([x, y]) => (shown = shownFacing(x, y, shown, BAND)));
    expect(seen).toEqual(['right', 'right', 'right', 'right', 'right']);
    // The bare pick alternated: that was the flicker.
    expect(aims.map(([x, y]) => aimFacing(x, y, 'right'))).toEqual(['right', 'down', 'right', 'down', 'right']);
  });

  it('holds a vertical facing the same way', () => {
    expect(shownFacing(60, 58, 'down', BAND)).toBe('down');
    expect(shownFacing(-60, -57, 'up', BAND)).toBe('up');
  });

  it('turns once the other axis clearly leads', () => {
    expect(shownFacing(60, 60 + BAND + 0.5, 'right', BAND)).toBe('down');
    expect(shownFacing(-(60 + BAND + 0.5), 60, 'down', BAND)).toBe('left');
  });

  it('matches the plain pick away from the tie, and zero keeps the facing', () => {
    const aims: [number, number][] = [
      [40, 5],
      [-40, 5],
      [5, 40],
      [5, -40],
    ];
    for (const [x, y] of aims) for (const f of ['up', 'down', 'left', 'right'] as Facing[]) expect(shownFacing(x, y, f, BAND)).toBe(aimFacing(x, y, f));
    expect(shownFacing(0, 0, 'up', BAND)).toBe('up');
  });

  it('keeps the axis but follows the aim across it near the tie', () => {
    expect(shownFacing(-60, 59, 'right', BAND)).toBe('left');
    expect(shownFacing(59, -60, 'down', BAND)).toBe('up');
  });
});
