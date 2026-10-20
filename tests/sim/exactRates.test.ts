import { describe, expect, it } from 'vitest';
import { ammoDef } from '../../src/data/ammo';
import { TICK_RATE } from '../../src/data/config';
import { TALENT_START } from '../../src/data/talents';
import type { SimState } from '../../src/sim/state';
import { arena, fireAt, PLAYER_AT, run } from './fight';

// Exact fire rates (039, Q13): each entrance's and the carried round's cooldown is
// fractional. It counts down 1 a tick, a round fires when it reaches 0 or less, and the
// interval TICK_RATE / fire rate is added to it; a cooldown that didn't fire never banks
// below 0. With no bonus every interval is whole, so timing is tick for tick as before
// (pinned in pinned039.test.ts).

const taking = (s: SimState, ...ids: string[]): SimState => {
  s.talents = [TALENT_START, ...ids];
  return s;
};

const FAR = { x: PLAYER_AT.x + 1000, y: PLAYER_AT.y };

/** Ticks (from 1) a carried `item` leaves the tube over `ticks` of held fire. */
function carried(s: SimState, item: string, slot: string, ticks: number): number[] {
  s.inventory = { [item]: 9999 };
  run(s, 1, { selectAmmo: slot });
  const out: number[] = [];
  for (let t = 1; t <= ticks; t++) {
    run(s, 1, fireAt(FAR.x, FAR.y));
    if (s.events.shots.length > 0) out.push(t);
  }
  return out;
}

/** Ticks an entrance fed with `ammoId` fires over `ticks` of held fire. */
function fed(s: SimState, ammoId: string, ticks: number): number[] {
  s.link.attuned = true;
  const e = s.link.entrances[1];
  if (!e) throw new Error('no entrance');
  Object.assign(e, { open: true, ammoId, count: 9999 });
  const out: number[] = [];
  for (let t = 1; t <= ticks; t++) {
    run(s, 1, fireAt(FAR.x, FAR.y));
    if (s.events.entranceFires.length > 0) out.push(t);
  }
  return out;
}

describe('exact fire rates (039)', () => {
  it('Quick Nock: 1100 ticks of held fire loose 80 arrows (4.4/s for 18.3 s), not 4.29/s', () => {
    const shots = carried(taking(arena(), 'a2'), 'arrow', 'arrow', 1100);
    expect(Math.abs(shots.length - 80)).toBeLessThanOrEqual(1);
    // Intervals of 13 and 14 ticks, averaging 15 / 1.1.
    const gaps = shots.slice(1).map((t, i) => t - (shots[i] ?? 0));
    expect(new Set(gaps)).toEqual(new Set([13, 14]));
    expect(((shots.at(-1) ?? 0) - (shots[0] ?? 0)) / (shots.length - 1)).toBeCloseTo(15 / 1.1, 1);
  });

  it('Oiled Breech: a fed entrance’s ley bolts fire 3.24/s, not 3.16/s', () => {
    const shots = fed(taking(arena(), 't1'), 'ley-bolt', 1500);
    const perSecond = ((shots.length - 1) * TICK_RATE) / ((shots.at(-1) ?? 0) - (shots[0] ?? 0));
    expect(perSecond).toBeCloseTo(3.24, 2);
  });

  it('with no bonus every interval is whole: a cooldown lands on 0 and the shot comes on its tick', () => {
    const s = arena();
    carried(s, 'arrow', 'arrow', 1);
    expect(s.tube.fireCooldown).toBe(ammoDef('arrow').fireTicks);
  });

  it('a cooldown that didn’t fire never banks below 0: released fire, then a press, paces from the press', () => {
    const s = taking(arena(), 'a2');
    s.inventory = { arrow: 99 };
    run(s, 1, { selectAmmo: 'arrow' });
    run(s, 1, fireAt(FAR.x, FAR.y));
    run(s, 200);
    expect(s.tube.fireCooldown).toBe(0);
    const ticks: number[] = [];
    for (let t = 1; t <= 30; t++) {
      run(s, 1, fireAt(FAR.x, FAR.y));
      if (s.events.shots.length > 0) ticks.push(t);
    }
    expect(ticks.slice(0, 2)).toEqual([1, 15]);
    expect(s.link.entrances.every((e) => e.cooldown >= 0)).toBe(true);
  });
});
