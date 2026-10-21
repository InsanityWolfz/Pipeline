import { describe, expect, it } from 'vitest';
import { ADDS_GROUP } from '../../src/data/bulwark';
import { TILE_SIZE } from '../../src/data/config';
import { FORUM_ARENA } from '../../src/data/arenas';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { FEET_BOX } from '../../src/data/player';
import { arenaLocked } from '../../src/sim/arenaLock';
import { createEnemy } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { WORLD } from '../../src/sim/world';
import { movePlayer, run, runUntil } from './fight';
import { DEF, forum, START } from './forum';

// The arena lock (043, was 041.18), on the forum's door since 055: when the Bulwark engages with the player inside,
// the forum locks (043's seal over its door). The door is part of the wall: feet and shots never pass it. E at it from
// inside leaves: the player stands just outside, and the fight resets as a leash reset does (the Bulwark back at its
// start at full health, its adds and bombs gone), so the lock drops. No healing source reaches the arena.

const A = FORUM_ARENA;
const T = TILE_SIZE;
const SEAL = A.door.tiles;
const SEAL_ROW = SEAL[0]?.ty ?? 0;
/** The door's middle column, px. */
const DOOR_X = ((SEAL[0]?.tx ?? 0) + (SEAL[SEAL.length - 1]?.tx ?? 0) + 1) * (T / 2);
/** Feet pressed against the door from inside: the box's top on the door's bottom edge. */
const INSIDE_DOOR_Y = (SEAL_ROW + 1) * T + FEET_BOX.h / 2;
const sealedNow = (s: SimState): boolean => arenaLocked(s, A);

/** The forum with the Bulwark awake (one tick run with the player inside). */
function awake(dy = 160): ReturnType<typeof forum> {
  const f = forum(dy);
  run(f.s, 1);
  expect(f.b.mode).not.toBe('idle');
  return f;
}

describe('the lock', () => {
  it('has its door across the forum way in, and a leave tile just outside it, in data', () => {
    expect(SEAL.length).toBeGreaterThan(0);
    for (const t of SEAL) expect(t.ty).toBe(A.bounds.y0);
    expect(A.door.leaveTo.ty).toBe(SEAL_ROW - 2);
    const room = WORLD[OVERWORLD_ROOM];
    expect(room?.rows[A.door.leaveTo.ty]?.[A.door.leaveTo.tx]).not.toBeUndefined();
  });

  it('is open while the Bulwark idles, and locks the tick it engages, shown in getState()', () => {
    const { s } = forum(160);
    expect(sealedNow(s)).toBe(false);
    const door = SEAL.map((t) => ({ tx: t.tx, ty: t.ty }));
    expect(summarize(s).arenas.find((a) => a.id === A.id)).toEqual({ id: A.id, locked: false, unlocked: true, inside: true, door });
    run(s, 1);
    expect(sealedNow(s)).toBe(true);
    expect(summarize(s).arenas.find((a) => a.id === A.id)?.locked).toBe(true);
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

  it('stops shots both ways (055: the door is part of the wall; 043.3 let them through the seal)', () => {
    const { s } = awake();
    movePlayer(s, DOOR_X, INSIDE_DOOR_Y + 4);
    const husk = createEnemy(s.nextEnemyId++, 'husk', { x: DOOR_X, y: (SEAL_ROW - 2) * T }, OVERWORLD_ROOM);
    husk.frozen = 10_000;
    s.enemies.push(husk);
    const max = husk.health;
    for (let t = 0; t < 40 && husk.health === max; t++) {
      s.player.health = 100;
      run(s, 1, { use: true, aimX: husk.x, aimY: husk.y - 12 });
    }
    expect(sealedNow(s)).toBe(true);
    expect(husk.health).toBe(max);
  });

  it("drops when the player is KO'd inside (the Bulwark turns for home)", () => {
    const { s } = awake();
    s.player.health = 0;
    run(s, 2);
    expect(s.player.dying).toBeGreaterThan(0);
    expect(sealedNow(s)).toBe(false);
  });

  it('seals for a summoned Bulwark too, and E resets it the same way', () => {
    const { s, b } = forum(160);
    b.health = 0;
    run(s, 1);
    expect(s.bossDefeats).toEqual(['bulwark']);
    s.groundItems = [];
    s.inventory = { ...s.inventory, 'ley-iron': 8 };
    const by = tileCentre({ tx: A.altar.tx + 1, ty: A.altar.ty });
    movePlayer(s, by.x, by.y);
    run(s, 1, { summon: A.altar.id });
    run(s, A.summonTicks + 1);
    const summoned = s.enemies.find((e) => e.enemyId === 'bulwark');
    expect(summoned).toBeDefined();
    expect(sealedNow(s)).toBe(true);
    if (!summoned) return;
    summoned.health = 1000;
    movePlayer(s, DOOR_X, INSIDE_DOOR_Y);
    run(s, 1, { interact: true });
    expect(s.events.arenaLeaves).toEqual([{ arena: A.id }]);
    expect(summoned).toMatchObject({ x: START.x, y: START.y, health: DEF.maxHealth, mode: 'idle' });
    expect(s.enemies).toContain(summoned);
    expect(sealedNow(s)).toBe(false);
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
    // A back wave building as the player leaves is gone with the rest.
    b.waveTicks = 5;
    run(s, 1, { interact: true });
    const out = tileCentre(A.door.leaveTo);
    expect({ x: s.player.x, y: s.player.y }).toEqual(out);
    expect(b).toMatchObject({ x: START.x, y: START.y, health: DEF.maxHealth, mode: 'idle', enraged: false, addsRisen: false, behind: 0, waveTicks: 0 });
    expect(s.enemies.some((e) => e.group === ADDS_GROUP)).toBe(false);
    expect(s.enemyBombs.filter((x) => x.enemyId === 'bulwark')).toEqual([]);
    expect(sealedNow(s)).toBe(false);
    expect(s.events.arenaLeaves).toEqual([{ arena: A.id }]);
    // Outside, it stays asleep.
    run(s, 60);
    expect(b.mode).toBe('idle');
    expect(b.health).toBe(DEF.maxHealth);
  });

  it('does nothing away from the door; from outside the door, E goes in (055) and leaves the Bulwark asleep', () => {
    const { s, b } = awake(96);
    run(s, 1, { interact: true });
    expect(s.events.arenaLeaves).toEqual([]);
    expect(b.mode).not.toBe('idle');
    const f = forum(160);
    movePlayer(f.s, DOOR_X, (SEAL_ROW - 1) * T + T / 2);
    run(f.s, 1, { interact: true });
    expect(f.s.events.arenaLeaves).toEqual([]);
    expect(f.s.events.arenaEnters).toEqual([{ arena: A.id }]);
    expect({ x: f.s.player.x, y: f.s.player.y }).toEqual(tileCentre(A.door.enterTo));
  });

  it('is deterministic: a fight with a leave, run twice, ends the same', () => {
    const go = (): string => {
      const { s } = awake(96);
      run(s, 300, (st) => ({ moveX: st.tick % 90 < 45 ? 1 : -1, use: true, aimX: START.x, aimY: START.y - 20 }));
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
