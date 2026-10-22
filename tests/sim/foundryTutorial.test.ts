import { describe, expect, it } from 'vitest';
import { OBJECTIVES } from '../../src/data/objectives';
import { TUTORIAL_START } from '../../src/data/player';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { currentObjective } from '../../src/sim/objectives';
import type { HopperState } from '../../src/sim/pieces';
import { createSim, roomById, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { FILL_GOAL, REFILL_GOAL, TRAVEL_GOAL } from '../fixtures/foundrySteps';
import { craft } from '../../src/sim/crafting';
import { die, movePlayer, run, runUntil } from './fight';
import { foundry, put } from './foundryKit';

// 046 (note 10, 027): the foundry tutorial starts from the example line, which fills the tube on its own (058: "Wait
// for the tube to fill with arrows"). Once it runs dry, the objective line asks for its hoppers to be refilled with
// wood, stone and fiber; 058: only if it has run dry by the time the fast travel home lands, after the shrine.

const REFILL = OBJECTIVES.findIndex((o) => o.text === REFILL_GOAL);
const TRAVEL = OBJECTIVES.findIndex((o) => o.text === TRAVEL_GOAL);
const FILL = OBJECTIVES.findIndex((o) => o.text === FILL_GOAL);

/** A new game just walked into the foundry (the example line laid) and the attune over, every goal before `goal` done. */
function newGame(goal = TRAVEL): SimState {
  const s = createSim(3, { start: TUTORIAL_START });
  s.objectives = OBJECTIVES.map((o, i) => i < goal && !o.cutIn);
  s.roomId = FOUNDRY_ROOM;
  const at = tileCentre(roomById(FOUNDRY_ROOM).spawn);
  movePlayer(s, at.x, at.y);
  run(s, 1);
  // The attune holds the player still (019); the line runs meanwhile.
  while (s.link.attunePulse > 0) run(s, 1);
  return s;
}

/** Steps until the line runs dry, emptying the centre entrance as firing would. */
function runDry(s: SimState, limit = 4000): void {
  for (let t = 0; t < limit && !s.lineRanDry; t++) {
    run(s, 1);
    const e = s.link.entrances[1];
    if (e) {
      e.count = 0;
      e.ammoId = null;
    }
  }
}

/** The fast travel home lands (the pylon's menu sets the flag). */
function travelHome(s: SimState): void {
  s.travelled = true;
  run(s, 1);
  expect(s.objectives[TRAVEL]).toBe(true);
}

/** Stands below the hopper at (tx, 5) and puts `n` of `item` in it by hand (one tick). */
function refill(s: SimState, tx: number, item: string, n = 3): void {
  s.inventory[item] = (s.inventory[item] ?? 0) + n;
  movePlayer(s, (tx + 0.5) * 32, 6.25 * 32);
  const h = s.foundry.pieces.find((p): p is HopperState => p.kind === 'hopper' && p.tx === tx && p.ty === 5);
  if (!h) throw new Error(`no hopper at ${tx},5`);
  run(s, 1, { deposit: { id: h.id, itemId: item, amount: 'all' } });
  expect(s.events.deposits, `${item} into ${tx},5`).toHaveLength(1);
}

describe('the foundry goals (046, 058)', () => {
  it("027's build steps are gone; waiting for the tube comes on entering, the refill after the fast travel home", () => {
    const texts = OBJECTIVES.map((o) => o.text);
    for (const old of ['Press B and place a hopper', 'Put wood in the hopper (E)', 'Run a conduit from the assembler into the intake', 'Fill the tube from your line']) expect(texts).not.toContain(old);
    expect(OBJECTIVES[FILL - 1]?.text).toBe('Enter the foundry');
    expect(OBJECTIVES[FILL]).toMatchObject({ check: { kind: 'lineFull' }, target: { kind: 'intake' } });
    expect(OBJECTIVES[FILL]?.prompt).toBeUndefined();
    expect(TRAVEL).toBe(REFILL - 1);
    expect(OBJECTIVES[REFILL]).toEqual({
      text: REFILL_GOAL,
      milestone: 'prototype',
      check: { kind: 'refilled', items: ['wood', 'stone', 'fiber'] },
      skipUnlessDryAfter: 'travelled',
      prompt: { key: 'E', over: 'hopper' },
      target: { kind: 'hoppers', unfilled: true },
    });
  });
});

describe('the refill goal (046)', () => {
  it('shows when the line ran dry before the fast travel home; refilling all three completes it', () => {
    const s = newGame();
    runDry(s);
    expect(s.foundry.pieces).toHaveLength(9);
    travelHome(s);
    expect(currentObjective(s)).toBe(REFILL);
    expect(summarize(s).objective).toEqual({ index: REFILL, text: REFILL_GOAL });
    refill(s, 11, 'wood');
    refill(s, 12, 'stone');
    run(s, 1);
    expect(s.objectives[REFILL]).toBe(false);
    refill(s, 13, 'fiber');
    run(s, 1);
    expect(s.objectives[REFILL]).toBe(true);
    expect(summarize(s)).toMatchObject({ lineRanDry: true, refilled: ['wood', 'stone', 'fiber'] });
  });

  it('is skipped, for good, when the line still runs as the fast travel lands', () => {
    const s = newGame();
    travelHome(s);
    expect(s.objectives[REFILL]).toBe(true);
    expect(currentObjective(s)).toBe(REFILL + 1);
    runDry(s);
    expect(currentObjective(s)).toBe(REFILL + 1);
  });

  it('a hopper filled before the line runs dry does not count; nor does one by a line, only by hand', () => {
    const s = newGame();
    refill(s, 11, 'wood');
    run(s, 1);
    expect(s.refilled).toEqual([]);
    runDry(s);
    travelHome(s);
    refill(s, 12, 'stone');
    refill(s, 13, 'fiber');
    run(s, 1);
    expect(s.objectives[REFILL]).toBe(false);
  });

  it('is kept through a KO: the goal still shows after waking', () => {
    const s = newGame();
    runDry(s);
    travelHome(s);
    die(s);
    expect(s.lineRanDry).toBe(true);
    expect(currentObjective(s)).toBe(REFILL);
  });

  it('leftovers stuck in the line still count as dry: one wood too many, and the goal still shows', () => {
    const s = newGame();
    const wood = s.foundry.pieces.find((p): p is HopperState => p.kind === 'hopper' && p.tx === 11);
    if (!wood) throw new Error('no wood hopper');
    wood.item = 'wood';
    wood.count += 1;
    runDry(s);
    expect(s.lineRanDry).toBe(true);
    // Shafts are left over in the line, never to be used without more stone and fiber.
    const leftover = s.foundry.pieces.some((p) => p.kind === 'machine' && ((p.buffer.shaft ?? 0) > 0 || (p.made === 'shaft' && p.output > 0)));
    expect(leftover).toBe(true);
    travelHome(s);
    expect(currentObjective(s)).toBe(REFILL);
  });

  it('with no hopper in the foundry (a start or save without the example line) it counts as done once attuned (046.8)', () => {
    const s = foundry();
    s.objectives = OBJECTIVES.map((o, i) => i < REFILL && !o.cutIn);
    run(s, 1);
    expect(s.lineRanDry).toBe(true);
    expect(s.objectives[REFILL]).toBe(true);
    expect(currentObjective(s)).toBe(REFILL + 1);
  });
});

describe('first-made popups (046)', () => {
  it("record the first time machines ever make each item, by the machine, and never again", () => {
    const s = createSim(3, { start: TUTORIAL_START });
    s.roomId = FOUNDRY_ROOM;
    const firsts: { id: number; itemId: string }[] = [];
    for (let t = 0; t < 900; t++) {
      run(s, 1);
      firsts.push(...s.events.firstMade);
    }
    const byPiece = (id: number) => s.foundry.pieces.find((p) => p.id === id)?.pieceId;
    expect(firsts.map((f) => [f.itemId, byPiece(f.id)]).sort()).toEqual([
      ['arrow', 'assembler'],
      ['arrowhead', 'knapper'],
      ['rope', 'spinner'],
      ['shaft', 'cutter'],
    ]);
  });

  it('hand-crafting never counts as machine-made', () => {
    const s = foundry();
    s.inventory = { wood: 1 };
    expect(craft(s, 'shaft')).toBe(true);
    run(s, 1);
    expect(s.inventory.shaft).toBe(2);
    expect(s.crafted).toContain('shaft');
    expect(s.machineMade).toEqual({});
    expect(s.events.firstMade).toEqual([]);
  });

  it('a machine finishing a craft records what it made, by whom', () => {
    const s = foundry();
    const h = put<HopperState>(s, 'hopper', 11, 5, 'up');
    Object.assign(h, { item: 'wood', count: 1 });
    const cutter = put(s, 'cutter', 11, 4, 'up');
    runUntil(s, (x) => x.events.made.length > 0, 200);
    expect(s.events.made).toEqual([{ id: cutter.id, pieceId: 'cutter', itemId: 'shaft', count: 2 }]);
    expect(s.events.firstMade).toEqual([{ id: cutter.id, itemId: 'shaft' }]);
    expect(summarize(s).machineMade).toEqual({ shaft: 2 });
  });

  it('keeps the machine-made tally through a KO', () => {
    const s = foundry();
    const h = put<HopperState>(s, 'hopper', 11, 5, 'up');
    Object.assign(h, { item: 'wood', count: 1 });
    put(s, 'cutter', 11, 4, 'up');
    runUntil(s, (x) => (x.machineMade.shaft ?? 0) > 0, 200);
    die(s);
    expect(s.machineMade).toEqual({ shaft: 2 });
  });
});
