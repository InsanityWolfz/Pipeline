import { describe, expect, it } from 'vitest';
import { advanceClock, createClock } from '../../src/sim/clock';
import { NO_COMMAND, type Command } from '../../src/sim/input';
import { createSim } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { summarize } from '../../src/sim/summary';
import { MAX_TICKS_PER_FRAME, TICK_RATE } from '../../src/data/config';

function stepped(seed: number, ticks: number) {
  const sim = createSim(seed);
  for (let i = 0; i < ticks; i++) stepSim(sim);
  return sim;
}

/** A scripted mix of walking, loading, rolling and firing at a sweeping aim. */
function scripted(seed: number, ticks: number) {
  const sim = createSim(seed);
  for (let t = 0; t < ticks; t++) {
    const command: Command = {
      ...NO_COMMAND,
      moveX: t % 90 < 45 ? 1 : -1,
      moveY: t % 70 < 20 ? 1 : 0,
      load: t % 120 === 0,
      dodge: t % 150 === 75,
      fire: t % 120 > 100,
      aimX: sim.player.x + Math.cos(t / 10) * 100,
      aimY: sim.player.y + Math.sin(t / 10) * 100,
    };
    stepSim(sim, command);
  }
  return sim;
}

/** One step toward a point: -1, 0 or 1 per axis. */
const toward = (from: number, to: number): -1 | 0 | 1 => (Math.abs(to - from) < 4 ? 0 : to > from ? 1 : -1);

/**
 * Walks into the Husk pack and stands there until KO'd, then fights the reset
 * pack from range, reloading when empty, and collects the drops.
 */
function scriptedFight(seed: number, ticks: number) {
  const sim = createSim(seed);
  for (let t = 0; t < ticks; t++) {
    const p = sim.player;
    const target = sim.enemies[0];
    const loot = sim.groundItems[0];
    const fighting = sim.nextEnemyId > 3;
    const empty = sim.tube.loaded === 0;
    const goal = !fighting ? target : target ? { x: 900, y: 300 } : loot;
    const command: Command = {
      ...NO_COMMAND,
      moveX: goal ? toward(p.x, goal.x) : 0,
      moveY: goal ? toward(p.y, goal.y) : 0,
      load: fighting && empty && !sim.tube.loading,
      fire: fighting && !empty && target !== undefined,
      aimX: target?.x ?? p.x,
      aimY: target?.y ?? p.y,
    };
    stepSim(sim, command);
  }
  return sim;
}

function ticksFor(deltas: number[]): number {
  const clock = createClock();
  return deltas.reduce((total, delta) => total + advanceClock(clock, delta), 0);
}

describe('sim state', () => {
  it('starts at tick 0 with the given seed', () => {
    const sim = createSim(5);
    expect(sim.tick).toBe(0);
    expect(sim.seed).toBe(5);
  });

  it('advances one tick per step', () => {
    expect(stepped(5, 37).tick).toBe(37);
  });

  it('is identical for the same seed and steps', () => {
    expect(stepped(11, 200)).toEqual(stepped(11, 200));
  });

  it('is identical for the same seed and a load and fire sequence', () => {
    const a = scripted(11, 600);
    expect(a.nextArrowId).toBeGreaterThan(0);
    expect(a).toEqual(scripted(11, 600));
  });

  it('replays a fight with hits, deaths, drops and a KO identically', () => {
    const a = scriptedFight(11, 3000);
    expect(a.nextEnemyId).toBe(6);
    expect(a.enemies).toEqual([]);
    expect(a.inventory['husk-resin']).toBeGreaterThanOrEqual(3);
    expect(a).toEqual(scriptedFight(11, 3000));
  });

  it('round-trips through JSON unchanged mid-fight', () => {
    const sim = scriptedFight(4, 700);
    expect(JSON.parse(JSON.stringify(sim))).toEqual(sim);
  });

  it('round-trips through JSON unchanged', () => {
    const sim = stepped(3, 10);
    expect(JSON.parse(JSON.stringify(sim))).toEqual(sim);
  });

  it('summarizes tick and seed', () => {
    expect(summarize(stepped(8, 4))).toMatchObject({ tick: 4, seed: 8 });
  });

  it('summarizes enemies, ground items and events', () => {
    const summary = summarize(createSim(8));
    expect(summary.enemies).toHaveLength(3);
    expect(summary.enemies[0]).toMatchObject({ enemyId: 'husk', mode: 'idle', health: 40, maxHealth: 40 });
    expect(summary.groundItems).toEqual([]);
    expect(summary.events).toEqual({ hits: [], deaths: [], pickups: [], ko: false });
  });
});

describe('fixed-timestep clock', () => {
  it('runs the same number of ticks however one second is split into frames', () => {
    const second = 1000;
    expect(ticksFor(Array(60).fill(second / 60))).toBe(TICK_RATE);
    expect(ticksFor(Array(20).fill(second / 20))).toBe(TICK_RATE);
    expect(ticksFor(Array(7).fill(second / 7))).toBe(TICK_RATE);
  });

  it('carries leftover time into the next frame', () => {
    const clock = createClock();
    const half = 1000 / TICK_RATE / 2;
    expect(advanceClock(clock, half)).toBe(0);
    expect(advanceClock(clock, half)).toBe(1);
  });

  it('caps the ticks run in one frame', () => {
    expect(advanceClock(createClock(), 60_000)).toBe(MAX_TICKS_PER_FRAME);
  });
});
