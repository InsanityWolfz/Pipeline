import { describe, expect, it } from 'vitest';
import { DROP_SCATTER } from '../../src/data/enemies';
import { FEET_BOX, PICKUP_RADIUS } from '../../src/data/player';
import { isSolid } from '../../src/sim/collision';
import { rollDrops, scatterPoint, spawnDrops } from '../../src/sim/drops';
import { createRng } from '../../src/sim/rng';
import { roomOf } from '../../src/sim/state';
import { openRoom } from './helpers';
import { arena, HALL, HUSK, PLAYER_AT, run } from './fight';

const EXTRAS = ['wood', 'stone', 'fiber'];

describe('drop rolls', () => {
  const rolls = Array.from({ length: 600 }, (_, seed) => rollDrops(HUSK.drops, createRng(seed)));

  it('always drops 1 or 2 husk resin', () => {
    for (const items of rolls) {
      const resin = items.filter((i) => i === 'husk-resin').length;
      expect(resin).toBeGreaterThanOrEqual(1);
      expect(resin).toBeLessThanOrEqual(2);
    }
    expect(rolls.some((items) => items.filter((i) => i === 'husk-resin').length === 2)).toBe(true);
  });

  it('adds one wood, stone or fiber about half the time', () => {
    const extras = rolls.map((items) => items.filter((i) => i !== 'husk-resin'));
    for (const e of extras) {
      expect(e.length).toBeLessThanOrEqual(1);
      for (const id of e) expect(EXTRAS).toContain(id);
    }
    const share = extras.filter((e) => e.length === 1).length / rolls.length;
    expect(share).toBeGreaterThan(0.4);
    expect(share).toBeLessThan(0.6);
    for (const id of EXTRAS) expect(extras.some((e) => e[0] === id)).toBe(true);
  });

  it('is the same for the same RNG state', () => {
    expect(rollDrops(HUSK.drops, createRng(99))).toEqual(rollDrops(HUSK.drops, createRng(99)));
  });
});

describe('drop scatter', () => {
  it('lands within DROP_SCATTER of the corpse on open floor', () => {
    const s = arena();
    for (let i = 0; i < 200; i++) {
      const p = scatterPoint(roomOf(s), s.rng, 500, 448);
      expect(Math.hypot(p.x - 500, p.y - 448)).toBeLessThanOrEqual(DROP_SCATTER);
    }
  });

  it('never lands inside a wall', () => {
    const s = arena();
    const room = roomOf(s);
    for (let i = 0; i < 200; i++) {
      // Tile (1,4) has wall on its left and above (014 shaped the corner).
      const p = scatterPoint(room, s.rng, 36, 132);
      expect(isSolid(room, Math.floor(p.x / 32), Math.floor(p.y / 32))).toBe(false);
    }
  });

  it('falls back to the corpse point when there is no clear spot', () => {
    const solid = openRoom(10, 10, Object.fromEntries(Array.from({ length: 10 }, (_, y) => [y, '#'.repeat(10)])));
    expect(scatterPoint(solid, createRng(1), 160, 160)).toEqual({ x: 160, y: 160 });
  });

  it('spawns one ground item per dropped item, with fresh ids', () => {
    const s = arena();
    spawnDrops(s, HUSK, 500, 448, HALL);
    spawnDrops(s, HUSK, 600, 448, HALL);
    const ids = s.groundItems.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(s.groundItems.length).toBeGreaterThanOrEqual(2);
  });
});

describe('pickup', () => {
  /** A wood item `gap` px east of the feet box's right edge. */
  function itemAt(gap: number) {
    const s = arena();
    s.groundItems.push({ id: s.nextGroundItemId++, itemId: 'wood', roomId: HALL, x: PLAYER_AT.x + FEET_BOX.w / 2 + gap, y: PLAYER_AT.y });
    return s;
  }

  it('picks up an item within PICKUP_RADIUS of the feet box', () => {
    const s = itemAt(PICKUP_RADIUS);
    const item = s.groundItems[0];
    run(s, 1);
    expect(s.groundItems).toEqual([]);
    expect(s.inventory.wood).toBe(1);
    expect(s.events.pickups).toEqual([{ id: item?.id, itemId: 'wood', x: item?.x, y: item?.y }]);
  });

  it('leaves items further away on the ground', () => {
    const s = itemAt(PICKUP_RADIUS + 0.5);
    run(s, 120);
    expect(s.groundItems.length).toBe(1);
    expect(s.inventory.wood).toBeUndefined();
  });
});
