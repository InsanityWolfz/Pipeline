import { describe, expect, it } from 'vitest';
import { OVERWORLD } from '../../src/data/overworld';
import { FEET_BOX } from '../../src/data/player';
import { DEFAULT_ROOM, FOUNDRY_ROOM, TILE, WALKABLE } from '../../src/data/rooms';
import { boxHitsSolid } from '../../src/sim/collision';
import { tileCentre } from '../../src/sim/state';
import { WORLD } from '../../src/sim/world';

const room = WORLD[DEFAULT_ROOM];
const SYMBOLS: string[] = Object.values(TILE);

describe('rooms', () => {
  it('has the default room, the overworld (017), with a matching id', () => {
    expect(room?.id).toBe(DEFAULT_ROOM);
    expect(DEFAULT_ROOM).toBe(OVERWORLD.id);
  });

  it('is about 4×4 screens of known symbols', () => {
    expect(room?.rows).toHaveLength(OVERWORLD.height);
    for (const row of room?.rows ?? []) {
      expect(row).toHaveLength(OVERWORLD.width);
      for (const ch of row) expect(SYMBOLS).toContain(ch);
    }
    expect(OVERWORLD.width * 32).toBeGreaterThanOrEqual(640 * 4);
    expect(OVERWORLD.height * 32).toBeGreaterThanOrEqual(360 * 4);
  });

  it('walls the foundry on every edge apart from its door; the overworld ends in forest, never a bare wall', () => {
    const f = WORLD[FOUNDRY_ROOM];
    if (!f) throw new Error('no foundry');
    const last = f.rows.length - 1;
    for (const [y, row] of f.rows.entries()) {
      const edges = y === 0 || y === last ? [...row] : [row[0], row[row.length - 1]];
      for (const ch of edges) expect([TILE.wall, TILE.door]).toContain(ch);
    }
    const rows = room?.rows ?? [];
    for (const [y, row] of rows.entries()) {
      const edges = y === 0 || y === rows.length - 1 ? [...row] : [row[0], row[row.length - 1]];
      for (const ch of edges) expect([TILE.tree, TILE.water]).toContain(ch);
    }
  });

  it('lists every door and links it to a door that links back', () => {
    for (const r of Object.values(WORLD)) {
      const listed = new Set((r.doorways ?? []).map((d) => `${d.tx},${d.ty}`));
      for (const [ty, row] of r.rows.entries()) {
        for (const [tx, ch] of [...row].entries()) if (ch === TILE.door) expect(listed.has(`${tx},${ty}`)).toBe(true);
      }
      for (const [i, d] of (r.doorways ?? []).entries()) {
        expect(r.rows[d.ty]?.[d.tx]).toBe(TILE.door);
        const back = WORLD[d.to]?.doorways?.[d.toDoor];
        expect(back).toMatchObject({ to: r.id, toDoor: i });
      }
    }
  });

  it('has an empty walled foundry to build in, with only its corners fallen in', () => {
    const f = WORLD[FOUNDRY_ROOM];
    if (!f) throw new Error('no foundry');
    expect(f.rows).toHaveLength(16);
    for (const row of f.rows) expect(row).toHaveLength(24);
    for (const row of f.rows) expect(row.replace(/[#.D]/g, '')).toBe('');
    for (const row of f.rows.slice(3, 13)) expect(row.slice(3, 21)).toBe('.'.repeat(18));
    expect(f.enemies ?? []).toEqual([]);
    expect(f.nodes ?? []).toEqual([]);
  });

  it('spawns the player on open ground at every start', () => {
    if (!room) throw new Error('no room');
    for (const t of [room.spawn, OVERWORLD.field, OVERWORLD.wake]) {
      expect(WALKABLE).toContain(room.rows[t.ty]?.[t.tx]);
      const { x, y } = tileCentre(t);
      expect(boxHitsSolid(room, x, y, FEET_BOX)).toBe(false);
    }
  });
});
