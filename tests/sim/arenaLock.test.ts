import { describe, expect, it } from 'vitest';
import { ADDS_GROUP } from '../../src/data/bulwark';
import { TILE_SIZE } from '../../src/data/config';
import { HOLLOWS } from '../../src/data/hollows';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { FEET_BOX } from '../../src/data/player';
import { arenaSealed } from '../../src/sim/arenaLock';
import { roomBodies } from '../../src/sim/bodies';
import { tileRect } from '../../src/sim/fixtures';
import { createEnemy } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { WORLD } from '../../src/sim/world';
import { movePlayer, run, runUntil } from './fight';
import { DEF, forum, START } from './forum';

// The arena lock (043, was 041.18): when the Bulwark engages, a ley barrier seals the Sunken
// Forum's way in; feet can't pass it. E at the sealed door leaves: the player stands just
// outside, and the fight resets as a leash reset does (the Bulwark back at its start at full
// health, its adds and bombs gone), so the seal drops. No healing source reaches the arena.

const A = HOLLOWS.arena;
const T = TILE_SIZE;
const SEAL = A.seal.tiles;
const SEAL_ROW = SEAL[0]?.ty ?? 0;
/** The door's middle column, px. */
const DOOR_X = ((SEAL[0]?.tx ?? 0) + (SEAL[SEAL.length - 1]?.tx ?? 0) + 1) * (T / 2);
/** Feet pressed against the seal from inside: the box's top on the seal's bottom edge. */
const INSIDE_DOOR_Y = (SEAL_ROW + 1) * T + FEET_BOX.h / 2;
const sealedNow = (s: SimState): boolean => arenaSealed(s, A);

/** The forum with the Bulwark awake (one tick run with the player inside). */
function awake(dy = 160): ReturnType<typeof forum> {
  const f = forum(dy);
  run(f.s, 1);
  expect(f.b.mode).not.toBe('idle');
  return f;
}

describe('the seal', () => {
  it('has its tiles across the forum way in, and a leave tile just outside it, in data', () => {
    expect(SEAL.length).toBeGreaterThan(0);
    for (const t of SEAL) expect(t.ty).toBe(A.bounds.y0);
    expect(A.seal.leaveTo.ty).toBe(SEAL_ROW - 1);
    const room = WORLD[OVERWORLD_ROOM];
    expect(room?.rows[A.seal.leaveTo.ty]?.[A.seal.leaveTo.tx]).not.toBeUndefined();
  });

  it('is open while the Bulwark idles, and seals the tick it engages, shown in getState()', () => {
    const { s } = forum(160);
    expect(sealedNow(s)).toBe(false);
    expect(summarize(s).arenas).toEqual([{ id: A.id, sealed: false, seal: SEAL.map((t) => ({ tx: t.tx, ty: t.ty })) }]);
    const sealBoxes = SEAL.map(tileRect);
    expect(roomBodies(s, OVERWORLD_ROOM).obstacles).not.toEqual(expect.arrayContaining(sealBoxes));
    run(s, 1);
    expect(sealedNow(s)).toBe(true);
    expect(summarize(s).arenas[0]?.sealed).toBe(true);
    // Solid to every mover's feet: the player's and enemies' moves both collide with the room's bodies.
    expect(roomBodies(s, OVERWORLD_ROOM).obstacles).toEqual(expect.arrayContaining(sealBoxes));
  });

  it('stops a roll at it too', () => {
    const { s } = awake();
    movePlayer(s, DOOR_X, INSIDE_DOOR_Y + 20);
    run(s, 1, { moveY: -1, dodge: true });
    run(s, 30, { moveY: -1 });
    expect(s.player.y).toBeGreaterThanOrEqual(INSIDE_DOOR_Y);
  });

  it("stops the player's feet walking out while sealed", () => {
    const { s } = awake();
    movePlayer(s, DOOR_X, INSIDE_DOOR_Y + 2);
    run(s, 60, { moveY: -1 });
    expect(s.player.y).toBeGreaterThanOrEqual(INSIDE_DOOR_Y);
  });

  it('pushes a player standing in the door row as the Bulwark wakes into the arena, so they cannot walk out', () => {
    const { s } = forum(160);
    // Feet just inside: the box still reaches into the door row.
    movePlayer(s, DOOR_X, A.inside.y0 * T);
    run(s, 1);
    expect(sealedNow(s)).toBe(true);
    expect(s.player.y).toBeGreaterThanOrEqual(INSIDE_DOOR_Y);
    run(s, 40, { moveY: -1 });
    expect(s.player.y).toBeGreaterThanOrEqual(INSIDE_DOOR_Y);
  });

  it("stops an enemy's feet walking in while sealed", () => {
    const { s } = awake();
    movePlayer(s, DOOR_X, INSIDE_DOOR_Y + 40);
    const husk = createEnemy(s.nextEnemyId++, 'husk', { x: DOOR_X, y: (SEAL_ROW - 2) * T }, OVERWORLD_ROOM);
    s.enemies.push(husk);
    run(s, 120, (st) => {
      st.player.health = 100;
      return {};
    });
    expect(sealedNow(s)).toBe(true);
    expect(husk.y).toBeLessThanOrEqual(SEAL_ROW * T);
  });

  it('drops when the Bulwark heads home on a leash, and when it dies', () => {
    const { s, b } = awake();
    movePlayer(s, DOOR_X, (SEAL_ROW - 3) * T);
    runUntil(s, () => b.mode === 'return', DEF.leashTicks + 5);
    expect(sealedNow(s)).toBe(false);
    const f = awake();
    f.b.health = 0;
    run(f.s, 1);
    expect(f.s.enemies.some((e) => e.enemyId === 'bulwark')).toBe(false);
    expect(sealedNow(f.s)).toBe(false);
  });
});

