import { describe, expect, it } from 'vitest';
import { nodeDef } from '../../src/data/nodes';
import { createNode, harvestable, stepNodes, useNode } from '../../src/sim/nodes';

// 051 (B.4): harvestable nodes glow; a used-up node loses it until it regrows.

describe('the harvestable glow (051)', () => {
  it('follows use and regrow', () => {
    const n = createNode(0, 'rubble', { x: 0, y: 0 }, 'overworld');
    expect(harvestable(n)).toBe(true);
    for (let i = 0; i < nodeDef('rubble').uses - 1; i++) useNode(n);
    expect(harvestable(n)).toBe(true);
    useNode(n);
    expect(harvestable(n)).toBe(false);
    for (let t = 0; t < nodeDef('rubble').regrowTicks - 1; t++) stepNodes([n]);
    expect(harvestable(n)).toBe(false);
    stepNodes([n]);
    expect(harvestable(n)).toBe(true);
  });
});
