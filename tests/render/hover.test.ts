import { describe, expect, it } from 'vitest';
import { BUILD_TIP, WORLD_NAMES } from '../../src/data/hudLayout';
import { FIXTURES } from '../../src/data/claims';
import { DESCRIPTIONS } from '../../src/data/descriptions';
import { SHRINE_SITE } from '../../src/data/rooms';
import { claim } from '../../src/sim/claims';
import { BUILD_BAR, PIECES } from '../../src/data/pieces';
import { OVERWORLD } from '../../src/data/overworld';
import { WORLD } from '../../src/sim/world';
import { arrowSpots, sorterLook, wrapText } from '../../src/render/foundryLayout';
import { sortSideOf } from '../../src/sim/pieces';
import { nameAt } from '../../src/render/hoverNames';
import { createSim } from '../../src/sim/state';
import { HALL, placeHusk, SEED } from '../sim/fight';
import { foundry, put } from '../sim/foundryKit';

const centre = (tx: number, ty: number) => ({ x: (tx + 0.5) * 32, y: (ty + 0.5) * 32 });

describe('world names on mouse-over', () => {
  it('names a foundry piece and a fixture', () => {
    const s = foundry();
    put(s, 'sorter', 5, 5);
    const at = centre(5, 5);
    expect(nameAt(s, 'foundry', at.x, at.y)?.name).toBe('Sorter');
    const bench = centre(1, 12);
    expect(nameAt(s, 'foundry', bench.x, bench.y)?.name).toBe('Identification bench');
  });

  it('names an enemy by its body, a node and a ground item', () => {
    const s = createSim(SEED, { roomId: HALL });
    s.enemies = [];
    const e = placeHusk(s, 300, 300);
    expect(nameAt(s, HALL, e.x, e.y - 12)?.name).toBe('Husk');
    const n = s.nodes.find((x) => x.roomId === HALL);
    if (!n) throw new Error('no node');
    expect(nameAt(s, HALL, n.x, n.y - 10)?.name).toBeTruthy();
    s.groundItems.push({ id: 99, itemId: 'wood', roomId: HALL, x: 500, y: 500 });
    expect(nameAt(s, HALL, 500, 498)?.name).toBe('Wood');
  });

  it('names the pylon and the tube stone, and nothing on bare ground (017: both in the overworld)', () => {
    const s = createSim(SEED, { roomId: HALL });
    const outside = WORLD[HALL];
    const shrine = outside?.pylons?.find((x) => x.site === 'shrine');
    if (!outside || !shrine) throw new Error('no pylon');
    const p = centre(shrine.tx, shrine.ty);
    expect(nameAt(s, HALL, p.x, p.y)?.name).toBe(WORLD_NAMES.pylon);
    const stone = outside.tubeStone;
    if (!stone) throw new Error('no stone');
    const t = centre(stone.tx, stone.ty);
    expect(nameAt(s, HALL, t.x, t.y)?.name).toBe(WORLD_NAMES.tubeStone);
    s.hasTube = false;
    expect(nameAt(s, HALL, t.x, t.y)?.name).toBe(WORLD_NAMES.dormantTube);
    s.enemies = [];
    s.nodes = [];
    const field = centre(OVERWORLD.field.tx, OVERWORLD.field.ty);
    expect(nameAt(s, HALL, field.x, field.y)).toBeNull();
  });

  it('says where materials come from over the pylon and a ley line (018), and what each port sends (028)', () => {
    const s = createSim(SEED, { roomId: HALL });
    s.enemies = [];
    s.nodes = [];
    const pylon = centre(OVERWORLD.shrine.pylon.tx, OVERWORLD.shrine.pylon.ty);
    expect(nameAt(s, HALL, pylon.x, pylon.y)?.description).toBe(DESCRIPTIONS.pylonDormant);
    claim(s, SHRINE_SITE);
    expect(nameAt(s, HALL, pylon.x, pylon.y)?.description).toBe(DESCRIPTIONS.pylon);
    // Halfway along the shrine's ley line, between two of its points.
    const [a, b] = OVERWORLD.leyLines.shrine.slice(2, 4);
    if (!a || !b) throw new Error('short ley line');
    const seam = { x: ((a.tx + b.tx) / 2 + 0.5) * 32, y: ((a.ty + b.ty) / 2 + 0.5) * 32 };
    expect(nameAt(s, HALL, seam.x, seam.y)).toMatchObject({ name: WORLD_NAMES.leyLine, description: DESCRIPTIONS.leyLine });
    const port = FIXTURES.find((f) => f.kind === 'port' && f.raw === 'stone');
    if (!port) throw new Error('no port');
    const at = centre(port.tx, port.ty);
    expect(nameAt(s, 'foundry', at.x, at.y)).toMatchObject({ name: 'Stone port', description: '×1 pylon · 15/min' });
    // A refused raw waiting in the port says so.
    const held = s.fixtures.find((f) => f.id === port.id);
    if (!held) throw new Error('no stone port');
    held.item = 'stone';
    expect(nameAt(s, 'foundry', at.x, at.y)?.description).toBe('×1 pylon · 15/min · waiting');
  });
});

describe('build bar descriptions', () => {
  it('every buildable piece has one, short enough for the tip', () => {
    for (const id of BUILD_BAR) {
      const def = PIECES[id];
      expect(def?.description.length, id).toBeGreaterThan(0);
      expect(wrapText(def?.description ?? '', BUILD_TIP.wrap).length, id).toBeLessThanOrEqual(BUILD_TIP.maxLines);
    }
  });

  it('wrap at spaces within the width', () => {
    expect(wrapText('one two three four', 9)).toEqual(['one two', 'three', 'four']);
    for (const line of wrapText(PIECES.sorter?.description ?? '', BUILD_TIP.wrap)) expect(line.length).toBeLessThanOrEqual(BUILD_TIP.wrap);
  });
});

describe('the sorter on screen', () => {
  it('sorts right of its facing, or left mirrored, matching its sprite turns', () => {
    expect(sortSideOf('right', false)).toBe('down');
    expect(sortSideOf('right', true)).toBe('up');
    expect(sortSideOf('down', false)).toBe('left');
    expect(sortSideOf('up', false)).toBe('right');
    expect(sorterLook('left', false)).toMatchObject({ flipX: true, flipY: true });
    expect(sorterLook('down', true)).toMatchObject({ flipX: true, flipY: false });
  });

  it('has an input arrow on its back, an output on its front and a gold one on its sort side', () => {
    const spots = arrowSpots({ pieceId: 'sorter', tx: 5, ty: 5, facing: 'right', mirrored: true });
    expect(spots.map((s) => `${s.kind}:${s.edge}`)).toEqual(['in:left', 'out:right', 'sort:up']);
  });
});
