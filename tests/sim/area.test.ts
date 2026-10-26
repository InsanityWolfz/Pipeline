import { describe, expect, it } from 'vitest';
import { LOCK_UNTIL } from '../../src/data/guidedBuilds';
import { areaPickUp, boxOf, piecesInBox, stashTotal } from '../../src/sim/area';
import { guidedGoal } from '../../src/sim/guided';
import type { ConduitState, CrateState, HopperState, MachineState, TunnelInState } from '../../src/sim/pieces';
import type { SimState } from '../../src/sim/state';
import { HALL, run } from './fight';
import { foundry, put } from './foundryKit';

// Area pick-up (063): a box dragged over the foundry counts every piece wholly inside it (never a fixture), and Pick up
// lifts them all at once, as picking each up by hand does, but everything they held goes to the stash. A stash that
// can't hold the lot refuses the whole pick-up; the tutorial's build lock refuses it as it refuses a single pick-up.

const ids = (s: SimState, box: ReturnType<typeof boxOf>): string[] => piecesInBox(s.foundry, box).map((p) => p.pieceId);

describe('the area box', () => {
  it('normalises its corners, whichever way it was dragged', () => {
    expect(boxOf({ tx: 6, ty: 9 }, { tx: 2, ty: 3 })).toEqual({ tx0: 2, ty0: 3, tx1: 6, ty1: 9 });
  });

  it('counts only pieces wholly inside it: a 3x1 needs all three tiles', () => {
    const s = foundry();
    put(s, 'assembler', 5, 5, 'up'); // a row: (4..6, 5)
    put(s, 'assembler', 10, 5, 'right'); // a column: (10, 4..6)
    put(s, 'conduit', 5, 7, 'up');
    expect(ids(s, boxOf({ tx: 5, ty: 4 }, { tx: 6, ty: 7 }))).toEqual(['conduit']);
    expect(ids(s, boxOf({ tx: 4, ty: 5 }, { tx: 6, ty: 7 }))).toEqual(['assembler', 'conduit']);
    expect(ids(s, boxOf({ tx: 9, ty: 4 }, { tx: 11, ty: 5 }))).toEqual([]);
    expect(ids(s, boxOf({ tx: 9, ty: 4 }, { tx: 11, ty: 6 }))).toEqual(['assembler']);
  });

  it('never counts a fixture: the stash, the bench, a port or the intake', () => {
    const s = foundry();
    // The stash (22, 11) and bench (22, 9), the ports down the west wall, the intake's mouth on the north wall.
    expect(piecesInBox(s.foundry, boxOf({ tx: 0, ty: 0 }, { tx: 23, ty: 15 }))).toEqual([]);
    put(s, 'conduit', 2, 4, 'right');
    expect(ids(s, boxOf({ tx: 0, ty: 0 }, { tx: 23, ty: 15 }))).toEqual(['conduit']);
  });
});

