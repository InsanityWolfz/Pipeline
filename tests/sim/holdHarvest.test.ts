import { describe, expect, it } from 'vitest';
import { FEET_BOX } from '../../src/data/player';
import { nodeDef } from '../../src/data/nodes';
import { heldPart, NO_COMMAND } from '../../src/sim/input';
import { arena, placeNode, PLAYER_AT, run } from './fight';

// 070: holding E on a node keeps harvesting, one use per channel, until the node is empty, the player moves or E is
// released. A single press still harvests once.

const TREE = nodeDef('tree');
const CHANNEL = TREE.harvestTicks;

/** The arena with a tree just right of the player's feet, in reach. */
function beside() {
  const s = arena();
  const n = placeNode(s, 'tree', PLAYER_AT.x + FEET_BOX.w / 2 + 4 + TREE.feetBox.w / 2, PLAYER_AT.y);
  return { s, n };
}

/** E pressed this tick and held. */
const PRESS = { interact: true, interactHeld: true } as const;
const HELD = { interactHeld: true } as const;

describe('hold E to harvest (070)', () => {
  it('holding E harvests channel after channel until the node is empty, then stops', () => {
    const { s, n } = beside();
    run(s, 1, PRESS);
    run(s, CHANNEL * TREE.uses - 1, HELD);
    expect(n.uses).toBe(0);
    expect(s.harvest).toBeNull();
    // Still held, nothing more starts on the empty node.
    run(s, CHANNEL, HELD);
    expect(s.harvest).toBeNull();
    expect(n.uses).toBe(0);
  });

  it('each channel takes the full harvest time', () => {
    const { s, n } = beside();
    run(s, 1, PRESS);
    run(s, CHANNEL - 2, HELD);
    expect(n.uses).toBe(TREE.uses);
    run(s, 1, HELD);
    expect(n.uses).toBe(TREE.uses - 1);
    run(s, CHANNEL - 1, HELD);
    expect(n.uses).toBe(TREE.uses - 1);
    run(s, 1, HELD);
    expect(n.uses).toBe(TREE.uses - 2);
  });

  it('a single press still harvests once', () => {
    const { s, n } = beside();
    run(s, 1, PRESS);
    run(s, CHANNEL * TREE.uses);
    expect(n.uses).toBe(TREE.uses - 1);
    expect(s.harvest).toBeNull();
  });

  it('letting go of E mid-channel finishes that channel and starts no other', () => {
    const { s, n } = beside();
    run(s, 1, PRESS);
    run(s, CHANNEL + 5, HELD);
    expect(n.uses).toBe(TREE.uses - 1);
    expect(s.harvest?.nodeId).toBe(n.id);
    run(s, CHANNEL * 2);
    expect(n.uses).toBe(TREE.uses - 2);
    expect(s.harvest).toBeNull();
  });

  it('moving ends the chain, and it stays ended when the player stops with E still held', () => {
    const { s, n } = beside();
    run(s, 1, PRESS);
    run(s, 10, HELD);
    run(s, 1, { ...HELD, moveY: 1 });
    expect(s.harvest).toBeNull();
    run(s, CHANNEL * 2, HELD);
    expect(s.harvest).toBeNull();
    expect(n.uses).toBe(TREE.uses);
  });

  it('E held without a press starts nothing', () => {
    const { s, n } = beside();
    run(s, CHANNEL * 2, HELD);
    expect(s.harvest).toBeNull();
    expect(n.uses).toBe(TREE.uses);
  });

  it('a held command keeps E held after its first tick', () => {
    expect(heldPart({ ...NO_COMMAND, ...PRESS }).interactHeld).toBe(true);
    expect(heldPart({ ...NO_COMMAND, ...PRESS }).interact).toBe(false);
    expect(NO_COMMAND.interactHeld).toBe(false);
  });
});
