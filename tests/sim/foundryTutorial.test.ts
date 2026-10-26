import { describe, expect, it } from 'vitest';
import { OBJECTIVES } from '../../src/data/objectives';
import { TUTORIAL_START } from '../../src/data/player';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import type { HopperState } from '../../src/sim/pieces';
import { createSim } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { FILL_GOAL, TRAVEL_GOAL } from '../fixtures/foundrySteps';
import { craft } from '../../src/sim/crafting';
import { die, run, runUntil } from './fight';
import { foundry, put } from './foundryKit';
import { layArrowLine } from './guidedKit';
import { claim } from '../../src/sim/claims';

// 046 (note 10, 027): the foundry tutorial's first goal is to wait for the tube to fill with arrows (058). 067: the
// foundry comes after the shrine's claim and the travel there; the refill goal is gone (its line is fed from the
// supply ports from the start).

const TRAVEL = OBJECTIVES.findIndex((o) => o.text === TRAVEL_GOAL);
const FILL = OBJECTIVES.findIndex((o) => o.text === FILL_GOAL);

describe('the foundry goals (046, 058, 067)', () => {
  it("027's build steps and 046's refill are gone; waiting for the tube comes after the travel to the foundry", () => {
    const texts = OBJECTIVES.map((o) => o.text);
    for (const old of ['Press B and place a hopper', 'Put wood in the hopper (E)', 'Run a conduit from the assembler into the intake', 'Fill the tube from your line', 'Refill the hoppers in the foundry with wood, stone and fiber (E)']) {
      expect(texts).not.toContain(old);
    }
    expect(TRAVEL).toBeGreaterThan(0);
    expect(FILL).toBeGreaterThan(TRAVEL);
    expect(OBJECTIVES[FILL]).toMatchObject({ check: { kind: 'lineFull' }, target: { kind: 'intake' } });
    expect(OBJECTIVES[FILL]?.prompt).toBeUndefined();
    expect(OBJECTIVES.some((o) => o.target?.kind === 'hoppers')).toBe(false);
  });
});

describe('first-made popups (046)', () => {
  it("record the first time machines ever make each item, by the machine, and never again", () => {
    // 067: the guided arrow line standing, fed from the ports the shrine's claim brings.
    const s = createSim(3, { start: TUTORIAL_START });
    claim(s, 'shrine');
    s.roomId = FOUNDRY_ROOM;
    layArrowLine(s);
    const firsts: { id: number; itemId: string }[] = [];
    for (let t = 0; t < 1500; t++) {
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
