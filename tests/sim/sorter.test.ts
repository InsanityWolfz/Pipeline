import { describe, expect, it } from 'vitest';
import { PORT_TICKS } from '../../src/data/claims';
import { TILE_SIZE } from '../../src/data/config';
import { CONDUIT_TICKS, HOPPER_TICKS } from '../../src/data/foundry';
import { BUILD_BAR } from '../../src/data/pieces';
import { SHRINE_ROOM } from '../../src/data/rooms';
import { claim } from '../../src/sim/claims';
import { place, unlockedPieces } from '../../src/sim/placement';
import type { ConduitState, CrateState, HopperState } from '../../src/sim/pieces';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer, run } from './fight';
import { foundry, put, STAND } from './foundryKit';

/** A sorter at (tx, ty) facing right, set to `filter`. */
function sorter(s: ReturnType<typeof foundry>, tx: number, ty: number, filter: string | null, mirrored = false) {
  const p = place(s, 'sorter', tx, ty, 'right', { mirrored });
  if (p?.kind !== 'sorter') throw new Error(`can't place a sorter at ${tx},${ty}`);
  p.filter = filter;
  return p;
}

/** Runs until a conduit or sorter has handed on everything, with room to spare. */
const settle = (s: ReturnType<typeof foundry>, hops = 3) => run(s, CONDUIT_TICKS * hops + 2);

describe('a sorter', () => {
  it('is free, unlocked from the start, and sits after the conduit in the build bar', () => {
    expect(BUILD_BAR.indexOf('sorter')).toBe(BUILD_BAR.indexOf('conduit') + 1);
    expect(unlockedPieces(foundry(false))).toContain('sorter');
  });

  it('sends its item out its right side, and everything else out the front', () => {
    const s = foundry();
    const feed = put<ConduitState>(s, 'conduit', 4, 5, 'right');
    sorter(s, 5, 5, 'wood');
    const side = put<CrateState>(s, 'crate', 5, 6);
    const front = put<CrateState>(s, 'crate', 6, 5);
    feed.item = 'wood';
    settle(s);
    feed.item = 'stone';
    settle(s);
    expect(side.contents).toEqual({ wood: 1 });
    expect(front.contents).toEqual({ stone: 1 });
  });

  it('sends it left when mirrored', () => {
    const s = foundry();
    const feed = put<ConduitState>(s, 'conduit', 4, 5, 'right');
    sorter(s, 5, 5, 'wood', true);
    const left = put<CrateState>(s, 'crate', 5, 4);
    feed.item = 'wood';
    settle(s);
    expect(left.contents).toEqual({ wood: 1 });
  });

  it('with no item set, passes everything out the front', () => {
    const s = foundry();
    const feed = put<ConduitState>(s, 'conduit', 4, 5, 'right');
    sorter(s, 5, 5, null);
    const side = put<CrateState>(s, 'crate', 5, 6);
    const front = put<CrateState>(s, 'crate', 6, 5);
    feed.item = 'wood';
    settle(s);
    expect([side.contents, front.contents]).toEqual([{}, { wood: 1 }]);
  });

  it('takes items only from its back', () => {
    const s = foundry();
    const so = sorter(s, 5, 5, null);
    const fromSide = put<ConduitState>(s, 'conduit', 5, 4, 'down');
    fromSide.item = 'wood';
    settle(s);
    expect([fromSide.item, so.item]).toEqual(['wood', null]);
  });

  it('stalls on a blocked exit, and the line behind it backs up', () => {
    const s = foundry();
    const a = put<ConduitState>(s, 'conduit', 3, 5, 'right');
    const b = put<ConduitState>(s, 'conduit', 4, 5, 'right');
    const so = sorter(s, 5, 5, 'wood');
    const front = put<CrateState>(s, 'crate', 6, 5);
    b.item = 'wood';
    a.item = 'stone';
    settle(s, 5);
    // Nothing on the sort side: the wood waits, so the stone behind it never reaches the front crate.
    expect([so.item, b.item, front.contents]).toEqual(['wood', 'stone', {}]);
  });

  it('stalls on a blocked front too: a full exit holds everything behind it', () => {
    const s = foundry();
    const feed = put<ConduitState>(s, 'conduit', 4, 5, 'right');
    const so = sorter(s, 5, 5, 'wood');
    const front = put<ConduitState>(s, 'conduit', 6, 5, 'right');
    front.item = 'fiber';
    put(s, 'cutter', 7, 5);
    feed.item = 'stone';
    settle(s, 4);
    expect([so.item, front.item]).toEqual(['stone', 'fiber']);
  });

  it('stalls when the conduit on its side exit takes from another side', () => {
    const s = foundry();
    const so = sorter(s, 5, 5, 'wood');
    // Facing right, its sort side is (5,6); this conduit there takes only from its left.
    place(s, 'conduit', 5, 6, 'right', { inFrom: 'left' });
    so.item = 'wood';
    settle(s);
    expect(so.item).toBe('wood');
  });

  it('is fed by a hopper behind it', () => {
    const s = foundry();
    const h = put<HopperState>(s, 'hopper', 4, 5, 'right');
    h.item = 'wood';
    h.count = 2;
    sorter(s, 5, 5, 'wood');
    const side = put<CrateState>(s, 'crate', 5, 6);
    run(s, HOPPER_TICKS * 3 + CONDUIT_TICKS * 3);
    expect(side.contents).toEqual({ wood: 2 });
  });

  it('can be walked over, like a conduit', () => {
    const s = foundry();
    sorter(s, STAND.tx - 1, STAND.ty, null);
    run(s, 30, { moveX: -1 });
    expect(s.player.x).toBeLessThan(tileCentre(STAND).x - TILE_SIZE / 2);
  });

  it('gives its held item back when picked up', () => {
    const s = foundry();
    const so = sorter(s, 5, 5, 'wood');
    so.item = 'wood';
    run(s, 1, { pickUp: { tx: 5, ty: 5 } });
    expect(s.events.pickUps[0]?.items).toEqual({ wood: 1 });
  });

  it('is joined as a corner by a conduit placed on its sort side, but not on its other side', () => {
    const s = foundry();
    sorter(s, 5, 5, 'wood');
    expect(put<ConduitState>(s, 'conduit', 5, 6, 'right').inFrom).toBe('up');
    expect(put<ConduitState>(s, 'conduit', 5, 4, 'right').inFrom).toBe('left');
  });

  it('shows its filter and side in the summary', () => {
    const s = foundry();
    sorter(s, 5, 5, 'stone', true);
    expect(summarize(s).foundry.pieces[0]).toMatchObject({ pieceId: 'sorter', filter: 'stone', mirrored: true, item: null });
  });
});

