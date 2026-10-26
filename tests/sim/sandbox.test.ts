import { describe, expect, it } from 'vitest';
import { AMMO } from '../../src/data/ammo';
import { ENEMIES } from '../../src/data/enemies';
import { GEAR_SLOTS, RARITIES } from '../../src/data/gear';
import { HOLLOWS } from '../../src/data/hollows';
import { ITEMS } from '../../src/data/items';
import { LEVEL_CAP } from '../../src/data/leveling';
import { BUILD_BAR } from '../../src/data/pieces';
import { RECIPES } from '../../src/data/recipes';
import { RELICS } from '../../src/data/relics';
import { RESEARCH_NODES } from '../../src/data/research';
import { RING_SCALE } from '../../src/data/ringScale';
import { SANDBOX_ROOM, TILE, WALKABLE } from '../../src/data/rooms';
import { KIT_COUNT, SANDBOX, SANDBOX_ARENAS, SANDBOX_GEAR, SANDBOX_PENS, WARDEN_ARENA } from '../../src/data/sandbox';
import { STAGE_ROWS, STAGES } from '../../src/data/stages';
import { ROUNDS, TAGS } from '../../src/data/tags';
import { TALENT_LIST } from '../../src/data/talents';
import { arenaLocked } from '../../src/sim/arenaLock';
import { FORUM_ARENA } from '../../src/data/arenas';
import { defOf } from '../../src/sim/champions';
import { unlockedPieces } from '../../src/sim/placement';
import { createSandboxSim, PEN_GROUP, SPAWN_GROUP, type SandboxCommand } from '../../src/sim/sandbox';
import { stagesUnlocked } from '../../src/sim/stages';
import { createSim, roomById, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { WORLD } from '../../src/sim/world';
import { movePlayer, run } from './fight';

// The sandbox (044): `?sandbox`'s start, its kit derived from the content lists, and its room
// (the pens, the arenas, the forum's seal). The panel and tools are in sandboxPanel.test.ts.

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

  it('is at the level cap with every talent point, the tube attuned to every entrance open (060: four; 064: five)', () => {
    const s = createSandboxSim(1);
    expect(s.level).toBe(LEVEL_CAP);
    expect(s.talentPoints).toBe(LEVEL_CAP - 1);
    expect(s.talentPoints).toBeLessThanOrEqual(TALENT_LIST.length);
    expect(s.hasTube && s.link.attuned).toBe(true);
    expect(s.link.entrances.map((e) => e.open)).toEqual([true, true, true, true, true]);
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
    // The shipped game has no way in: no door anywhere leads to the sandbox's room.
    for (const room of Object.values(WORLD)) expect((room.doorways ?? []).some((d) => d.to === SANDBOX_ROOM), room.id).toBe(false);
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
    for (const t of HOLLOWS.arena.door.tiles) expect(rows[t.ty]?.[t.tx]).toBe(TILE.arenaDoor);
    expect(WALKABLE).toContain(rows[HOLLOWS.arena.door.leaveTo.ty]?.[HOLLOWS.arena.door.leaveTo.tx]);
    expect(rows[WARDEN_ARENA.bounds.y1]?.[WARDEN_ARENA.bounds.x0]).toBe('#');
    expect(WORLD[SANDBOX_ROOM]).toBeDefined();
  });

  it('locks the forum while its Bulwark fights, as in the Hollows (043)', () => {
    const s = createSandboxSim(1);
    const A = FORUM_ARENA;
    expect(arenaLocked(s, A, SANDBOX_ROOM)).toBe(false);
    const inside = tileCentre({ tx: A.start.tx, ty: A.start.ty - 3 });
    movePlayer(s, inside.x, inside.y);
    once(s, { kind: 'god', on: true });
    run(s, 2);
    expect(arenaLocked(s, A, SANDBOX_ROOM)).toBe(true);
    expect(summarize(s).arenas.find((a) => a.id === A.id)?.locked).toBe(true);
  });
});
