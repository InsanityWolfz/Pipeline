import { describe, expect, it } from 'vitest';
import { NODE_SPRITES } from '../../src/data/assets';
import { NODES, REGROW_STAGES } from '../../src/data/nodes';
import { harvestTarget, nodeFrame, regrowStage } from '../../src/render/nodeStages';

// 018: a node's look follows its uses and regrow timer; the pylon reaches for the nearest node of a raw.

describe('node looks', () => {
  it('shows one look per use left', () => {
    for (const id of Object.keys(NODES)) {
      const looks = [3, 2, 1].map((uses) => nodeFrame({ nodeId: id, uses, regrow: 0 }));
      expect(new Set(looks).size).toBe(3);
      expect(looks[0]).toBe(NODE_SPRITES[id]?.uses[2]);
    }
  });

  it('grows back through at least 3 stages after the bare remains', () => {
    const ticks = 1800;
    expect(REGROW_STAGES).toBeGreaterThanOrEqual(3);
    expect(regrowStage(ticks, ticks)).toBe(0);
    const seen: number[] = [];
    for (let r = ticks; r >= 1; r--) {
      const s = regrowStage(r, ticks);
      if (seen[seen.length - 1] !== s) seen.push(s);
    }
    expect(seen).toEqual(Array.from({ length: REGROW_STAGES + 1 }, (_, i) => i));
    expect(nodeFrame({ nodeId: 'tree', uses: 0, regrow: ticks })).toBe(NODE_SPRITES.tree?.regrow[0]);
    expect(nodeFrame({ nodeId: 'tree', uses: 0, regrow: 1 })).toBe(NODE_SPRITES.tree?.regrow[REGROW_STAGES]);
  });
});

describe("the pylon's harvest", () => {
  const nodes = [
    { nodeId: 'tree', roomId: 'overworld', x: 100, y: 0 },
    { nodeId: 'tree', roomId: 'overworld', x: 40, y: 0 },
    { nodeId: 'rubble', roomId: 'overworld', x: 10, y: 0 },
    { nodeId: 'tree', roomId: 'foundry', x: 5, y: 0 },
  ];

  it('picks the nearest node of the raw in reach', () => {
    expect(harvestTarget(nodes, 'overworld', 'wood', { x: 0, y: 0 }, 320)).toBe(nodes[1]);
    expect(harvestTarget(nodes, 'overworld', 'stone', { x: 0, y: 0 }, 320)).toBe(nodes[2]);
  });

  it('finds nothing out of reach or of another raw', () => {
    expect(harvestTarget(nodes, 'overworld', 'wood', { x: 0, y: 0 }, 30)).toBeUndefined();
    expect(harvestTarget(nodes, 'overworld', 'fiber', { x: 0, y: 0 }, 320)).toBeUndefined();
  });
});
