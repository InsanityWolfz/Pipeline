import { describe, expect, it } from 'vitest';
import { FOUNDRY_MAP } from '../../src/data/foundryMap';
import { TUTORIAL_START } from '../../src/data/player';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { foundryMapBox, foundryMapItems } from '../../src/render/foundryMap';
import { placeExampleLine } from '../../src/sim/exampleLine';
import { createSim } from '../../src/sim/state';

// 051 (B.6): the foundry's minimap: conduits as lines, machines as dots, icons for the tube, bench, stash, door,
// entrances and ports. Items moving aren't shown.

describe('the foundry map (051)', () => {
  it("sits in the overworld minimap's corner, the foundry's tiles at its scale", () => {
    const box = foundryMapBox();
    expect(box).toEqual({ x: 640 - FOUNDRY_MAP.margin - 24 * FOUNDRY_MAP.scale, y: FOUNDRY_MAP.margin, w: 24 * FOUNDRY_MAP.scale, h: 16 * FOUNDRY_MAP.scale });
  });

  it('shows the example line: two conduits as lines, four machines and three hoppers as dots', () => {
    const s = createSim(1, { start: TUTORIAL_START });
    s.roomId = FOUNDRY_ROOM;
    placeExampleLine(s);
    const map = foundryMapItems(s);
    expect(map.lines).toHaveLength(4);
    expect(map.dots.filter((d) => d.kind === 'machine')).toHaveLength(4);
    expect(map.dots.filter((d) => d.kind === 'hopper')).toHaveLength(3);
    // The conduit at (12, 2) runs up: from its bottom edge to its top edge, through its centre.
    const { x, y } = foundryMapBox();
    const k = FOUNDRY_MAP.scale;
    expect(map.lines[0]).toEqual({ x1: x + 12.5 * k, y1: y + 3 * k, x2: x + 12.5 * k, y2: y + 2.5 * k });
    expect(map.lines[1]).toEqual({ x1: x + 12.5 * k, y1: y + 2.5 * k, x2: x + 12.5 * k, y2: y + 2 * k });
  });

  it('marks the tube, the bench, the stash, the door, the open centre entrance, the player, and a port once claimed', () => {
    const s = createSim(1, { start: TUTORIAL_START });
    s.roomId = FOUNDRY_ROOM;
    expect(foundryMapItems(s).icons.map((i) => i.kind).sort()).toEqual(['bench', 'door', 'entrance', 'player', 'stash', 'tube']);
    s.fixtures.push({ id: 'stone-port', item: null, timer: 0 });
    expect(foundryMapItems(s).icons.find((i) => i.kind === 'port')?.itemId).toBe('stone');
  });
});
