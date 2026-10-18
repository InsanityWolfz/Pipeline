import { describe, expect, it } from 'vitest';
import { HUD_DIGITS, HUD_LETTERS } from '../../src/data/assets';
import { BUILD_TIP, WORLD_NAMES } from '../../src/data/hudLayout';
import { FIXTURES } from '../../src/data/claims';
import { ENEMIES } from '../../src/data/enemies';
import { ITEMS } from '../../src/data/items';
import { NODES } from '../../src/data/nodes';
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
    const shrine = outside?.pylon;
    if (!shrine) throw new Error('no pylon');
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
});

describe('world names in the pixel font', () => {
  it('only use glyphs the font has, for everything that can be hovered', () => {
    const glyphs = new Set([...HUD_LETTERS.glyphs, ...HUD_DIGITS.glyphs]);
    const names = [
      ...Object.values(ENEMIES).map((e) => e.name),
      ...Object.values(NODES).map((n) => n.name),
      ...Object.values(ITEMS).map((i) => i.name),
      ...FIXTURES.map((f) => f.name),
      ...Object.values(PIECES).map((p) => p.name),
      ...Object.values(WORLD_NAMES),
    ];
    for (const name of names) for (const ch of name.toUpperCase()) expect(glyphs.has(ch), `${name}: '${ch}'`).toBe(true);
  });
});

describe('build bar descriptions', () => {
  const glyphs = new Set([...HUD_LETTERS.glyphs, ...HUD_DIGITS.glyphs]);

  it('every buildable piece has one, written only in glyphs the pixel font has', () => {
    for (const id of BUILD_BAR) {
      const def = PIECES[id];
      expect(def?.description.length, id).toBeGreaterThan(0);
      for (const ch of `${def?.name ?? ''} ${def?.description ?? ''}`.toUpperCase()) expect(glyphs.has(ch), `${id}: '${ch}'`).toBe(true);
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
