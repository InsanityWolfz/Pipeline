import { describe, expect, it } from 'vitest';
import { ACCEL_TICKS, WALK_SPEED } from '../../src/data/player';
import { TICK_RATE } from '../../src/data/config';
import { stepPlayer } from '../../src/sim/movement';
import { createSim } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { cmd, openRoom, playerIn, run } from './helpers';

const TOP = WALK_SPEED / TICK_RATE;
const speed = (p: { vx: number; vy: number }) => Math.hypot(p.vx, p.vy);

describe('walking', () => {
  it('has the same top speed on diagonals as straight', () => {
    const room = openRoom();
    const straight = playerIn(room);
    const diagonal = playerIn(room);
    run(straight, room, cmd(1, 0), 20);
    run(diagonal, room, cmd(1, 1), 20);
    expect(speed(straight)).toBeCloseTo(TOP, 6);
    expect(speed(diagonal)).toBeCloseTo(TOP, 6);
  });

  it('reaches top speed in about ACCEL_TICKS ticks, not sooner', () => {
    const room = openRoom();
    const p = playerIn(room);
    let ticks = 0;
    while (speed(p) < TOP - 1e-9 && ticks < 100) {
      stepPlayer(p, room, cmd(1, 0));
      ticks++;
    }
    expect(ticks).toBeGreaterThanOrEqual(ACCEL_TICKS - 1);
    expect(ticks).toBeLessThanOrEqual(ACCEL_TICKS + 1);
  });

  it('comes to rest in about ACCEL_TICKS ticks after input stops', () => {
    const room = openRoom();
    const p = playerIn(room);
    run(p, room, cmd(0, 1), 20);
    let ticks = 0;
    while (speed(p) > 0 && ticks < 100) {
      stepPlayer(p, room, cmd());
      ticks++;
    }
    expect(ticks).toBeGreaterThanOrEqual(ACCEL_TICKS - 1);
    expect(ticks).toBeLessThanOrEqual(ACCEL_TICKS + 1);
  });

  it('moves in the input direction', () => {
    const room = openRoom();
    const p = playerIn(room);
    const { x, y } = p;
    run(p, room, cmd(-1, -1), 10);
    expect(p.x).toBeLessThan(x);
    expect(p.y).toBeLessThan(y);
    expect(x - p.x).toBeCloseTo(y - p.y, 6);
  });
});

describe('facing', () => {
  it('starts down, follows the last move and is kept when input stops', () => {
    const room = openRoom();
    const p = playerIn(room);
    expect(p.facing).toBe('down');
    run(p, room, cmd(0, -1), 1);
    expect(p.facing).toBe('up');
    run(p, room, cmd(-1, 0), 1);
    expect(p.facing).toBe('left');
    run(p, room, cmd(), 10);
    expect(p.facing).toBe('left');
  });

  it('snaps diagonals to the horizontal direction', () => {
    const room = openRoom();
    const p = playerIn(room);
    run(p, room, cmd(1, -1), 1);
    expect(p.facing).toBe('right');
  });
});

describe('sim with movement', () => {
  const script = (i: number) => cmd(i % 50 < 25 ? 1 : -1, i % 70 < 30 ? 1 : 0, i % 40 === 0);

  function played(ticks: number) {
    const sim = createSim(7);
    for (let i = 0; i < ticks; i++) stepSim(sim, script(i));
    return sim;
  }

  it('gives identical state for the same commands', () => {
    expect(played(500)).toEqual(played(500));
  });

  it('round-trips through JSON unchanged', () => {
    const sim = played(123);
    expect(JSON.parse(JSON.stringify(sim))).toEqual(sim);
  });
});
