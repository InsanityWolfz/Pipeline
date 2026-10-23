import { describe, expect, it } from 'vitest';
import { NODE_SPRITES } from '../../src/data/assets';
import { EMBERWORKS_SPRITES } from '../../src/data/emberworksAssets';
import { nodeDef, NODES, REGROW_STAGES } from '../../src/data/nodes';
import { harvestTarget, nodeFrame, regrowStage } from '../../src/render/nodeStages';

// 018: a node's look follows its uses and regrow timer; the pylon reaches for the nearest node of a raw.

describe('node looks', () => {
  it('shows one look per use left (060: a cinder vent while open)', () => {
    for (const id of Object.keys(NODES)) {
      const c = NODES[id]?.cycle;
      const phase = c ? c.closedTicks + c.warnTicks : 0;
      const looks = [3, 2, 1].map((uses) => nodeFrame({ nodeId: id, uses, regrow: 0, phase }));
      expect(new Set(looks).size).toBe(3);
      expect(looks[0]).toBe(NODE_SPRITES[id]?.uses[2]);
    }
  });

  it('shows a cinder vent closed and warning while it has uses, and its spent cone once used up, whatever its cycle (060)', () => {
    const c = nodeDef('cinder-vent').cycle;
    if (!c) throw new Error('no cycle');
    expect(nodeFrame({ nodeId: 'cinder-vent', uses: 2, regrow: 0, phase: 0 })).toBe(EMBERWORKS_SPRITES.vent.closed);
    expect(nodeFrame({ nodeId: 'cinder-vent', uses: 2, regrow: 0, phase: c.closedTicks })).toBe(EMBERWORKS_SPRITES.vent.warning);
    expect(nodeFrame({ nodeId: 'cinder-vent', uses: 0, regrow: 10, phase: 0 })).toBe(NODE_SPRITES['cinder-vent']?.regrow[REGROW_STAGES]);
  });

  it('grows back through at least 3 stages after the bare remains', () => {
    const ticks = nodeDef('tree').regrowTicks;
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
