import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../../src/data/config';
import { OVERWORLD_ROOM } from '../../src/data/overworld';
import { TILE, type Room } from '../../src/data/rooms';
import { CROWN_SPIRE } from '../../src/data/stormcrownSites';
import { isSolid, moveBox } from '../../src/sim/collision';
import { roomBodies } from '../../src/sim/bodies';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import { flyBox } from '../../src/sim/flight';
import { inSafeZone, safeZones } from '../../src/sim/population';
import { separate } from '../../src/sim/separation';
import type { SimState } from '../../src/sim/state';
import { WORLD } from '../../src/sim/world';
import { arena, fireAt, hold, HALL, movePlayer, PLAYER_AT, placeHusk, run, runUntil } from './fight';

// Flight (065: the thunderhawk). A flier moves over walls, cliffs and chasms, never blocked by terrain; it stays on
// its room's grid and out of a boss arena's walls; safe zones keep it out as anyone; it never pushes a walker or is
// pushed by one; killed over something solid, its drops land on open ground. Homing rounds track it as it circles.

const BOX = { w: 16, h: 8 };

/** A small room: open floor with a wall column at tx 5 and a chasm-like water column at tx 8. */
const ROOM: Room = {
  id: 'test',
  rows: Array.from({ length: 6 }, () => Array.from({ length: 12 }, (_, tx) => (tx === 5 ? TILE.wall : tx === 8 ? TILE.water : TILE.floor)).join('')),
  spawn: { tx: 1, ty: 1 },
};

function placeHawk(s: SimState, x: number, y: number): EnemyState {
  const e = createEnemy(s.nextEnemyId++, 'thunderhawk', { x, y }, HALL, 'pack');
  s.enemies.push(e);
  return e;
}

