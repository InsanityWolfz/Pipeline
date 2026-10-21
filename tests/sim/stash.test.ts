import { describe, expect, it } from 'vitest';
import { fixtureDef } from '../../src/sim/fixtures';
import type { SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { die, movePlayer, run } from './fight';
import { foundry, stepOutside } from './foundryKit';

// 052 (C.3): the stash as storage. Its screen moves stacks both ways with the same clicks as a crate's (one, Shift
// half, Ctrl the stack): `stashPut` from the inventory into the stash and `takeStash` back, standing at it. No limit.
// 052.3: the stash is always safe, as before.

/** A foundry sim with the player standing just below the stash. */
function atStash(): SimState {
  const s = foundry();
  const def = fixtureDef('stash');
  const by = tileCentre({ tx: def.tx, ty: def.ty + 1 });
  movePlayer(s, by.x, by.y);
  return s;
}

describe('the stash screen', () => {
  it('puts one, half or the clicked stack into the stash, and takes them back the same way', () => {
    const s = atStash();
    s.inventory = { wood: 70, arrow: 9 };
    run(s, 1, { stashPut: { itemId: 'wood', amount: 'one' } });
    expect([s.inventory.wood, s.stash.wood]).toEqual([69, 1]);
    // Half of the clicked stack (50 of the 69 sit in its first stack), rounded up.
    run(s, 1, { stashPut: { itemId: 'wood', amount: 'half', stack: 50 } });
    expect([s.inventory.wood, s.stash.wood]).toEqual([44, 26]);
    run(s, 1, { stashPut: { itemId: 'arrow', amount: 'all', stack: 9 } });
    expect([s.inventory.arrow ?? 0, s.stash.arrow]).toEqual([0, 9]);
    expect(s.events.stashPuts).toEqual([{ items: { arrow: 9 } }]);
    run(s, 1, { takeStash: { itemId: 'wood', amount: 'one' } });
    expect([s.inventory.wood, s.stash.wood]).toEqual([45, 25]);
    run(s, 1, { takeStash: { itemId: 'wood', amount: 'half', stack: 25 } });
    expect([s.inventory.wood, s.stash.wood]).toEqual([58, 12]);
    run(s, 1, { takeStash: { itemId: 'arrow', amount: 'all', stack: 9 } });
    expect(s.inventory.arrow).toBe(9);
    // An emptied kind leaves the stash.
    expect(s.stash).toEqual({ wood: 12 });
    expect(s.events.stashTakes).toEqual([{ items: { arrow: 9 } }]);
  });

  it('has no practical limit', () => {
    const s = atStash();
    s.inventory = { stone: 5000 };
    run(s, 1, { stashPut: { itemId: 'stone', amount: 'all' } });
    expect([s.inventory.stone ?? 0, s.stash.stone]).toEqual([0, 5000]);
  });

  it('does nothing out of reach, outside the foundry, or for items not held', () => {
    const s = foundry();
    s.inventory = { wood: 3 };
    run(s, 1, { stashPut: { itemId: 'wood', amount: 'all' } });
    expect(s.stash).toEqual({});
    const t = atStash();
    t.inventory = { wood: 3 };
    run(t, 1, { stashPut: { itemId: 'fiber', amount: 'all' } });
    run(t, 1, { takeStash: { itemId: 'fiber', amount: 'all' } });
    expect([t.inventory, t.stash]).toEqual([{ wood: 3 }, {}]);
    stepOutside(t);
    run(t, 1, { stashPut: { itemId: 'wood', amount: 'all' } });
    expect(t.stash).toEqual({});
  });

  it('a null item still takes everything (the hook and the old menu row)', () => {
    const s = atStash();
    s.inventory = {};
    s.stash = { wood: 4, arrow: 2 };
    run(s, 1, { takeStash: { itemId: null } });
    expect([s.inventory, s.stash]).toEqual([{ wood: 4, arrow: 2 }, {}]);
  });

  it('keeps what it holds through a KO (052.3)', () => {
    const s = atStash();
    s.inventory = { wood: 10 };
    run(s, 1, { stashPut: { itemId: 'wood', amount: 'all' } });
    stepOutside(s);
    die(s);
    expect(s.stash).toEqual({ wood: 10 });
  });
});
