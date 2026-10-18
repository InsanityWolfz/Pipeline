import { describe, expect, it } from 'vitest';
import { FEET_BOX } from '../../src/data/player';
import { DEFAULT_ROOM, FOUNDRY_ROOM, ROOMS, TILE } from '../../src/data/rooms';
import { boxHitsSolid } from '../../src/sim/collision';
import { tileCentre } from '../../src/sim/state';

const room = ROOMS[DEFAULT_ROOM];
const SYMBOLS: string[] = Object.values(TILE);

describe('rooms', () => {
  it('has the default room with a matching id', () => {
    expect(room?.id).toBe(DEFAULT_ROOM);
  });

  it('is 40x30 tiles of known symbols', () => {
    expect(room?.rows).toHaveLength(30);
    for (const row of room?.rows ?? []) {
      expect(row).toHaveLength(40);
      for (const ch of row) expect(SYMBOLS).toContain(ch);
    }
  });

  it('is walled on every edge, apart from doors', () => {
    for (const r of Object.values(ROOMS)) {
      const rows = r.rows;
      const last = rows.length - 1;
      for (const [y, row] of rows.entries()) {
        const edges = y === 0 || y === last ? [...row] : [row[0], row[row.length - 1]];
        for (const ch of edges) expect([TILE.wall, TILE.door]).toContain(ch);
      }
    }
  });

  it('only has doors on the outer wall, each listed and linked to a door that links back', () => {
    for (const r of Object.values(ROOMS)) {
      const listed = new Set((r.doorways ?? []).map((d) => `${d.tx},${d.ty}`));
      for (const [ty, row] of r.rows.entries()) {
        for (const [tx, ch] of [...row].entries()) if (ch === TILE.door) expect(listed.has(`${tx},${ty}`)).toBe(true);
      }
      for (const [i, d] of (r.doorways ?? []).entries()) {
        expect(r.rows[d.ty]?.[d.tx]).toBe(TILE.door);
        const back = ROOMS[d.to]?.doorways?.[d.toDoor];
        expect(back).toMatchObject({ to: r.id, toDoor: i });
      }
    }
  });

  it('has an empty walled foundry to build in', () => {
    const f = ROOMS[FOUNDRY_ROOM];
    if (!f) throw new Error('no foundry');
    expect(f.rows).toHaveLength(16);
    for (const row of f.rows) expect(row).toHaveLength(24);
    for (const row of f.rows.slice(1, -1)) expect(row.slice(1, -1)).toBe('.'.repeat(22));
    expect(f.enemies ?? []).toEqual([]);
    expect(f.nodes ?? []).toEqual([]);
  });

  it('spawns the player on open floor', () => {
    if (!room) throw new Error('no room');
    const { tx, ty } = room.spawn;
    expect(room.rows[ty]?.[tx]).toBe(TILE.floor);
    const { x, y } = tileCentre(room.spawn);
    expect(boxHitsSolid(room, x, y, FEET_BOX)).toBe(false);
  });

  it('puts the crystal on open floor', () => {
    const crystal = room?.crystal;
    if (!crystal) return;
    expect(room.rows[crystal.ty]?.[crystal.tx]).toBe(TILE.floor);
  });
});
