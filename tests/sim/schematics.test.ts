import { describe, expect, it } from 'vitest';
import { ANY_SCHEMATIC, SCHEMATIC_CHANCE } from '../../src/data/drops';
import { enemyDef } from '../../src/data/enemies';
import { CACHE_DROPS } from '../../src/data/landmarks';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { bank } from '../../src/sim/banking';
import { rollDrops, rollRare, scatterItems, spawnDrops } from '../../src/sim/drops';
import { createRng } from '../../src/sim/rng';
import { createSim } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { summarize } from '../../src/sim/summary';
import { eligibleSchematics, pickSchematic, rollSchematic, schematicKnown } from '../../src/sim/schematics';
import { arena, die, HALL, PLAYER_AT, run } from './fight';
import { foundry } from './foundryKit';

// Schematics (033): a rare drop, picked from those still lost with no duplicates, that
// shows as an unknown until banked; banking reveals its node, a KO before banking loses
// it with the node still hidden. Machine parts drop from Husks, Wisps and the cache.

const ALL = ['schematic-machine-speed', 'schematic-reservoir-2'];
const REGION_1 = ['schematic-machine-speed'];
const share = (n: number, of: number): number => n / of;

describe('the schematic roll', () => {
  it('drops at 1% for a normal enemy and 5% for a champion, with a fixed seed', () => {
    const rng = createRng(11);
    const N = 20_000;
    const normal = Array.from({ length: N }, () => rollSchematic(rng, false).length).reduce((a, b) => a + b, 0);
    const champ = Array.from({ length: N }, () => rollSchematic(rng, true).length).reduce((a, b) => a + b, 0);
    expect(share(normal, N)).toBeGreaterThan(SCHEMATIC_CHANCE.enemy * 0.7);
    expect(share(normal, N)).toBeLessThan(SCHEMATIC_CHANCE.enemy * 1.3);
    expect(share(champ, N)).toBeGreaterThan(SCHEMATIC_CHANCE.champion * 0.85);
    expect(share(champ, N)).toBeLessThan(SCHEMATIC_CHANCE.champion * 1.15);
    // The same seed, the same rolls.
    const a = createRng(11);
    const b = createRng(11);
    expect(Array.from({ length: 200 }, () => rollSchematic(a, true))).toEqual(Array.from({ length: 200 }, () => rollSchematic(b, true)));
  });

  it('the Ruined Cache rolls a schematic at 20%, and its ancient gear at 50%', () => {
    const rng = createRng(3);
    const N = 10_000;
    const rolls = Array.from({ length: N }, () => rollRare(CACHE_DROPS, rng));
    expect(share(rolls.filter((r) => r.includes(ANY_SCHEMATIC)).length, N)).toBeGreaterThan(0.17);
    expect(share(rolls.filter((r) => r.includes(ANY_SCHEMATIC)).length, N)).toBeLessThan(0.23);
    expect(share(rolls.filter((r) => r.includes('ancient-gear')).length, N)).toBeGreaterThan(0.46);
    expect(share(rolls.filter((r) => r.includes('ancient-gear')).length, N)).toBeLessThan(0.54);
  });

  it('picks evenly from Region 1 schematics still lost: never one revealed, carried, on the ground or at home', () => {
    const s = arena();
    expect(eligibleSchematics(s, HALL).sort()).toEqual(REGION_1);
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) seen.add(pickSchematic(s, HALL) ?? '');
    expect([...seen].sort()).toEqual(REGION_1);
    // Reservoir II drops only in Region 2 (034).
    expect(eligibleSchematics(s, HALL)).not.toContain('schematic-reservoir-2');
    const carried = arena();
    carried.inventory['schematic-machine-speed'] = 1;
    expect(eligibleSchematics(carried, HALL)).toEqual([]);
    const revealed = arena();
    revealed.research['machine-speed'] = 'revealed';
    expect(eligibleSchematics(revealed, HALL)).toEqual([]);
    s.stash['schematic-machine-speed'] = 1;
    expect(eligibleSchematics(s, HALL)).toEqual([]);
    expect(pickSchematic(s, HALL)).toBeNull();
    const ground = arena();
    scatterItems(ground, [ANY_SCHEMATIC, ANY_SCHEMATIC, ANY_SCHEMATIC, ANY_SCHEMATIC], HALL, PLAYER_AT.x + 100, PLAYER_AT.y);
    // One eligible (052: the merger's schematic is gone): one lands; the rest find none and drop nothing.
    const landed = ground.groundItems.map((g) => g.itemId);
    expect(landed.sort()).toEqual(REGION_1);
    expect(ground.events.schematicDrops.map((d) => d.itemId).sort()).toEqual(REGION_1);
  });

  it("an enemy's death rolls it separately: over 400 seeded Husk deaths, a few (about 1%) drop a schematic", () => {
    const def = enemyDef('husk');
    let dropped = 0;
    for (let seed = 0; seed < 400; seed++) {
      const t = arena(seed);
      t.firstHuskDropped = true;
      spawnDrops(t, def, PLAYER_AT.x + 100, PLAYER_AT.y, HALL);
      dropped += t.groundItems.filter((g) => ALL.includes(g.itemId)).length;
    }
    expect(dropped).toBeGreaterThan(0);
    expect(dropped).toBeLessThan(15);
  });
});

