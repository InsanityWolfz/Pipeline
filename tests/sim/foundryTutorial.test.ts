import { describe, expect, it } from 'vitest';
import { OBJECTIVES, type ObjectiveCheck } from '../../src/data/objectives';
import { craft } from '../../src/sim/crafting';
import { currentObjective } from '../../src/sim/objectives';
import type { HopperState, MachineState } from '../../src/sim/pieces';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { AFTER_STEPS, FOUNDRY_STEPS } from '../fixtures/foundrySteps';
import { foundry, put } from './foundryKit';
import { die, run, runUntil } from './fight';

// 027: the foundry's arrow line, taught a step at a time. The single "build a
// line" objective is seven steps, each completing from sim state.

const STEPS = FOUNDRY_STEPS;

const FIRST = OBJECTIVES.findIndex((o) => o.text === STEPS[0]);
const FILL = OBJECTIVES.findIndex((o) => o.text === AFTER_STEPS);
const step = (n: number): number => FIRST + n - 1;

/** The foundry with every objective before the steps done, so the line shows step 1. */
function atSteps(): SimState {
  const s = foundry();
  s.objectives = OBJECTIVES.map((_, i) => i < FIRST);
  return s;
}

/** A hopper at (tx, ty) facing up, holding `count` of `item`. */
function hopper(s: SimState, tx: number, ty: number, item: string, count: number): HopperState {
  const h = put<HopperState>(s, 'hopper', tx, ty, 'up');
  h.item = item;
  h.count = count;
  return h;
}

/** The arrow line under the intake's centre entrance (12, 0): hoppers on row 5, part machines on row 4, the assembler across row 3. */
function partLine(s: SimState): void {
  hopper(s, 11, 5, 'wood', 4);
  put(s, 'cutter', 11, 4, 'up');
  hopper(s, 12, 5, 'stone', 4);
  put(s, 'knapper', 12, 4, 'up');
  hopper(s, 13, 5, 'fiber', 4);
  put(s, 'spinner', 13, 4, 'up');
}