describe('setting a sorter', () => {
  it('works in reach and clears with null', () => {
    const s = foundry();
    const so = sorter(s, 5, 5, null);
    const at = tileCentre({ tx: 5, ty: 6 });
    movePlayer(s, at.x, at.y);
    run(s, 1, { setFilter: { id: so.id, itemId: 'fiber' } });
    expect(so.filter).toBe('fiber');
    run(s, 1, { setFilter: { id: so.id, itemId: null } });
    expect(so.filter).toBeNull();
  });

  it('ignores an item that does not exist', () => {
    const s = foundry();
    const so = sorter(s, 5, 5, 'wood');
    const at = tileCentre({ tx: 5, ty: 6 });
    movePlayer(s, at.x, at.y);
    run(s, 1, { setFilter: { id: so.id, itemId: 'no-such-item' } });
    expect(so.filter).toBe('wood');
  });

  it('E beside it changes nothing in the sim (render opens its menu)', () => {
    const s = foundry();
    const so = sorter(s, 5, 5, 'wood');
    const at = tileCentre({ tx: 5, ty: 6 });
    movePlayer(s, at.x, at.y);
    const before = summarize(s).foundry;
    run(s, 1, { interact: true });
    expect(summarize(s).foundry).toEqual(before);
    expect(so.filter).toBe('wood');
  });

  it('does nothing out of reach', () => {
    const s = foundry();
    const so = sorter(s, 5, 5, null);
    run(s, 1, { setFilter: { id: so.id, itemId: 'fiber' } });
    expect(so.filter).toBeNull();
  });
});

describe('splitting the supply line', () => {
  it('sorts wood and stone off the port onto their own belts into crates', () => {
    const s = foundry();
    claim(s, SHRINE_ROOM);
    // The port at (1,8) hands right into (2,8). Wood drops out at (2,9), stone at (3,9), the rest runs on to (4,8).
    const a = sorter(s, 2, 8, 'wood');
    const b = sorter(s, 3, 8, 'stone');
    const wood = put<CrateState>(s, 'crate', 2, 9);
    const stone = put<CrateState>(s, 'crate', 3, 9);
    const rest = put<CrateState>(s, 'crate', 4, 8);
    run(s, PORT_TICKS * 8 + CONDUIT_TICKS * 4);
    expect(Object.keys(wood.contents)).toEqual(['wood']);
    expect(Object.keys(stone.contents)).toEqual(['stone']);
    expect(rest.contents.wood ?? 0).toBe(0);
    expect(rest.contents.stone ?? 0).toBe(0);
    expect(Object.values(rest.contents).reduce((x, y) => x + y, 0)).toBeGreaterThan(0);
    expect([a.filter, b.filter]).toEqual(['wood', 'stone']);
  });

  it('is deterministic', () => {
    const build = () => {
      const s = foundry();
      claim(s, SHRINE_ROOM);
      sorter(s, 2, 8, 'wood');
      put(s, 'crate', 2, 9);
      put(s, 'crate', 3, 8);
      run(s, PORT_TICKS * 5);
      return summarize(s).foundry;
    };
    expect(build()).toEqual(build());
  });
});
