import { describe, expect, it } from 'vitest';
import { AMMO } from '../../src/data/ammo';
import { TILE_SIZE } from '../../src/data/config';
import { ENEMIES } from '../../src/data/enemies';
import { GEAR_SLOTS, RARITIES } from '../../src/data/gear';
import { HOLLOWS } from '../../src/data/hollows';
import { ITEMS } from '../../src/data/items';
import { LEVEL_CAP } from '../../src/data/leveling';
import { BUILD_BAR } from '../../src/data/pieces';
import { DYING_TICKS } from '../../src/data/player';
import { RECIPES } from '../../src/data/recipes';
import { RELICS } from '../../src/data/relics';
import { RESEARCH_NODES } from '../../src/data/research';
import { RING_SCALE } from '../../src/data/ringScale';
import { SANDBOX_ROOM, WALKABLE } from '../../src/data/rooms';
import { KIT_COUNT, SANDBOX, SANDBOX_ARENAS, SANDBOX_GEAR, SANDBOX_PENS, SANDBOX_START, WARDEN_ARENA } from '../../src/data/sandbox';
import { STAGE_ROWS, STAGES } from '../../src/data/stages';
import { ROUNDS, TAGS } from '../../src/data/tags';
import { TALENT_LIST } from '../../src/data/talents';
import { arenaSealed, sealRects } from '../../src/sim/arenaLock';
import { defOf } from '../../src/sim/champions';
import { damagePlayer } from '../../src/sim/health';
import { NO_COMMAND } from '../../src/sim/input';
import { entranceCap } from '../../src/sim/research';
import { unlockedPieces } from '../../src/sim/placement';
import { createSandboxSim, PEN_GROUP, SPAWN_GROUP, type SandboxCommand } from '../../src/sim/sandbox';
import { stagesUnlocked } from '../../src/sim/stages';
import { createSim, roomById, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { WORLD } from '../../src/sim/world';
import { movePlayer, run } from './fight';

// The sandbox (044): `?sandbox`'s room, its kit derived from the content lists, the loadout
// panel's bottomless entrances, the spawn panel, the pens, the boss arenas, god mode and the KO.

const T = TILE_SIZE;
/** One tick with the panel's command. */
const once = (s: SimState, sandbox: SandboxCommand): void => run(s, 1, { sandbox });
const inRoom = (s: SimState) => s.enemies.filter((e) => e.roomId === SANDBOX_ROOM);
const ofGroup = (s: SimState, group: string) => s.enemies.filter((e) => e.group === group);

describe('the sandbox start and kit (044)', () => {
  it('starts in its own room at its spawn, with clear floor round it', () => {
    const s = createSandboxSim(1);
    expect(s.roomId).toBe(SANDBOX_ROOM);
    expect(s.sandbox).toBeDefined();
    expect({ x: s.player.x, y: s.player.y }).toEqual(tileCentre(SANDBOX.spawn));
    const rows = roomById(SANDBOX_ROOM).rows;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) expect(WALKABLE).toContain(rows[SANDBOX.spawn.ty + dy]?.[SANDBOX.spawn.tx + dx]);
    expect(roomById(SANDBOX_ROOM).doorways ?? []).toEqual([]);
  });

  it('carries 99 of every item, so every round and tagged round, from the item list', () => {
    const s = createSandboxSim(1);
    for (const id of Object.keys(ITEMS)) expect(s.inventory[id], id).toBe(KIT_COUNT);
    for (const round of [...ROUNDS, ...Object.keys(AMMO)]) expect(s.inventory[round], round).toBe(KIT_COUNT);
    // Every tag is on some round carried.
    for (const tag of Object.keys(TAGS)) expect(ROUNDS.some((r) => r.split('+').includes(tag) && s.inventory[r] === KIT_COUNT), tag).toBe(true);
  });

  it('knows every recipe, every stage and every piece, with all research done', () => {
    const s = createSandboxSim(1);
    for (const r of Object.values(RECIPES)) expect(s.crafted).toContain(r.output.itemId);
    for (const r of STAGE_ROWS) expect(s.crafted).toContain(r.recipe.output.itemId);
    expect(stagesUnlocked(s).sort()).toEqual(Object.keys(STAGES).sort());
    expect(unlockedPieces(s)).toEqual([...BUILD_BAR]);
    for (const n of RESEARCH_NODES) expect(s.research[n.id], n.id).toBe('restored');
  });

  it('is at the level cap with every talent point, the tube attuned to three open entrances', () => {
    const s = createSandboxSim(1);
    expect(s.level).toBe(LEVEL_CAP);
    expect(s.talentPoints).toBe(LEVEL_CAP - 1);
    expect(s.talentPoints).toBeLessThanOrEqual(TALENT_LIST.length);
    expect(s.hasTube && s.link.attuned).toBe(true);
    expect(s.link.entrances.map((e) => e.open)).toEqual([true, true, true]);
  });

  it('holds every gear piece at each rarity and every relic, none worn (044.4)', () => {
    const s = createSandboxSim(1);
    const rolled = Object.keys(RARITIES).filter((r) => r !== 'relic');
    for (const slot of GEAR_SLOTS) {
      for (const rarity of rolled) {
        const weights = slot === 'body' ? ['light', 'heavy'] : [null];
        for (const w of weights) expect(s.gear.some((g) => g.slot === slot && g.rarity === rarity && g.weight === w && g.relic === null), `${slot} ${rarity} ${w}`).toBe(true);
      }
    }
    for (const r of RELICS) expect(s.gear.some((g) => g.relic === r.id)).toBe(true);
    expect(s.gear.length).toBe(SANDBOX_GEAR.length);
    expect(new Set(s.gear.map((g) => g.id)).size).toBe(s.gear.length);
    expect(Object.values(s.equipped).every((v) => v === null)).toBe(true);
  });

  it('has nothing in any other room, and the real game has no sandbox', () => {
    const s = createSandboxSim(1);
    expect(s.enemies.every((e) => e.roomId === SANDBOX_ROOM)).toBe(true);
    expect(createSim(1).sandbox).toBeUndefined();
    expect(createSim(1).enemies.some((e) => e.roomId === SANDBOX_ROOM)).toBe(false);
    expect(summarize(createSim(1)).sandbox).toBe(false);
    expect(summarize(s).sandbox).toBe(true);
  });

  it('is deterministic', () => {
    const play = (): string => {
      const s = createSandboxSim(5);
      once(s, { kind: 'loadout', entrance: 1, round: 'ley-bolt+frost+split' });
      once(s, { kind: 'spawn', enemyId: 'husk', ring: 2, champion: true, count: 3 });
      run(s, 120, { fire: true, aimX: s.player.x + 200, aimY: s.player.y });
      return JSON.stringify(summarize(s));
    };
    expect(play()).toBe(play());
  });
});

