import { afterEach, describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../../src/data/config';
import { DYING_TICKS, HEALING, MAX_HEALTH } from '../../src/data/player';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { FOUNDRY_ROOM, SHRINE_SITE } from '../../src/data/rooms';
import { claim } from '../../src/sim/claims';
import { fieldRegen, springAt, strongest } from '../../src/sim/healing';
import { damagePlayer } from '../../src/sim/health';
import { roomById, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { arena, atPylon, movePlayer, run } from './fight';

// Healing only in safe spots (030): fast in a claimed pylon's safe zone and in a Ley
// Spring's pool, a fast fill at the foundry, nothing in the open field. Rates never stack.

const BASE_REGEN = HEALING.fieldRegen;
afterEach(() => {
  HEALING.fieldRegen = BASE_REGEN;
});

const spring = (id: string) => {
  const s = OVERWORLD.springs.find((x) => x.id === id);
  if (!s) throw new Error(`no spring ${id}`);
  return s;
};

/** A hurt player standing in a spring's pool, the overworld otherwise empty. */
function inSpring(id: string, health: number): SimState {
  const s = arena();
  const c = tileCentre(spring(id));
  movePlayer(s, c.x, c.y);
  s.player.health = health;
  return s;
}

/** A hurt player one tile below the claimed shrine's pylon. */
function inZone(health: number): SimState {
  const s = arena();
  claim(s, SHRINE_SITE);
  s.enemies = [];
  atPylon(s);
  s.player.health = health;
  return s;
}

/** A hurt player in the foundry. */
function inFoundry(health: number): SimState {
  const s = arena();
  s.roomId = FOUNDRY_ROOM;
  const c = tileCentre(roomById(FOUNDRY_ROOM).spawn);
  movePlayer(s, c.x, c.y);
  s.player.health = health;
  return s;
}

describe('where you heal', () => {
  it('the open field heals nothing: field regen is 0', () => {
    expect(HEALING).toEqual({ foundry: 50, pylon: 10, spring: 10, fieldRegen: 0, afterHitDelay: 0 });
    const s = arena();
    s.player.health = 40;
    expect(fieldRegen()).toBe(0);
    run(s, 600);
    expect(s.player.health).toBe(40);
    expect(s.player.healing).toBeNull();
  });

  it('the shrine safe zone, once claimed, gives back 30 in exactly 180 ticks', () => {
    const before = arena();
    atPylon(before);
    before.enemies = [];
    before.player.health = 50;
    run(before, 180);
    expect(before.player.health).toBe(50);

    const s = inZone(50);
    run(s, 179);
    expect(s.player.health).toBe(79);
    run(s, 1);
    expect(s.player.health).toBe(80);
    expect(s.player.healing).toBe('pylon');
  });

  it('each spring gives back 30 in exactly 180 ticks in its pool, and nothing a tile outside it', () => {
    for (const sp of OVERWORLD.springs) {
      const s = inSpring(sp.id, 50);
      run(s, 179);
      expect(s.player.health, sp.id).toBe(79);
      run(s, 1);
      expect(s.player.health, sp.id).toBe(80);
      expect(s.player.healing).toBe('spring');

      const out = inSpring(sp.id, 50);
      const c = tileCentre(sp);
      movePlayer(out, c.x, c.y + (sp.radius + 1) * TILE_SIZE);
      run(out, 180);
      expect(out.player.health, sp.id).toBe(50);
      expect(out.player.healing).toBeNull();
    }
  });

  it('feet inside the pool count: the rim heals, just past it does not', () => {
    const sp = spring('west-spring');
    const c = tileCentre(sp);
    const r = sp.radius * TILE_SIZE;
    expect(springAt(OVERWORLD_ROOM, c.x + r - 1, c.y)?.id).toBe('west-spring');
    expect(springAt(OVERWORLD_ROOM, c.x + r + 1, c.y)).toBeNull();
    expect(springAt(FOUNDRY_ROOM, c.x, c.y)).toBeNull();
  });

  it('the foundry fills 10 to 100 in 108 ticks, not at once', () => {
    const s = inFoundry(10);
    run(s, 1);
    expect(s.player.health).toBeLessThan(12);
    run(s, 106);
    expect(s.player.health).toBe(99);
    run(s, 1);
    expect(s.player.health).toBe(MAX_HEALTH);
  });

  it('health stays whole: 10 HP/s is 1 HP every 6 ticks', () => {
    const s = inSpring('west-spring', 50);
    const seen: number[] = [];
    for (let i = 0; i < 12; i++) {
      run(s, 1);
      seen.push(s.player.health);
    }
    expect(seen).toEqual([50, 50, 50, 50, 50, 51, 51, 51, 51, 51, 51, 52]);
  });
});

describe('the highest rate wins', () => {
  it('two rates give the higher, never the sum; ties keep the table order', () => {
    expect(strongest([{ source: 'spring', rate: 10 }, { source: 'pylon', rate: 10 }])).toEqual({ source: 'pylon', rate: 10 });
    expect(strongest([{ source: 'regen', rate: 4 }, { source: 'spring', rate: 10 }])).toEqual({ source: 'spring', rate: 10 });
    expect(strongest([{ source: 'regen', rate: 0 }])).toBeNull();
    expect(strongest([])).toBeNull();
  });

  it('field regen raised to 10 in a spring still heals 10 HP/s, not 20', () => {
    HEALING.fieldRegen = 10;
    const s = inSpring('west-spring', 50);
    run(s, 60);
    expect(s.player.health).toBe(60);
  });

  it('field regen raised to 10 in the claimed zone still heals 10 HP/s', () => {
    HEALING.fieldRegen = 10;
    const s = inZone(50);
    run(s, 60);
    expect(s.player.health).toBe(60);
  });

  it('field regen raised to 60 in the foundry heals 60 HP/s, not 110', () => {
    HEALING.fieldRegen = 60;
    const s = inFoundry(10);
    run(s, 60);
    expect(s.player.health).toBe(70);
    expect(s.player.healing).toBe('regen');
  });

  it('raised field regen heals in the open field and reports regen', () => {
    HEALING.fieldRegen = 6;
    const s = arena();
    s.player.health = 40;
    expect(fieldRegen()).toBe(6);
    run(s, 600);
    expect(s.player.health).toBe(100);
    const t = arena();
    t.player.health = 40;
    run(t, 10);
    expect(t.player.health).toBe(41);
    expect(t.player.healing).toBe('regen');
  });
});

describe('limits', () => {
  it('never heals above max health', () => {
    const s = inFoundry(95);
    run(s, 300);
    expect(s.player.health).toBe(MAX_HEALTH);
  });

  it('never heals while dying, and a KO still wakes at full health', () => {
    const s = inSpring('west-spring', 0);
    run(s, 1);
    expect(s.player.dying).toBeGreaterThan(0);
    expect(s.player.healing).toBeNull();
    run(s, DYING_TICKS - 1);
    expect(s.player.health).toBe(0);
    run(s, 1);
    expect(s.events.ko).toBe(true);
    expect(s.player.health).toBe(MAX_HEALTH);
  });

  it('carries on through hits', () => {
    const s = inSpring('west-spring', 60);
    run(s, 3);
    expect(damagePlayer(s, 20, -1, 0, 0, 1)).toBe(true);
    expect(s.player.health).toBe(40);
    run(s, 3);
    expect(s.player.health).toBe(41);
    expect(s.player.healing).toBe('spring');
  });
});

describe('the healing flag', () => {
  it('is null at full health and names the source while gaining', () => {
    const s = inSpring('west-spring', MAX_HEALTH);
    run(s, 30);
    expect(s.player.healing).toBeNull();
    s.player.health = 90;
    run(s, 1);
    expect(s.player.healing).toBe('spring');
    expect(summarize(s).player.healing).toBe('spring');
  });

  it('heals events fire on start and stop, and on a change of source', () => {
    const s = inSpring('west-spring', 50);
    run(s, 1);
    expect(s.events.heals).toEqual([{ source: 'spring', kind: 'start' }]);
    run(s, 1);
    expect(s.events.heals).toEqual([]);
    // Straight into the claimed zone: the spring stops and the pylon starts.
    claim(s, SHRINE_SITE);
    s.enemies = [];
    atPylon(s);
    run(s, 1);
    expect(s.events.heals).toEqual([
      { source: 'spring', kind: 'stop' },
      { source: 'pylon', kind: 'start' },
    ]);
    // Out into the open field: it stops.
    const field = tileCentre(OVERWORLD.field);
    movePlayer(s, field.x, field.y);
    run(s, 1);
    expect(s.events.heals).toEqual([{ source: 'pylon', kind: 'stop' }]);
    expect(s.player.healing).toBeNull();
  });

  it('stops when health reaches max', () => {
    const s = inFoundry(99);
    run(s, 1);
    expect(s.player.healing).toBe('foundry');
    run(s, 1);
    expect(s.player.health).toBe(MAX_HEALTH);
    run(s, 1);
    expect(s.player.healing).toBeNull();
    expect(s.events.heals).toEqual([{ source: 'foundry', kind: 'stop' }]);
  });
});

describe('the hook', () => {
  it('reports each spring: its tile, pool radius px, and whether the player is in it', () => {
    const s = inSpring('north-spring', 80);
    run(s, 1);
    const sum = summarize(s);
    expect(sum.springs).toEqual([
      { id: 'west-spring', tx: 10, ty: 31, radius: 48, inside: false },
      { id: 'south-east-spring', tx: 66, ty: 38, radius: 48, inside: false },
      { id: 'north-spring', tx: 26, ty: 8, radius: 48, inside: true },
    ]);
    expect(sum.player.healing).toBe('spring');
    expect(sum.events.heals).toEqual([{ source: 'spring', kind: 'start' }]);
  });
});
