import { describe, expect, it } from 'vitest';
import { CONDUIT_TICKS } from '../../src/data/foundry';
import { BUILD_BAR, isSolidPiece } from '../../src/data/pieces';
import { feedsIntake } from '../../src/sim/intake';
import { canPlace, place, unlockedPieces } from '../../src/sim/placement';
import type { ConduitState, CrateState, HopperState, MergerState, SplitterState } from '../../src/sim/pieces';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { run } from './fight';
import { foundry, put } from './foundryKit';

// The splitter and the merger (033): logistics pieces, never crafted; the splitter is
// on the bar from the start (046), the merger restored. A splitter deals items out its front and side in turn, falling back and waiting; a
// merger takes from its back, left and right in turn, out its front.

/** A foundry with the merger restored (046: the splitter needs no restoring). */
function restored(): SimState {
  const s = foundry();
  s.research.merger = 'restored';
  return s;
}

/** A conduit holding `item`, ready to hand it on. */
function ready(s: SimState, tx: number, ty: number, facing: 'up' | 'down' | 'left' | 'right', item: string): ConduitState {
  const c = put<ConduitState>(s, 'conduit', tx, ty, facing);
  c.item = item;
  c.progress = CONDUIT_TICKS;
  return c;
}

/** A hopper of `n` of an item feeding forward. */
function hopper(s: SimState, tx: number, ty: number, facing: 'up' | 'down' | 'left' | 'right', item: string, n: number): HopperState {
  const h = put<HopperState>(s, 'hopper', tx, ty, facing);
  h.item = item;
  h.count = n;
  return h;
}

describe('unlocking', () => {
  it('the splitter is on the bar from the start (046), the merger hidden until restored; both sit after the sorter, flat underfoot', () => {
    const s = foundry();
    expect(unlockedPieces(s)).toContain('splitter');
    expect(canPlace(s, 'splitter', 5, 5, 'right')).toBeNull();
    expect(unlockedPieces(s)).not.toContain('merger');
    expect(canPlace(s, 'merger', 5, 5, 'right')).toBe('locked');
    expect(s.research).not.toHaveProperty('splitter');
    s.research.merger = 'restored';
    expect(unlockedPieces(s)).toContain('merger');
    expect(BUILD_BAR.slice(BUILD_BAR.indexOf('sorter'), BUILD_BAR.indexOf('sorter') + 3)).toEqual(['sorter', 'splitter', 'merger']);
    expect([isSolidPiece('splitter'), isSolidPiece('merger')]).toEqual([false, false]);
    expect(summarize(s).unlocked).toContain('splitter');
  });
});

describe('a splitter', () => {
  it('alternates its items between its front and its right side', () => {
    const s = restored();
    hopper(s, 3, 5, 'right', 'wood', 6);
    put(s, 'conduit', 4, 5, 'right');
    put<SplitterState>(s, 'splitter', 5, 5, 'right');
    const front = put<CrateState>(s, 'crate', 6, 5);
    const side = put<CrateState>(s, 'crate', 5, 6);
    run(s, 400);
    expect([front.contents.wood, side.contents.wood]).toEqual([3, 3]);
  });

  it('F flips its side to the left', () => {
    const s = restored();
    const p = place(s, 'splitter', 5, 5, 'right', { mirrored: true });
    expect(p).toMatchObject({ kind: 'splitter', mirrored: true });
    hopper(s, 3, 5, 'right', 'wood', 2);
    put(s, 'conduit', 4, 5, 'right');
    const left = put<CrateState>(s, 'crate', 5, 4);
    const right = put<CrateState>(s, 'crate', 5, 6);
    const front = put<CrateState>(s, 'crate', 6, 5);
    run(s, 200);
    expect([front.contents, left.contents, right.contents]).toEqual([{ wood: 1 }, { wood: 1 }, {}]);
  });

  it('uses the other output when one will not take the item, and waits holding it when neither will', () => {
    const s = restored();
    hopper(s, 3, 5, 'right', 'wood', 4);
    put(s, 'conduit', 4, 5, 'right');
    const sp = put<SplitterState>(s, 'splitter', 5, 5, 'right');
    // Nothing on its side: every item goes out the front.
    const front = put<CrateState>(s, 'crate', 6, 5);
    run(s, 300);
    expect(front.contents.wood).toBe(4);
    // Nothing on either output: it holds its item and the line backs up.
    const t = restored();
    const c = ready(t, 4, 5, 'right', 'wood');
    const held = put<SplitterState>(t, 'splitter', 5, 5, 'right');
    run(t, CONDUIT_TICKS * 3);
    expect(held.item).toBe('wood');
    c.item = 'stone';
    c.progress = CONDUIT_TICKS;
    run(t, CONDUIT_TICKS);
    expect([held.item, c.item]).toEqual(['wood', 'stone']);
    expect(sp.item).toBeNull();
  });

  it('takes items only from its back', () => {
    const s = restored();
    const sp = put<SplitterState>(s, 'splitter', 5, 5, 'right');
    const fromSide = ready(s, 5, 4, 'down', 'wood');
    run(s, CONDUIT_TICKS + 2);
    expect([fromSide.item, sp.item]).toEqual(['wood', null]);
  });
});

