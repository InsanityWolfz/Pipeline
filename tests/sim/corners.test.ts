import { describe, expect, it } from 'vitest';
import { CONDUIT_TICKS } from '../../src/data/foundry';
import { PORT_TICKS } from '../../src/data/claims';
import { SHRINE_SITE } from '../../src/data/rooms';
import { claim } from '../../src/sim/claims';
import { place } from '../../src/sim/placement';
import type { ConduitState, CrateState, HopperState } from '../../src/sim/pieces';
import { summarize } from '../../src/sim/summary';
import { run } from './fight';
import { foundry, put } from './foundryKit';

/** A conduit placed with an explicit intake side. */
function corner(s: ReturnType<typeof foundry>, tx: number, ty: number, facing: 'up' | 'down' | 'left' | 'right', inFrom: 'up' | 'down' | 'left' | 'right') {
  const p = place(s, 'conduit', tx, ty, facing, { inFrom });
  if (!p) throw new Error(`can't place conduit at ${tx},${ty}`);
  return p as ConduitState;
}

describe('conduit intake', () => {
  it('a straight conduit takes from its back only, and now refuses side feeds', () => {
    const s = foundry();
    const back = put<ConduitState>(s, 'conduit', 4, 5, 'right');
    const target = put<ConduitState>(s, 'conduit', 5, 5, 'right');
    const side = put<ConduitState>(s, 'conduit', 5, 4, 'down');
    expect(target.inFrom).toBe('left');
    side.item = 'stone';
    run(s, CONDUIT_TICKS * 2);
    expect([side.item, target.item]).toEqual(['stone', null]);
    back.item = 'wood';
    run(s, CONDUIT_TICKS);
    expect(target.item).toBe('wood');
  });

  it('a corner takes only from its inFrom side and hands on out its front', () => {
    const s = foundry();
    const c = corner(s, 5, 5, 'down', 'left');
    const fromLeft = put<ConduitState>(s, 'conduit', 4, 5, 'right');
    const fromTop = put<ConduitState>(s, 'conduit', 5, 4, 'down');
    const out = put<ConduitState>(s, 'conduit', 5, 6, 'down');
    fromTop.item = 'stone';
    run(s, CONDUIT_TICKS * 2);
    expect([fromTop.item, c.item]).toEqual(['stone', null]);
    fromLeft.item = 'wood';
    run(s, CONDUIT_TICKS);
    expect(c.item).toBe('wood');
    run(s, CONDUIT_TICKS);
    expect([c.item, out.item]).toEqual([null, 'wood']);
  });
});

describe('conduit intake from other pieces', () => {
  it('a corner refuses its third side as well as its front', () => {
    const s = foundry();
    const c = corner(s, 5, 5, 'down', 'left');
    const fromRight = put<ConduitState>(s, 'conduit', 6, 5, 'left');
    fromRight.item = 'stone';
    run(s, CONDUIT_TICKS * 2);
    expect([fromRight.item, c.item]).toEqual(['stone', null]);
  });

  it('a hopper beside a straight conduit no longer feeds it', () => {
    const s = foundry();
    const c = put<ConduitState>(s, 'conduit', 5, 5, 'right');
    const h = put<HopperState>(s, 'hopper', 5, 4, 'right');
    h.facing = 'down';
    h.item = 'wood';
    h.count = 3;
    run(s, CONDUIT_TICKS * 2);
    expect([h.count, c.item]).toEqual([3, null]);
  });

  it('the supply port feeds a corner that joined it', () => {
    const s = foundry();
    claim(s, SHRINE_SITE);
    const c = put<ConduitState>(s, 'conduit', 2, 8, 'up');
    run(s, PORT_TICKS + 1);
    expect(c.item).not.toBeNull();
  });
});

describe('placing a conduit without a side', () => {
  it('joins one side feeder as a corner, and leaves the feeder alone', () => {
    const s = foundry();
    const feeder = put<ConduitState>(s, 'conduit', 4, 5, 'right');
    const c = put<ConduitState>(s, 'conduit', 5, 5, 'down');
    expect(c.inFrom).toBe('left');
    expect([feeder.facing, feeder.inFrom]).toEqual(['right', 'left']);
  });

  it('joins a machine or hopper whose front is the tile', () => {
    const s = foundry();
    put<HopperState>(s, 'hopper', 5, 4, 'down');
    expect(put<ConduitState>(s, 'conduit', 5, 5, 'right').inFrom).toBe('up');
  });

  it('stays straight with no feeder, two side feeders, or a fed back', () => {
    const s = foundry();
    expect(put<ConduitState>(s, 'conduit', 5, 5, 'down').inFrom).toBe('up');
    put(s, 'conduit', 9, 5, 'right');
    put(s, 'conduit', 11, 5, 'left');
    expect(put<ConduitState>(s, 'conduit', 10, 5, 'down').inFrom).toBe('up');
    put(s, 'conduit', 14, 4, 'down');
    put(s, 'conduit', 13, 5, 'right');
    expect(put<ConduitState>(s, 'conduit', 14, 5, 'down').inFrom).toBe('up');
  });

  it('ignores neighbours that do not face in, crates and sockets', () => {
    const s = foundry();
    put(s, 'conduit', 4, 5, 'up');
    put<CrateState>(s, 'crate', 6, 5);
    expect(put<ConduitState>(s, 'conduit', 5, 5, 'down').inFrom).toBe('up');
  });

  it('joins the supply port, which faces the tile beside it', () => {
    const s = foundry();
    claim(s, SHRINE_SITE);
    // The port is at (1,8) facing right, so it hands to (2,8).
    expect(put<ConduitState>(s, 'conduit', 2, 8, 'up').inFrom).toBe('left');
  });
});

describe('an explicit side', () => {
  it('is kept when it is a side or the back', () => {
    const s = foundry();
    expect(corner(s, 5, 5, 'up', 'right').inFrom).toBe('right');
    expect(corner(s, 7, 5, 'up', 'down').inFrom).toBe('down');
  });

  it('becomes straight when it is the front', () => {
    const s = foundry();
    expect(corner(s, 5, 5, 'up', 'up').inFrom).toBe('down');
  });

  it('is in the summary', () => {
    const s = foundry();
    corner(s, 5, 5, 'up', 'right');
    expect(summarize(s).foundry.pieces[0]).toMatchObject({ pieceId: 'conduit', facing: 'up', inFrom: 'right' });
  });
});

describe('a U-shaped run', () => {
  it('carries items right, down and back left into a crate', () => {
    const s = foundry();
    const start = corner(s, 4, 5, 'right', 'left');
    corner(s, 5, 5, 'right', 'left');
    corner(s, 6, 5, 'down', 'left');
    corner(s, 6, 6, 'left', 'up');
    corner(s, 5, 6, 'left', 'right');
    const crate = put<CrateState>(s, 'crate', 4, 6);
    start.item = 'wood';
    run(s, CONDUIT_TICKS * 6);
    expect(crate.contents).toEqual({ wood: 1 });
  });
});
