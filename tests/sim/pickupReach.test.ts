import { describe, expect, it, vi } from 'vitest';
import { nodeDef } from '../../src/data/nodes';
import { FEET_BOX } from '../../src/data/player';
import { arena, placeNode, PLAYER_AT, run } from './fight';

// The playtest case (021): harvest a tree standing south of it, and the log lands
// north of the tree, behind it. It's picked up without the player moving.

/** Where the next harvest drop lands, when set; else the real scatter. */
const forced = vi.hoisted(() => ({ at: null as { x: number; y: number } | null }));

vi.mock('../../src/sim/drops', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/sim/drops')>();
  return {
    ...real,
    scatterPoint: (...args: Parameters<typeof real.scatterPoint>) => forced.at ?? real.scatterPoint(...args),
  };
});

const TREE = nodeDef('tree');

describe('pickup from behind a tree (021)', () => {
  it('takes a log that landed on the far side of the tree, with the player standing still', () => {
    const s = arena();
    // The tree just north of the player, in harvest reach.
    const treeY = PLAYER_AT.y - FEET_BOX.h / 2 - 4 - TREE.feetBox.h / 2;
    placeNode(s, 'tree', PLAYER_AT.x, treeY);
    const north = { x: PLAYER_AT.x, y: treeY - TREE.feetBox.h / 2 - 6 };
    forced.at = north;
    try {
      run(s, 1, { interact: true });
      expect(s.harvest).not.toBeNull();
      run(s, TREE.harvestTicks - 1);
    } finally {
      forced.at = null;
    }
    expect(s.events.harvests).toHaveLength(1);
    // The log landed north of the tree, with the tree between it and the player, and went straight into the pack.
    expect(s.events.pickups).toEqual([expect.objectContaining({ itemId: 'wood', x: north.x, y: north.y })]);
    expect(north.y).toBeLessThan(treeY - TREE.feetBox.h / 2);
    expect(s.player.y).toBeGreaterThan(treeY + TREE.feetBox.h / 2);
    expect(s.inventory.wood).toBe(1);
    expect(s.groundItems).toEqual([]);
    expect({ x: s.player.x, y: s.player.y }).toEqual(PLAYER_AT);
  });
});
