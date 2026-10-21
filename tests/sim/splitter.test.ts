import { describe, expect, it } from 'vitest';
import { CONDUIT_TICKS } from '../../src/data/foundry';
import { BUILD_BAR, isSolidPiece } from '../../src/data/pieces';
import { canPlace, place, unlockedPieces } from '../../src/sim/placement';
import type { ConduitState, CrateState, HopperState, SplitterState } from '../../src/sim/pieces';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { run } from './fight';
import { foundry, put } from './foundryKit';

// The splitter (033): a logistics piece, never crafted, on the bar from the start (046).
// It deals items out its front and side in turn, falling back and waiting.

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
  it('the splitter is on the bar from the start (046), after the conduit, flat underfoot', () => {
    const s = foundry();
    expect(unlockedPieces(s)).toContain('splitter');
    expect(canPlace(s, 'splitter', 5, 5, 'right')).toBeNull();
    expect(s.research).not.toHaveProperty('splitter');
    expect(BUILD_BAR.slice(0, 2)).toEqual(['conduit', 'splitter']);
    expect(isSolidPiece('splitter')).toBe(false);
    expect(summarize(s).unlocked).toContain('splitter');
  });
});

describe('a splitter', () => {
  it('alternates its items between its front and its right side', () => {
    const s = foundry();
    hopper(s, 3, 5, 'right', 'wood', 6);
    put(s, 'conduit', 4, 5, 'right');
    put<SplitterState>(s, 'splitter', 5, 5, 'right');
    const front = put<CrateState>(s, 'crate', 6, 5);
    const side = put<CrateState>(s, 'crate', 5, 6);
    run(s, 400);
    expect([front.contents.wood, side.contents.wood]).toEqual([3, 3]);
  });

  it('F flips its side to the left', () => {
    const s = foundry();
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
    const s = foundry();
    hopper(s, 3, 5, 'right', 'wood', 4);
    put(s, 'conduit', 4, 5, 'right');
    const sp = put<SplitterState>(s, 'splitter', 5, 5, 'right');
    // Nothing on its side: every item goes out the front.
    const front = put<CrateState>(s, 'crate', 6, 5);
    run(s, 300);
    expect(front.contents.wood).toBe(4);
    // Nothing on either output: it holds its item and the line backs up.
    const t = foundry();
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
    const s = foundry();
    const sp = put<SplitterState>(s, 'splitter', 5, 5, 'right');
    const fromSide = ready(s, 5, 4, 'down', 'wood');
    run(s, CONDUIT_TICKS + 2);
    expect([fromSide.item, sp.item]).toEqual(['wood', null]);
  });
});

describe('the summary', () => {
  it('getState reports a splitter', () => {
    const s = foundry();
    put(s, 'splitter', 5, 5, 'up');
    expect(summarize(s).foundry.pieces).toEqual([expect.objectContaining({ kind: 'splitter', item: null, mirrored: false, next: 'front' })]);
  });
});
