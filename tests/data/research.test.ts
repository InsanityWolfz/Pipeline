import { describe, expect, it } from 'vitest';
import { FIXTURES } from '../../src/data/claims';
import { ANY_SCHEMATIC, CACHE_RARE, REGION_1_PART, ROOM_REGIONS, SCHEMATIC_CHANCE, SCHEMATIC_REGIONS } from '../../src/data/drops';
import { ENEMIES } from '../../src/data/enemies';
import { ENTRANCE_CAPS, INTAKE } from '../../src/data/foundry';
import { ITEMS } from '../../src/data/items';
import { CACHE_DROPS } from '../../src/data/landmarks';
import { BUILD_BAR, PIECES } from '../../src/data/pieces';
import { PLAYTEST_START } from '../../src/data/playtest';
import { MACHINE_SPEED_MULT, nodeOfSchematic, RESEARCH_GROUPS, RESEARCH_NODES, RESEARCH_PIECES, researchNode } from '../../src/data/research';
import { STATIC_ROOMS, TILE } from '../../src/data/rooms';

// Research nodes as data (033): every cost a core, machine part or schematic; every
// reference real; no cycles; the wall panels on walls clear of everything else.

const FOUNDRY = STATIC_ROOMS.foundry;
if (!FOUNDRY) throw new Error('no foundry room');
const at = (tx: number, ty: number): string => FOUNDRY.rows[ty]?.[tx] ?? '';
const SCHEMATICS = Object.values(ITEMS).filter((it) => it.kind === 'schematic');

describe('research nodes', () => {
  it('have unique kebab-case ids, names and one-line descriptions', () => {
    const ids = RESEARCH_NODES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const n of RESEARCH_NODES) {
      expect(n.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(n.name.length).toBeGreaterThan(0);
      expect(n.description).not.toContain('\n');
    }
    expect(researchNode('splitter').name).toBe('Splitter');
    expect(() => researchNode('nope')).toThrow();
  });

  it('cost only boss cores, machine parts and schematics, never gold or raws', () => {
    for (const n of RESEARCH_NODES) {
      for (const [itemId, k] of Object.entries(n.cost)) {
        const item = ITEMS[itemId];
        expect(item, `${n.id}: ${itemId}`).toBeDefined();
        expect(['core', 'machinePart', 'schematic'], `${n.id}: ${itemId}`).toContain(item?.research);
        expect(Number.isInteger(k) && k > 0).toBe(true);
      }
    }
    // Tagged as the spec says: the cores, the two regions' parts, the four schematics.
    const tagged = (tag: string) => Object.values(ITEMS).filter((it) => it.research === tag).map((it) => it.id).sort();
    expect(tagged('core')).toEqual(['bulwark-core', 'warden-core']);
    expect(tagged('machinePart')).toEqual(['ancient-gear', 'aqueduct-valve']);
    expect(tagged('schematic')).toEqual(['schematic-machine-speed', 'schematic-merger', 'schematic-reservoir-2', 'schematic-splitter']);
    // Kinds unchanged (031 keeps cores a part); the schematics are the one new kind. Panel groups: cores in Cores, the rest in Parts.
    expect(ITEMS['warden-core']).toMatchObject({ kind: 'part', group: 'cores' });
    expect(ITEMS['bulwark-core']).toMatchObject({ kind: 'part', group: 'cores' });
    for (const id of ['ancient-gear', 'aqueduct-valve']) expect(ITEMS[id]).toMatchObject({ kind: 'part', group: 'parts' });
    for (const s of SCHEMATICS) expect(s).toMatchObject({ kind: 'schematic', group: 'parts' });
  });

  it('require only real nodes, with no cycles', () => {
    const ids = new Set(RESEARCH_NODES.map((n) => n.id));
    for (const n of RESEARCH_NODES) for (const r of n.requires) expect(ids.has(r), `${n.id} requires ${r}`).toBe(true);
    const visiting = new Set<string>();
    const done = new Set<string>();
    const visit = (id: string): void => {
      if (done.has(id)) return;
      if (visiting.has(id)) throw new Error(`cycle at ${id}`);
      visiting.add(id);
      for (const r of researchNode(id).requires) visit(r);
      visiting.delete(id);
      done.add(id);
    };
    for (const n of RESEARCH_NODES) expect(() => visit(n.id)).not.toThrow();
  });

  it('are revealed from the start or by their own schematic, one schematic per node that names one', () => {
    for (const n of RESEARCH_NODES) {
      if (n.reveal === 'start') continue;
      expect(ITEMS[n.reveal]?.kind).toBe('schematic');
      // Restoring spends the schematic as part of the cost.
      expect(n.cost[n.reveal]).toBe(1);
    }
    expect(SCHEMATICS.map((s) => nodeOfSchematic(s.id)?.id).sort()).toEqual(['machine-speed', 'merger', 'reservoir-2', 'splitter']);
    for (const s of SCHEMATICS) expect(s.name).toBe(`Schematic: ${nodeOfSchematic(s.id)?.name}`);
  });

  it('hold the spec table: costs, requires, reveals and effects', () => {
    const row = (id: string) => {
      const n = researchNode(id);
      return [n.reveal, n.cost, n.requires, n.effect];
    };
    expect(row('entrance-2')).toEqual(['start', { 'warden-core': 1 }, [], { kind: 'entrance' }]);
    expect(row('entrance-3')).toEqual(['start', { 'bulwark-core': 1 }, ['entrance-2'], { kind: 'entrance' }]);
    expect(row('reservoir-1')).toEqual(['start', { 'ancient-gear': 4 }, [], { kind: 'reservoir', tier: 1 }]);
    expect(row('reservoir-2')).toEqual([
      'schematic-reservoir-2',
      { 'schematic-reservoir-2': 1, 'aqueduct-valve': 4, 'bulwark-core': 1 },
      ['reservoir-1'],
      { kind: 'reservoir', tier: 2 },
    ]);
    expect(row('machine-speed')).toEqual(['schematic-machine-speed', { 'schematic-machine-speed': 1, 'ancient-gear': 3 }, [], { kind: 'machineSpeed' }]);
    expect(row('splitter')).toEqual(['schematic-splitter', { 'schematic-splitter': 1, 'ancient-gear': 2 }, [], { kind: 'unlockPiece', piece: 'splitter' }]);
    expect(row('merger')).toEqual(['schematic-merger', { 'schematic-merger': 1, 'ancient-gear': 2 }, [], { kind: 'unlockPiece', piece: 'merger' }]);
    expect(row('sealed-wing')).toEqual(['start', {}, [], { kind: 'wing' }]);
    expect(MACHINE_SPEED_MULT).toBe(0.75);
  });

  it('reservoir tiers index the cap table, which runs 30, 45, 60; unlocked pieces are logistics on the build bar', () => {
    expect(ENTRANCE_CAPS).toEqual([30, 45, 60]);
    for (const n of RESEARCH_NODES) if (n.effect.kind === 'reservoir') expect(ENTRANCE_CAPS[n.effect.tier]).toBeDefined();
    expect(RESEARCH_PIECES).toEqual(['splitter', 'merger']);
    for (const id of RESEARCH_PIECES) {
      expect(BUILD_BAR).toContain(id);
      expect(PIECES[id]?.category).toBe('logistics');
    }
  });

  it('put wall panels and the wing door on wall tiles facing floor, clear of the door, fixtures, ports, props and the intake', () => {
    const taken = [
      ...INTAKE.entrances.flatMap((e) => [e.tx - 1, e.tx, e.tx + 1].map((tx) => ({ tx, ty: e.ty }))),
      ...(FOUNDRY.props ?? []),
      ...(FOUNDRY.doorways ?? []),
    ];
    const tiles = RESEARCH_NODES.flatMap((n) =>
      n.anchor.kind === 'wall' ? [n.anchor] : n.anchor.kind === 'wing' ? Array.from({ length: n.anchor.w }, (_, i) => ({ tx: (n.anchor as { tx: number }).tx + i, ty: (n.anchor as { ty: number }).ty })) : [],
    );
    expect(tiles.length).toBe(5);
    for (const t of tiles) {
      expect(at(t.tx, t.ty), `${t.tx},${t.ty}`).toBe(TILE.wall);
      expect(at(t.tx, t.ty + 1), `below ${t.tx},${t.ty}`).toBe(TILE.floor);
      expect(taken.some((o) => o.tx === t.tx && o.ty === t.ty), `${t.tx},${t.ty} taken`).toBe(false);
      // Not behind a fixture (each stands on the floor tile next to its wall).
      for (const f of FIXTURES) expect(Math.abs(f.tx - t.tx) + Math.abs(f.ty - t.ty) > 1, `${f.id} by ${t.tx},${t.ty}`).toBe(true);
    }
    expect(new Set(tiles.map((t) => `${t.tx},${t.ty}`)).size).toBe(tiles.length);
  });

  it('group every node in the list by its anchor', () => {
    for (const n of RESEARCH_NODES) expect(RESEARCH_GROUPS.filter((g) => g.anchors.includes(n.anchor.kind))).toHaveLength(1);
    expect(RESEARCH_GROUPS.map((g) => g.label)).toEqual(['Intake', 'Walls', 'Sealed wing']);
  });
});

