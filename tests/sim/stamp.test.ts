import { describe, expect, it } from 'vitest';
import { BLUEPRINT_TABLE } from '../../src/data/blueprints';
import { LOCK_UNTIL } from '../../src/data/guidedBuilds';
import { boxOf } from '../../src/sim/area';
import { saveBlueprint } from '../../src/sim/blueprints';
import { guidedGoal } from '../../src/sim/guided';
import type { ConduitState, CrateState, HopperState, MachineState, PieceState, SplitterState, TunnelInState } from '../../src/sim/pieces';
import { stampPlan } from '../../src/sim/stamp';
import type { SimState } from '../../src/sim/state';
import { run } from './fight';
import { foundry, put } from './foundryKit';

// Placing a blueprint (063): a click stamps every piece that fits at once, new and empty, keeping the saved settings
// (a conduit's corner, a splitter's side, a stage machine's round, an underground pair's link), and skips the rest: a
// taken tile, a fixture, a wall or off the floor, a piece not unlocked. The ghost stays, so it can go down again. The
// tutorial's build lock refuses the whole stamp.

function table(unlockAll = true): SimState {
  const s = foundry(unlockAll);
  s.research[BLUEPRINT_TABLE] = 'restored';
  return s;
}

const at = (s: SimState, tx: number, ty: number): PieceState | undefined => s.foundry.pieces.find((p) => p.tx === tx && p.ty === ty);

/** A blueprint of a small frost arrow line, saved from (3, 5): arrows in from the left, rimestone from below, a crate. */
function frostLine(s: SimState): number {
  const arrows = put<HopperState>(s, 'hopper', 3, 5, 'right');
  arrows.item = 'arrow';
  arrows.count = 12;
  put(s, 'frost-rune', 4, 5, 'right');
  put(s, 'crate', 5, 5, 'right');
  put(s, 'hopper', 4, 6, 'up');
  const slot = saveBlueprint(s, boxOf({ tx: 3, ty: 5 }, { tx: 5, ty: 6 }));
  if (slot === null) throw new Error('not saved');
  return slot;
}

