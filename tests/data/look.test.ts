import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FLOOR_VARIANTS, WALL_SPRITES } from '../../src/data/roomArt';
import { animFrames } from '../../src/data/assets';
import { ENEMIES } from '../../src/data/enemies';
import { LOGISTICS_ICONS, SORTER_ANIMS } from '../../src/data/foundryAssets';
import { AMBIENT, DAMAGE_NUMBERS, GLOWS, PARTICLES, ROOM_MOOD } from '../../src/data/juice';
import { DAYLIGHT_PALETTE, PIXEL_PALETTE } from '../../src/data/palette';
import { FIRE_SOUNDS, ROOM_AMBIENCE, SOUNDS, WINDUP_SOUNDS } from '../../src/data/sounds';
import { SLOT_AMMOS } from '../../src/data/tube';
import { PROPS, type PropDef } from '../../src/data/props';
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

describe('feel and sound references', () => {
  const known = new Set([...PIXEL_PALETTE, ...DAYLIGHT_PALETTE].map((c) => c.id));

  it('use only palette colours', () => {
    const ids = [
      ...Object.values(PARTICLES).flatMap((p) => p.colors),
      ...Object.values(GLOWS).map((g) => g.color),
      ...Object.values(ROOM_MOOD).map((m) => m.tint),
      DAMAGE_NUMBERS.enemy,
      DAMAGE_NUMBERS.player,
      DAMAGE_NUMBERS.outline,
      ...AMBIENT.moteColors,
      AMBIENT.fireflyColor,
      ...Object.values(PROPS).flatMap((p) => {
        const def: PropDef = p;
        return def.glow ? [def.glow.color] : [];
      }),
    ];
    for (const id of ids) expect(known.has(id), id).toBe(true);
  });

  it('key moods and ambience by real rooms, fire sounds by real ammo, and wind-ups by real enemy kinds', () => {
    for (const roomId of [...Object.keys(ROOM_MOOD), ...Object.keys(ROOM_AMBIENCE)]) expect(ROOMS[roomId], roomId).toBeDefined();
    for (const room of Object.keys(ROOMS)) expect(ROOM_AMBIENCE[room], room).toBeDefined();
    for (const ammoId of SLOT_AMMOS) expect(FIRE_SOUNDS[ammoId], ammoId).toBeDefined();
    const kinds = new Set(Object.values(ENEMIES).map((e) => e.kind));
    for (const kind of kinds) expect(WINDUP_SOUNDS[kind], kind).toBeDefined();
    for (const kind of Object.keys(WINDUP_SOUNDS)) expect(kinds.has(kind as never), kind).toBe(true);
  });

  it('only play sounds that have recipes', () => {
    const keys = new Set<string>(Object.values(SOUNDS));
    for (const key of [...Object.values(FIRE_SOUNDS), ...Object.values(WINDUP_SOUNDS), ...Object.values(ROOM_AMBIENCE)]) expect(keys.has(key), key).toBe(true);
  });
});

describe('the sorter (015)', () => {
  it('has every frame in the atlas', () => {
    for (const anim of Object.values(SORTER_ANIMS)) for (const frame of animFrames(anim)) expect(frames).toContain(frame);
    expect(frames).toContain(LOGISTICS_ICONS.sorter);
  });
});
