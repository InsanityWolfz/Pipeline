import { describe, expect, it } from 'vitest';
import { LIGHTNING } from '../../src/data/tags';
import { TALENT_START } from '../../src/data/talents';
import { createArrow } from '../../src/sim/arrows';
import { chainRangeOf, chainsOf } from '../../src/sim/lightning';
import { arena, fireAt, hold, PLAYER_AT, run, runUntil } from './fight';
import { still } from './fireKit';

// Lightning's two payoffs (064): the Ley lane's "Lightning: +1 chain" (l4, StatId chains) and "Lightning: +1 tile chain
// range" (l5, StatId chain-range). Neither touches a Burst's radius.

const LEY = [TALENT_START, 'l1', 'l2', 'l3'];

describe('the Lightning talents', () => {
  it('read through resolveStat: 2 arcs and 96 px bare, 3 arcs with l4, 128 px with l5', () => {
    const s = arena();
    expect([chainsOf(s), chainRangeOf(s)]).toEqual([LIGHTNING.chains, LIGHTNING.chainRange]);
    s.talents = [...LEY, 'l4'];
    expect(chainsOf(s)).toBe(3);
    s.talents = [...LEY, 'l5'];
    expect(chainRangeOf(s)).toBe(128);
  });

  it('+1 chain: a line of four takes three arcs', () => {
    const s = arena();
    s.talents = [...LEY, 'l4'];
    const line = [0, 1, 2, 3].map((i) => still(s, PLAYER_AT.x + 60, PLAYER_AT.y + i * 70));
    s.arrows.push(createArrow(s.nextArrowId++, 'arrow+lightning', s.roomId, PLAYER_AT.x + 10, PLAYER_AT.y, 1, 0));
    runUntil(s, () => s.events.arcs.length > 0, 30);
    expect(s.events.arcs.map((a) => a.to)).toEqual(line.slice(1).map((e) => e.id));
  });

  it('+1 tile chain range: an arc reaches 120 px, and a Lightning bomb’s Burst is no wider', () => {
    const s = arena();
    s.talents = [...LEY, 'l5'];
    still(s, PLAYER_AT.x + 60, PLAYER_AT.y);
    const far = still(s, PLAYER_AT.x + 60, PLAYER_AT.y + 120);
    s.arrows.push(createArrow(s.nextArrowId++, 'arrow+lightning', s.roomId, PLAYER_AT.x + 10, PLAYER_AT.y, 1, 0));
    runUntil(s, () => s.events.arcs.length > 0, 30);
    expect(s.events.arcs.map((a) => a.to)).toEqual([far.id]);

    const radius = (talents: string[]) => {
      const b = arena();
      b.talents = talents;
      b.inventory = { 'bomb+lightning': 2 };
      hold(b, 'bomb');
      run(b, 1, fireAt(PLAYER_AT.x + 100, PLAYER_AT.y));
      runUntil(b, () => b.events.bursts.length > 0, 60);
      return b.events.bursts[0]?.radius;
    };
    expect(radius([...LEY, 'l5'])).toBe(radius([TALENT_START]));
  });
});
