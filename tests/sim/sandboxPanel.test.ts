import { restore, snapshot } from '../../src/sim/save';
import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../../src/data/config';
import { ENEMIES } from '../../src/data/enemies';
import { HOLLOWS } from '../../src/data/hollows';
import { LEVEL_CAP } from '../../src/data/leveling';
import { DYING_TICKS } from '../../src/data/player';
import { SANDBOX_ROOM, WALKABLE } from '../../src/data/rooms';
import { KIT_COUNT, SANDBOX, SANDBOX_PENS, SANDBOX_START, WARDEN_ARENA } from '../../src/data/sandbox';
import { TALENT_LIST } from '../../src/data/talents';
import { defOf } from '../../src/sim/champions';
import { damagePlayer } from '../../src/sim/health';
import { NO_COMMAND } from '../../src/sim/input';
import { entranceCap } from '../../src/sim/research';
import { createSandboxSim, PEN_GROUP, SPAWN_GROUP, type SandboxCommand } from '../../src/sim/sandbox';
import { createSim, roomById, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer, run } from './fight';

// The sandbox (044), its panel and tools: the loadout's bottomless entrances, the spawn panel,
// the pens, the boss arenas' resets, god mode, the KO, respec and the bench.

const T = TILE_SIZE;
/** One tick with the panel's command. */
const once = (s: SimState, sandbox: SandboxCommand): void => run(s, 1, { sandbox });
const inRoom = (s: SimState) => s.enemies.filter((e) => e.roomId === SANDBOX_ROOM);
const ofGroup = (s: SimState, group: string) => s.enemies.filter((e) => e.group === group);

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

describe('the sandbox never reaches a real game through a save (044)', () => {
  it('drops the sandbox state and the start flag when a save is restored', () => {
    const s = createSandboxSim(11);
    once(s, { kind: 'god', on: true });
    const restored = restore(JSON.parse(JSON.stringify(snapshot(s))));
    expect(restored.sandbox).toBeUndefined();
    expect(restored.start.sandbox).toBeUndefined();
    expect(summarize(restored).god).toBe(false);
    expect(damagePlayer(restored, 30, 1, 0, 0, 0)).toBe(true);
    expect(restored.player.health).toBeLessThan(summarize(restored).player.maxHealth);
  });
});
