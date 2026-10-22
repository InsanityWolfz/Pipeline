import { describe, expect, it } from 'vitest';
import { FIXTURES, SITE_SAFE_RADIUS, SITE_SUPPLY } from '../../src/data/claims';
import { NODE_SPRITES } from '../../src/data/assets';
import { HARVEST_BURSTS } from '../../src/data/juice';
import { LANDMARK_LIST, landmarkDef } from '../../src/data/landmarks';
import { LANDMARK_SPRITES } from '../../src/data/landmarkAssets';
import { NODES, nodeDef } from '../../src/data/nodes';
import { OBJECTIVES } from '../../src/data/objectives';
import { OVERWORLD, ringOf } from '../../src/data/overworld';
import { SUPPLY_LOOK } from '../../src/data/art/ground';
import { inHollows } from '../../src/data/hollows';
import { vectorFrames } from '../../src/render/vector/catalog';

// 049: the Husk Hive, a landmark entry like 032's sites: a Husk nest of amber-crusted stone in ring 2 of Region 1,
// guarded by a Husk pack with a champion, with resin seeps and a pylon that sends Husk resin home.

const HIVE = landmarkDef('husk-hive');
const centre = (a: { x0: number; y0: number; x1: number; y1: number }) => ({ tx: (a.x0 + a.x1) / 2, ty: (a.y0 + a.y1) / 2 });

describe('the Husk Hive entry', () => {
  it('is a ring 2 resource site in Region 1, named, with a site marker on the minimap', () => {
    expect(HIVE).toMatchObject({ name: 'Husk Hive', kind: 'resource-site', ring: 2, marker: 'site' });
    const c = centre(HIVE.area);
    expect(inHollows(Math.round(c.tx), Math.round(c.ty))).toBe(false);
    expect(ringOf(Math.round(c.tx), Math.round(c.ty))).toBe(2);
  });

  it('lies across the foundry from the Old Grove (049.1), so the two ring 2 sites spread out', () => {
    const door = OVERWORLD.entrance.door;
    const grove = centre(landmarkDef('old-grove').area);
    const hive = centre(HIVE.area);
    // The grove is west of the foundry, the Hive east of it.
    expect(grove.tx).toBeLessThan(door.tx);
    expect(hive.tx).toBeGreaterThan(door.tx);
  });

  it('is a nest of amber-crusted stones: its blocks are drawn as the Hive', () => {
    expect(HIVE.look?.blocks).toBe('hive');
    expect((HIVE.blocks ?? []).length).toBeGreaterThanOrEqual(4);
    const frames = new Set(vectorFrames().map((f) => f.name));
    for (const key of LANDMARK_SPRITES.hiveStones) expect(frames.has(key), key).toBe(true);
  });

  it('is guarded by a pack of Husks, exactly one of them a champion', () => {
    expect(HIVE.guards.length).toBeGreaterThanOrEqual(3);
    expect(HIVE.guards.length).toBeLessThanOrEqual(5);
    for (const g of HIVE.guards) expect(g.enemyId).toBe('husk');
    expect(HIVE.guards.filter((g) => g.champion)).toHaveLength(1);
    // At ring 2 scaling: every guard's home is a ring 2 tile.
    for (const g of HIVE.guards) expect(ringOf(g.tx, g.ty), `${g.tx},${g.ty}`).toBe(2);
    // No other landmark's guard is a champion by data.
    for (const l of LANDMARK_LIST.filter((x) => x.id !== HIVE.id)) expect(l.guards.some((g) => g.champion), l.id).toBe(false);
  });

  it('holds five resin seeps, and a pylon that sends only Husk resin, with a seep in its zone', () => {
    expect(HIVE.nodes).toHaveLength(5);
    for (const n of HIVE.nodes) expect(n.nodeId).toBe('resin-seep');
    const pylon = HIVE.pylon;
    if (!pylon) throw new Error('no pylon');
    expect(pylon).toMatchObject({ site: 'husk-hive', supplies: ['husk-resin'] });
    expect(SITE_SUPPLY['husk-hive']).toEqual(['husk-resin']);
    expect(HIVE.nodes.some((n) => Math.hypot(n.tx - pylon.tx, n.ty - pylon.ty) <= SITE_SAFE_RADIUS)).toBe(true);
    expect(OVERWORLD.leyLines['husk-hive']?.[0]).toEqual({ tx: pylon.tx, ty: pylon.ty });
  });

  it('has a goal line after the frost rune build that points to it (049.2: no lock; 058: the frost rune goes before it)', () => {
    const frost = OBJECTIVES.findIndex((o) => o.guided === 'frost-line');
    expect(OBJECTIVES[frost + 1]).toMatchObject({ text: 'Find the Husk Hive and claim its pylon', milestone: 'm1', check: { kind: 'claimed', site: 'husk-hive' } });
  });
});

describe('the resin seep', () => {
  it('gives Husk resin with the boulder\'s uses, harvest time, yield and regrow (049.3)', () => {
    const seep = nodeDef('resin-seep');
    const stone = nodeDef('rubble');
    expect(seep).toMatchObject({ name: 'Resin seep', itemId: 'husk-resin', placement: 'hive' });
    expect([seep.uses, seep.harvestTicks, seep.yield, seep.regrowTicks]).toEqual([stone.uses, stone.harvestTicks, stone.yield, stone.regrowTicks]);
  });

  it('stands only in the Hive', () => {
    const seeps = OVERWORLD.nodes.filter((n) => n.nodeId === 'resin-seep');
    expect(seeps).toHaveLength(5);
    const a = HIVE.area;
    for (const n of seeps) expect(n.tx >= a.x0 && n.tx <= a.x1 && n.ty >= a.y0 && n.ty <= a.y1, `${n.tx},${n.ty}`).toBe(true);
  });

  it('has a frame per use, bare remains and each regrow stage, a harvest burst, and the supply motes a resin colour', () => {
    const frames = new Set(vectorFrames().map((f) => f.name));
    const own = NODE_SPRITES['resin-seep'];
    if (!own) throw new Error('no seep frames');
    expect(own.uses).toHaveLength(NODES['resin-seep']?.uses ?? 0);
    for (const key of [...own.uses, ...own.regrow]) expect(frames.has(key), key).toBe(true);
    expect(HARVEST_BURSTS['resin-seep']).toBe('harvestResin');
    expect(SUPPLY_LOOK.moteColors['husk-resin']).toBe('resin-light');
  });
});

describe('the resin port', () => {
  it('stands on the west wall facing into the room, below the ley crystal port and above the bench', () => {
    expect(FIXTURES.find((f) => f.kind === 'port' && f.raw === 'husk-resin')).toMatchObject({ id: 'husk-resin-port', name: 'Husk resin port', tx: 1, ty: 11, facing: 'right' });
  });
});
