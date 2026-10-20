import { describe, expect, it } from 'vitest';
import { STACK_SIZES, stackSize } from '../../src/data/items';
import { CRATE_CAP } from '../../src/data/foundry';
import { containerStacks, gridSlots, gridStacks, stacksOf } from '../../src/sim/bag';
import type { CrateState, HopperState } from '../../src/sim/pieces';
import { run } from './fight';
import { foundry, put } from './foundryKit';

// 047 (note 12): the grid inventory. Each slot holds one stack, stack sizes in data (047.1); the grid's order is the
// order kinds were first carried, and Sort orders it by group then item. Click moves one, Shift half, Ctrl the whole
// stack, into an open hopper or crate, or back; a hopper's screen shows only the hopper's own stacks.

describe('stack sizes (047.1)', () => {
  it('are 50 for resources, 100 for parts and rounds, 20 for bombs and landmines, 1 for gear', () => {
    expect(STACK_SIZES).toMatchObject({ raw: 50, part: 100, round: 100, thrown: 20, armor: 1 });
    expect(['wood', 'rimestone', 'ley-iron'].map(stackSize)).toEqual([50, 50, 50]);
    expect(['shaft', 'iron-plate', 'warden-core'].map(stackSize)).toEqual([100, 100, 100]);
    expect(['arrow', 'arrow+frost', 'ley-bolt+homing'].map(stackSize)).toEqual([100, 100, 100]);
    expect(['bomb', 'bomb+frost+cluster', 'landmine', 'landmine+frost'].map(stackSize)).toEqual([20, 20, 20, 20]);
    expect(stackSize('unidentified-armor')).toBe(1);
  });

  it('split a count into full stacks and a remainder', () => {
    expect(stacksOf('wood', 120).map((st) => st.count)).toEqual([50, 50, 20]);
    expect(stacksOf('bomb', 20).map((st) => st.count)).toEqual([20]);
    expect(stacksOf('unidentified-armor', 3).map((st) => st.count)).toEqual([1, 1, 1]);
    expect(stacksOf('arrow', 0)).toEqual([]);
  });
});

describe('the grid', () => {
  it('lists kinds in the order first carried, each its stacks; a used-up kind leaves, a new one goes on the end', () => {
    const s = foundry();
    s.inventory = { stone: 60 };
    run(s, 1);
    s.inventory.arrow = 140;
    run(s, 1);
    s.inventory.wood = 3;
    run(s, 1);
    expect(gridStacks(s).map((st) => [st.itemId, st.count])).toEqual([['stone', 50], ['stone', 10], ['arrow', 100], ['arrow', 40], ['wood', 3]]);
    s.inventory.stone = 0;
    run(s, 1);
    s.inventory.stone = 5;
    run(s, 1);
    expect(s.bag).toEqual(['arrow', 'wood', 'stone']);
  });

  it('sorts by group (Raw, Parts, Ammo, Gear, Cores), then by item', () => {
    const s = foundry();
    s.inventory = { 'warden-core': 1, arrow: 5, 'unidentified-armor': 1, shaft: 2, wood: 4, stone: 1 };
    run(s, 1);
    run(s, 1, { sortInventory: true });
    expect(s.bag).toEqual(['wood', 'stone', 'shaft', 'arrow', 'unidentified-armor', 'warden-core']);
  });

  it('marks what a death would take (031): a kind\'s safe items fill its first stacks', () => {
    const s = foundry();
    s.inventory = { wood: 70, stone: 4 };
    s.banked = { wood: 60, stone: 4 };
    run(s, 1);
    expect(gridSlots(s).map((g) => [g.itemId, g.count, g.atRisk])).toEqual([['wood', 50, 0], ['wood', 20, 10], ['stone', 4, 0]]);
  });

  it('keeps going past 40 slots (047.2: no limit; the grid scrolls)', () => {
    const s = foundry();
    s.inventory = { 'unidentified-armor': 45 };
    run(s, 1);
    expect(gridStacks(s)).toHaveLength(45);
  });
});

describe('moving stacks to and from a hopper (047)', () => {
  /** The foundry with the player beside a hopper. */
  function atHopper() {
    const s = foundry();
    const h = put<HopperState>(s, 'hopper', 5, 5, 'down');
    s.player.x = (5 + 0.5) * 32;
    s.player.y = (6 + 0.5) * 32;
    return { s, h };
  }

  it('click moves one, Shift half the stack and Ctrl the whole stack, in', () => {
    const { s, h } = atHopper();
    s.inventory = { wood: 120 };
    run(s, 1, { deposit: { id: h.id, itemId: 'wood', amount: 'one', stack: 50 } });
    expect([s.inventory.wood, h.count]).toEqual([119, 1]);
    run(s, 1, { deposit: { id: h.id, itemId: 'wood', amount: 'half', stack: 50 } });
    expect([s.inventory.wood, h.count]).toEqual([94, 26]);
    run(s, 1, { deposit: { id: h.id, itemId: 'wood', amount: 'all', stack: 44 } });
    expect([s.inventory.wood, h.count]).toEqual([50, 70]);
  });

  it('and out, by the hopper\'s own stack clicked', () => {
    const { s, h } = atHopper();
    s.inventory = {};
    Object.assign(h, { item: 'wood', count: 70 });
    expect(containerStacks({ wood: h.count }).map((st) => st.count)).toEqual([50, 20]);
    run(s, 1, { withdraw: { id: h.id, amount: 'all', stack: 20 } });
    expect([s.inventory.wood, h.count]).toEqual([20, 50]);
    run(s, 1, { withdraw: { id: h.id, amount: 'half', stack: 50 } });
    expect([s.inventory.wood, h.count]).toEqual([45, 25]);
    run(s, 1, { withdraw: { id: h.id, amount: 'one', stack: 25 } });
    expect([s.inventory.wood, h.count]).toEqual([46, 24]);
  });

  it('a hopper holding another kind takes nothing', () => {
    const { s, h } = atHopper();
    s.inventory = { stone: 5 };
    Object.assign(h, { item: 'wood', count: 3 });
    run(s, 1, { deposit: { id: h.id, itemId: 'stone', amount: 'all', stack: 5 } });
    expect([s.inventory.stone, h.count]).toEqual([5, 3]);
  });
});

describe('a crate\'s screen (047: the same grid, the same clicks)', () => {
  it('takes stacks of any kind up to its cap, and gives them back by kind', () => {
    const s = foundry();
    const c = put<CrateState>(s, 'crate', 5, 5, 'down');
    s.player.x = (5 + 0.5) * 32;
    s.player.y = (6 + 0.5) * 32;
    s.inventory = { wood: 80, arrow: 100 };
    run(s, 1, { deposit: { id: c.id, itemId: 'wood', amount: 'all', stack: 50 } });
    run(s, 1, { deposit: { id: c.id, itemId: 'arrow', amount: 'all', stack: 100 } });
    expect(c.contents).toEqual({ wood: 50, arrow: CRATE_CAP - 50 });
    expect(s.inventory.arrow).toBe(100 - (CRATE_CAP - 50));
    run(s, 1, { withdraw: { id: c.id, amount: 'half', itemId: 'wood', stack: 50 } });
    expect([c.contents.wood, s.inventory.wood]).toEqual([25, 55]);
    run(s, 1, { interact: true });
    expect(c.contents.wood).toBe(25);
  });
});
