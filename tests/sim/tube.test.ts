import { describe, expect, it } from 'vitest';
import { DRY_FIRE_TICKS, FIRE_TICKS, LOAD_TICKS, TUBE_CAPACITY } from '../../src/data/tube';
import { STARTING_INVENTORY, ROLL_TICKS } from '../../src/data/player';
import { NO_COMMAND, type Command } from '../../src/sim/input';
import { isRolling } from '../../src/sim/movement';
import { createSim, type SimState } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { summarize } from '../../src/sim/summary';

const SEED = 7;

function sim(): SimState {
  return createSim(SEED);
}

const command = (c: Partial<Command> = {}): Command => ({ ...NO_COMMAND, ...c });

/** Fire held, aimed `dx, dy` px from the player's feet. */
function fireAt(s: SimState, dx = 100, dy = 0, extra: Partial<Command> = {}): Command {
  return command({ fire: true, aimX: s.player.x + dx, aimY: s.player.y + dy, ...extra });
}

function run(s: SimState, c: Command | ((s: SimState) => Command), ticks: number): void {
  for (let i = 0; i < ticks; i++) stepSim(s, typeof c === 'function' ? c(s) : c);
}

/** Taps load, then lets it run until the tube is full. */
function loadFull(s: SimState): void {
  stepSim(s, command({ load: true }));
  run(s, command(), LOAD_TICKS * TUBE_CAPACITY);
}

/** Steps one tick and reports whether an arrow was fired on it. */
function firedOn(s: SimState, c: Command): boolean {
  const before = s.nextArrowId;
  stepSim(s, c);
  return s.nextArrowId > before;
}

describe('inventory and loading', () => {
  it('starts with the starting arrows and an empty tube', () => {
    const s = sim();
    expect(s.inventory.arrow).toBe(STARTING_INVENTORY.arrow);
    expect(STARTING_INVENTORY.arrow).toBe(30);
    expect(summarize(s).tube).toMatchObject({ ammo: 'arrow', loaded: 0, capacity: 6, loading: false });
  });

  it('loads one round per LOAD_TICKS from one tap until full', () => {
    const s = sim();
    stepSim(s, command({ load: true }));
    expect(s.tube.loading).toBe(true);
    run(s, command(), LOAD_TICKS - 2);
    expect(s.tube.loaded).toBe(0);
    stepSim(s, command());
    expect(s.tube.loaded).toBe(1);
    expect(s.inventory.arrow).toBe(29);
    run(s, command(), LOAD_TICKS * (TUBE_CAPACITY - 1));
    expect(s.tube.loaded).toBe(TUBE_CAPACITY);
    expect(s.tube.loading).toBe(false);
    expect(s.inventory.arrow).toBe(30 - TUBE_CAPACITY);
    run(s, command(), LOAD_TICKS * 2);
    expect(s.tube.loaded).toBe(TUBE_CAPACITY);
  });

  it('stops loading when the inventory runs out', () => {
    const s = sim();
    s.inventory.arrow = 3;
    stepSim(s, command({ load: true }));
    run(s, command(), LOAD_TICKS * TUBE_CAPACITY);
    expect(s.tube.loaded).toBe(3);
    expect(s.inventory.arrow).toBe(0);
    expect(s.tube.loading).toBe(false);
  });

  it('ignores load while loading, while full and with no arrows', () => {
    const s = sim();
    stepSim(s, command({ load: true }));
    run(s, command(), 5);
    stepSim(s, command({ load: true }));
    // A second tap doesn't restart progress: the round still lands on tick LOAD_TICKS.
    expect(s.tube.loadProgress).toBe(7);
    run(s, command(), LOAD_TICKS * TUBE_CAPACITY);
    expect(s.tube.loaded).toBe(TUBE_CAPACITY);
    stepSim(s, command({ load: true }));
    expect(s.tube.loading).toBe(false);

    const empty = sim();
    empty.inventory.arrow = 0;
    stepSim(empty, command({ load: true }));
    expect(empty.tube.loading).toBe(false);
  });

  it('ignores load during a roll and does not buffer it', () => {
    const s = sim();
    stepSim(s, command({ dodge: true, moveX: 1 }));
    stepSim(s, command({ load: true }));
    expect(s.tube.loading).toBe(false);
    run(s, command(), ROLL_TICKS);
    expect(isRolling(s.player)).toBe(false);
    expect(s.tube.loading).toBe(false);
  });

  it('stops loading on fire, keeping loaded rounds and dropping partial progress', () => {
    const s = sim();
    stepSim(s, command({ load: true }));
    run(s, command(), LOAD_TICKS * 2 + 4);
    expect(s.tube.loaded).toBe(2);
    stepSim(s, fireAt(s));
    expect(s.tube.loading).toBe(false);
    expect(s.tube.loaded).toBe(1);
    expect(s.inventory.arrow).toBe(28);
    run(s, command(), LOAD_TICKS * 2);
    expect(s.tube.loaded).toBe(1);
  });

  it('stops loading when a roll starts', () => {
    const s = sim();
    stepSim(s, command({ load: true }));
    run(s, command(), LOAD_TICKS + 4);
    stepSim(s, command({ dodge: true, moveX: 1 }));
    expect(s.tube.loading).toBe(false);
    expect(s.tube.loadProgress).toBe(0);
    expect(s.tube.loaded).toBe(1);
    expect(s.inventory.arrow).toBe(29);
  });

  it('stops loading on a dry fire too', () => {
    const s = sim();
    stepSim(s, command({ load: true }));
    run(s, command(), 4);
    stepSim(s, fireAt(s));
    expect(s.tube.loading).toBe(false);
    expect(s.tube.loaded).toBe(0);
    expect(s.inventory.arrow).toBe(30);
  });
});