describe('the room (044)', () => {
  it('has a pen per non-boss enemy, each holding one at its ring (044.3)', () => {
    const s = createSandboxSim(1);
    const kinds = Object.values(ENEMIES).filter((e) => !e.boss).map((e) => e.id);
    expect(SANDBOX_PENS.map((p) => p.enemyId)).toEqual(kinds);
    expect(SANDBOX_PENS.find((p) => p.enemyId === 'husk')?.ring).toBe(1);
    expect(SANDBOX_PENS.find((p) => p.enemyId === 'wisp')?.ring).toBe(1);
    for (const id of ['charger', 'burrower', 'shardback', 'sniper']) expect(SANDBOX_PENS.find((p) => p.enemyId === id)?.ring).toBe(3);
    SANDBOX_PENS.forEach((p, i) => {
      const held = ofGroup(s, PEN_GROUP(i));
      expect(held.map((e) => e.enemyId)).toEqual([p.enemyId]);
      expect(held[0]?.ring).toBe(p.ring);
      expect(held[0]?.health).toBe(defOf({ enemyId: p.enemyId, champion: null, ring: p.ring }).maxHealth);
      expect({ x: held[0]?.x, y: held[0]?.y }).toEqual(tileCentre(p.home));
    });
  });

  it('has the room no ring: a spawned enemy takes the ring it is given', () => {
    const s = createSandboxSim(1);
    expect(summarize(s).area.ring).toBeNull();
    once(s, { kind: 'spawn', enemyId: 'husk', ring: 3, champion: false, count: 1 });
    const h = ofGroup(s, SPAWN_GROUP)[0];
    expect(h?.ring).toBe(3);
    expect(h?.health).toBe(Math.round((ENEMIES.husk?.maxHealth ?? 0) * RING_SCALE[3].health));
  });

  it('has the Warden in its arena and the Bulwark in the Sunken Forum, laid out as the Hollows', () => {
    const s = createSandboxSim(1);
    for (const a of SANDBOX_ARENAS) {
      const boss = inRoom(s).filter((e) => e.enemyId === a.boss);
      expect(boss.length, a.boss).toBe(1);
      expect({ x: boss[0]?.x, y: boss[0]?.y }).toEqual(tileCentre(a.start));
    }
    const rows = roomById(SANDBOX_ROOM).rows;
    for (const t of HOLLOWS.arena.walls) expect(rows[t.ty]?.[t.tx]).toBe(t.symbol);
    for (const t of HOLLOWS.arena.seal.tiles) expect(WALKABLE).toContain(rows[t.ty]?.[t.tx]);
    expect(WALKABLE).toContain(rows[HOLLOWS.arena.seal.leaveTo.ty]?.[HOLLOWS.arena.seal.leaveTo.tx]);
    expect(rows[WARDEN_ARENA.bounds.y1]?.[WARDEN_ARENA.bounds.x0]).toBe('#');
    expect(WORLD[SANDBOX_ROOM]).toBeDefined();
  });

  it('seals the forum while its Bulwark fights, as in the Hollows (043)', () => {
    const s = createSandboxSim(1);
    const A = HOLLOWS.arena;
    expect(arenaSealed(s, A, SANDBOX_ROOM)).toBe(false);
    const inside = tileCentre({ tx: A.start.tx, ty: A.start.ty - 3 });
    movePlayer(s, inside.x, inside.y);
    once(s, { kind: 'god', on: true });
    run(s, 2);
    expect(arenaSealed(s, A, SANDBOX_ROOM)).toBe(true);
    expect(sealRects(s, SANDBOX_ROOM).length).toBe(A.seal.tiles.length);
    expect(summarize(s).arenas[0]?.sealed).toBe(true);
  });
});

