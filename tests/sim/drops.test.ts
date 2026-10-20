import { describe, expect, it } from 'vitest';
import { DROP_SCATTER } from '../../src/data/enemies';
import { FEET_BOX, MAGNET, PICKUP_RADIUS } from '../../src/data/player';
import { isSolid } from '../../src/sim/collision';
import { rollDrops, scatterPoint, spawnDrops } from '../../src/sim/drops';
import { createRng } from '../../src/sim/rng';
import { roomOf } from '../../src/sim/state';
import { openRoom } from './helpers';
import { arena, at, FIELD_WALL, HALL, HUSK, placeNode, PLAYER_AT, run, SEED } from './fight';
import { FOUNDRY_ROOM } from '../../src/data/rooms';

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
    // 033's ancient gear is a rare entry of its own.
    const extras = rolls.map((items) => items.filter((i) => i !== 'husk-resin' && i !== 'ancient-gear'));
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
      // Tile (32, 13) has the ruin field's wall on its left and above (017).
      const p = scatterPoint(room, s.rng, 32 * 32 + 4, 13 * 32 + 4);
      expect(isSolid(room, Math.floor(p.x / 32), Math.floor(p.y / 32))).toBe(false);
    }
  });

  it('falls back to the corpse point when there is no clear spot', () => {
    const solid = openRoom(10, 10, Object.fromEntries(Array.from({ length: 10 }, (_, y) => [y, '#'.repeat(10)])));
    expect(scatterPoint(solid, createRng(1), 160, 160)).toEqual({ x: 160, y: 160 });
  });

  it('spawns one ground item per dropped item, with fresh ids', () => {
    const s = arena();
    spawnDrops(s, HUSK, at(500).x, at(500).y, HALL);
    spawnDrops(s, HUSK, at(600).x, at(600).y, HALL);
    const ids = s.groundItems.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(s.groundItems.length).toBeGreaterThanOrEqual(2);
  });
});

describe('pickup (021; 045: a 96 px magnet pull)', () => {
  /** A wood item `gap` px east of the feet box's right edge. */
  function itemAt(gap: number) {
    const s = arena();
    s.groundItems.push({ id: s.nextGroundItemId++, itemId: 'wood', roomId: HALL, x: PLAYER_AT.x + FEET_BOX.w / 2 + gap, y: PLAYER_AT.y });
    return s;
  }

  it('the reach is 96 px (from 64) and is the magnet radius; the pull is data', () => {
    expect(PICKUP_RADIUS).toBe(96);
    expect(MAGNET.radius).toBe(PICKUP_RADIUS);
    expect(MAGNET.accel).toBeGreaterThan(0);
    expect(MAGNET.maxSpeed).toBeGreaterThan(0);
  });

  it('pulls an item within PICKUP_RADIUS in and picks it up on contact, not at once', () => {
    const s = itemAt(PICKUP_RADIUS);
    const item = s.groundItems[0];
    const x0 = item?.x ?? 0;
    run(s, 1);
    expect(s.inventory.wood).toBeUndefined();
    expect(s.groundItems[0]?.x).toBeLessThan(x0);
    let ticks = 1;
    while (s.groundItems.length > 0 && ticks < 60) {
      run(s, 1);
      ticks += 1;
    }
    expect(s.groundItems).toEqual([]);
    expect(s.inventory.wood).toBe(1);
    expect(s.events.pickups).toMatchObject([{ id: item?.id, itemId: 'wood' }]);
    // 045.1: about a quarter second from the edge of its reach.
    expect(ticks).toBeGreaterThanOrEqual(10);
    expect(ticks).toBeLessThanOrEqual(24);
  });

  it('accelerates as it comes in', () => {
    const s = itemAt(PICKUP_RADIUS - 1);
    const xs: number[] = [];
    for (let i = 0; i < 4; i++) {
      run(s, 1);
      xs.push(s.groundItems[0]?.x ?? 0);
    }
    const steps = xs.slice(1).map((x, i) => (xs[i] ?? 0) - x);
    for (let i = 1; i < steps.length; i++) expect(steps[i] ?? 0).toBeGreaterThan(steps[i - 1] ?? 0);
  });

  it('leaves items further away on the ground, unmoved', () => {
    const s = itemAt(PICKUP_RADIUS + 0.5);
    const x0 = s.groundItems[0]?.x;
    run(s, 120);
    expect(s.groundItems.length).toBe(1);
    expect(s.groundItems[0]?.x).toBe(x0);
    expect(s.inventory.wood).toBeUndefined();
  });

  it('works in combat (045.2): the pull runs while firing', () => {
    const s = itemAt(40);
    run(s, 30, { fire: true, aimX: PLAYER_AT.x - 100, aimY: PLAYER_AT.y });
    expect(s.inventory.wood).toBe(1);
  });

  it('stops pulling once the player is out of reach', () => {
    const s = itemAt(PICKUP_RADIUS - 2);
    run(s, 1);
    // The player is carried far off; the item stays where the pull left it.
    s.player.x -= 400;
    const x = s.groundItems[0]?.x;
    run(s, 10);
    expect(s.groundItems[0]?.x).toBe(x);
    expect(s.groundItems[0]?.speed).toBeUndefined();
  });

  it('pulls through a solid tile (021)', () => {
    // The tile east of the ruin field's west wall (017); the item lies past that wall tile.
    const wall = FIELD_WALL.west;
    const s = arena(SEED, { x: (wall + 1) * 32 + 16, y: 13 * 32 + 16 });
    const room = roomOf(s);
    expect(isSolid(room, wall, 13)).toBe(true);
    const x = s.player.x - FEET_BOX.w / 2 - 50;
    expect(Math.floor(x / 32)).toBeLessThan(wall);
    s.groundItems.push({ id: s.nextGroundItemId++, itemId: 'stone', roomId: HALL, x, y: s.player.y });
    run(s, 30);
    expect(s.inventory.stone).toBe(1);
    expect(s.groundItems).toEqual([]);
  });

  it("pulls through a node's box (021)", () => {
    const s = arena();
    // A boulder standing right of the player, and the item past it.
    placeNode(s, 'rubble', PLAYER_AT.x + FEET_BOX.w / 2 + 20, PLAYER_AT.y);
    s.groundItems.push({ id: s.nextGroundItemId++, itemId: 'wood', roomId: HALL, x: PLAYER_AT.x + FEET_BOX.w / 2 + 45, y: PLAYER_AT.y });
    run(s, 30);
    expect(s.inventory.wood).toBe(1);
  });

  it('never pulls or picks up an item in another room, however close (021)', () => {
    const s = arena();
    s.groundItems.push({ id: s.nextGroundItemId++, itemId: 'wood', roomId: FOUNDRY_ROOM, x: PLAYER_AT.x + 4, y: PLAYER_AT.y });
    run(s, 30);
    expect(s.groundItems.length).toBe(1);
    expect(s.groundItems[0]?.x).toBe(PLAYER_AT.x + 4);
    expect(s.inventory.wood).toBeUndefined();
  });

  it('an item still waiting (a cache burst, 045) is not pulled until its wait runs out', () => {
    const s = itemAt(30);
    const item = s.groundItems[0];
    if (item) item.wait = 20;
    run(s, 19);
    expect(s.groundItems[0]?.x).toBe(PLAYER_AT.x + FEET_BOX.w / 2 + 30);
    run(s, 30);
    expect(s.inventory.wood).toBe(1);
  });
});
