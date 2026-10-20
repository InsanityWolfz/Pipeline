import { describe, expect, it } from 'vitest';
import { BOSS_REFIGHT_XP, CHAMPION_XP, CLAIM_XP, LANDMARK_XP, LEVEL_CAP, RING_XP, XP_CURVE } from '../../src/data/leveling';
import { CLAIM_TICKS } from '../../src/data/claims';
import { enemyDef } from '../../src/data/enemies';
import { HOLLOWS, REGION_1_X } from '../../src/data/hollows';
import { HOLLOWS_START } from '../../src/data/playtest';
import { OVERWORLD, OVERWORLD_ROOM, ringOf } from '../../src/data/overworld';
import { FOUNDRY_ROOM, SHRINE_SITE, WALKABLE } from '../../src/data/rooms';
import { makeChampion } from '../../src/sim/champions';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import { gainXp, xpToNext } from '../../src/sim/leveling';
import { createSim, roomById, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { arena, atEntrance, die, fireAt, movePlayer, run, SEED } from './fight';
import { foundry } from './foundryKit';
import { standAtBench } from '../fixtures/gear';
import { claim } from '../../src/sim/claims';
import { craft } from '../../src/sim/crafting';
import type { HopperState } from '../../src/sim/pieces';

// Leveling (037): XP from kills (scaled by ring, more for champions), bosses (half on a
// refight), claims and first discoveries; one talent point a level; kept through a KO.

const rows = roomById(OVERWORLD_ROOM).rows;

/** A walkable overworld tile in `ring`, the first found scanning from the map's centre row outward. */
function tileInRing(ring: number): { tx: number; ty: number } {
  for (let ty = 0; ty < rows.length; ty++) {
    const row = rows[ty] ?? '';
    for (let tx = 0; tx < row.length; tx++) if (WALKABLE.includes(row[tx] ?? '') && ringOf(tx, ty) === ring) return { tx, ty };
  }
  throw new Error(`no tile in ring ${ring}`);
}

/** Puts an enemy whose home is `at` into the overworld and kills it this tick; returns the XP gained. */
function killAt(s: SimState, enemyId: string, at: { x: number; y: number }, champion = false): number {
  const e = createEnemy(s.nextEnemyId++, enemyId, at, OVERWORLD_ROOM);
  if (champion) makeChampion(s.rng, e);
  s.enemies.push(e);
  return killThis(s, e);
}

function killThis(s: SimState, e: EnemyState): number {
  const before = totalXp(s);
  e.health = 0;
  run(s, 1);
  return totalXp(s) - before;
}

/** Every XP point earned so far, from the level and the XP toward the next. */
const totalXp = (s: SimState): number => XP_CURVE.slice(0, s.level - 1).reduce((n, x) => n + x, 0) + s.xp;

describe('a new player', () => {
  it('is level 1 with no XP and no points, and holds only the centre start', () => {
    const s = createSim(SEED);
    expect([s.level, s.xp, s.talentPoints, s.talents]).toEqual([1, 0, 0, ['start']]);
    const sum = summarize(s);
    expect([sum.level, sum.xp, sum.xpToNext, sum.talentPoints, sum.talents]).toEqual([1, 0, XP_CURVE[0], 0, ['start']]);
  });
});

describe('kill XP', () => {
  it('is the enemy’s XP times its home ring’s multiplier: a Husk in rings 1 and 2', () => {
    const s = arena();
    expect(killAt(s, 'husk', tileCentre(tileInRing(1)))).toBe(5 * (RING_XP[1] ?? 0));
    expect(killAt(s, 'husk', tileCentre(tileInRing(2)))).toBe(5 * (RING_XP[2] ?? 0));
    expect(s.events.xp).toEqual([{ amount: 10, source: 'kill' }]);
  });

  it('gives a Region 2 enemy 18 in ring 3, and a champion three times as much', () => {
    const s = arena();
    const hollows = tileCentre(tileInRing(HOLLOWS.ring));
    expect(killAt(s, 'charger', hollows)).toBe(18);
    expect(killAt(s, 'wisp', tileCentre(tileInRing(1)), true)).toBe(6 * CHAMPION_XP);
  });

  it('counts a punch kill like any other', () => {
    const s = arena();
    s.hasTube = false;
    const e = createEnemy(s.nextEnemyId++, 'husk', { x: s.player.x + 16, y: s.player.y }, OVERWORLD_ROOM);
    e.health = 1;
    s.enemies.push(e);
    const ring = ringOf(Math.floor(e.homeX / 32), Math.floor(e.homeY / 32));
    // The punch lands after this tick's removals: the death is the next tick's.
    run(s, 2, fireAt(e.x, e.y));
    expect(s.enemies).toEqual([]);
    expect(s.xp).toBe(5 * (RING_XP[ring] ?? 0));
  });

  it('gives the Warden its 150 on the first kill, with no ring multiplier, and nothing for a later one (no altar refight)', () => {
    const s = arena();
    const ring2 = tileCentre(tileInRing(2));
    expect(killAt(s, 'pylon-warden', ring2)).toBe(enemyDef('pylon-warden').xp);
    expect(killAt(s, 'pylon-warden', ring2)).toBe(0);
    expect(s.killedBosses).toEqual(['pylon-warden']);
  });

  it('gives the Bulwark 300 on its first kill and 150 on a refight at the altar', () => {
    const s = createSim(SEED, { start: HOLLOWS_START });
    s.enemies = s.enemies.filter((e) => e.enemyId === 'bulwark');
    const by = tileCentre({ tx: HOLLOWS.arena.altar.tx + 1, ty: HOLLOWS.arena.altar.ty });
    movePlayer(s, by.x, by.y);
    const first = s.enemies[0];
    if (!first) throw new Error('no Bulwark');
    expect(killThis(s, first)).toBe(300);
    s.inventory = { ...HOLLOWS.arena.offering };
    run(s, 1, { summon: HOLLOWS.arena.altar.id });
    run(s, HOLLOWS.arena.summonTicks + 1);
    const again = s.enemies.find((e) => e.enemyId === 'bulwark');
    if (!again) throw new Error('no refight');
    expect(killThis(s, again)).toBe(300 * BOSS_REFIGHT_XP);
    expect(s.events.xp).toEqual([{ amount: 150, source: 'boss' }]);
    // A Bulwark that wasn't summoned at the altar (here placed by hand) gives nothing.
    const stray = createEnemy(s.nextEnemyId++, 'bulwark', { x: again.x, y: again.y }, OVERWORLD_ROOM);
    s.enemies.push(stray);
    expect(killThis(s, stray)).toBe(0);
  });
});

describe('claims and discoveries', () => {
  it('a claim gives CLAIM_XP once, and its pylon never again', () => {
    const s = createSim(SEED);
    s.enemies = s.enemies.filter((e) => e.group !== SHRINE_SITE);
    const pylon = OVERWORLD.shrine.pylon;
    const below = tileCentre({ tx: pylon.tx, ty: pylon.ty + 1 });
    movePlayer(s, below.x, below.y);
    run(s, 1, { interact: true });
    run(s, CLAIM_TICKS);
    expect(s.claims).toEqual([SHRINE_SITE]);
    expect(totalXp(s)).toBe(CLAIM_XP);
    run(s, 1, { interact: true });
    run(s, CLAIM_TICKS);
    expect(totalXp(s)).toBe(CLAIM_XP);
  });

  it('a landmark’s first discovery gives LANDMARK_XP, once', () => {
    const s = createSim(SEED);
    s.enemies = [];
    const near = tileCentre({ tx: 24 + REGION_1_X, ty: 25 });
    movePlayer(s, near.x, near.y);
    run(s, 1);
    expect(s.discovered).toEqual(['quarry']);
    expect(s.events.xp).toEqual([{ amount: LANDMARK_XP, source: 'landmark' }]);
    run(s, 30);
    expect(totalXp(s)).toBe(LANDMARK_XP);
  });
});

describe('the factory', () => {
  it('never gives XP: a long run of banking on the way in, building, a line, supply, crafting, identifying, depositing and research', () => {
    const s = foundry();
    claim(s, SHRINE_SITE);
    Object.assign(s.inventory, { wood: 40, stone: 40, fiber: 40, 'unidentified-armor': 3, 'schematic-machine-speed': 1, 'ancient-gear': 5, 'warden-core': 1 });
    const seen: number[] = [];
    let supplied = 0;
    let banked = 0;
    const watch = () => {
      seen.push(s.events.xp.length, s.events.levelUps.length);
      supplied += s.events.supplies.length;
      banked += s.events.banks.length;
    };
    // Down the stairs from the overworld: entering the foundry banks what's carried.
    atEntrance(s);
    for (let t = 0; t < 60 && s.roomId !== FOUNDRY_ROOM; t++) {
      run(s, 1, { moveY: -1 });
      watch();
    }
    expect(s.roomId).toBe(FOUNDRY_ROOM);
    expect(banked).toBeGreaterThan(0);
    // The line built with the place command: a hopper of arrows and a conduit up into the intake, and a hopper to fill.
    const placeAt = (pieceId: string, tx: number, ty: number, facing: 'up' | 'right') => {
      run(s, 1, { place: { pieceId, tx, ty, facing } });
      watch();
      const p = s.foundry.pieces.find((q) => q.tx === tx && q.ty === ty);
      if (!p) throw new Error(`no ${pieceId} at ${tx},${ty}`);
      return p;
    };
    const hopper = placeAt('hopper', 12, 2, 'up') as HopperState;
    placeAt('conduit', 12, 1, 'up');
    hopper.item = 'arrow';
    hopper.count = 99;
    const fed = placeAt('hopper', 16, 6, 'right') as HopperState;
    for (const recipe of ['arrow', 'arrow', 'bomb']) craft(s, recipe);
    standAtBench(s);
    run(s, 1, { identify: true });
    watch();
    s.research['machine-speed'] = 'revealed';
    const panel = tileCentre({ tx: 6, ty: 1 });
    movePlayer(s, panel.x, panel.y);
    run(s, 1, { restore: 'machine-speed' });
    watch();
    expect(s.research['machine-speed']).toBe('restored');
    const by = tileCentre({ tx: 15, ty: 6 });
    movePlayer(s, by.x, by.y);
    run(s, 1, { deposit: { id: fed.id, itemId: 'wood', amount: 'all' } });
    expect(fed.count).toBeGreaterThan(0);
    for (let t = 0; t < 3600; t++) {
      run(s, 1);
      watch();
    }
    expect(s.link.entrances.some((e) => e.count > 0)).toBe(true);
    expect(supplied).toBeGreaterThan(0);
    expect(seen.every((n) => n === 0)).toBe(true);
    expect([s.level, s.xp, s.talentPoints]).toEqual([1, 0, 0]);
  }, 20_000); // A long scenario (3600 ticks on the full map): about 3 s on a quiet machine, before and after 039, so 5 s is too tight under load.
});

describe('levels', () => {
  it('rise when XP reaches the curve, with a point each, the rest carried over and an event', () => {
    const s = arena();
    gainXp(s, 39, 'kill');
    expect([s.level, s.xp, s.talentPoints]).toEqual([1, 39, 0]);
    gainXp(s, 3, 'kill');
    expect([s.level, s.xp, s.talentPoints]).toEqual([2, 2, 1]);
    expect(s.events.levelUps).toEqual([{ level: 2 }]);
    expect(xpToNext(s)).toBe(XP_CURVE[1]);
  });

  it('can rise several levels from one gain', () => {
    const s = arena();
    gainXp(s, 40 + 70 + 100 + 5, 'boss');
    expect([s.level, s.xp, s.talentPoints]).toEqual([4, 5, 3]);
    expect(s.events.levelUps).toEqual([{ level: 2 }, { level: 3 }, { level: 4 }]);
  });

  it('stop at the cap: XP stops counting, the bar reads full, 14 points in all', () => {
    const s = arena();
    expect(XP_CURVE).toHaveLength(LEVEL_CAP - 1);
    gainXp(s, 100_000, 'kill');
    expect([s.level, s.xp, s.talentPoints, xpToNext(s)]).toEqual([LEVEL_CAP, 0, LEVEL_CAP - 1, 0]);
    s.events.xp.length = 0;
    gainXp(s, 50, 'claim');
    expect([s.level, s.xp]).toEqual([LEVEL_CAP, 0]);
    expect(s.events.xp).toEqual([]);
  });

  it('are kept through a KO, with the XP, points and talents', () => {
    const s = arena();
    gainXp(s, 150, 'kill');
    s.talents = ['start', 'a1'];
    const before = [s.level, s.xp, s.talentPoints, [...s.talents]];
    die(s);
    expect(s.events.ko).toBe(true);
    expect([s.level, s.xp, s.talentPoints, s.talents]).toEqual(before);
  });

  it('are deterministic: two runs of the same fight end on the same XP', () => {
    const fight = () => {
      const s = arena();
      for (let i = 0; i < 4; i++) {
        const e = createEnemy(s.nextEnemyId++, 'husk', { x: s.player.x + 60 + i * 20, y: s.player.y }, OVERWORLD_ROOM);
        s.enemies.push(e);
      }
      run(s, 600, (x) => fireAt(x.enemies[0]?.x ?? x.player.x + 60, x.enemies[0]?.y ?? x.player.y));
      return [s.level, s.xp, s.talentPoints, s.enemies.length];
    };
    expect(fight()).toEqual(fight());
  });
});
