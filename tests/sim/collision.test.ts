import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../../src/data/config';
import { FEET_BOX, ROLL_TICKS, WALK_SPEED } from '../../src/data/player';
import { TICK_RATE } from '../../src/data/config';
import { DEFAULT_ROOM, ROOMS } from '../../src/data/rooms';
import { boxHitsSolid } from '../../src/sim/collision';
import type { Axis } from '../../src/sim/input';
import { isRolling, stepPlayer } from '../../src/sim/movement';
import { createRng, nextFloat, nextInt } from '../../src/sim/rng';
import { cmd, openRoom, playerIn, run } from './helpers';

const TOP = WALK_SPEED / TICK_RATE;

describe('collision', () => {
  it('stops flush against a wall', () => {
    const room = openRoom(10, 10);
    const p = playerIn(room);
    run(p, room, cmd(1, 0), 200);
    // Right wall's left edge is at tile 9.
    expect(p.x + FEET_BOX.w / 2).toBe(9 * TILE_SIZE);
    expect(p.vx).toBe(0);
    expect(boxHitsSolid(room, p.x, p.y, FEET_BOX)).toBe(false);
  });

  it('stops flush against the top wall', () => {
    const room = openRoom(10, 10);
    const p = playerIn(room);
    run(p, room, cmd(0, -1), 200);
    expect(p.y - FEET_BOX.h / 2).toBe(TILE_SIZE);
  });

  it('slides along a wall when moving diagonally into it', () => {
    const room = openRoom(30, 10);
    const p = playerIn(room);
    run(p, room, cmd(0, 1), 100);
    const y = p.y;
    const x = p.x;
    run(p, room, cmd(1, 1), 30);
    expect(p.y).toBe(y);
    expect(p.vy).toBe(0);
    // The blocked axis is dropped, so x keeps the diagonal's x share of top speed.
    expect(p.vx).toBeCloseTo(TOP * Math.SQRT1_2, 1);
    expect(p.x).toBeGreaterThan(x);
  });

  it('stops a roll at a ruin block and still ends it on time', () => {
    // Block one tile right of spawn (spawn is tile 15,15).
    const row = `#${'.'.repeat(15)}B${'.'.repeat(12)}#`;
    const room = openRoom(30, 30, { 15: row });
    const p = playerIn(room);
    stepPlayer(p, room, cmd(1, 0, true));
    run(p, room, cmd(), ROLL_TICKS - 1);
    expect(p.x + FEET_BOX.w / 2).toBe(16 * TILE_SIZE);
    stepPlayer(p, room, cmd());
    expect(isRolling(p)).toBe(false);
  });

  it('never overlaps a solid tile under random input in the real room', () => {
    const room = ROOMS[DEFAULT_ROOM];
    if (!room) throw new Error('no room');
    const p = playerIn(room);
    const rng = createRng(99);
    const axis = (): Axis => nextInt(rng, -1, 1) as Axis;
    let current = cmd();
    for (let i = 0; i < 2000; i++) {
      if (i % 15 === 0) current = cmd(axis(), axis());
      stepPlayer(p, room, { ...current, dodge: nextFloat(rng) < 0.05 });
      expect(boxHitsSolid(room, p.x, p.y, FEET_BOX)).toBe(false);
    }
  });
});
