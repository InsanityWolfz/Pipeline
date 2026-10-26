import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../../src/data/config';
import { enemyDef, type EnemyDef } from '../../src/data/enemies';
import { HOLLOWS } from '../../src/data/hollows';
import { OVERWORLD, OVERWORLD_ROOM, ringOf } from '../../src/data/overworld';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { defOf, makeChampion } from '../../src/sim/champions';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import { castOrb } from '../../src/sim/orbs';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { arena, hold, movePlayer, PLAYER_AT, run } from './fight';

// Ring scaling (041): an enemy's ring is its home tile's, set when it's created; its
// def scales max health and every attack's damage by the ring, then by a champion's,
// rounded once. Bosses keep their own numbers.

/** The shrine's pylon tile is in ring 2 (017); the Hollows' start in ring 3 (034). */
const RING_2 = tileCentre(OVERWORLD.shrine.pylon);
const RING_3 = tileCentre(HOLLOWS.start);

/** An enemy placed at a point in the overworld, its home there. */
function place(s: SimState, enemyId: string, at: { x: number; y: number }, dx = 0): EnemyState {
  const e = createEnemy(s.nextEnemyId++, enemyId, { x: at.x + dx, y: at.y }, OVERWORLD_ROOM);
  s.enemies.push(e);
  return e;
}

/** Its one attack's damage, whatever its kind. */
function attackDamage(def: EnemyDef): number {
  switch (def.kind) {
    case 'melee':
      return def.swipe.damage;
    case 'caster':
      return def.cast.orbDamage;
    case 'slammer':
      return def.slam.damage;
    case 'bulwark':
      return def.pound.damage;
    case 'forgewright':
      return def.slam.damage;
    case 'charger':
      return def.charge.damage;
    case 'burrower':
      return def.burrow.damage;
    case 'shardback':
      return def.bash.damage;
    case 'sniper':
      return def.snipe.damage;
    case 'mote':
      return def.swell.damage;
  }
}

describe('an enemy’s ring', () => {
  it('is its home tile’s, set when it is created, and kept as it walks', () => {
    expect(ringOf(Math.floor(RING_2.x / TILE_SIZE), Math.floor(RING_2.y / TILE_SIZE))).toBe(2);
    const s = arena();
    const e = place(s, 'husk', RING_2, 64);
    expect(e.ring).toBe(2);
    expect(e.health).toBe(64);
    e.x = tileCentre(OVERWORLD.field).x;
    e.y = tileCentre(OVERWORLD.field).y;
    run(s, 2);
    expect(e.ring).toBe(2);
    expect(defOf(e).maxHealth).toBe(64);
  });

  it('is 0 in any room but the overworld', () => {
    expect(createEnemy(1, 'husk', { x: 300, y: 300 }, FOUNDRY_ROOM).ring).toBe(0);
  });

  it('is reported by getState(), with the scaled max health', () => {
    const s = arena();
    const e = place(s, 'charger', RING_3);
    expect(summarize(s).enemies.find((x) => x.id === e.id)).toMatchObject({ ring: 3, health: 125, maxHealth: 125 });
  });
});