describe('the loadout (044)', () => {
  it('sets each entrance to any round, and the volley fires them all, bottomless', () => {
    const s = createSandboxSim(2);
    const rounds = ['arrow+frost', 'ley-bolt+frost+homing', 'bomb+cluster'];
    rounds.forEach((round, entrance) => once(s, { kind: 'loadout', entrance, round }));
    expect(s.sandbox?.loadout).toEqual(rounds);
    const fired = new Set<string>();
    const cap = entranceCap(s);
    for (let t = 0; t < 600; t++) {
      run(s, 1, { fire: true, aimX: s.player.x + 150, aimY: s.player.y });
      for (const f of s.events.entranceFires) fired.add(f.ammoId);
      s.link.entrances.forEach((e, i) => {
        expect(e.ammoId).toBe(rounds[i]);
        expect(e.count).toBeGreaterThanOrEqual(cap - 1);
      });
    }
    expect([...fired].sort()).toEqual([...rounds].sort());
    // The volley fires from the reservoirs, never the carried rounds.
    for (const r of rounds) expect(s.inventory[r]).toBe(KIT_COUNT);
    expect(summarize(s).loadout).toEqual(rounds);
  });

  it('empties an entrance on null, and ignores an unknown round or entrance', () => {
    const s = createSandboxSim(2);
    once(s, { kind: 'loadout', entrance: 0, round: null });
    expect(s.link.entrances[0]?.count).toBe(0);
    once(s, { kind: 'loadout', entrance: 1, round: 'arrow+homing' });
    once(s, { kind: 'loadout', entrance: 5, round: 'arrow' });
    expect(s.sandbox?.loadout).toEqual([null, ...SANDBOX.loadout.slice(1)]);
  });

  it('does nothing outside the sandbox', () => {
    const s = createSim(1);
    const before = JSON.stringify(s.link);
    run(s, 1, { sandbox: { kind: 'loadout', entrance: 0, round: 'bomb' } });
    run(s, 1, { sandbox: { kind: 'spawn', enemyId: 'husk', ring: 3, champion: true, count: 5 } });
    expect(JSON.stringify(s.link)).toBe(before);
    expect(s.enemies.some((e) => e.group === SPAWN_GROUP)).toBe(false);
  });
});