describe('research drops', () => {
  it('roll schematics at 1% for an enemy, 5% for a champion and 20% from the cache, Reservoir II only in Region 2', () => {
    expect(SCHEMATIC_CHANCE).toEqual({ enemy: 0.01, champion: 0.05 });
    expect(CACHE_RARE).toContainEqual({ itemId: ANY_SCHEMATIC, chance: 0.2 });
    expect(Object.keys(SCHEMATIC_REGIONS).sort()).toEqual(SCHEMATICS.map((s) => s.id).sort());
    expect(SCHEMATIC_REGIONS['schematic-reservoir-2']).toEqual([2]);
    for (const room of Object.keys(ROOM_REGIONS)) expect(['overworld', 'foundry']).toContain(room);
  });

  it('drop the ancient gear from Husks and Wisps at 4% (champions 12%) and from the cache at 50%', () => {
    expect(REGION_1_PART).toEqual({ itemId: 'ancient-gear', chance: 0.04, championChance: 0.12 });
    expect(ENEMIES.husk?.drops.rare).toEqual([REGION_1_PART]);
    expect(ENEMIES.wisp?.drops.rare).toEqual([REGION_1_PART]);
    expect(CACHE_DROPS.rare).toEqual(CACHE_RARE);
    expect(CACHE_RARE).toContainEqual({ itemId: 'ancient-gear', chance: 0.5 });
  });

  it('give the playtest start enough to restore every node by hand', () => {
    expect(PLAYTEST_START.inventory).toMatchObject({ 'warden-core': 5, 'bulwark-core': 2, 'ancient-gear': 10, 'aqueduct-valve': 10 });
    for (const s of SCHEMATICS) expect(PLAYTEST_START.inventory[s.id]).toBe(1);
  });
});
