import { describe, expect, it } from 'vitest';
import { amountOf } from '../../src/sim/foundryUse';
import type { HopperAmount } from '../../src/sim/input';
import type { HopperState } from '../../src/sim/pieces';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer, run } from './fight';
import { foundry, put } from './foundryKit';

// 022: a click moves one, Shift+click half (rounded up), Ctrl+click the whole stack,
// both into a hopper and out of it.

const COUNTS = [1, 2, 5, 30] as const;
const AMOUNTS: readonly HopperAmount[] = ['one', 'half', 'all'];
const EXPECTED: Record<HopperAmount, Record<(typeof COUNTS)[number], number>> = {
  one: { 1: 1, 2: 1, 5: 1, 30: 1 },
  half: { 1: 1, 2: 1, 5: 3, 30: 15 },
  all: { 1: 1, 2: 2, 5: 5, 30: 30 },
};

/** A hopper at (5, 5) facing up, with the player standing just below it, in reach. */
function setup(): { s: ReturnType<typeof foundry>; h: HopperState } {
  const s = foundry();
  const h = put<HopperState>(s, 'hopper', 5, 5, 'up');
  const { x, y } = tileCentre({ tx: 5, ty: 6 });
  movePlayer(s, x, y);
  return { s, h };
}

describe('amountOf', () => {
  for (const amount of AMOUNTS)
    for (const n of COUNTS)
      it(`${amount} of ${n} is ${EXPECTED[amount][n]}`, () => {
        expect(amountOf(amount, n)).toBe(EXPECTED[amount][n]);
      });

  it('is 0 of nothing', () => {
    for (const amount of AMOUNTS) expect(amountOf(amount, 0)).toBe(0);
  });
});

describe('deposit amounts', () => {
  for (const amount of AMOUNTS)
    for (const n of COUNTS)
      it(`${amount} of ${n} carried moves ${EXPECTED[amount][n]}`, () => {
        const { s, h } = setup();
        s.inventory = { wood: n };
        run(s, 1, { deposit: { id: h.id, itemId: 'wood', amount } });
        const moved = EXPECTED[amount][n];
        expect(h).toMatchObject({ item: 'wood', count: moved });
        expect(s.inventory.wood).toBe(n - moved);
        expect(s.events.deposits).toEqual([{ id: h.id, itemId: 'wood', count: moved }]);
      });

  it('adds to a hopper of the same item', () => {
    const { s, h } = setup();
    h.item = 'wood';
    h.count = 4;
    s.inventory = { wood: 5 };
    run(s, 1, { deposit: { id: h.id, itemId: 'wood', amount: 'half' } });
    expect([h.count, s.inventory.wood]).toEqual([7, 2]);
  });

  it('refuses a different item into a non-empty hopper, at every amount', () => {
    const { s, h } = setup();
    h.item = 'stone';
    h.count = 1;
    s.inventory = { wood: 5 };
    for (const amount of AMOUNTS) run(s, 1, { deposit: { id: h.id, itemId: 'wood', amount } });
    expect(h).toMatchObject({ item: 'stone', count: 1 });
    expect(s.inventory.wood).toBe(5);
  });

  it('moves nothing of an item not carried', () => {
    const { s, h } = setup();
    s.inventory = {};
    run(s, 1, { deposit: { id: h.id, itemId: 'wood', amount: 'one' } });
    expect(h).toMatchObject({ item: null, count: 0 });
    expect(s.events.deposits).toEqual([]);
  });
});

describe('withdraw amounts', () => {
  for (const amount of AMOUNTS)
    for (const n of COUNTS)
      it(`${amount} of ${n} in the hopper moves ${EXPECTED[amount][n]}`, () => {
        const { s, h } = setup();
        h.item = 'wood';
        h.count = n;
        h.timer = 3;
        s.inventory = { wood: 2 };
        run(s, 1, { withdraw: { id: h.id, amount } });
        const moved = EXPECTED[amount][n];
        const left = n - moved;
        expect(h.count).toBe(left);
        expect(s.inventory.wood).toBe(2 + moved);
        expect(s.events.withdraws).toEqual([{ id: h.id, itemId: 'wood', count: moved }]);
        // The hopper keeps its type while any are left, and forgets it (and its timer) at 0.
        if (left > 0) expect(h.item).toBe('wood');
        else expect(h).toMatchObject({ item: null, timer: 0 });
      });

  it('emptied one at a time, a hopper forgets its type and takes a new one', () => {
    const { s, h } = setup();
    h.item = 'stone';
    h.count = 2;
    s.inventory = { wood: 3 };
    run(s, 1, { withdraw: { id: h.id, amount: 'one' } });
    expect(h).toMatchObject({ item: 'stone', count: 1 });
    run(s, 1, { deposit: { id: h.id, itemId: 'wood', amount: 'all' } });
    expect(h).toMatchObject({ item: 'stone', count: 1 });
    run(s, 1, { withdraw: { id: h.id, amount: 'one' } });
    expect(h).toMatchObject({ item: null, count: 0 });
    run(s, 1, { deposit: { id: h.id, itemId: 'wood', amount: 'all' } });
    expect(h).toMatchObject({ item: 'wood', count: 3 });
    expect(s.inventory).toMatchObject({ stone: 2, wood: 0 });
  });
});