describe('the spawn panel and the pens (044)', () => {
  it('spawns a ring 3 champion pack a short distance in front of the player', () => {
    const s = createSandboxSim(3);
    s.player.facing = 'down';
    run(s, 1, { aimX: s.player.x + 300, aimY: s.player.y, sandbox: { kind: 'spawn', enemyId: 'charger', ring: 3, champion: true, count: 5 } });
    const pack = ofGroup(s, SPAWN_GROUP);
    expect(pack.length).toBe(5);
    for (const e of pack) {
      expect(e.ring).toBe(3);
      expect(e.champion).not.toBeNull();
      expect(e.health).toBe(defOf(e).maxHealth);
      // In front (below, the way the player faces, wherever the cursor is), about `distance` tiles out.
      expect(e.y - s.player.y).toBeGreaterThan((SANDBOX.place.distance - 1) * T);
      expect(Math.abs(e.y - s.player.y)).toBeLessThan((SANDBOX.place.distance + 1) * T);
    }
    expect(new Set(pack.map((e) => Math.round(e.x))).size).toBe(5);
  });

  it('spawns 1 to 10, any enemy (bosses never as champions), and Clear removes only what it spawned', () => {
    const s = createSandboxSim(3);
    const before = s.enemies.length;
    once(s, { kind: 'spawn', enemyId: 'wisp', ring: 1, champion: false, count: 50 });
    expect(ofGroup(s, SPAWN_GROUP).length).toBe(SANDBOX.maxCount);
    once(s, { kind: 'spawn', enemyId: 'pylon-warden', ring: 2, champion: true, count: 1 });
    const warden = ofGroup(s, SPAWN_GROUP).find((e) => e.enemyId === 'pylon-warden');
    expect(warden?.champion).toBeNull();
    once(s, { kind: 'spawn', enemyId: 'nobody', ring: 1, champion: false, count: 1 });
    expect(ofGroup(s, SPAWN_GROUP).length).toBe(SANDBOX.maxCount + 1);
    once(s, { kind: 'clear' });
    expect(ofGroup(s, SPAWN_GROUP).length).toBe(0);
    expect(s.enemies.length).toBe(before);
  });

  it('puts a spawn that would stand in a wall back toward the player', () => {
    const s = createSandboxSim(3);
    const near = tileCentre({ tx: (SANDBOX_PENS[2]?.bounds.x1 ?? 0) + 2, ty: 1 });
    movePlayer(s, near.x, near.y + 2 * T);
    s.player.facing = 'up';
    run(s, 1, { sandbox: { kind: 'spawn', enemyId: 'husk', ring: 1, champion: false, count: 3 } });
    const room = roomById(SANDBOX_ROOM);
    for (const e of ofGroup(s, SPAWN_GROUP)) expect(WALKABLE).toContain(room.rows[Math.floor(e.y / T)]?.[Math.floor(e.x / T)]);
  });

  it('refills a cleared pen after its delay (044.2)', () => {
    const s = createSandboxSim(4);
    const pen = SANDBOX_PENS[0];
    const group = PEN_GROUP(0);
    const first = ofGroup(s, group)[0];
    if (!pen || !first) throw new Error('no pen');
    first.health = 0;
    run(s, 1);
    expect(ofGroup(s, group).length).toBe(0);
    run(s, SANDBOX.penRefillTicks - 1);
    expect(ofGroup(s, group).length).toBe(0);
    run(s, 2);
    const back = ofGroup(s, group);
    expect(back.map((e) => e.enemyId)).toEqual([pen.enemyId]);
    expect(back[0]?.ring).toBe(pen.ring);
    expect(back[0]?.id).not.toBe(first.id);
    expect(summarize(s).pens[0]).toMatchObject({ enemyId: pen.enemyId, alive: true });
  });
});

