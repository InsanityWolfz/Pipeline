import { describe, expect, it } from 'vitest';
import { ARENAS, BOSS_ARENAS } from '../../src/data/arenas';
import { TILE_SIZE } from '../../src/data/config';
import { DECOR_CLEAR } from '../../src/data/decor';
import { EMBERWORKS, rampTiles } from '../../src/data/emberworks';
import { SET_PIECE_LIGHTS } from '../../src/data/lights';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { paletteHex } from '../../src/data/palette';
import { SHOT_THROUGH, TILE, WALKABLE } from '../../src/data/rooms';
import { SET_PIECES, setPieceAnchor } from '../../src/data/setPieces';
import { STORMCROWN, stormRampTiles } from '../../src/data/stormcrown';
import { SET_PIECE_FRAMES } from '../../src/data/worldArtAssets';
import { onBarrier, bearingOf, fromCentre } from '../../src/data/worldShape';
import { inksOf, type VectorSprite } from '../../src/data/art/types';
import { WORLD_ART_SPRITES } from '../../src/data/art/worldArt';
import { WORLD } from '../../src/sim/world';

// 077: the twelve set pieces: three a region, each standing only on tiles that already stop feet and straight shots
// (placement rules 1–4 on the generated map), named, drawn and registered; lights only on the Ley Tower, the Great
// Furnace and the Great Crucible.

const T = TILE_SIZE;
const room = WORLD[OVERWORLD_ROOM];
if (!room) throw new Error('no overworld');
const at = (tx: number, ty: number): string | undefined => room.rows[ty]?.[tx];
const key = (tx: number, ty: number) => `${tx},${ty}`;
const frameNames = (s: VectorSprite): string[] => (s.frames.length === 1 ? [s.key] : s.frames.map((_, i) => `${s.key}/${i}`));
const drawn = new Map(WORLD_ART_SPRITES.flatMap((s) => frameNames(s).map((n) => [n, s] as const)));

/** Tiles a solid piece may not stand on: doors, arena doors, the barrier's band, ramps, gates. */
const forbidden = new Set<string>([
  ...ARENAS.flatMap((a) => a.door.tiles.map((t) => key(t.tx, t.ty))),
  ...EMBERWORKS.ramps.flatMap((r) => rampTiles(r).map((t) => key(t.tx, t.ty))),
  ...STORMCROWN.ramps.flatMap((r) => stormRampTiles(r).map((t) => key(t.tx, t.ty))),
  ...(room.gateTiles ?? []).map((t) => key(t.tx, t.ty)),
]);

/** Tiles the drawn box may not cover: pylons, nodes, altars, arena doors, return stones, springs, the start stone, roads. */
const keepUncovered = new Set<string>([
  ...(room.pylons ?? []).map((t) => key(t.tx, t.ty)),
  ...OVERWORLD.nodes.map((t) => key(t.tx, t.ty)),
  ...(room.altars ?? []).map((t) => key(t.tx, t.ty)),
  ...ARENAS.flatMap((a) => a.door.tiles.map((t) => key(t.tx, t.ty))),
  ...BOSS_ARENAS.map((a) => key(a.door.leaveTo.tx - DECOR_CLEAR.returnStoneWest, a.door.leaveTo.ty)),
  ...OVERWORLD.springs.map((t) => key(t.tx, t.ty)),
  key(OVERWORLD.startStone.tx, OVERWORLD.startStone.ty),
]);

