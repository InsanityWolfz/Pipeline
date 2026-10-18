import { describe, expect, it } from 'vitest';
import { straightAmmo } from '../../src/data/ammo';
import { TILE_SIZE, TICK_RATE } from '../../src/data/config';
import { LOAD_TICKS, MUZZLE_OFFSET, TUBE_CAPACITY } from '../../src/data/tube';
import { createArrow, stepArrows, type ArrowState } from '../../src/sim/arrows';
import { NO_COMMAND } from '../../src/sim/input';
import { createSim } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { summarize } from '../../src/sim/summary';
import { openRoom } from './helpers';

const ARROW = straightAmmo('arrow');
const STEP = ARROW.speed / TICK_RATE;

/** An arrow flying from the centre of tile (tx, ty). */
function arrowAt(tx: number, ty: number, dx: number, dy: number): ArrowState {
  return createArrow(0, 'arrow', 'test', (tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE, dx, dy);
}

function ticksToRemove(arrows: ArrowState[], room = openRoom(), limit = 200): number {
  for (let t = 1; t <= limit; t++) {
    stepArrows(arrows, () => room);
    if (arrows.length === 0) return t;
  }
  return -1;
}

describe('arrows', () => {
  it('spawn at the muzzle and fly at the ammo speed with its damage', () => {
    const s = createSim(3);
    stepSim(s, { ...NO_COMMAND, load: true });
    for (let i = 0; i < LOAD_TICKS * TUBE_CAPACITY; i++) stepSim(s);
    const { x, y } = s.player;
    stepSim(s, { ...NO_COMMAND, fire: true, aimX: x, aimY: y + 200 });
    const arrow = s.arrows[0];
    expect(arrow).toMatchObject({ ammoId: 'arrow', damage: 10, damageType: 'physical', travelled: 0 });
    expect(arrow?.x).toBeCloseTo(x);
    expect(arrow?.y).toBeCloseTo(y + MUZZLE_OFFSET);
    stepSim(s);
    expect(s.arrows[0]?.y).toBeCloseTo(y + MUZZLE_OFFSET + STEP);
    expect(STEP).toBe(8);
    expect(summarize(s).arrows).toHaveLength(1);
  });

  it('vanish after flying their range', () => {
    const arrows = [arrowAt(2, 15, 1, 0)];
    const room = openRoom(60, 30);
    expect(ticksToRemove(arrows, room)).toBe(ARROW.range / STEP);
  });

  it('stop at walls', () => {
    // From the centre of tile 3, the wall at tile 0 is 2.5 tiles (80 px) away.
    expect(ticksToRemove([arrowAt(3, 10, -1, 0)])).toBe(Math.ceil((2.5 * TILE_SIZE + 0.01) / STEP));
  });

  it('stop at ruin blocks', () => {
    const room = openRoom(30, 30, { 10: `#${'.'.repeat(9)}B${'.'.repeat(18)}#` });
    // The block's left edge is 6.5 tiles from the centre of tile 3.
    const ticks = ticksToRemove([arrowAt(3, 10, 1, 0)], room);
    expect(ticks).toBe(Math.ceil((6.5 * TILE_SIZE) / STEP));
  });

  it('spawned inside a wall vanish on their first tick', () => {
    expect(ticksToRemove([arrowAt(0, 10, 1, 0)])).toBe(1);
  });

  it('keep flying on open floor', () => {
    const arrows = [arrowAt(10, 10, 0, 1)];
    stepArrows(arrows, () => openRoom());
    expect(arrows).toHaveLength(1);
    expect(arrows[0]?.travelled).toBe(STEP);
  });
});