describe('firing', () => {
  it('fires on hold at most once per FIRE_TICKS, one round per shot', () => {
    const s = sim();
    loadFull(s);
    const shots: number[] = [];
    for (let t = 1; t <= FIRE_TICKS * 3 + 1; t++) if (firedOn(s, fireAt(s))) shots.push(t);
    expect(shots).toEqual([1, 1 + FIRE_TICKS, 1 + FIRE_TICKS * 2, 1 + FIRE_TICKS * 3]);
    expect(s.tube.loaded).toBe(TUBE_CAPACITY - 4);
  });

  it('fires one arrow from a single-tick press', () => {
    const s = sim();
    loadFull(s);
    expect(firedOn(s, fireAt(s))).toBe(true);
    run(s, command(), 30);
    expect(s.tube.loaded).toBe(TUBE_CAPACITY - 1);
    expect(s.nextArrowId).toBe(1);
  });

  it('only fires a press once the interval has passed', () => {
    const s = sim();
    loadFull(s);
    stepSim(s, fireAt(s));
    stepSim(s, command());
    expect(firedOn(s, fireAt(s))).toBe(false);
  });

  it('dry-fires on an empty tube without loading', () => {
    const s = sim();
    expect(firedOn(s, fireAt(s))).toBe(false);
    expect(summarize(s).tube.dryFire).toBe(true);
    run(s, command(), DRY_FIRE_TICKS - 1);
    expect(summarize(s).tube.dryFire).toBe(true);
    stepSim(s, command());
    expect(summarize(s).tube.dryFire).toBe(false);
    expect(s.tube.loading).toBe(false);
    expect(s.inventory.arrow).toBe(30);
  });

  it('dry-fires at most once per FIRE_TICKS while held', () => {
    const s = sim();
    const dry: number[] = [];
    for (let t = 1; t <= FIRE_TICKS * 2 + 1; t++) {
      stepSim(s, fireAt(s));
      if (s.tube.dryFire === DRY_FIRE_TICKS) dry.push(t);
    }
    expect(dry).toEqual([1, 1 + FIRE_TICKS, 1 + FIRE_TICKS * 2]);
  });

  it('never fires during a roll, then fires when it ends if still held', () => {
    const s = sim();
    loadFull(s);
    expect(firedOn(s, fireAt(s, 100, 0, { dodge: true, moveX: 1 }))).toBe(false);
    let firstShot = 0;
    for (let t = 2; t <= ROLL_TICKS + 2 && firstShot === 0; t++) {
      const rolling = isRolling(s.player);
      if (firedOn(s, fireAt(s))) firstShot = t;
      else expect(rolling || isRolling(s.player)).toBe(true);
    }
    expect(firstShot).toBe(ROLL_TICKS + 1);
    expect(s.tube.firing).toBe(true);
  });

  it('leaves walking unchanged while firing and loading', () => {
    const walker = sim();
    const shooter = sim();
    loadFull(shooter);
    loadFull(walker);
    run(walker, command({ moveX: 1, moveY: 1 }), 40);
    run(shooter, (s) => fireAt(s, -50, 20, { moveX: 1, moveY: 1, load: true }), 40);
    expect(shooter.player.x).toBe(walker.player.x);
    expect(shooter.player.y).toBe(walker.player.y);
    expect(shooter.player.vx).toBe(walker.player.vx);
  });

  it('aims from the feet to the aim point', () => {
    const s = sim();
    loadFull(s);
    stepSim(s, fireAt(s, 30, -40));
    const arrow = s.arrows[0];
    expect(arrow?.dx).toBeCloseTo(0.6);
    expect(arrow?.dy).toBeCloseTo(-0.8);
  });

  it('shoots in the facing direction when aimed at the feet', () => {
    const s = sim();
    loadFull(s);
    s.player.facing = 'left';
    stepSim(s, fireAt(s, 0, 0));
    expect(s.arrows[0]).toMatchObject({ dx: -1, dy: 0 });
  });

  it('faces the aim while firing, then follows movement again', () => {
    const s = sim();
    stepSim(s, fireAt(s, 10, 40, { moveX: 1 }));
    expect(s.player.facing).toBe('down');
    stepSim(s, fireAt(s, -40, 40, { moveX: 1 }));
    expect(s.player.facing).toBe('left');
    stepSim(s, fireAt(s, 0, -40, { moveX: 1 }));
    expect(s.player.facing).toBe('up');
    stepSim(s, command({ moveX: 1 }));
    expect(s.player.facing).toBe('right');
  });
});