describe('flight', () => {
  it('carries a flier across a wall and water that stop a walker', () => {
    const walker = { x: 3 * TILE_SIZE, y: 2.5 * TILE_SIZE };
    const flier = { ...walker };
    for (let i = 0; i < 60; i++) {
      moveBox(ROOM, walker, BOX, 4, 0);
      flyBox(ROOM, 'test', flier, BOX, 4, 0);
    }
    expect(walker.x).toBeLessThan(5 * TILE_SIZE);
    expect(flier.x).toBeGreaterThan(9 * TILE_SIZE);
  });

  it("keeps a flier on its room's grid", () => {
    const flier = { x: 11 * TILE_SIZE, y: 5 * TILE_SIZE };
    const hit = flyBox(ROOM, 'test', flier, BOX, 100, 100);
    expect(hit).toEqual({ hitX: true, hitY: true });
    expect(flier).toEqual({ x: 12 * TILE_SIZE - BOX.w / 2, y: 6 * TILE_SIZE - BOX.h / 2 });
  });

  it("stops a flier at a boss arena's walls (the Crown Spire's), unless it is already inside", () => {
    const room = WORLD[OVERWORLD_ROOM] as Room;
    const b = CROWN_SPIRE.bounds;
    const below = { x: (b.x0 + 5) * TILE_SIZE, y: (b.y1 + 1) * TILE_SIZE + 6 };
    const hit = flyBox(room, OVERWORLD_ROOM, below, BOX, 0, -8);
    expect(hit.hitY).toBe(true);
    expect(below.y).toBe((b.y1 + 1) * TILE_SIZE + 6);
    const inside = { x: (b.x0 + 5) * TILE_SIZE, y: (b.y0 + 5) * TILE_SIZE };
    expect(flyBox(room, OVERWORLD_ROOM, inside, BOX, 0, -8).hitY).toBe(false);
  });

  it('flies a hawk up off a solid tile and on round the player', () => {
    const s = arena();
    const room = WORLD[OVERWORLD_ROOM] as Room;
    // The nearest solid tile to the player, a few tiles out; the player stands beside it (so the hawk wakes).
    let solid: { tx: number; ty: number } | null = null;
    const ptx = Math.floor(PLAYER_AT.x / TILE_SIZE);
    const pty = Math.floor(PLAYER_AT.y / TILE_SIZE);
    for (let r = 3; r < 12 && !solid; r++) for (let dx = -r; dx <= r && !solid; dx++) if (isSolid(room, ptx + dx, pty - r)) solid = { tx: ptx + dx, ty: pty - r };
    if (!solid) throw new Error('no solid tile near the meadow');
    const at = { x: (solid.tx + 0.5) * TILE_SIZE, y: (solid.ty + 0.5) * TILE_SIZE };
    const hawk = placeHawk(s, at.x, at.y);
    hawk.cooldown = 100_000;
    movePlayer(s, PLAYER_AT.x, at.y + 150);
    run(s, 30);
    expect(Math.hypot(hawk.x - at.x, hawk.y - at.y)).toBeGreaterThan(30);
  });

  it("never enters a claimed pylon's safe zone", () => {
    const s = arena();
    s.claims.push('weathervane');
    const zone = safeZones(s).find((z) => z.roomId === OVERWORLD_ROOM && z.r > 0);
    if (!zone) throw new Error('no safe zone');
    s.player.x = zone.x;
    s.player.y = zone.y;
    const hawk = placeHawk(s, zone.x + zone.r + 20, zone.y);
    for (let t = 0; t < 400; t++) {
      run(s, 1);
      expect(inSafeZone(s, OVERWORLD_ROOM, hawk.x, hawk.y)).toBe(false);
    }
  });

  it('never pushes a walker or is pushed by one; two fliers push apart', () => {
    const s = arena();
    const bodies = (id: string) => roomBodies(s, id);
    const hawk = placeHawk(s, PLAYER_AT.x + 200, PLAYER_AT.y);
    const husk = placeHusk(s, PLAYER_AT.x + 200, PLAYER_AT.y);
    separate(s.enemies, bodies);
    expect({ x: hawk.x, y: hawk.y }).toEqual({ x: husk.x, y: husk.y });
    const other = placeHawk(s, PLAYER_AT.x + 202, PLAYER_AT.y);
    separate(s.enemies, bodies);
    expect(Math.abs(other.x - hawk.x) >= 16 - 1e-6 || Math.abs(other.y - hawk.y) >= 8 - 1e-6).toBe(true);
    expect(husk.x).toBe(PLAYER_AT.x + 200);
  });

  it('lands the drops of a hawk killed over a solid tile on open ground', () => {
    const s = arena();
    const room = WORLD[OVERWORLD_ROOM] as Room;
    const ptx = Math.floor(PLAYER_AT.x / TILE_SIZE);
    const pty = Math.floor(PLAYER_AT.y / TILE_SIZE);
    let solid: { tx: number; ty: number } | null = null;
    for (let r = 3; r < 12 && !solid; r++) for (let dx = -r; dx <= r && !solid; dx++) if (isSolid(room, ptx + dx, pty + r)) solid = { tx: ptx + dx, ty: pty + r };
    if (!solid) throw new Error('no solid tile near the meadow');
    const hawk = placeHawk(s, (solid.tx + 0.5) * TILE_SIZE, (solid.ty + 0.5) * TILE_SIZE);
    hawk.frozen = 100;
    hawk.health = 0;
    run(s, 1);
    expect(s.groundItems.length).toBeGreaterThan(0);
    for (const g of s.groundItems) expect(isSolid(room, Math.floor(g.x / TILE_SIZE), Math.floor(g.y / TILE_SIZE))).toBe(false);
  });

  it('is tracked to a hit by a homing round where a plain one fired at the same point misses', () => {
    const shoot = (round: string): boolean => {
      const s = arena();
      s.inventory = { [round]: 10 };
      hold(s, 'ley-bolt');
      const hawk = placeHawk(s, PLAYER_AT.x + 200, PLAYER_AT.y);
      hawk.cooldown = 100_000;
      // Let it settle into its orbit.
      run(s, 240);
      hawk.health = 1000;
      run(s, 1, fireAt(hawk.x, hawk.y - 30));
      try {
        runUntil(s, (x) => x.events.hits.some((h) => h.target === 'enemy' && h.id === hawk.id), 90);
        return true;
      } catch {
        return false;
      }
    };
    expect(shoot('ley-bolt+homing')).toBe(true);
    expect(shoot('ley-bolt')).toBe(false);
  });
});