describe('area pick-up', () => {
  it('removes every counted piece at once, each with its pick-up event, and one area event', () => {
    const s = foundry();
    put(s, 'conduit', 3, 3, 'right');
    put(s, 'cutter', 4, 3, 'right');
    put(s, 'conduit', 8, 8, 'right');
    run(s, 1, { area: { box: boxOf({ tx: 3, ty: 3 }, { tx: 4, ty: 3 }), action: 'pickUp' } });
    expect(s.foundry.pieces.map((p) => p.pieceId)).toEqual(['conduit']);
    expect(s.events.pickUps.map((p) => p.pieceId)).toEqual(['conduit', 'cutter']);
    expect(s.events.areaPickUps).toEqual([{ count: 2, items: {} }]);
  });

  it('sends everything the pieces held to the stash, none to the inventory', () => {
    const s = foundry();
    const c = put<ConduitState>(s, 'conduit', 3, 3, 'right');
    c.item = 'wood';
    const m = put<MachineState>(s, 'cutter', 4, 3, 'right');
    m.buffer = { wood: 2 };
    m.output = 3;
    m.crafting = true;
    const h = put<HopperState>(s, 'hopper', 3, 4, 'up');
    h.item = 'stone';
    h.count = 7;
    const k = put<CrateState>(s, 'crate', 4, 4, 'up');
    k.contents = { arrow: 5 };
    const tin = put<TunnelInState>(s, 'underground-entrance', 3, 6, 'right');
    put(s, 'underground-exit', 6, 6, 'right');
    tin.tunnel = [{ item: 'fiber', progress: 0 }, null];
    s.inventory = {};
    s.stash = { wood: 1 };
    run(s, 1, { area: { box: boxOf({ tx: 3, ty: 3 }, { tx: 6, ty: 6 }), action: 'pickUp' } });
    expect(s.foundry.pieces).toEqual([]);
    expect(s.inventory).toEqual({});
    // The craft in progress gives back its input (1 wood), as by hand.
    expect(s.stash).toEqual({ wood: 5, shaft: 3, stone: 7, arrow: 5, fiber: 1 });
    expect(s.events.areaPickUps[0]?.items).toEqual({ wood: 4, shaft: 3, stone: 7, arrow: 5, fiber: 1 });
  });

  it('is refused whole when the stash can not hold it all, with a stash-full hint', () => {
    const s = foundry();
    const h = put<HopperState>(s, 'hopper', 3, 4, 'up');
    h.item = 'stone';
    h.count = 7;
    put(s, 'conduit', 4, 4, 'up');
    s.stash = { wood: 5 };
    const box = boxOf({ tx: 3, ty: 4 }, { tx: 4, ty: 4 });
    expect(areaPickUp(s, box, 11)).toBe(false);
    expect(s.foundry.pieces).toHaveLength(2);
    expect(s.stash).toEqual({ wood: 5 });
    expect(s.events.pickUpFails).toEqual([{ tx: 3, ty: 4, reason: 'stash-full' }]);
    expect(areaPickUp(s, box, 12)).toBe(true);
    expect(stashTotal(s.stash)).toBe(12);
  });

  it('is refused by the build lock, picking up nothing', () => {
    const s = foundry();
    put(s, 'conduit', 3, 3, 'up');
    s.start = { ...s.start, guided: true };
    s.objectives[guidedGoal(LOCK_UNTIL)] = false;
    run(s, 1, { area: { box: boxOf({ tx: 3, ty: 3 }, { tx: 3, ty: 3 }), action: 'pickUp' } });
    expect(s.foundry.pieces).toHaveLength(1);
    expect(s.events.pickUpFails.map((f) => f.reason)).toEqual(['tutorial']);
    s.objectives[guidedGoal(LOCK_UNTIL)] = true;
    run(s, 1, { area: { box: boxOf({ tx: 3, ty: 3 }, { tx: 3, ty: 3 }), action: 'pickUp' } });
    expect(s.foundry.pieces).toHaveLength(0);
  });

  it('needs no Blueprint table, only the foundry', () => {
    const s = foundry();
    expect(s.research['blueprint-table'] ?? 'revealed').not.toBe('restored');
    put(s, 'conduit', 3, 3, 'up');
    s.roomId = HALL;
    run(s, 1, { area: { box: boxOf({ tx: 3, ty: 3 }, { tx: 3, ty: 3 }), action: 'pickUp' } });
    expect(s.foundry.pieces).toHaveLength(1);
    s.roomId = 'foundry';
    run(s, 1, { area: { box: boxOf({ tx: 3, ty: 3 }, { tx: 3, ty: 3 }), action: 'pickUp' } });
    expect(s.foundry.pieces).toHaveLength(0);
  });

  it('does nothing over a box with no pieces', () => {
    const s = foundry();
    run(s, 1, { area: { box: boxOf({ tx: 3, ty: 3 }, { tx: 5, ty: 5 }), action: 'pickUp' } });
    expect(s.events.areaPickUps).toEqual([]);
    expect(s.events.pickUpFails).toEqual([]);
  });
});