describe('the foundry steps (027)', () => {
  it('replace the one line objective, in order, after crafting a bomb and a ley bolt and before filling the tube', () => {
    expect(OBJECTIVES.map((o) => o.text)).not.toContain('Build an ammo line into the intake (B)');
    expect(OBJECTIVES[FIRST - 1]?.text).toBe('Craft a bomb and a ley bolt (C)');
    expect(OBJECTIVES.slice(FIRST, FIRST + STEPS.length).map((o) => o.text)).toEqual(STEPS);
    expect(FILL).toBe(FIRST + STEPS.length);
    const checks: ObjectiveCheck[] = [
      { kind: 'placed', piece: 'hopper' },
      { kind: 'hopperHolds', item: 'wood' },
      { kind: 'machineMade', item: 'shaft' },
      { kind: 'machineMade', item: 'arrowhead' },
      { kind: 'machineMade', item: 'rope' },
      { kind: 'machineMade', item: 'arrow' },
      { kind: 'intakeFed', item: 'arrow' },
    ];
    expect(OBJECTIVES.slice(FIRST, FIRST + STEPS.length).map((o) => o.check)).toEqual(checks);
  });

  it('name the piece to pulse and where the prompt floats', () => {
    const steps = OBJECTIVES.slice(FIRST, FIRST + STEPS.length);
    expect(steps.map((o) => o.highlight)).toEqual(['hopper', 'hopper', 'cutter', 'knapper', 'spinner', 'assembler', 'conduit']);
    expect(steps.map((o) => o.prompt ?? null)).toEqual([
      { key: 'B', over: 'player' },
      { key: 'E', over: 'newestHopper' },
      { key: 'B', over: 'player' },
      { key: 'B', over: 'player' },
      { key: 'B', over: 'player' },
      { key: 'B', over: 'player' },
      { key: 'B', over: 'player' },
    ]);
    expect(steps.map((o) => o.marker ?? null)).toEqual([null, null, null, null, null, null, 'intake']);
  });

  it('tick off one at a time as a scripted build goes up, ending on filling the tube', () => {
    const s = atSteps();
    run(s, 1);
    expect(currentObjective(s)).toBe(step(1));
    expect(summarize(s).objective).toEqual({ index: step(1), text: STEPS[0] });

    const wood = put<HopperState>(s, 'hopper', 11, 5, 'up');
    run(s, 1);
    expect(currentObjective(s)).toBe(step(2));
    expect(s.events.objectives).toEqual([{ index: step(1) }]);

    wood.item = 'wood';
    wood.count = 4;
    run(s, 1);
    expect(currentObjective(s)).toBe(step(3));

    put(s, 'cutter', 11, 4, 'up');
    runUntil(s, (x) => currentObjective(x) !== step(3), 200);
    expect(currentObjective(s)).toBe(step(4));
    expect(s.machineMade).toEqual({ shaft: 2 });

    hopper(s, 12, 5, 'stone', 4);
    put(s, 'knapper', 12, 4, 'up');
    runUntil(s, (x) => currentObjective(x) !== step(4), 200);
    expect(currentObjective(s)).toBe(step(5));

    hopper(s, 13, 5, 'fiber', 4);
    put(s, 'spinner', 13, 4, 'up');
    runUntil(s, (x) => currentObjective(x) !== step(5), 200);
    expect(currentObjective(s)).toBe(step(6));

    put(s, 'assembler', 12, 3, 'up');
    runUntil(s, (x) => currentObjective(x) !== step(6), 300);
    expect(currentObjective(s)).toBe(step(7));
    expect(s.machineMade.arrow).toBe(4);

    put(s, 'conduit', 12, 2, 'up');
    put(s, 'conduit', 12, 1, 'up');
    runUntil(s, (x) => currentObjective(x) !== step(7), 200);
    expect(summarize(s).objective).toEqual({ index: FILL, text: AFTER_STEPS });
    expect(s.link.entrances[1]).toMatchObject({ ammoId: 'arrow' });
  });

  it('a machine finishing a craft records what it made, by whom', () => {
    const s = atSteps();
    hopper(s, 11, 5, 'wood', 1);
    const cutter = put<MachineState>(s, 'cutter', 11, 4, 'up');
    runUntil(s, (x) => x.events.made.length > 0, 200);
    expect(s.events.made).toEqual([{ id: cutter.id, pieceId: 'cutter', itemId: 'shaft', count: 2 }]);
    expect(summarize(s).machineMade).toEqual({ shaft: 2 });
  });

  it('hand-crafting a part never counts as machine-made', () => {
    const s = atSteps();
    s.objectives = OBJECTIVES.map((_, i) => i < step(3));
    s.inventory = { wood: 3 };
    craft(s, 'shaft');
    run(s, 2);
    expect(s.crafted).toContain('shaft');
    expect(s.machineMade).toEqual({});
    expect(currentObjective(s)).toBe(step(3));
  });

  it('a line into the intake only finishes the last step once arrows arrive, not ley bolts', () => {
    const s = atSteps();
    s.objectives = OBJECTIVES.map((_, i) => i < step(7));
    // A ley bolt line into the centre entrance: it feeds the intake, but no arrows arrive.
    hopper(s, 12, 4, 'ley-dust', 4);
    put(s, 'focuser', 12, 3, 'up');
    put(s, 'conduit', 12, 2, 'up');
    put(s, 'conduit', 12, 1, 'up');
    runUntil(s, (x) => (x.link.entrances[1]?.count ?? 0) > 0, 300);
    run(s, 10);
    expect(currentObjective(s)).toBe(step(7));
    expect(s.machineMade['ley-bolt']).toBeGreaterThan(0);
  });

  it('skip straight past when the line was built before the steps came up', () => {
    const s = foundry();
    // Not yet crafted by hand: the bomb and ley bolt objective stays open while the line goes up.
    s.crafted = s.crafted.filter((id) => id !== 'bomb' && id !== 'ley-bolt');
    s.objectives = OBJECTIVES.map((_, i) => i < FIRST - 1);
    partLine(s);
    put(s, 'assembler', 12, 3, 'up');
    put(s, 'conduit', 12, 2, 'up');
    put(s, 'conduit', 12, 1, 'up');
    runUntil(s, (x) => x.objectives.slice(FIRST, FILL).every(Boolean), 600);
    // Still on the bomb and ley bolt craft, with all seven steps already done behind it.
    expect(currentObjective(s)).toBe(FIRST - 1);
    s.objectives[FIRST - 1] = true;
    run(s, 1);
    expect(currentObjective(s)).toBe(FILL);
  });

  it('a hopper holding something else, or emptied, does not count; one holding wood does', () => {
    const s = atSteps();
    s.objectives = OBJECTIVES.map((_, i) => i < step(2));
    const h = hopper(s, 11, 5, 'stone', 2);
    run(s, 1);
    expect(currentObjective(s)).toBe(step(2));
    h.item = 'wood';
    h.count = 0;
    run(s, 1);
    expect(currentObjective(s)).toBe(step(2));
    h.count = 1;
    run(s, 1);
    expect(currentObjective(s)).toBe(step(3));
  });

  it('keeps the machine-made tally through a KO', () => {
    const s = atSteps();
    hopper(s, 11, 5, 'wood', 1);
    put(s, 'cutter', 11, 4, 'up');
    runUntil(s, (x) => (x.machineMade.shaft ?? 0) > 0, 200);
    die(s);
    expect(s.machineMade).toEqual({ shaft: 2 });
  });

  it('replay identically', () => {
    const play = () => {
      const s = atSteps();
      partLine(s);
      put(s, 'assembler', 12, 3, 'up');
      put(s, 'conduit', 12, 2, 'up');
      put(s, 'conduit', 12, 1, 'up');
      run(s, 400);
      return summarize(s);
    };
    expect(play()).toEqual(play());
  });
});