describe('machine parts', () => {
  it('Husks and Wisps drop an ancient gear about 4% of the time; a champion rolls it once at 12%', () => {
    for (const id of ['husk', 'wisp']) {
      const rng = createRng(21);
      const N = 10_000;
      const normal = Array.from({ length: N }, () => rollDrops(enemyDef(id).drops, rng).filter((i) => i === 'ancient-gear').length).reduce((a, b) => a + b, 0);
      expect(share(normal, N)).toBeGreaterThan(0.03);
      expect(share(normal, N)).toBeLessThan(0.05);
      const champ = Array.from({ length: N }, () => rollRare(enemyDef(id).drops, rng, true).length).reduce((a, b) => a + b, 0);
      expect(share(champ, N)).toBeGreaterThan(0.1);
      expect(share(champ, N)).toBeLessThan(0.14);
    }
  });
});

describe('unknown until banked', () => {
  it('a carried schematic reveals nothing; banking it reveals its node and gives it its name', () => {
    const s = foundry();
    s.roomId = HALL;
    s.inventory['schematic-machine-speed'] = 1;
    run(s, 1);
    expect([s.research['machine-speed'], schematicKnown(s, 'schematic-machine-speed')]).toEqual(['hidden', false]);
    expect(summarize(s).research.schematics).toEqual({ carried: ['schematic-machine-speed'], banked: [] });
    bank(s);
    expect([s.research['machine-speed'], schematicKnown(s, 'schematic-machine-speed')]).toEqual(['revealed', true]);
    expect(s.events.schematicReveals).toEqual([{ itemId: 'schematic-machine-speed', node: 'machine-speed' }]);
    expect(summarize(s).research.schematics).toEqual({ carried: ['schematic-machine-speed'], banked: ['schematic-machine-speed'] });
    // Banking again reveals nothing new.
    bank(s);
    expect(s.events.schematicReveals).toHaveLength(1);
  });

  it('walking into the foundry banks and reveals; so does sending the haul home from a pylon', () => {
    const s = createSim(5, { start: { ...createSim(5).start, inventory: { 'schematic-machine-speed': 1 } } });
    s.roomId = FOUNDRY_ROOM;
    expect(s.research['machine-speed']).toBe('hidden');
    bank(s);
    expect(s.research['machine-speed']).toBe('revealed');
    const p = arena();
    p.inventory['schematic-reservoir-2'] = 1;
    // A pylon deposit moves the haul to the stash, then banks: the schematic sent home reveals its node.
    for (const [itemId, n] of Object.entries(p.inventory)) p.stash[itemId] = n;
    p.inventory = {};
    bank(p);
    expect(p.research['reservoir-2']).toBe('revealed');
  });

  it('a KO before banking loses it, and its node stays hidden', () => {
    const s = arena();
    s.link.attuned = true; // Past the first foundry entry: before it, a KO loses nothing (067.16).
    s.inventory['schematic-machine-speed'] = 1;
    die(s);
    expect(s.inventory['schematic-machine-speed'] ?? 0).toBe(0);
    expect(s.events.lost).toMatchObject({ 'schematic-machine-speed': 1 });
    expect(s.research['machine-speed']).toBe('hidden');
    // Lost, so it can drop again.
    expect(eligibleSchematics(s, HALL)).toContain('schematic-machine-speed');
  });

  it('restoring spends the schematic as part of the cost', () => {
    const s = foundry();
    s.research['machine-speed'] = 'revealed';
    Object.assign(s.inventory, { 'schematic-machine-speed': 1, 'ancient-gear': 3 });
    const at = { x: 6.5 * 32, y: 1.5 * 32 };
    s.player.x = at.x;
    s.player.y = at.y;
    run(s, 1, { restore: 'machine-speed' });
    expect(s.research['machine-speed']).toBe('restored');
    expect(s.inventory).toMatchObject({ 'schematic-machine-speed': 0, 'ancient-gear': 0 });
  });

  it('is deterministic: the same seed and inputs give the same drops and reveals', () => {
    const play = () => {
      const s = arena(9);
      for (let i = 0; i < 30; i++) scatterItems(s, [ANY_SCHEMATIC, 'wood'], HALL, PLAYER_AT.x + 80, PLAYER_AT.y);
      stepSim(s);
      return summarize(s).groundItems;
    };
    expect(play()).toEqual(play());
  });
});
