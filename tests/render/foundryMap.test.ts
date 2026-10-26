import { describe, expect, it } from 'vitest';
import { FOUNDRY_MAP } from '../../src/data/foundryMap';
import { TUTORIAL_START } from '../../src/data/player';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { foundryMapBox, foundryMapItems } from '../../src/render/foundryMap';
import { layArrowLine } from '../sim/guidedKit';
import { createSim } from '../../src/sim/state';
import { foundry, put } from '../sim/foundryKit';

// 051 (B.6): the foundry's minimap: conduits as lines, machines as dots, icons for the tube, bench, stash, door,
// entrances and ports. Items moving aren't shown.

describe('the foundry map (051)', () => {
  it("sits in the overworld minimap's corner, the foundry's tiles at its scale", () => {
    const box = foundryMapBox();
    expect(box).toEqual({ x: 640 - FOUNDRY_MAP.margin - 24 * FOUNDRY_MAP.scale, y: FOUNDRY_MAP.margin, w: 24 * FOUNDRY_MAP.scale, h: 16 * FOUNDRY_MAP.scale });
  });

  it("shows the guided arrow line (067): its conduits as lines, two a conduit, and its four machines as dots", () => {
    const s = createSim(1, { start: TUTORIAL_START });
    s.roomId = FOUNDRY_ROOM;
    layArrowLine(s);
    const conduits = s.foundry.pieces.filter((p) => p.kind === 'conduit').length;
    const map = foundryMapItems(s);
    expect(map.lines).toHaveLength(conduits * 2);
    expect(map.dots.filter((d) => d.kind === 'machine')).toHaveLength(4);
    expect(map.dots.filter((d) => d.kind === 'hopper')).toHaveLength(0);
    // The conduit at (12, 2) runs up: from its bottom edge to its top edge, through its centre.
    const { x, y } = foundryMapBox();
    const k = FOUNDRY_MAP.scale;
    expect(map.lines).toContainEqual({ x1: x + 12.5 * k, y1: y + 3 * k, x2: x + 12.5 * k, y2: y + 2.5 * k });
    expect(map.lines).toContainEqual({ x1: x + 12.5 * k, y1: y + 2.5 * k, x2: x + 12.5 * k, y2: y + 2 * k });
  });

  it('marks the tube, the bench, the stash, the door, the open centre entrance, the player, and a port once claimed', () => {
    const s = createSim(1, { start: TUTORIAL_START });
    s.roomId = FOUNDRY_ROOM;
    expect(foundryMapItems(s).icons.map((i) => i.kind).sort()).toEqual(['bench', 'door', 'entrance', 'player', 'stash', 'tube']);
    s.fixtures.push({ id: 'stone-port', item: null, timer: 0 });
    expect(foundryMapItems(s).icons.find((i) => i.kind === 'port')?.itemId).toBe('stone');
  });

  it("052: an underground pair's ends are lines like a conduit's (back to front), with no line drawn under the floor", () => {
    const s = foundry(false);
    put(s, 'underground-entrance', 6, 6, 'right');
    put(s, 'underground-exit', 9, 6, 'right');
    const map = foundryMapItems(s);
    const { x, y } = foundryMapBox();
    const k = FOUNDRY_MAP.scale;
    expect(map.dots).toHaveLength(0);
    expect(map.lines).toEqual([
      { x1: x + 6 * k, y1: y + 6.5 * k, x2: x + 6.5 * k, y2: y + 6.5 * k },
      { x1: x + 6.5 * k, y1: y + 6.5 * k, x2: x + 7 * k, y2: y + 6.5 * k },
      { x1: x + 9 * k, y1: y + 6.5 * k, x2: x + 9.5 * k, y2: y + 6.5 * k },
      { x1: x + 9.5 * k, y1: y + 6.5 * k, x2: x + 10 * k, y2: y + 6.5 * k },
    ]);
  });

  it("052: the bench's icon sits at its spot just inside the door, (22, 9)", () => {
    const s = createSim(1, { start: TUTORIAL_START });
    s.roomId = FOUNDRY_ROOM;
    const { x, y } = foundryMapBox();
    const k = FOUNDRY_MAP.scale;
    expect(foundryMapItems(s).icons.find((i) => i.kind === 'bench')).toEqual({ kind: 'bench', x: x + 22.5 * k, y: y + 9.5 * k });
  });
});
