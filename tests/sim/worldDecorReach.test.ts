import { describe, expect, it } from 'vitest';
import { ARENAS, BOSS_ARENAS } from '../../src/data/arenas';
import { DECOR_CLEAR } from '../../src/data/decor';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { SHOT_THROUGH, TILE, WALKABLE } from '../../src/data/rooms';
import { SET_PIECES } from '../../src/data/setPieces';
import { isSolid } from '../../src/sim/collision';
import { WORLD } from '../../src/sim/world';
import { reachable, tileKey } from '../fixtures/reach';

// 077: the world's detail changes nothing a player walks or shoots through. With every gate open, from the wake,
// every road tile, every pack's spawn tile, a tile beside every pylon (the waystones), each return stone's travel tile
// (072's: one west of a stone three west of its door's `leaveTo`), every arena door's outside tile and every spring
// are reachable on foot; and every set piece's footprint is solid and stops shots, as it was.

const room = WORLD[OVERWORLD_ROOM];
if (!room) throw new Error('no overworld');
const reach = reachable(room, OVERWORLD.wake);
const has = (t: { tx: number; ty: number }) => reach.has(tileKey(t));

describe('the world is as reachable as before (077)', () => {
  it('reaches every road tile', () => {
    const roads: { tx: number; ty: number }[] = [];
    room.rows.forEach((row, ty) => [...row].forEach((s, tx) => s === TILE.path && roads.push({ tx, ty })));
    expect(roads.length).toBeGreaterThan(1000);
    expect(roads.filter((t) => !has(t))).toEqual([]);
  });

  it('reaches every pack’s spawn tile, a tile beside every pylon, every arena door’s outside tile and every spring', () => {
    const solidSpawn = OVERWORLD.packs.filter((p) => !WALKABLE.includes(room.rows[p.ty]?.[p.tx] ?? ''));
    expect(solidSpawn).toEqual([]);
    expect(OVERWORLD.packs.filter((p) => !has(p)).map((p) => `${p.enemyId}@${p.tx},${p.ty}`)).toEqual([]);
    const beside = (t: { tx: number; ty: number }) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx = 0, dy = 0]) => has({ tx: t.tx + dx, ty: t.ty + dy }));
    expect((room.pylons ?? []).filter((p) => !beside(p)).map((p) => p.site)).toEqual([]);
    expect(ARENAS.filter((a) => !has(a.door.leaveTo)).map((a) => a.id)).toEqual([]);
    expect(OVERWORLD.springs.filter((s) => !has(s)).map((s) => s.id)).toEqual([]);
  });

  it('reaches each return stone’s travel tile (072)', () => {
    const travel = BOSS_ARENAS.map((a) => ({ tx: a.door.leaveTo.tx - DECOR_CLEAR.returnStoneWest - 1, ty: a.door.leaveTo.ty }));
    expect(travel.filter((t) => !has(t))).toEqual([]);
  });

  it('stands every set piece on tiles that stop feet and shots', () => {
    for (const p of SET_PIECES) {
      const f = p.footprint;
      for (let ty = f.ty; ty < f.ty + f.h; ty++) {
        for (let tx = f.tx; tx < f.tx + f.w; tx++) {
          expect(isSolid(room, tx, ty), `${p.id} ${tx},${ty}`).toBe(true);
          expect(SHOT_THROUGH.includes(room.rows[ty]?.[tx] ?? ''), `${p.id} ${tx},${ty}`).toBe(false);
        }
      }
    }
  });
});
