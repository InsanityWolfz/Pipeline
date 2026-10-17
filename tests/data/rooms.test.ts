import { describe, expect, it } from 'vitest';
import { FEET_BOX } from '../../src/data/player';
import { DEFAULT_ROOM, ROOMS, TILE } from '../../src/data/rooms';
import { TILE_SIZE } from '../../src/data/config';
import { boxHitsSolid } from '../../src/sim/collision';

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

  it('is walled on every edge', () => {
    const rows = room?.rows ?? [];
    const last = rows.length - 1;
    for (const [y, row] of rows.entries()) {
      const edges = y === 0 || y === last ? [...row] : [row[0], row[row.length - 1]];
      for (const ch of edges) expect(ch).toBe(TILE.wall);
    }
  });

  it('spawns the player on open floor', () => {
    if (!room) throw new Error('no room');
    const { tx, ty } = room.spawn;
    expect(room.rows[ty]?.[tx]).toBe(TILE.floor);
    const x = (tx + 0.5) * TILE_SIZE;
    const y = (ty + 0.5) * TILE_SIZE;
    expect(boxHitsSolid(room, x, y, FEET_BOX)).toBe(false);
  });

  it('puts the crystal on open floor', () => {
    expect(room?.rows[room.crystal.ty]?.[room.crystal.tx]).toBe(TILE.floor);
  });
});