describe('a merger', () => {
  it('takes from its back, left and right in turn, so no input starves', () => {
    const s = restored();
    // Facing right at (6, 6): back from the west, left from the north, right from the south.
    hopper(s, 4, 6, 'right', 'wood', 9);
    put(s, 'conduit', 5, 6, 'right');
    hopper(s, 6, 4, 'down', 'stone', 9);
    put(s, 'conduit', 6, 5, 'down');
    hopper(s, 6, 8, 'up', 'fiber', 9);
    put(s, 'conduit', 6, 7, 'up');
    const m = put<MergerState>(s, 'merger', 6, 6, 'right');
    const out = put<ConduitState>(s, 'conduit', 7, 6, 'right');
    put(s, 'crate', 8, 6);
    const order: string[] = [];
    for (let t = 0; t < 400 && order.length < 9; t++) {
      run(s, 1);
      if (out.item && out.progress === 0) order.push(out.item);
    }
    expect(order).toEqual(['wood', 'stone', 'fiber', 'wood', 'stone', 'fiber', 'wood', 'stone', 'fiber']);
    expect(m.kind).toBe('merger');
  });

  it('skips an input with nothing ready rather than waiting on it', () => {
    const s = restored();
    hopper(s, 6, 4, 'down', 'stone', 3);
    put(s, 'conduit', 6, 5, 'down');
    put<MergerState>(s, 'merger', 6, 6, 'right');
    const crate = put<CrateState>(s, 'crate', 7, 6);
    run(s, 300);
    expect(crate.contents.stone).toBe(3);
  });

  it('a blocked front stalls it, and its inputs back up', () => {
    const s = restored();
    const back = ready(s, 5, 6, 'right', 'wood');
    const m = put<MergerState>(s, 'merger', 6, 6, 'right');
    run(s, CONDUIT_TICKS * 3);
    expect(m.item).toBe('wood');
    back.item = 'stone';
    back.progress = CONDUIT_TICKS;
    run(s, CONDUIT_TICKS * 2);
    expect([m.item, back.item]).toEqual(['wood', 'stone']);
  });

  it('never takes from its front; its front can feed the intake', () => {
    const s = restored();
    const m = put<MergerState>(s, 'merger', 6, 6, 'right');
    const ahead = ready(s, 7, 6, 'left', 'wood');
    run(s, CONDUIT_TICKS + 2);
    expect([ahead.item, m.item]).toEqual(['wood', null]);
    put(s, 'merger', 12, 1, 'up');
    expect(feedsIntake(s.foundry)).toBe(true);
  });

  it('getState reports both pieces', () => {
    const s = restored();
    put(s, 'splitter', 5, 5, 'up');
    put(s, 'merger', 7, 5, 'left');
    expect(summarize(s).foundry.pieces).toEqual([
      expect.objectContaining({ kind: 'splitter', item: null, mirrored: false, next: 'front' }),
      expect.objectContaining({ kind: 'merger', item: null, turn: 0 }),
    ]);
  });
});