describe('stamping (063)', () => {
  it('places every piece at once, new and empty, offset from the box top-left', () => {
    const s = table();
    const slot = frostLine(s);
    run(s, 1, { stamp: { slot, tx: 10, ty: 8, turns: 0, mirrored: false } });
    expect(s.events.stamps).toEqual([{ slot, placed: 4, skipped: 0 }]);
    expect([at(s, 10, 8)?.pieceId, at(s, 11, 8)?.pieceId, at(s, 12, 8)?.pieceId, at(s, 11, 9)?.pieceId]).toEqual(['hopper', 'frost-rune', 'crate', 'hopper']);
    expect((at(s, 10, 8) as HopperState).count).toBe(0);
    expect(s.events.places).toHaveLength(4);
  });

  it("keeps a conduit's corner, a splitter's side, a stage machine's round and an underground pair's link", () => {
    const s = table();
    const c = put<ConduitState>(s, 'conduit', 3, 3, 'right');
    c.inFrom = 'down';
    const sp = put<SplitterState>(s, 'splitter', 4, 3, 'right');
    sp.mirrored = true;
    const rune = put<MachineState>(s, 'frost-rune', 5, 3, 'right');
    rune.made = 'bomb+frost';
    put(s, 'underground-entrance', 3, 4, 'right');
    put(s, 'underground-exit', 6, 4, 'right');
    const slot = saveBlueprint(s, boxOf({ tx: 3, ty: 3 }, { tx: 6, ty: 4 }));
    // A free exit between where the stamped pair lands: nearer to the entrance, but the saved link wins.
    put(s, 'underground-exit', 12, 11, 'right');
    run(s, 1, { stamp: { slot: slot ?? -1, tx: 10, ty: 10, turns: 0, mirrored: false } });
    expect((at(s, 10, 10) as ConduitState).inFrom).toBe('down');
    expect((at(s, 11, 10) as SplitterState).mirrored).toBe(true);
    expect((at(s, 12, 10) as MachineState).made).toBe('bomb+frost');
    const tin = at(s, 10, 11) as TunnelInState;
    expect(tin.pair).toBe(at(s, 13, 11)?.id);
    expect(tin.tunnel).toHaveLength(2);
  });

  it('skips pieces on a taken tile, a fixture, a wall or off the floor, and pieces not unlocked', () => {
    const s = table();
    const slot = frostLine(s);
    put(s, 'conduit', 11, 8, 'up');
    const plan = stampPlan(s, slot, 10, 8, 0, false);
    expect(plan?.map((p) => p.fail)).toEqual([null, 'occupied', null, null]);
    run(s, 1, { stamp: { slot, tx: 10, ty: 8, turns: 0, mirrored: false } });
    expect(s.events.stamps).toEqual([{ slot, placed: 3, skipped: 1 }]);
    // The stash at (22, 11) and the east wall: the crate lands on the stash, the hopper's column in the wall.
    expect(stampPlan(s, slot, 20, 11, 0, false)?.map((p) => p.fail)).toEqual([null, null, 'occupied', null]);
    expect(stampPlan(s, slot, 22, 4, 0, false)?.map((p) => p.fail)).toEqual([null, 'blocked', 'blocked', 'blocked']);
    expect(stampPlan(s, slot, 4, -1, 0, false)?.map((p) => p.fail)).toEqual(['blocked', 'blocked', 'blocked', 'blocked']);
    const fresh = table(false);
    fresh.blueprints = s.blueprints;
    expect(stampPlan(fresh, slot, 10, 8, 0, false)?.map((p) => p.fail)).toEqual([null, 'locked', null, null]);
  });

  it('stamps the same blueprint again in a second place', () => {
    const s = table();
    const slot = frostLine(s);
    run(s, 1, { stamp: { slot, tx: 10, ty: 3, turns: 0, mirrored: false } });
    run(s, 1, { stamp: { slot, tx: 10, ty: 8, turns: 0, mirrored: false } });
    expect(s.foundry.pieces.filter((p) => p.pieceId === 'frost-rune')).toHaveLength(3);
  });

  it('is refused whole by the build lock, and does nothing before the table', () => {
    const s = table();
    const slot = frostLine(s);
    s.start = { ...s.start, guided: true };
    s.objectives[guidedGoal(LOCK_UNTIL)] = false;
    const before = s.foundry.pieces.length;
    run(s, 1, { stamp: { slot, tx: 10, ty: 8, turns: 0, mirrored: false } });
    expect(s.foundry.pieces).toHaveLength(before);
    expect(s.events.placeFails.map((f) => f.reason)).toEqual(['tutorial']);
    s.objectives[guidedGoal(LOCK_UNTIL)] = true;
    s.research[BLUEPRINT_TABLE] = 'revealed';
    run(s, 1, { stamp: { slot, tx: 10, ty: 8, turns: 0, mirrored: false } });
    expect(s.foundry.pieces).toHaveLength(before);
    expect(stampPlan(s, slot, 10, 8, 0, false)).toBeNull();
  });

  it('a frost arrow line stamped turned and mirrored makes frost arrows', () => {
    const s = table();
    const slot = frostLine(s);
    // Turned once and mirrored: the 3x2 box stands 2 wide and 3 tall.
    run(s, 1, { stamp: { slot, tx: 15, ty: 6, turns: 1, mirrored: true } });
    expect(s.events.stamps[0]).toEqual({ slot, placed: 4, skipped: 0 });
    const placed = s.foundry.pieces.slice(-4);
    const [arrows, rune, crate, rime] = placed as [HopperState, MachineState, CrateState, HopperState];
    expect([arrows.facing, rune.facing]).toEqual(['up', 'up']);
    arrows.item = 'arrow';
    arrows.count = 8;
    rime.item = 'rimestone';
    rime.count = 2;
    run(s, 400);
    expect(crate.contents['arrow+frost'] ?? 0).toBeGreaterThanOrEqual(4);
  });
});
