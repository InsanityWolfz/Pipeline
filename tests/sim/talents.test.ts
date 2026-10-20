import { describe, expect, it } from 'vitest';
import { TALENT_START } from '../../src/data/talents';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { MAX_HEALTH } from '../../src/data/player';
import { canTake } from '../../src/sim/talents';
import { gainXp } from '../../src/sim/leveling';
import { playerStats } from '../../src/sim/stats';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { arena, run } from './fight';
import { foundry } from './foundryKit';

// The tree (037): a node can be taken with a point when it isn't taken and links to a
// taken one; points can be spent anywhere; respec is free, but only in the foundry.

/** A sim with `points` unspent points (levels gained the honest way). */
function withPoints(s: SimState, points: number): SimState {
  const curve = [40, 70, 100, 130, 160, 200, 240, 280, 330, 380, 440, 500, 570, 650];
  gainXp(s, curve.slice(0, points).reduce((n, x) => n + x, 0), 'kill');
  expect(s.talentPoints).toBe(points);
  return s;
}

describe('taking a talent', () => {
  it('the centre start is always taken and cost nothing', () => {
    const s = arena();
    expect(s.talents).toEqual([TALENT_START]);
    expect(canTake(s, TALENT_START)).toBe(false);
  });

  it('needs a point', () => {
    const s = arena();
    expect(canTake(s, 'a1')).toBe(false);
    run(s, 1, { takeTalent: 'a1' });
    expect(s.talents).toEqual([TALENT_START]);
    expect(s.events.talents).toEqual([]);
  });

  it('takes a node linked to a taken one, spending a point and recording it, anywhere (here mid-trip)', () => {
    const s = withPoints(arena(), 2);
    expect(canTake(s, 'a1')).toBe(true);
    run(s, 1, { takeTalent: 'a1' });
    expect(s.talents).toEqual([TALENT_START, 'a1']);
    expect(s.talentPoints).toBe(1);
    expect(s.events.talents).toEqual([{ id: 'a1' }]);
    expect(summarize(s).talents).toEqual([TALENT_START, 'a1']);
  });

  it('refuses a node with no taken neighbour, one already taken, and an unknown id', () => {
    const s = withPoints(arena(), 3);
    for (const id of ['a2', 'k1', 's4', 'nope']) {
      run(s, 1, { takeTalent: id });
      expect(s.talents, id).toEqual([TALENT_START]);
    }
    run(s, 1, { takeTalent: 'a1' });
    run(s, 1, { takeTalent: 'a1' });
    expect(s.talents).toEqual([TALENT_START, 'a1']);
    expect(s.talentPoints).toBe(2);
    run(s, 1, { takeTalent: 'a2' });
    expect(s.talents).toEqual([TALENT_START, 'a1', 'a2']);
  });

  it('reaches a keystone from either of its lanes', () => {
    const s = withPoints(arena(), 7);
    for (const id of ['b1', 'b2', 'b3', 'k1']) run(s, 1, { takeTalent: id });
    expect(s.talents).toEqual([TALENT_START, 'b1', 'b2', 'b3', 'k1']);
    // Blastfletch links on to Rimecraft, so the Arrows lane can be taken from its tip.
    expect(canTake(s, 'a3')).toBe(true);
  });
});

describe('respec', () => {
  it('in the foundry clears every talent but the start and returns every point, free, with an event', () => {
    const s = withPoints(foundry(), 4);
    for (const id of ['s1', 's2', 't1']) run(s, 1, { takeTalent: id });
    expect(s.talentPoints).toBe(1);
    run(s, 1, { respec: true });
    expect(s.talents).toEqual([TALENT_START]);
    expect(s.talentPoints).toBe(4);
    expect(s.events.respecs).toEqual([{ refunded: 3 }]);
  });

  it('does nothing outside the foundry', () => {
    const s = withPoints(arena(), 2);
    run(s, 1, { takeTalent: 'a1' });
    run(s, 1, { respec: true });
    expect(s.talents).toEqual([TALENT_START, 'a1']);
    expect(s.events.respecs).toEqual([]);
  });

  it('clamps health to a lower max (Tough Hide taken back); taking it never heals', () => {
    const s = withPoints(foundry(), 1);
    s.player.health = 90;
    run(s, 1, { takeTalent: 's1' });
    expect(playerStats(s).maxHealth).toBe(MAX_HEALTH + 15);
    // The foundry's fill tops it up; taking the node alone didn't.
    expect(s.player.health).toBeLessThan(MAX_HEALTH + 15);
    run(s, 120);
    expect(s.player.health).toBe(MAX_HEALTH + 15);
    run(s, 1, { respec: true });
    expect(s.roomId).toBe(FOUNDRY_ROOM);
    expect(s.player.health).toBe(MAX_HEALTH);
  });
});
