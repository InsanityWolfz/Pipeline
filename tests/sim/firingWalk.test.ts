import { describe, expect, it } from 'vitest';
import { SLOT_BASE } from '../../src/data/gear';
import { bodyPiece, wear } from '../fixtures/gear';
import { FIRING_WALK_MULTIPLIER, ROLL_TICKS } from '../../src/data/player';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { firingWalkScale } from '../../src/sim/tube';
import type { Command } from '../../src/sim/input';
import type { SimState } from '../../src/sim/state';
import { arena, fireAt, PLAYER_AT, run, volleyAt } from './fight';

// 016: the tube is heavy. Walking while it fires is slower; a punch (023), the foundry and rolls aren't.

const AHEAD = { x: PLAYER_AT.x + 400, y: PLAYER_AT.y };

/** Distance walked right over `ticks`, after a run-up that reaches top speed. */
function walked(s: SimState, ticks: number, fire: boolean): number {
  const c: Partial<Command> = { moveX: 1, ...(fire ? fireAt(AHEAD.x, AHEAD.y) : {}) };
  run(s, 10, c);
  const x = s.player.x;
  run(s, ticks, c);
  return s.player.x - x;
}

describe('firing slows the walk', () => {
  it('walking while firing runs at the multiplier of walk speed', () => {
    const plain = walked(arena(), 30, false);
    const firing = walked(arena(), 30, true);
    expect(firing).toBeCloseTo(plain * FIRING_WALK_MULTIPLIER, 0);
    expect(FIRING_WALK_MULTIPLIER).toBe(0.7);
  });

  it('only while the tube really fires: not punching, not in the foundry, not rolling', () => {
    const s = arena();
    run(s, 1, fireAt(AHEAD.x, AHEAD.y));
    expect(firingWalkScale(s)).toBe(FIRING_WALK_MULTIPLIER);

    const dry = arena();
    dry.inventory = {};
    run(dry, 1, volleyAt(AHEAD.x, AHEAD.y));
    expect(dry.events.melees).toHaveLength(1);
    expect(firingWalkScale(dry)).toBe(1);
    expect(walked(dry, 30, true)).toBeCloseTo(walked(arena(), 30, false), 0);

    const home = arena();
    home.roomId = FOUNDRY_ROOM;
    run(home, 1, fireAt(AHEAD.x, AHEAD.y));
    expect(firingWalkScale(home)).toBe(1);

    const rolling = arena();
    run(rolling, 1, { ...fireAt(AHEAD.x, AHEAD.y), moveX: 1, dodge: true });
    expect(firingWalkScale(rolling)).toBe(1);
  });

  it('rolls cover the same ground while firing', () => {
    const roll = (fire: boolean) => {
      const s = arena();
      const c: Partial<Command> = { moveX: 1, ...(fire ? fireAt(AHEAD.x, AHEAD.y) : {}) };
      const x = s.player.x;
      run(s, 1, { ...c, dodge: true });
      run(s, ROLL_TICKS - 1, c);
      return s.player.x - x;
    };
    expect(roll(true)).toBeCloseTo(roll(false), 5);
  });

  it('releasing fire restores full speed on the next tick', () => {
    const s = arena();
    run(s, 10, { moveX: 1, ...fireAt(AHEAD.x, AHEAD.y) });
    run(s, 1, { moveX: 1 });
    expect(firingWalkScale(s)).toBe(1);
  });

  it('stacks with heavy armor by multiplying', () => {
    const heavy = (): SimState => {
      return wear(arena(), bodyPiece(0, 'heavy', 11));
    };
    const plain = walked(arena(), 30, false);
    expect(walked(heavy(), 30, true)).toBeCloseTo(plain * SLOT_BASE.body.heavy.walkScale * FIRING_WALK_MULTIPLIER, 0);
  });
});
