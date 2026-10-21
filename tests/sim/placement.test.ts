import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../../src/data/config';
import { FEET_BOX } from '../../src/data/player';
import { rotateCw } from '../../src/sim/direction';
import {
  footprint,
  frontTile,
  pieceAt,
  tilesBetween,
  type ConduitState,
  type MachineState,
} from '../../src/sim/pieces';
import { canPlace, pickUp, place, unlockedPieces } from '../../src/sim/placement';
import { tileCentre } from '../../src/sim/tiles';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { die, fireAt, HALL, run } from './fight';
import { foundry, put, STAND } from './foundryKit';

describe('unlocks', () => {
  it('locks each machine until its output has been hand-crafted; logistics are always open', () => {
    const s = foundry(false);
    expect(unlockedPieces(s)).toEqual(['conduit', 'splitter', 'hopper', 'crate']);
    s.crafted = ['ley-dust'];
    expect(unlockedPieces(s)).toEqual(['conduit', 'splitter', 'hopper', 'crate', 'grinder']);
  });

  it('refuses a locked piece', () => {
    const s = foundry(false);
    expect(place(s, 'grinder', 5, 5, 'right')).toBeNull();
    expect(s.events.placeFails).toEqual([{ pieceId: 'grinder', tx: 5, ty: 5, reason: 'locked' }]);
    expect(s.foundry.pieces).toEqual([]);
  });
});

describe('placement', () => {
  it('puts a piece on free floor and records it', () => {
    const s = foundry();
    const p = put(s, 'cutter', 5, 5, 'down');
    expect(p).toMatchObject({ pieceId: 'cutter', kind: 'machine', tx: 5, ty: 5, facing: 'down' });
    expect(s.events.places).toEqual([{ id: p.id, pieceId: 'cutter', tx: 5, ty: 5, facing: 'down' }]);
  });

  it('refuses walls, doors, out of bounds and taken tiles', () => {
    const s = foundry();
    put(s, 'conduit', 5, 5);
    expect(canPlace(s, 'conduit', 0, 5, 'right')).toBe('blocked');
    expect(canPlace(s, 'conduit', 23, 8, 'right')).toBe('blocked');
    expect(canPlace(s, 'conduit', -3, 5, 'right')).toBe('blocked');
    expect(canPlace(s, 'conduit', 5, 5, 'right')).toBe('occupied');
    expect(canPlace(s, 'assembler', 6, 5, 'up')).toBe('occupied');
    expect(canPlace(s, 'assembler', 1, 5, 'up')).toBe('blocked');
  });

  it('keeps solid pieces off the player but lets a conduit go under them', () => {
    const s = foundry();
    expect(canPlace(s, 'hopper', STAND.tx, STAND.ty, 'right')).toBe('player');
    expect(canPlace(s, 'conduit', STAND.tx, STAND.ty, 'right')).toBeNull();
  });

  it('only builds while the player is in the foundry', () => {
    const s = foundry();
    s.roomId = HALL;
    expect(place(s, 'conduit', 5, 5, 'right')).toBeNull();
    expect(s.events.placeFails[0]?.reason).toBe('not-foundry');
  });

  it('lays a 3x1 piece across its facing, centred on its tile, with its front ahead of the middle', () => {
    expect(footprint('assembler', 5, 5, 'up')).toEqual([
      { tx: 4, ty: 5 },
      { tx: 5, ty: 5 },
      { tx: 6, ty: 5 },
    ]);
    expect(footprint('assembler', 5, 5, 'left')).toEqual([
      { tx: 5, ty: 4 },
      { tx: 5, ty: 5 },
      { tx: 5, ty: 6 },
    ]);
    expect(footprint('cutter', 5, 5, 'left')).toEqual([{ tx: 5, ty: 5 }]);
    const s = foundry();
    const a = put(s, 'assembler', 5, 5, 'down');
    expect(frontTile(a)).toEqual({ tx: 5, ty: 6 });
    expect(pieceAt(s.foundry, 4, 5)).toBe(a);
    expect(pieceAt(s.foundry, 6, 5)).toBe(a);
    expect(pieceAt(s.foundry, 5, 6)).toBeUndefined();
  });

  it('walks the tiles a drag crosses, edge to edge', () => {
    expect(tilesBetween({ tx: 2, ty: 2 }, { tx: 5, ty: 2 })).toEqual([
      { tx: 3, ty: 2 },
      { tx: 4, ty: 2 },
      { tx: 5, ty: 2 },
    ]);
    expect(tilesBetween({ tx: 2, ty: 2 }, { tx: 2, ty: 0 })).toEqual([
      { tx: 2, ty: 1 },
      { tx: 2, ty: 0 },
    ]);
    const diagonal = tilesBetween({ tx: 0, ty: 0 }, { tx: 2, ty: 2 });
    expect(diagonal).toHaveLength(4);
    expect(diagonal.at(-1)).toEqual({ tx: 2, ty: 2 });
    let prev = { tx: 0, ty: 0 };
    for (const t of diagonal) {
      expect(Math.abs(t.tx - prev.tx) + Math.abs(t.ty - prev.ty)).toBe(1);
      prev = t;
    }
    expect(tilesBetween({ tx: 1, ty: 1 }, { tx: 1, ty: 1 })).toEqual([]);
  });

  it('rotates clockwise', () => {
    expect(['up', 'right', 'down', 'left'].map((f) => rotateCw(f as 'up'))).toEqual(['right', 'down', 'left', 'up']);
  });
});