describe('set pieces (077)', () => {
  it('has three per region with kebab-case ids, names and the spec’s places', () => {
    expect(SET_PIECES).toHaveLength(12);
    for (const r of ['meadow', 'hollows', 'ember', 'storm']) expect(SET_PIECES.filter((p) => p.region === r), r).toHaveLength(3);
    for (const p of SET_PIECES) {
      expect(p.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(p.name.length).toBeGreaterThan(3);
      expect(SET_PIECE_FRAMES[p.id]).toBeDefined();
    }
    const place = Object.fromEntries(SET_PIECES.map((p) => [p.id, [p.footprint.tx, p.footprint.ty, p.footprint.w, p.footprint.h]]));
    expect(place).toEqual({
      'fallen-colossus': [153, 107, 3, 2],
      'ley-tower': [186, 161, 2, 2],
      watcher: [132, 187, 2, 2],
      'unfinished-giant': [174, 72, 5, 2],
      'aqueduct-head': [154, 226, 3, 2],
      'great-crane': [109, 185, 4, 2],
      'great-furnace': [118, 38, 4, 2],
      'great-crucible': [55, 179, 3, 2],
      'toppled-stack': [105, 239, 3, 2],
      'storm-tower': [66, 45, 2, 2],
      stormcaller: [155, 258, 3, 2],
      'wind-harp': [40, 229, 3, 2],
    });
    // Bearing and distance as the spec gives them (from the footprint's middle), within a few degrees and tiles.
    const spec: Record<string, readonly [number, number]> = { 'fallen-colossus': [10, 40], 'ley-tower': [111, 43], watcher: [199, 43], 'unfinished-giant': [21, 79], 'aqueduct-head': [174, 80], 'great-crane': [223, 54], 'great-furnace': [345, 112], 'great-crucible': [250, 97], 'toppled-stack': [204, 102], 'storm-tower': [322, 129], stormcaller: [175, 112], 'wind-harp': [232, 135] };
    for (const p of SET_PIECES) {
      const mx = p.footprint.tx + p.footprint.w / 2 - 0.5;
      const my = p.footprint.ty + p.footprint.h / 2 - 0.5;
      const [b, d] = spec[p.id] ?? [0, 0];
      expect(Math.abs(((bearingOf(mx, my) - b + 540) % 360) - 180), p.id).toBeLessThanOrEqual(4);
      expect(Math.abs(fromCentre(mx, my) - d), p.id).toBeLessThanOrEqual(3);
    }
  });

  it('rule 1: every footprint tile already stops feet and straight shots, and none is a door, ramp, gate or the barrier', () => {
    const kinds = { tree: TILE.tree, cliff: TILE.cliff, kiln: TILE.kiln, cairn: TILE.cairn } as const;
    for (const p of SET_PIECES) {
      const f = p.footprint;
      for (let ty = f.ty; ty < f.ty + f.h; ty++) {
        for (let tx = f.tx; tx < f.tx + f.w; tx++) {
          const s = at(tx, ty) ?? '';
          expect(WALKABLE.includes(s), `${p.id} ${tx},${ty} walkable`).toBe(false);
          expect(SHOT_THROUGH.includes(s), `${p.id} ${tx},${ty} shot-through`).toBe(false);
          expect([TILE.door, TILE.arenaDoor].includes(s as never), `${p.id} ${tx},${ty} door`).toBe(false);
          expect(s, `${p.id} ${tx},${ty}`).toBe(kinds[p.standsOn]);
          expect(forbidden.has(key(tx, ty)), `${p.id} ${tx},${ty} ramp/gate`).toBe(false);
          expect(onBarrier(tx, ty), `${p.id} ${tx},${ty} barrier`).toBe(false);
        }
      }
    }
  });

  it('rule 2: the row just in front is walkable for at least half its width', () => {
    for (const p of SET_PIECES) {
      const f = p.footprint;
      let open = 0;
      for (let tx = f.tx; tx < f.tx + f.w; tx++) if (WALKABLE.includes(at(tx, f.ty + f.h) ?? '')) open += 1;
      expect(open, p.id).toBeGreaterThanOrEqual(f.w / 2);
    }
  });

  it('rule 3: 2 tiles from any road, and its drawn box covers no pylon, node, altar, arena door, return stone, spring, start stone or road', () => {
    for (const p of SET_PIECES) {
      const f = p.footprint;
      for (let ty = f.ty - 2; ty < f.ty + f.h + 2; ty++) for (let tx = f.tx - 2; tx < f.tx + f.w + 2; tx++) expect(at(tx, ty), `${p.id} road at ${tx},${ty}`).not.toBe(TILE.path);
      const a = setPieceAnchor(p, T);
      const tx0 = Math.floor((a.x - p.look.w / 2) / T);
      const tx1 = Math.floor((a.x + p.look.w / 2 - 1) / T);
      const ty0 = Math.floor((a.y - p.look.h) / T);
      const ty1 = Math.floor((a.y - 1) / T);
      for (let ty = ty0; ty <= ty1; ty++) {
        for (let tx = tx0; tx <= tx1; tx++) {
          expect(keepUncovered.has(key(tx, ty)), `${p.id} covers ${tx},${ty}`).toBe(false);
          expect(at(tx, ty), `${p.id} covers a road at ${tx},${ty}`).not.toBe(TILE.path);
        }
      }
    }
  });

  it('rule 4: its base lies inside its footprint, at most 4 px over the edge, in the footprint’s bottom row', () => {
    for (const p of SET_PIECES) {
      const half = (p.footprint.w * T) / 2;
      expect(p.base.x0, p.id).toBeGreaterThanOrEqual(-half - 4);
      expect(p.base.x1, p.id).toBeLessThanOrEqual(half + 4);
      expect(p.base.y0, p.id).toBeGreaterThanOrEqual(-T - 4);
      // The base fills most of its footprint's width, so where you bump into it matches what you see.
      expect(p.base.x1 - p.base.x0, p.id).toBeGreaterThanOrEqual(p.footprint.w * T * 0.7);
    }
  });

  it('draws and registers every frame in palette ids, sized as its look', () => {
    for (const p of SET_PIECES) {
      const frames = SET_PIECE_FRAMES[p.id];
      const names: string[] = [frames.base, ...('loop' in frames ? frames.loop : []), ...('sway' in frames ? [frames.sway] : [])];
      for (const n of names) {
        const s = drawn.get(n);
        expect(s, n).toBeDefined();
        for (const f of s?.frames ?? []) for (const shape of f) for (const id of inksOf(shape)) expect(() => paletteHex(id), `${n}: ${id}`).not.toThrow();
      }
      const base = drawn.get(frames.base);
      expect(base?.size[0], p.id).toBeGreaterThanOrEqual(p.look.w);
      expect(base?.anchor[1], p.id).toBeGreaterThanOrEqual(p.look.h);
      expect('loop' in frames ? frames.loop.length : 0, p.id).toBe(p.loopMs ? 4 : 0);
    }
  });

  it('lights only the Ley Tower (ley), the Great Furnace and the Great Crucible (fire), each placed by its art', () => {
    expect(Object.keys(SET_PIECE_LIGHTS).sort()).toEqual(['great-crucible', 'great-furnace', 'ley-tower']);
    expect(SET_PIECE_LIGHTS['ley-tower']).toMatchObject({ color: 'cyan', radius: 96, intensity: 0.7, priority: 3 });
    expect(SET_PIECE_LIGHTS['great-furnace']).toMatchObject({ color: 'cinder', radius: 96, intensity: 0.9, priority: 2, flicker: true });
    expect(SET_PIECE_LIGHTS['great-crucible']).toMatchObject({ color: 'cinder', radius: 72, intensity: 0.8, priority: 2 });
    for (const p of SET_PIECES) expect(p.lightAt !== undefined, p.id).toBe(SET_PIECE_LIGHTS[p.id] !== undefined);
    expect(SET_PIECES.filter((p) => p.strikeAt).map((p) => p.id)).toEqual(['storm-tower']);
  });
});