describe('the def function (041.3)', () => {
  const def = (enemyId: string, ring: 0 | 1 | 2 | 3, champion = false): EnemyDef => defOf({ enemyId, ring, champion: champion ? { name: 'x' } : null });

  it('scales health and every attack’s damage by the ring, then the champion, rounded once', () => {
    expect([def('husk', 2).maxHealth, attackDamage(def('husk', 2))]).toEqual([64, 32]);
    expect([def('sniper', 3, true).maxHealth, attackDamage(def('sniper', 3, true))]).toEqual([113, 91]);
  });

  it('leaves walk speed, size, reach, timings, knockback, weight, drops and XP unscaled (a champion’s size and speed are its own)', () => {
    const base = enemyDef('charger');
    const scaled = def('charger', 3);
    if (base.kind !== 'charger' || scaled.kind !== 'charger') throw new Error('not a Charger');
    expect([scaled.maxHealth, scaled.charge.damage]).toEqual([125, 63]);
    expect({ ...scaled, maxHealth: 0, charge: { ...scaled.charge, damage: 0 } }).toEqual({ ...base, maxHealth: 0, charge: { ...base.charge, damage: 0 } });
    const champ = def('charger', 3, true);
    expect(champ.feetBox).toEqual(def('charger', 1, true).feetBox);
    expect(champ.walkSpeed).toBe(def('charger', 1, true).walkSpeed);
  });

  it('a ring 1 champion is exactly as before 041: a Husk’s swipe 26, 60 HP', () => {
    expect([def('husk', 1, true).maxHealth, attackDamage(def('husk', 1, true))]).toEqual([60, 26]);
    expect(def('husk', 0)).toBe(enemyDef('husk'));
    expect(def('husk', 1)).toBe(enemyDef('husk'));
  });

  it('never scales a boss: the Warden and the Bulwark keep their own numbers in any ring', () => {
    for (const ring of [0, 1, 2, 3] as const) {
      expect(def('pylon-warden', ring)).toBe(enemyDef('pylon-warden'));
      expect(def('bulwark', ring)).toBe(enemyDef('bulwark'));
    }
  });
});

describe('scaled enemies in a fight', () => {
  it('a ring 2 Husk has 64 HP and swipes for 32', () => {
    const s = arena(undefined, RING_2);
    const e = place(s, 'husk', RING_2, 30);
    expect(e.health).toBe(64);
    let taken = 0;
    for (let t = 0; t < 120 && taken === 0; t++) {
      run(s, 1);
      taken = s.events.hits.filter((h) => h.target === 'player').reduce((n, h) => n + h.damage, 0);
    }
    expect(taken).toBe(32);
  });

  it('a ring 3 champion Sniper has 113 HP and its bolt hits for 91', () => {
    const s = arena(undefined, RING_3);
    const e = place(s, 'sniper', RING_3, -120);
    makeChampion(s.rng, e);
    expect(e.health).toBe(113);
    e.swipeDirX = 1;
    e.swipeDirY = 0;
    movePlayer(s, e.x + 60, e.y);
    s.enemies = [];
    castOrb(s, e);
    let taken = 0;
    for (let t = 0; t < 30 && taken === 0; t++) {
      run(s, 1);
      taken = s.events.hits.filter((h) => h.target === 'player').reduce((n, h) => n + h.damage, 0);
    }
    expect(taken).toBe(91);
  });

  it('a ring 3 Bulwark and Warden start at their own health', () => {
    const s = arena();
    expect(place(s, 'bulwark', RING_3).health).toBe(enemyDef('bulwark').maxHealth);
    expect(place(s, 'pylon-warden', RING_3).health).toBe(enemyDef('pylon-warden').maxHealth);
  });
});

describe('frost on a ring 1 Husk (041: Frost unchanged)', () => {
  it('dies to its third Frost arrow, before a Freeze', () => {
    const s = arena();
    s.inventory = { 'arrow+frost': 10 };
    hold(s, 'arrow+frost');
    const e = createEnemy(s.nextEnemyId++, 'husk', { x: PLAYER_AT.x + 120, y: PLAYER_AT.y }, OVERWORLD_ROOM);
    e.ring = 1;
    // Held where it stands, its wind-up never landing, so only the arrows matter.
    Object.assign(e, { mode: 'windup', modeTicks: -10_000 });
    s.enemies.push(e);
    let hits = 0;
    let froze = 0;
    for (let t = 0; t < 300 && s.enemies.includes(e); t++) {
      run(s, 1, { use: true, aimX: e.x, aimY: e.y - 10 });
      hits += s.events.hits.filter((h) => h.target === 'enemy' && h.id === e.id).length;
      froze += s.events.freezes.length;
    }
    expect(s.enemies.includes(e)).toBe(false);
    expect(hits).toBe(3);
    expect(froze).toBe(0);
  });
});