describe('picking up', () => {
  it('removes the piece under any of its tiles and returns everything it held', () => {
    const s = foundry();
    s.inventory = {};
    const c = put<ConduitState>(s, 'conduit', 3, 3);
    c.item = 'wood';
    const m = put<MachineState>(s, 'assembler', 8, 8, 'up');
    m.buffer = { shaft: 2, rope: 1 };
    m.output = 3;
    m.crafting = true;
    const h = put(s, 'hopper', 3, 6);
    if (h.kind !== 'hopper') throw new Error('not a hopper');
    h.item = 'stone';
    h.count = 5;
    const crate = put(s, 'crate', 3, 9);
    if (crate.kind !== 'crate') throw new Error('not a crate');
    crate.contents = { arrow: 8, bomb: 2 };
    pickUp(s, 3, 3);
    pickUp(s, 9, 8);
    pickUp(s, 3, 6);
    pickUp(s, 3, 9);
    expect(s.foundry.pieces).toEqual([]);
    // The craft in progress gives back its inputs: 1 shaft, 1 arrowhead, 1 rope.
    expect(s.inventory).toEqual({ wood: 1, shaft: 3, rope: 2, arrowhead: 1, arrow: 3 + 8, stone: 5, bomb: 2 });
    expect(s.events.pickUps.map((e) => e.pieceId)).toEqual(['conduit', 'assembler', 'hopper', 'crate']);
  });

  it('does nothing on an empty tile or outside the foundry', () => {
    const s = foundry();
    put(s, 'conduit', 3, 3);
    pickUp(s, 4, 4);
    s.roomId = HALL;
    pickUp(s, 3, 3);
    expect(s.foundry.pieces).toHaveLength(1);
    expect(s.events.pickUps).toEqual([]);
  });
});

describe('piece bodies', () => {
  it('machines, hoppers and crates block the player; conduits can be walked over', () => {
    const s = foundry();
    put(s, 'conduit', STAND.tx - 1, STAND.ty);
    put(s, 'hopper', STAND.tx - 2, STAND.ty);
    run(s, 60, { moveX: -1 });
    const hopperRight = (STAND.tx - 1) * TILE_SIZE;
    expect(s.player.x).toBeCloseTo(hopperRight + FEET_BOX.w / 2, 6);
    expect(s.player.y).toBe(tileCentre(STAND).y);
  });

  it('slides along a piece', () => {
    const s = foundry();
    put(s, 'crate', STAND.tx - 1, STAND.ty);
    run(s, 20, { moveX: -1, moveY: -1 });
    expect(s.player.y).toBeLessThan(tileCentre(STAND).y);
  });

  it('the tube never fires in the foundry: no shot, no round spent, no punch', () => {
    const s = foundry();
    const { x, y } = tileCentre(STAND);
    s.inventory = { arrow: 5 };
    run(s, 30, fireAt(x - 200, y));
    expect([s.arrows.length, s.inventory.arrow, s.tube.meleeCooldown, s.tube.firing]).toEqual([0, 5, 0, false]);
    s.inventory = {};
    run(s, 1, fireAt(x - 200, y));
    expect(s.tube.meleeCooldown).toBe(0);
  });

  it('a KO keeps the whole foundry', () => {
    const s = foundry();
    const c = put<ConduitState>(s, 'conduit', 3, 3, 'up');
    c.item = 'wood';
    const before = structuredClone(s.foundry);
    s.building = true;
    die(s);
    expect(s.roomId).toBe(FOUNDRY_ROOM);
    expect(s.building).toBe(false);
    // The conduit's item kept moving; everything else is as it was.
    expect(s.foundry.pieces.map((p) => ({ ...p, progress: 0 }))).toEqual(
      before.pieces.map((p) => ({ ...p, progress: 0 })),
    );
  });
});
