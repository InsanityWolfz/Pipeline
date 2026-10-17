import { describe, expect, it } from 'vitest';
import { INVULN_TICKS, ROLL_COOLDOWN_TICKS, ROLL_DISTANCE, ROLL_TICKS } from '../../src/data/player';
import { isInvulnerable, isRolling, stepPlayer } from '../../src/sim/movement';
import { cmd, openRoom, playerIn, run } from './helpers';

describe('roll', () => {
  it('covers ROLL_DISTANCE over ROLL_TICKS in the move direction', () => {
    const room = openRoom();
    const p = playerIn(room);
    const { x, y } = p;
    stepPlayer(p, room, cmd(1, 0, true));
    run(p, room, cmd(1, 0), ROLL_TICKS - 1);
    expect(isRolling(p)).toBe(true);
    expect(p.x - x).toBeCloseTo(ROLL_DISTANCE, 1);
    expect(p.y).toBe(y);
    stepPlayer(p, room, cmd());
    expect(isRolling(p)).toBe(false);
  });

  it('rolls diagonally at the same distance', () => {
    const room = openRoom();
    const p = playerIn(room);
    const { x, y } = p;
    stepPlayer(p, room, cmd(-1, 1, true));
    run(p, room, cmd(), ROLL_TICKS - 1);
    expect(Math.hypot(p.x - x, p.y - y)).toBeCloseTo(ROLL_DISTANCE, 1);
  });

  it('rolls the facing direction when standing still', () => {
    const room = openRoom();
    const p = playerIn(room);
    run(p, room, cmd(0, -1), 1);
    run(p, room, cmd(), 20);
    const { x, y } = p;
    stepPlayer(p, room, cmd(0, 0, true));
    run(p, room, cmd(), ROLL_TICKS - 1);
    expect(p.x).toBeCloseTo(x, 6);
    expect(y - p.y).toBeCloseTo(ROLL_DISTANCE, 1);
  });

  it('starts facing down, so a first still roll goes down', () => {
    const room = openRoom();
    const p = playerIn(room);
    const { y } = p;
    stepPlayer(p, room, cmd(0, 0, true));
    expect(p.y).toBeGreaterThan(y);
  });

  it("can't be steered once started", () => {
    const room = openRoom();
    const p = playerIn(room);
    const { y } = p;
    stepPlayer(p, room, cmd(1, 0, true));
    run(p, room, cmd(0, 1), ROLL_TICKS - 1);
    expect(p.y).toBe(y);
    expect(p.facing).toBe('right');
  });

  it('is invulnerable on the first INVULN_TICKS ticks only', () => {
    const room = openRoom();
    const p = playerIn(room);
    const seen: boolean[] = [];
    for (let i = 0; i < ROLL_TICKS; i++) {
      stepPlayer(p, room, cmd(1, 0, i === 0));
      seen.push(isInvulnerable(p));
    }
    expect(seen).toEqual(Array.from({ length: ROLL_TICKS }, (_, i) => i < INVULN_TICKS));
    stepPlayer(p, room, cmd());
    expect(isInvulnerable(p)).toBe(false);
  });

  it('ignores presses during the roll and the cooldown, without buffering', () => {
    const room = openRoom(60, 30);
    const p = playerIn(room);
    stepPlayer(p, room, cmd(1, 0, true));
    // Press every tick through the roll and the whole cooldown.
    for (let i = 1; i < ROLL_TICKS + ROLL_COOLDOWN_TICKS; i++) {
      stepPlayer(p, room, cmd(1, 0, true));
      if (i >= ROLL_TICKS) expect(isRolling(p)).toBe(false);
    }
    // No press now: nothing was buffered.
    stepPlayer(p, room, cmd(1, 0));
    expect(isRolling(p)).toBe(false);
    stepPlayer(p, room, cmd(1, 0, true));
    expect(isRolling(p)).toBe(true);
  });

  it('allows the next roll exactly ROLL_COOLDOWN_TICKS ticks after the roll ends', () => {
    const room = openRoom(60, 30);
    const p = playerIn(room);
    stepPlayer(p, room, cmd(1, 0, true));
    run(p, room, cmd(), ROLL_TICKS - 1);
    run(p, room, cmd(), ROLL_COOLDOWN_TICKS);
    expect(p.cooldown).toBe(0);
    stepPlayer(p, room, cmd(0, 0, true));
    expect(isRolling(p)).toBe(true);
  });
});
