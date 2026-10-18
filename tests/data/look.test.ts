import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FLOOR_VARIANTS, WALL_SPRITES } from '../../src/data/roomArt';
import { animFrames } from '../../src/data/assets';
import { PROPS } from '../../src/data/props';
import { ROOMS, TILE } from '../../src/data/rooms';

// Look and feel (014): every new frame exists, and room dressing stays out of the way.

const atlas = JSON.parse(readFileSync('assets/build/sprites.json', 'utf8')) as { frames: Record<string, unknown> };
const frames = Object.keys(atlas.frames);

describe('room art', () => {
  it('has every floor variant and wall piece in the atlas', () => {
    for (const key of [...Object.values(FLOOR_VARIANTS).flatMap((v) => v.tiles), ...Object.values(WALL_SPRITES)]) expect(frames).toContain(key);
  });

  it('has variants for every room floor theme', () => {
    for (const room of Object.values(ROOMS)) expect(new Set(FLOOR_VARIANTS[room.floor ?? 'ruin']?.tiles).size).toBeGreaterThanOrEqual(4);
  });
});

describe('props', () => {
  it('have every frame in the atlas', () => {
    for (const def of Object.values(PROPS)) for (const frame of animFrames(def.anim)) expect(frames).toContain(frame);
  });

  it('sit where their layer allows, clear of everything the player uses', () => {
    for (const room of Object.values(ROOMS)) {
      const at = (tx: number, ty: number) => room.rows[ty]?.[tx];
      const busy = [
        room.spawn,
        ...(room.nodes ?? []),
        ...(room.enemies ?? []),
        ...(room.tubeStone ? [room.tubeStone] : []),
        ...(room.pylon ? [room.pylon] : []),
      ];
      for (const p of room.props ?? []) {
        const where = `${room.id} ${p.propId} at ${p.tx},${p.ty}`;
        const layer = PROPS[p.propId].layer;
        if (layer === 'block') expect(at(p.tx, p.ty), where).toBe(TILE.ruinBlock);
        else if (layer === 'wall') {
          expect(at(p.tx, p.ty), where).toBe(TILE.wall);
          expect(at(p.tx, p.ty + 1), where).toBe(TILE.floor);
        } else {
          expect(at(p.tx, p.ty), where).toBe(TILE.floor);
          for (const b of busy) expect(b.tx === p.tx && b.ty === p.ty, where).toBe(false);
          for (const d of room.doorways ?? []) expect(Math.abs(d.tx - p.tx) + Math.abs(d.ty - p.ty), where).toBeGreaterThan(1);
        }
      }
    }
  });

  it('never share a tile', () => {
    for (const room of Object.values(ROOMS)) {
      const tiles = (room.props ?? []).map((p) => `${p.tx},${p.ty}`);
      expect(new Set(tiles).size, room.id).toBe(tiles.length);
    }
  });
});
