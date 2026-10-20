import { describe, expect, it } from 'vitest';
import { roomById } from '../../src/sim/state';
import { HALL } from './fight';
import { CAP, clearTicks, SCENARIOS } from './ammoScenarios';

// 041.9's ammo scenarios as correctness checks: the harness runs a scenario to its end,
// draws no random numbers (each seed plays out alike), and puts the room back after a
// harness-built wall. Which family wins each scenario (by at least 10% over the next, on
// seeds 1–5) is a measurement, printed by `npm run measure` (tests/measure/ammo.measure.ts),
// not a test here.

describe('the ammo scenarios (041.9)', () => {
  it('run arrows against the line of Husks to its end, alike on two seeds', () => {
    const first = clearTicks(1, SCENARIOS.line, 'arrow', CAP);
    expect(first).toBeLessThan(CAP);
    expect(clearTicks(2, SCENARIOS.line, 'arrow', CAP)).toBe(first);
  });

  it('put the room back after the walled scenario', () => {
    const before = roomById(HALL);
    clearTicks(1, SCENARIOS.walls, 'bomb', 60);
    expect(roomById(HALL)).toBe(before);
  });
});
