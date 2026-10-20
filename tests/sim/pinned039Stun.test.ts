import { describe, expect, it } from 'vitest';
import { ROLLBREAKER } from '../../src/data/relics';
import { TALENT_START } from '../../src/data/talents';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { piece, wear } from '../fixtures/gear';
import { arena, fireAt, HALL, hold, movePlayer, placeHusk, PLAYER_AT, run, runUntil } from './fight';

// 039 pins, beside pinned039.test.ts: the Stun's two sources and the landmine's timing,
// taken from the code before the keyword refactor (fd75ac9) and held after it.

/** A Charger run into the rocks south of it (charger.test.ts's), on the tick the wall dazes it. */
function dazedCharger(s: SimState): EnemyState {
  const rocks = { charger: tileCentre({ tx: 70, ty: 26 }), before: tileCentre({ tx: 70, ty: 31 }) };
  const e = createEnemy(s.nextEnemyId++, 'charger', rocks.charger, HALL);
  s.enemies.push(e);
  movePlayer(s, rocks.before.x, rocks.before.y);
  run(s, 1);
  movePlayer(s, rocks.before.x + 3 * 32, rocks.before.y);
  runUntil(s, () => e.mode === 'stun', 200);
  return e;
}

/** Each mode change (tick + mode) and each move (tick + 'm') over the next `ticks`, from 1. */
function trace(s: SimState, e: EnemyState, ticks: number, c = {}): string {
  const out: string[] = [];
  for (let t = 1, [x, y, mode] = [e.x, e.y, e.mode]; t <= ticks; t++, [x, y, mode] = [e.x, e.y, e.mode]) {
    run(s, 1, c);
    if (e.mode !== mode) out.push(`${t}${e.mode}`);
    if (e.x !== x || e.y !== y) out.push(`${t}m`);
  }
  return out.slice(0, 3).join(' ');
}

const BREAKER = piece(0, 'boots', { rarity: 'relic', relic: ROLLBREAKER.id, baseArmor: 0, name: ROLLBREAKER.id });

describe('039 pins: Stun (the wall daze and Rollbreaker keep their own timing, 039.6)', () => {
  it('a wall daze holds 60 ticks; on the 60th the Charger thinks and moves', () => {
    const s = arena();
    const e = dazedCharger(s);
    movePlayer(s, e.x + 300, e.y - 250);
    expect(trace(s, e, 70)).toBe('60return 60m 61m');
  });

  it('a freeze pauses a wall daze', () => {
    const s = arena();
    const e = dazedCharger(s);
    e.frozen = 30;
    expect(trace(s, e, 120)).toMatch(/^90chase/);
    const t = arena();
    const late = dazedCharger(t);
    run(t, 9);
    late.frozen = 30;
    expect(trace(t, late, 120)).toMatch(/^81chase/);
  });

  it('Rollbreaker holds a Husk 40 ticks from the roll, frozen or not; it moves the tick after', () => {
    const s = wear(arena(), BREAKER);
    const husk = placeHusk(s, PLAYER_AT.x + 20, PLAYER_AT.y);
    run(s, 2);
    run(s, 1, { moveX: 1, dodge: true });
    expect(husk.mode).toBe('recover');
    expect(trace(s, husk, 60)).toBe('39chase 40m 41m');
    const f = wear(arena(), BREAKER);
    const frozen = placeHusk(f, PLAYER_AT.x + 20, PLAYER_AT.y);
    run(f, 2);
    run(f, 1, { moveX: 1, dodge: true });
    frozen.frozen = 20;
    expect(trace(f, frozen, 60)).toMatch(/^39chase/);
  });

  it('Rollbreaker on a dazed Charger: the longer of the two, then a roll’s Stun (a freeze doesn’t pause it)', () => {
    const left = (wait: number): string => {
      const s = wear(arena(), BREAKER);
      const e = dazedCharger(s);
      run(s, wait);
      movePlayer(s, e.x - 20, e.y);
      run(s, 1, { moveX: 1, dodge: true });
      e.frozen = 10;
      return trace(s, e, 80).split(' ')[0] ?? '';
    };
    expect(left(5)).toBe('53chase');
    expect(left(30)).toBe('39chase');
  });

  it('a landmine arms 40 ticks after it leaves the tube and bursts 300 after that, Swift Arc or not', () => {
    for (const talent of [[], ['b3']]) {
      const s = arena();
      s.talents = [TALENT_START, ...talent];
      s.inventory = { landmine: 2 };
      hold(s, 'landmine');
      run(s, 1, fireAt(PLAYER_AT.x + 137, PLAYER_AT.y + 41));
      expect(runUntil(s, () => s.events.mineArms.length > 0, 200)).toBe(40);
      expect(runUntil(s, () => s.events.mineBursts.length > 0, 600)).toBe(300);
      expect(s.events.mineBursts[0]).toMatchObject({ x: 2713, y: 921, radius: 24 });
    }
  });
});