describe('E at the sealed door', () => {
  it('leaves: the player just outside, the Bulwark at its start at full health, its adds and bombs gone, the seal down', () => {
    const { s, b } = awake(96);
    // Hurt it below half so its adds rise, and let it lob.
    b.health = Math.floor(DEF.maxHealth * DEF.adds.below) - 1;
    for (let t = 0; t < DEF.lob.cooldownTicks + 200 && s.enemyBombs.length === 0; t++) {
      s.player.health = 100;
      run(s, 1);
    }
    expect(s.enemyBombs.length).toBeGreaterThan(0);
    expect(s.enemies.some((e) => e.group === ADDS_GROUP)).toBe(true);
    movePlayer(s, DOOR_X, INSIDE_DOOR_Y);
    run(s, 1, { interact: true });
    const out = tileCentre(A.seal.leaveTo);
    expect({ x: s.player.x, y: s.player.y }).toEqual(out);
    expect(b).toMatchObject({ x: START.x, y: START.y, health: DEF.maxHealth, mode: 'idle', enraged: false, addsRisen: false, behind: 0 });
    expect(s.enemies.some((e) => e.group === ADDS_GROUP)).toBe(false);
    expect(s.enemyBombs.filter((x) => x.enemyId === 'bulwark')).toEqual([]);
    expect(sealedNow(s)).toBe(false);
    expect(s.events.arenaLeaves).toEqual([{ arena: A.id }]);
    // Outside, it stays asleep.
    run(s, 60);
    expect(b.mode).toBe('idle');
    expect(b.health).toBe(DEF.maxHealth);
  });

  it('does nothing away from the door, or at the door while it is open', () => {
    const { s, b } = awake(96);
    run(s, 1, { interact: true });
    expect(s.events.arenaLeaves).toEqual([]);
    expect(b.mode).not.toBe('idle');
    const f = forum(160);
    movePlayer(f.s, DOOR_X, (SEAL_ROW - 1) * T + T / 2);
    run(f.s, 1, { interact: true });
    expect(f.s.events.arenaLeaves).toEqual([]);
  });

  it('is deterministic: a fight with a leave, run twice, ends the same', () => {
    const go = (): string => {
      const { s } = awake(96);
      run(s, 300, (st) => ({ moveX: st.tick % 90 < 45 ? 1 : -1, fire: true, aimX: START.x, aimY: START.y - 20 }));
      movePlayer(s, DOOR_X, INSIDE_DOOR_Y);
      run(s, 1, { interact: true });
      run(s, 120);
      const sum = summarize(s);
      return JSON.stringify({ bosses: sum.bosses, player: sum.player, arenas: sum.arenas });
    };
    expect(go()).toBe(go());
  });
});

describe('no healing source inside the arena', () => {
  /** The gap from a circle's centre to the arena's bounds, px (0 inside). */
  const gap = (x: number, y: number): number => {
    const b = A.bounds;
    const dx = Math.max(b.x0 * T - x, 0, x - (b.x1 + 1) * T);
    const dy = Math.max(b.y0 * T - y, 0, y - (b.y1 + 1) * T);
    return Math.hypot(dx, dy);
  };

  it('no spring pool overlaps it', () => {
    for (const sp of OVERWORLD.springs) {
      const c = tileCentre(sp);
      expect(gap(c.x, c.y), sp.id).toBeGreaterThan(sp.radius * T);
    }
  });

  it("no pylon's safe zone overlaps it, claimed or not", () => {
    const pylons = WORLD[OVERWORLD_ROOM]?.pylons ?? [];
    expect(pylons.length).toBeGreaterThan(0);
    for (const p of pylons) {
      const c = tileCentre(p);
      expect(gap(c.x, c.y), p.site).toBeGreaterThan(p.safeRadius * T);
    }
  });
});
