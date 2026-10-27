import { describe, expect, it } from 'vitest';
import { TICK_RATE } from '../../src/data/config';
import { INTAKE, INTAKE_RATE } from '../../src/data/foundry';
import { fireRate } from '../../src/sim/emissions';
import { entranceRates, stepIntakeRates } from '../../src/sim/intakeRates';
import type { HopperState } from '../../src/sim/pieces';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { run } from './fight';
import { foundry, put } from './foundryKit';

// 069: the intake's hover shows each open entrance's supply rate in, measured over the last few seconds (a window of
// whole seconds, INTAKE_RATE), and its fire rate: the round's own shots a second with the player's talents and gear
// (069.1: the tube is quiet in the foundry, where the hover shows, so a measured fire rate would always read 0 there).

const MIDDLE = INTAKE.entrances.findIndex((e) => e.startsOpen);
const W = INTAKE_RATE.windowSeconds;

/** Runs the rate step alone for `ticks` ticks, an entrance taking a round on every tick `feeds` says. */
function tickRates(s: SimState, ticks: number, feeds: (tick: number) => boolean): void {
  for (let i = 0; i < ticks; i++) {
    s.tick += 1;
    s.events.refills = feeds(s.tick) ? [{ entrance: MIDDLE, itemId: 'arrow' }] : [];
    stepIntakeRates(s);
  }
}

const inRate = (s: SimState): number => entranceRates(s)[MIDDLE]?.inPerSecond ?? NaN;

describe('the intake’s supply rate (069)', () => {
  it('reads 0 in for every entrance on a fresh link', () => {
    const s = foundry();
    expect(entranceRates(s).map((r) => r.inPerSecond)).toEqual(INTAKE.entrances.map(() => 0));
  });

  it('measures a round every 30 ticks as 2/s once the window has filled', () => {
    const s = foundry();
    s.tick = 0;
    tickRates(s, (W + 1) * TICK_RATE, (t) => t % 30 === 0);
    expect(inRate(s)).toBe(2);
  });

  it('changes only as a whole second ends, and falls to 0 a window after the line stops', () => {
    const s = foundry();
    s.tick = 0;
    tickRates(s, (W + 1) * TICK_RATE, (t) => t % 15 === 0);
    expect(inRate(s)).toBe(4);
    // Mid-second, the stopped line still reads as the last whole seconds did.
    tickRates(s, TICK_RATE / 2, () => false);
    expect(inRate(s)).toBe(4);
    tickRates(s, TICK_RATE / 2, () => false);
    expect(inRate(s)).toBeLessThan(4);
    tickRates(s, W * TICK_RATE, () => false);
    expect(inRate(s)).toBe(0);
  });

  it('matches the refills a running line actually made over the last whole seconds', () => {
    const s = foundry();
    const h = put<HopperState>(s, 'hopper', 12, 2, 'up');
    put(s, 'conduit', 12, 1, 'up');
    h.item = 'arrow';
    h.count = 99;
    const perSecond: number[] = [];
    let n = 0;
    for (let i = 0; i < (W + 2) * TICK_RATE; i++) {
      run(s, 1);
      n += s.events.refills.filter((r) => r.entrance === MIDDLE).length;
      if (s.tick % TICK_RATE === TICK_RATE - 1) {
        perSecond.push(n);
        n = 0;
      }
    }
    // Stop just inside the next second: the window is the last W whole seconds.
    run(s, 1);
    const expected = perSecond.slice(-W).reduce((a, b) => a + b, 0) / W;
    expect(expected).toBeGreaterThan(0);
    expect(inRate(s)).toBeCloseTo(expected, 5);
  });
});

describe('the intake’s fire rate (069.1)', () => {
  it('is the round’s own shots a second for a fed entrance, and none for an empty or capped one', () => {
    const s = foundry();
    const e = s.link.entrances[MIDDLE];
    if (!e) throw new Error('no entrance');
    expect(entranceRates(s)[MIDDLE]?.firesPerSecond).toBeNull();
    Object.assign(e, { ammoId: 'arrow', count: 12 });
    expect(entranceRates(s)[MIDDLE]?.firesPerSecond).toBeCloseTo(fireRate({ talents: s.talents, gear: s.gear, equipped: s.equipped }, 'arrow'), 5);
    const capped = entranceRates(s).find((_r, i) => !s.link.entrances[i]?.open);
    expect(capped?.firesPerSecond).toBeNull();
  });

  it('shows in getState beside each entrance’s count', () => {
    const s = foundry();
    const e = s.link.entrances[MIDDLE];
    if (!e) throw new Error('no entrance');
    Object.assign(e, { ammoId: 'arrow', count: 12 });
    const row = summarize(s).intake.entrances[MIDDLE];
    expect(row).toMatchObject({ count: 12, inPerSecond: 0 });
    expect(row?.firesPerSecond).toBeCloseTo(fireRate({ talents: s.talents, gear: s.gear, equipped: s.equipped }, 'arrow'), 5);
  });
});
