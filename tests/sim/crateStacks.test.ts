import { describe, expect, it } from 'vitest';
import { CONDUIT_TICKS, CRATE_SLOTS } from '../../src/data/foundry';
import { stackSize } from '../../src/data/items';
import { crateRoom } from '../../src/sim/crateSlots';
import { deposit } from '../../src/sim/foundryUse';
import type { ConduitState, CrateState } from '../../src/sim/pieces';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer, run } from './fight';
import { foundry, put } from './foundryKit';

// 050 (A.12, Shaun): "the crates have like 8 slots, but they're maxing out at 100, so maybe make those 8 slots
// available." Each of a crate's 8 slots holds a stack, 047's stack sizes (raws 50, rounds 100, thrown 20).

describe('crate slots (050)', () => {
  it('has 8 slots, each a stack', () => {
    expect(CRATE_SLOTS).toBe(8);
    expect(crateRoom({}, 'wood')).toBe(8 * stackSize('wood'));
    expect(crateRoom({}, 'arrow')).toBe(8 * stackSize('arrow'));
    expect(crateRoom({}, 'bomb')).toBe(8 * stackSize('bomb'));
  });

  it('counts the slots other kinds fill, and the room left in a part-filled stack', () => {
    // 120 arrows fill 2 slots (100 + 20), 30 wood 1: 5 slots left for wood, plus the 20 in its own stack.
    expect(crateRoom({ arrow: 120, wood: 30 }, 'wood')).toBe(5 * 50 + 20);
    // 8 slots taken: no room for a new kind, none for a full kind.
    expect(crateRoom({ wood: 350, stone: 1 }, 'fiber')).toBe(0);
    expect(crateRoom({ wood: 400 }, 'wood')).toBe(0);
  });

  it('takes deposits up to 8 stacks: 400 wood, then no ninth kind', () => {
    const s = foundry();
    const crate = put<CrateState>(s, 'crate', 10, 8);
    const at = tileCentre({ tx: 10, ty: 9 });
    movePlayer(s, at.x, at.y);
    s.inventory = { wood: 450, stone: 10 };
    deposit(s, crate.id, 'wood', 'all');
    expect(crate.contents).toEqual({ wood: 400 });
    expect(s.inventory.wood).toBe(50);
    deposit(s, crate.id, 'stone', 'all');
    expect(crate.contents).toEqual({ wood: 400 });
  });

  it('fills from a line past the old 99, up to its 8 stacks', () => {
    const s = foundry();
    const c = put<ConduitState>(s, 'conduit', 4, 5);
    const crate = put<CrateState>(s, 'crate', 5, 5);
    crate.contents = { arrow: 799 };
    c.item = 'arrow';
    run(s, CONDUIT_TICKS);
    expect(crate.contents).toEqual({ arrow: 800 });
    c.item = 'arrow';
    run(s, CONDUIT_TICKS);
    expect(c.item).toBe('arrow');
    expect(crate.contents).toEqual({ arrow: 800 });
  });
});
