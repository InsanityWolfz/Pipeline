import { ANY_SCHEMATIC } from '../../src/data/drops';
import { describe, expect, it } from 'vitest';
import { ITEMS } from '../../src/data/items';
import { CACHE_DROPS, LANDMARKS, landmarkDef } from '../../src/data/landmarks';
import { OVERWORLD_ROOM } from '../../src/data/overworld';
import { createSim, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { die, movePlayer, run, SEED } from './fight';

// The Ruined Cache (032): sealed while its guards live; holding E then opens it, its
// drops scattered with the seeded RNG; it stays empty until it re-arms after 10 minutes
// of play while out of view, and a KO never refills it.

const CACHE = landmarkDef('ruined-cache');
const AT = CACHE.cache ?? { tx: 0, ty: 0 };
const RAWS = ['wood', 'stone', 'fiber', 'ley-crystal'];
const guards = (s: SimState) => s.enemies.filter((e) => e.group === CACHE.id);

/** Stands the player just below the reliquary; `clear` kills its guards. */
function atCache(seed = SEED, clear = true): SimState {
  const s = createSim(seed);
  if (clear) s.enemies = s.enemies.filter((e) => e.group !== CACHE.id);
  s.roomId = OVERWORLD_ROOM;
  const below = tileCentre({ tx: AT.tx, ty: AT.ty + 1 });
  movePlayer(s, below.x, below.y);
  return s;
}

/** Opens it: E, then the hold. Returns what it gave, sorted: what lies on the ground and what was picked up straight away. */
function open(s: SimState): string[] {
  s.inventory = {};
  const before = new Set(s.groundItems.map((g) => g.id));
  run(s, 1, { interact: true });
  run(s, LANDMARKS.cacheOpenTicks - 1);
  const ground = s.groundItems.filter((g) => !before.has(g.id)).map((g) => g.itemId);
  const picked = Object.entries(s.inventory).flatMap(([id, n]) => Array<string>(n).fill(id));
  return [...ground, ...picked].sort();
}

describe('the Ruined Cache', () => {
  it('is guarded by its own pack at the start, and its reliquary is solid', () => {
    const s = atCache(SEED, false);
    expect(guards(s).map((e) => e.enemyId).sort()).toEqual(['husk', 'husk', 'husk', 'husk', 'wisp']);
    const y = s.player.y;
    s.enemies = [];
    run(s, 30, { moveY: -1 });
    expect(s.player.y).toBeGreaterThan(y - 16);
  });

  it('is sealed while any guard lives', () => {
    const s = atCache(SEED, false);
    s.enemies = guards(s).slice(0, 1);
    run(s, 1, { interact: true });
    expect(s.events.sealed).toEqual([{ site: CACHE.id }]);
    expect(s.cacheHold).toBeNull();
    run(s, LANDMARKS.cacheOpenTicks);
    expect(summarize(s).landmarks.find((l) => l.id === CACHE.id)?.opened).toBe(false);
  });

  it('opens after a 60-tick hold of E once they are dead, scattering 3–5 of the region\'s raws (and 033\'s rare finds) below it', () => {
    const s = atCache();
    s.inventory = {};
    run(s, 1, { interact: true });
    expect(s.cacheHold).toEqual({ id: CACHE.id, progress: 1 });
    run(s, LANDMARKS.cacheOpenTicks - 2);
    expect(s.events.cacheOpens).toEqual([]);
    expect(s.groundItems).toEqual([]);
    run(s, 1);
    const c = tileCentre(AT);
    expect(s.events.cacheOpens).toEqual([{ id: CACHE.id, x: c.x, y: c.y }]);
    const all = [...s.groundItems.map((g) => g.itemId), ...Object.entries(s.inventory).flatMap(([id, n]) => Array<string>(n).fill(id))];
    // 033's rare entries: an ancient gear at 50%, a schematic at 20%.
    const items = all.filter((id) => id !== 'ancient-gear' && !id.startsWith('schematic-'));
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.length).toBeLessThanOrEqual(5);
    for (const id of items) expect(RAWS).toContain(id);
    // Scattered below it (the player stands there, so some are picked up the same tick).
    for (const g of s.groundItems) expect(g.y).toBeGreaterThan(c.y);
    expect(summarize(s).landmarks.find((l) => l.id === CACHE.id)?.opened).toBe(true);
  });

  it('is cancelled by moving, like a claim', () => {
    const s = atCache();
    run(s, 1, { interact: true });
    run(s, 10);
    run(s, 1, { moveX: 1 });
    expect(s.cacheHold).toBeNull();
    run(s, LANDMARKS.cacheOpenTicks);
    expect(s.events.cacheOpens).toEqual([]);
  });

  it('rolls with the seeded RNG: the same seed, the same drops; other seeds differ', () => {
    expect(open(atCache(3))).toEqual(open(atCache(3)));
    const runs = [1, 2, 3, 4, 5, 6].map((seed) => open(atCache(seed)).join(','));
    expect(new Set(runs).size).toBeGreaterThan(1);
  });

  it('picks up as normal, and what it gave is at risk until banked', () => {
    const s = atCache();
    s.banked = {};
    const gave = open(s);
    for (let t = 0; t < 40 && s.groundItems.length > 0; t++) {
      const g = s.groundItems[0];
      if (g) movePlayer(s, g.x, g.y);
      run(s, 1);
    }
    expect(s.groundItems).toEqual([]);
    const held = Object.entries(s.inventory).flatMap(([id, n]) => Array<string>(n).fill(id)).sort();
    expect(held).toEqual(gave);
    expect(Object.values(summarize(s).atRisk).reduce((a, b) => a + b, 0)).toBe(held.length);
  });

  it('shows open and empty, with nothing more from E, until it re-arms', () => {
    const s = atCache();
    open(s);
    expect(open(s)).toEqual([]);
    expect(s.cacheHold).toBeNull();
  });

  it('never refills on a KO, and its guards come back then (dying after banking earns nothing)', () => {
    const s = atCache();
    open(s);
    die(s);
    expect(summarize(s).landmarks.find((l) => l.id === CACHE.id)?.opened).toBe(true);
    expect(guards(s)).toHaveLength(5);
    s.enemies = s.enemies.filter((e) => e.group !== CACHE.id);
    s.roomId = OVERWORLD_ROOM;
    const below = tileCentre({ tx: AT.tx, ty: AT.ty + 1 });
    movePlayer(s, below.x, below.y);
    expect(open(s)).toEqual([]);
  });

  it('re-arms after 10 minutes of play, only on a tick it is out of view, with its guards back', () => {
    const s = atCache();
    open(s);
    // Still in view at the cache: the time passes but it stays empty.
    s.tick += LANDMARKS.cacheRearmTicks;
    run(s, 2);
    expect(summarize(s).landmarks.find((l) => l.id === CACHE.id)?.opened).toBe(true);
    expect(guards(s)).toEqual([]);
    // Out of view: it fills, and its guards are home again.
    const far = tileCentre({ tx: 40, ty: 27 });
    movePlayer(s, far.x, far.y);
    run(s, 1);
    expect(summarize(s).landmarks.find((l) => l.id === CACHE.id)?.opened).toBe(false);
    expect(guards(s).map((e) => e.enemyId).sort()).toEqual(['husk', 'husk', 'husk', 'husk', 'wisp']);
  });

  it('does not re-arm a tick early', () => {
    const s = atCache();
    open(s);
    const far = tileCentre({ tx: 40, ty: 27 });
    movePlayer(s, far.x, far.y);
    s.tick += LANDMARKS.cacheRearmTicks - 3;
    run(s, 1);
    expect(summarize(s).landmarks.find((l) => l.id === CACHE.id)?.opened).toBe(true);
    run(s, 2);
    expect(summarize(s).landmarks.find((l) => l.id === CACHE.id)?.opened).toBe(false);
  });

  it('names only real items in its table, or 033\'s schematic roll', () => {
    for (const p of CACHE_DROPS.picks ?? []) {
      for (const id of p.items) expect(ITEMS[id]?.kind, id).toBe('raw');
      expect([p.min, p.max]).toEqual([3, 5]);
    }
    for (const r of CACHE_DROPS.rare ?? []) expect(ITEMS[r.itemId] !== undefined || r.itemId === ANY_SCHEMATIC, r.itemId).toBe(true);
  });
});
