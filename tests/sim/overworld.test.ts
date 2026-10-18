import { describe, expect, it } from 'vitest';
import { OVERWORLD, ringOf } from '../../src/data/overworld';
import { TILE, WALKABLE } from '../../src/data/rooms';
import { blocksShot, isSolid } from '../../src/sim/collision';
import { generateOverworld } from '../../src/sim/overworldGen';
import { summarize } from '../../src/sim/summary';
import { WORLD } from '../../src/sim/world';
import { arena, fireAt, movePlayer, run, runUntil } from './fight';

// The overworld (017): one generated map, the same every run, with hand-placed landmarks on top.

const room = generateOverworld();
const at = (t: { tx: number; ty: number }): string | undefined => room.rows[t.ty]?.[t.tx];

/** Tiles reachable on foot from a start, treating the door as passable (it leads on). */
function reachable(from: { tx: number; ty: number }): Set<string> {
  const seen = new Set<string>([`${from.tx},${from.ty}`]);
  const queue = [from];
  while (queue.length > 0) {
    const t = queue.shift();
    if (!t) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const n = { tx: t.tx + dx, ty: t.ty + dy };
      const key = `${n.tx},${n.ty}`;
      if (seen.has(key)) continue;
      const symbol = at(n);
      if (symbol === undefined || !(WALKABLE.includes(symbol) || symbol === TILE.door)) continue;
      seen.add(key);
      queue.push(n);
    }
  }
  return seen;
}

describe('generation', () => {
  it('is the same for the same seed, different for another, and is what the world uses', () => {
    expect(generateOverworld(OVERWORLD.seed).rows).toEqual(room.rows);
    expect(generateOverworld(OVERWORLD.seed + 1).rows).not.toEqual(room.rows);
    expect(WORLD[OVERWORLD.id]?.rows).toEqual(room.rows);
  });

  it('grows groves, rock fields and ponds with shallow edges', () => {
    const all = room.rows.join('');
    const count = (symbol: string) => [...all].filter((c) => c === symbol).length;
    // Trees beyond the forest edge alone.
    expect(count(TILE.tree)).toBeGreaterThan(2 * (OVERWORLD.width + OVERWORLD.height) * OVERWORLD.edge.depth);
    expect(count(TILE.rock)).toBeGreaterThan(0);
    expect(count(TILE.water)).toBeGreaterThan(0);
    expect(count(TILE.shallow)).toBeGreaterThan(0);
    expect(room.terrain?.ponds.length).toBeGreaterThan(0);
    for (const p of room.terrain?.ponds ?? []) expect(at({ tx: p.cx, ty: p.cy })).toBe(TILE.water);
  });

  it('lets landmarks override the terrain', () => {
    expect(at(OVERWORLD.entrance.door)).toBe(TILE.door);
    for (const t of OVERWORLD.entrance.mound) expect(at(t)).toBe(TILE.ruinBlock);
    for (const t of OVERWORLD.ruinField.walls) expect(at(t)).toBe(TILE.ruinBlock);
    for (const t of OVERWORLD.shrine.walls) expect(at(t)).toBe(TILE.wall);
    for (const t of [OVERWORLD.startStone, OVERWORLD.shrine.pylon, ...OVERWORLD.shrine.gate, ...OVERWORLD.nodes]) expect(WALKABLE).toContain(at(t));
    // Clearings hold no trees, rocks or water.
    for (const r of OVERWORLD.clearings) {
      for (let ty = r.y0; ty <= r.y1; ty++) for (let tx = r.x0; tx <= r.x1; tx++) expect([TILE.tree, TILE.rock, TILE.water]).not.toContain(at({ tx, ty }));
    }
  });

  it('can reach every landmark on foot from the start', () => {
    const seen = reachable(OVERWORLD.wake);
    const key = (t: { tx: number; ty: number }) => `${t.tx},${t.ty}`;
    expect(seen.has(key(OVERWORLD.field))).toBe(true);
    expect(seen.has(key(OVERWORLD.entrance.door))).toBe(true);
    expect(seen.has(key(OVERWORLD.shrine.pylon))).toBe(true);
    for (const p of OVERWORLD.packs) expect(seen.has(key(p)), `${p.enemyId} at ${key(p)}`).toBe(true);
    for (const n of OVERWORLD.nodes) {
      const beside = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx = 0, dy = 0]) => seen.has(key({ tx: n.tx + dx, ty: n.ty + dy })));
      expect(beside, `${n.nodeId} at ${key(n)}`).toBe(true);
    }
  });
});

describe('ground', () => {
  it('stops feet at trees, rocks, walls and deep water; shallows and paths are walkable', () => {
    for (const symbol of [TILE.tree, TILE.rock, TILE.wall, TILE.ruinBlock, TILE.water]) expect(isSolid({ ...room, rows: [symbol] }, 0, 0), symbol).toBe(true);
    for (const symbol of [TILE.floor, TILE.path, TILE.shallow]) expect(isSolid({ ...room, rows: [symbol] }, 0, 0), symbol).toBe(false);
  });

  it('lets shots fly over water but not through trees, rocks or walls', () => {
    expect(blocksShot({ ...room, rows: [TILE.water] }, 0, 0)).toBe(false);
    for (const symbol of [TILE.tree, TILE.rock, TILE.wall, TILE.ruinBlock]) expect(blocksShot({ ...room, rows: [symbol] }, 0, 0), symbol).toBe(true);
  });

  it('an arrow crosses a pond', () => {
    const pond = room.terrain?.ponds[0];
    if (!pond) throw new Error('no pond');
    const s = arena();
    // Stand just west of the pond's shallow edge, on its centre row, and fire east across it.
    let tx = pond.cx - pond.rx - 1;
    while (isSolid(room, tx, pond.cy) || at({ tx, ty: pond.cy }) === TILE.shallow) tx -= 1;
    movePlayer(s, tx * 32 + 16, pond.cy * 32 + 16);
    s.nodes = [];
    run(s, 1, fireAt(s.player.x + 400, s.player.y));
    const arrow = s.arrows[0];
    if (!arrow) throw new Error('no arrow');
    let farthest = arrow.x;
    runUntil(s, () => {
      farthest = Math.max(farthest, s.arrows[0]?.x ?? farthest);
      return s.arrows.length === 0;
    }, 60);
    expect(farthest).toBeGreaterThan((pond.cx + pond.rx) * 32);
  });
});

describe('rings', () => {
  it('rise with distance from the foundry entrance', () => {
    const e = OVERWORLD.rings.centre;
    expect(ringOf(e.tx, e.ty)).toBe(0);
    expect(ringOf(OVERWORLD.field.tx, OVERWORLD.field.ty)).toBe(0);
    expect(ringOf(e.tx + OVERWORLD.rings.bounds[0] + 1, e.ty)).toBe(1);
    expect(ringOf(OVERWORLD.shrine.pylon.tx, OVERWORLD.shrine.pylon.ty)).toBe(2);
  });

  it('are in the summary, with the live enemy count', () => {
    const s = arena();
    expect(summarize(s).area).toEqual({ room: OVERWORLD.id, ring: 0, liveEnemies: 0 });
    const pylon = OVERWORLD.shrine.pylon;
    movePlayer(s, pylon.tx * 32 + 16, (pylon.ty + 1) * 32 + 16);
    expect(summarize(s).area.ring).toBe(2);
  });
});