describe('the boss arenas (044)', () => {
  it('resets the Warden to its start at full health', () => {
    const s = createSandboxSim(6);
    const w = inRoom(s).find((e) => e.enemyId === 'pylon-warden');
    if (!w) throw new Error('no Warden');
    w.health = 10;
    w.x += 40;
    once(s, { kind: 'reset', boss: 'pylon-warden' });
    const now = inRoom(s).filter((e) => e.enemyId === 'pylon-warden');
    expect(now.length).toBe(1);
    expect(now[0]?.health).toBe(ENEMIES['pylon-warden']?.maxHealth);
    expect({ x: now[0]?.x, y: now[0]?.y }).toEqual(tileCentre(WARDEN_ARENA.start));
  });

  it('brings a killed Bulwark back, its adds gone', () => {
    const s = createSandboxSim(6);
    const b = inRoom(s).find((e) => e.enemyId === 'bulwark');
    if (!b) throw new Error('no Bulwark');
    b.health = 0;
    run(s, 2);
    expect(inRoom(s).some((e) => e.enemyId === 'bulwark')).toBe(false);
    once(s, { kind: 'reset', boss: 'bulwark' });
    const back = inRoom(s).filter((e) => e.enemyId === 'bulwark');
    expect(back.length).toBe(1);
    expect(back[0]?.health).toBe(ENEMIES.bulwark?.maxHealth);
    expect({ x: back[0]?.x, y: back[0]?.y }).toEqual(tileCentre(HOLLOWS.arena.start));
    once(s, { kind: 'reset', boss: 'husk' });
    expect(inRoom(s).filter((e) => e.enemyId === 'bulwark').length).toBe(1);
  });
});

describe('god mode, the KO and the player tools (044)', () => {
  it('takes no damage in god mode, but the hit still lands', () => {
    const s = createSandboxSim(7);
    once(s, { kind: 'god', on: true });
    expect(summarize(s).god).toBe(true);
    const hp = s.player.health;
    expect(damagePlayer(s, 30, 1, 0, 10, 4)).toBe(true);
    expect(s.player.health).toBe(hp);
    expect(s.events.hits.some((h) => h.target === 'player' && h.damage > 0)).toBe(true);
    expect(s.player.hurtTicks).toBeGreaterThan(0);
    once(s, { kind: 'god', on: false });
    run(s, 60);
    damagePlayer(s, 30, 1, 0, 10, 4);
    expect(s.player.health).toBeLessThan(hp);
  });

  it('wakes at the spawn with the kit intact after a KO (044.6)', () => {
    const s = createSandboxSim(8);
    once(s, { kind: 'spawn', enemyId: 'husk', ring: 1, champion: false, count: 2 });
    for (const e of ofGroup(s, PEN_GROUP(0))) e.health = 0;
    const away = tileCentre({ tx: SANDBOX.spawn.tx + 10, ty: SANDBOX.spawn.ty + 3 });
    movePlayer(s, away.x, away.y);
    const inventory = { ...s.inventory };
    s.player.health = 1;
    damagePlayer(s, 50, 1, 0, 0, 0);
    run(s, DYING_TICKS + 2);
    expect(s.roomId).toBe(SANDBOX_ROOM);
    expect({ x: s.player.x, y: s.player.y }).toEqual(tileCentre(SANDBOX.spawn));
    expect(s.player.health).toBe(summarize(s).player.maxHealth);
    expect(s.inventory).toEqual(inventory);
    expect(s.sandbox).toBeDefined();
    expect(ofGroup(s, SPAWN_GROUP).length).toBe(0);
    SANDBOX_PENS.forEach((_, i) => expect(ofGroup(s, PEN_GROUP(i)).length).toBe(1));
    expect(s.enemies.every((e) => e.roomId === SANDBOX_ROOM)).toBe(true);
  });

  it('respecs in the sandbox room for free (037)', () => {
    const s = createSandboxSim(9);
    const first = TALENT_LIST.find((t) => t.links.includes('start'));
    if (!first) throw new Error('no talent');
    run(s, 1, { takeTalent: first.id });
    expect(s.talents).toContain(first.id);
    run(s, 1, { respec: true });
    expect(s.talents).toEqual(['start']);
    expect(s.talentPoints).toBe(LEVEL_CAP - 1);
  });

  it('wears the stash gear at the sandbox bench', () => {
    const s = createSandboxSim(9);
    const piece = s.gear[0];
    if (!piece) throw new Error('no gear');
    run(s, 1, { equip: { id: piece.id } });
    expect(s.equipped[piece.slot]).toBeNull();
    const by = tileCentre({ tx: SANDBOX.bench.tx, ty: SANDBOX.bench.ty + 1 });
    movePlayer(s, by.x, by.y);
    run(s, 1, { equip: { id: piece.id } });
    expect(s.equipped[piece.slot]).toBe(piece.id);
  });

  it('keeps the start out of saves: the start def says sandbox', () => {
    expect(SANDBOX_START.sandbox).toBe(true);
    expect(NO_COMMAND.sandbox).toBeNull();
  });
});
