import { describe, expect, it } from 'vitest';
import { OVERWORLD_ROOM } from '../../src/data/overworld';
import { SET_PIECES, setPieceAnchor } from '../../src/data/setPieces';
import { createSim } from '../../src/sim/state';
import { nameAt } from '../../src/render/hoverNames';

// 077: hovering a set piece shows its name, like other world names (015), with no description.

describe('set piece hover names (077)', () => {
  const sim = createSim(1);
  sim.enemies = [];
  it.each(SET_PIECES.map((p) => [p.id, p] as const))('%s', (_, p) => {
    const a = setPieceAnchor(p, 32);
    const hit = nameAt(sim, OVERWORLD_ROOM, a.x, a.y - p.look.h / 2);
    expect(hit?.name).toBe(p.name);
    expect(hit?.description).toBeUndefined();
    expect(hit?.rise).toBe(p.look.h);
  });
});
