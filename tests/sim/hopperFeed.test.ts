import { describe, expect, it } from 'vitest';
import { SUPPLY_TICKS } from '../../src/data/claims';
import { CONDUIT_TICKS, HOPPER_FLOW_CAP, HOPPER_TICKS } from '../../src/data/foundry';
import { SHRINE_SITE } from '../../src/data/rooms';
import { claim } from '../../src/sim/claims';
import type { ConduitState, CrateState, HopperState, MachineState, SplitterState } from '../../src/sim/pieces';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer, run } from './fight';
import { foundry, put } from './foundryKit';

// 028: hoppers fed by lines. A hopper takes items from any side but its front (a
// conduit, a splitter's side, a machine's output or a supply port) while it is empty or
// already holds that item, up to HOPPER_FLOW_CAP. Hand-filling stays uncapped.

/** A conduit at (tx, ty) facing `facing`, holding `item` ready to hand over. */
function loaded(s: ReturnType<typeof foundry>, tx: number, ty: number, item: string, facing: 'right' | 'left' | 'up' | 'down' = 'right'): ConduitState {
  const c = put<ConduitState>(s, 'conduit', tx, ty, facing);
  c.item = item;
  c.progress = CONDUIT_TICKS;
  return c;
}

describe('a hopper fed by a line', () => {
  it('HOPPER_FLOW_CAP is 99 (the old crate cap; 050 gave crates 8 stacks)', () => {
    expect(HOPPER_FLOW_CAP).toBe(99);
  });

  it('takes from a conduit into its back, and from its sides', () => {
    const s = foundry();
    const h = put<HopperState>(s, 'hopper', 5, 5, 'right');
    const back = loaded(s, 4, 5, 'wood', 'right');
    run(s, 1);
    expect([back.item, h.item, h.count]).toEqual([null, 'wood', 1]);
    const side = loaded(s, 5, 4, 'wood', 'down');
    run(s, 1);
    expect([side.item, h.count]).toEqual([null, 2]);
  });

  it('takes from a machine whose output faces it', () => {
    const s = foundry();
    const m = put<MachineState>(s, 'cutter', 4, 5, 'right');
    m.output = 2;
    const h = put<HopperState>(s, 'hopper', 5, 5, 'right');
    run(s, 2);
    expect([m.output, h.item, h.count]).toEqual([0, 'shaft', 2]);
  });

  it("takes a splitter's item out of its side", () => {
    const s = foundry();
    // A splitter at (5,5) facing right whose side has the turn sends it out of its right side, (5,6).
    const so = put<SplitterState>(s, 'splitter', 5, 5, 'right');
    so.next = 'side';
    so.item = 'stone';
    so.progress = CONDUIT_TICKS;
    const h = put<HopperState>(s, 'hopper', 5, 6, 'down');
    run(s, 1);
    expect([so.item, h.item, h.count]).toEqual([null, 'stone', 1]);
  });

  it('takes from a supply port facing it', () => {
    const s = foundry();
    claim(s, SHRINE_SITE);
    // The wood port at (1, 4) faces right into (2, 4).
    const h = put<HopperState>(s, 'hopper', 2, 4, 'right');
    run(s, SUPPLY_TICKS);
    expect([h.item, h.count]).toEqual(['wood', 1]);
  });

  it('refuses a different item, and the line behind it backs up', () => {
    const s = foundry();
    const h = put<HopperState>(s, 'hopper', 5, 5, 'right');
    h.item = 'stone';
    h.count = 3;
    const c = loaded(s, 4, 5, 'wood');
    run(s, 3);
    expect([c.item, h.item, h.count]).toEqual(['wood', 'stone', 3]);
  });

  it('refuses past the cap, and the line backs up', () => {
    const s = foundry();
    // Facing up, into a crate it can't feed, so it never pushes and its count holds.
    const h = put<HopperState>(s, 'hopper', 5, 5, 'up');
    put(s, 'crate', 5, 4);
    h.item = 'wood';
    h.count = HOPPER_FLOW_CAP - 1;
    const c = loaded(s, 4, 5, 'wood');
    run(s, 1);
    expect([c.item, h.count]).toEqual([null, HOPPER_FLOW_CAP]);
    c.item = 'wood';
    c.progress = CONDUIT_TICKS;
    run(s, 3);
    expect([c.item, h.count]).toEqual(['wood', HOPPER_FLOW_CAP]);
  });

  it('never takes from its front', () => {
    const s = foundry();
    const h = put<HopperState>(s, 'hopper', 5, 5, 'right');
    // A conduit in front of the hopper, pointing back at it.
    const c = loaded(s, 6, 5, 'wood', 'left');
    run(s, 3);
    expect([c.item, h.item, h.count]).toEqual(['wood', null, 0]);
  });

  it('an item that arrives waits a whole push before going on, so nothing moves two hops in a tick', () => {
    const s = foundry();
    const h = put<HopperState>(s, 'hopper', 5, 5, 'right');
    h.timer = HOPPER_TICKS;
    loaded(s, 4, 5, 'wood');
    const out = put<ConduitState>(s, 'conduit', 6, 5, 'right');
    run(s, 1);
    expect([h.count, out.item]).toEqual([1, null]);
    run(s, HOPPER_TICKS - 1);
    expect([h.count, out.item]).toEqual([1, null]);
    run(s, 1);
    expect([h.count, out.item]).toEqual([0, 'wood']);
  });

  it('still never feeds a crate or the intake', () => {
    const s = foundry();
    const h = put<HopperState>(s, 'hopper', 5, 5, 'right');
    const crate = put<CrateState>(s, 'crate', 6, 5);
    loaded(s, 4, 5, 'wood');
    run(s, HOPPER_TICKS * 3);
    expect([h.count, crate.contents]).toEqual([1, {}]);
    const under = put<HopperState>(s, 'hopper', 12, 1, 'up');
    under.item = 'arrow';
    under.count = 3;
    run(s, HOPPER_TICKS * 3);
    expect(under.count).toBe(3);
  });
});

describe('hand-filling', () => {
  it('stays uncapped by the line cap', () => {
    const s = foundry();
    const h = put<HopperState>(s, 'hopper', 5, 5, 'up');
    put(s, 'crate', 5, 4);
    const by = tileCentre({ tx: 5, ty: 6 });
    movePlayer(s, by.x, by.y);
    s.inventory = { wood: HOPPER_FLOW_CAP + 20 };
    run(s, 1, { deposit: { id: h.id, itemId: 'wood', amount: 'all' } });
    expect([h.item, h.count]).toEqual(['wood', HOPPER_FLOW_CAP + 20]);
  });
});
