import { describe, expect, it } from 'vitest';
import { CLAIM_TICKS, FIXTURES, SITE_SAFE_RADIUS, SITE_SUPPLY } from '../../src/data/claims';
import { ANVIL_ARENA, ARENAS } from '../../src/data/arenas';
import { EMBERWORKS, inEmberworks } from '../../src/data/emberworks';
import { EMBERWORKS_SITES, SLAG_RIVER_TILES } from '../../src/data/emberworksSites';
import { ITEMS } from '../../src/data/items';
import { LANDMARK_XP } from '../../src/data/leveling';
import { LANDMARK_LIST, landmarkDef } from '../../src/data/landmarks';
import { LEY_LINES, LINES_HOME } from '../../src/data/leyLines';
import { NODES } from '../../src/data/nodes';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { HOLLOWS_START } from '../../src/data/playtest';
import { FOUNDRY_ROOM, SHOT_THROUGH, SHRINE_SITE, TILE, WALKABLE } from '../../src/data/rooms';
import { bearingOf, fromCentre } from '../../src/data/worldShape';
import { claim, claimedPylons } from '../../src/sim/claims';
import { createSim, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { WORLD } from '../../src/sim/world';
import { reachable, tileKey } from '../fixtures/reach';
import { fireAt, hold, movePlayer, run, runUntil } from './fight';

// The Emberworks' places (060): the Cinder Vents (cinderite vents, no pylon), the Ash Kilns (a claimable pylon that
// sends cinderite home, overlooking the vents), the Slag River and its bridges, the Outpost Forge with a Ruined Cache,
// a Ley Spring on the far side of the ring, and the Anvil Hall's walls and door. Each is hidden until found and gives
// its first-discovery XP.

const room = WORLD[OVERWORLD_ROOM];
if (!room) throw new Error('no overworld');
const at = (t: { tx: number; ty: number }): string | undefined => room.rows[t.ty]?.[t.tx];
const IDS = ['ash-kilns', 'cinder-vents', 'slag-river', 'outpost-forge', 'emberworks-spring'];
const KILNS = landmarkDef('ash-kilns');
const PYLON = KILNS.pylon ?? { tx: 0, ty: 0, site: '', supplies: [] };

/** The Hollows start with the Emberworks' barrier down (the Bulwark beaten) and the land calm. */
function emberworks(): SimState {
  const s = createSim(3, { start: HOLLOWS_START });
  s.bossDefeats.push('bulwark');
  s.enemies = [];
  run(s, 1);
  return s;
}

describe('the places (data)', () => {
  it('are each a landmark in ring 4, inside the ring clear of its ragged edges', () => {
    const ring4 = LANDMARK_LIST.filter((l) => l.ring === 4);
    expect(ring4.map((l) => l.id).sort()).toEqual([...IDS].sort());
    expect(EMBERWORKS_SITES.every((l) => ring4.includes(l))).toBe(true);
    for (const l of ring4) {
      expect(l.ring, l.id).toBe(4);
      for (const [tx, ty] of [[l.area.x0, l.area.y0], [l.area.x1, l.area.y0], [l.area.x0, l.area.y1], [l.area.x1, l.area.y1]] as const) {
        expect(fromCentre(tx, ty), `${l.id} ${tx},${ty}`).toBeGreaterThan(EMBERWORKS.radii.inner + EMBERWORKS.wall);
        expect(fromCentre(tx, ty), `${l.id} ${tx},${ty}`).toBeLessThan(EMBERWORKS.radii.outer - EMBERWORKS.edge.ragged);
      }
    }
  });

  it('give cinderite: a raw with an icon, gathered at the Cinder Vents’ cinder-vent nodes', () => {
    expect(ITEMS.cinderite).toMatchObject({ id: 'cinderite', name: 'Cinderite', kind: 'raw', group: 'raw' });
    expect(NODES['cinder-vent']).toMatchObject({ itemId: 'cinderite', placement: 'vent', cycle: { closedTicks: 720, warnTicks: 90, openTicks: 360 } });
    const vents = landmarkDef('cinder-vents');
    expect(vents.nodes.length).toBeGreaterThanOrEqual(5);
    for (const n of vents.nodes) expect(n.nodeId).toBe('cinder-vent');
    expect(vents.pylon).toBeUndefined();
  });

  it('make the Ash Kilns a claimable site whose pylon sends cinderite, with a vent in its zone and a ley line home', () => {
    expect(KILNS.kind).toBe('resource-site');
    expect(PYLON).toMatchObject({ site: 'ash-kilns', supplies: ['cinderite'] });
    expect(SITE_SUPPLY['ash-kilns']).toEqual(['cinderite']);
    // 061: its guards, the Emberworks' fixed pack (tests/sim/emberworksPacks.test.ts).
    expect(KILNS.guards.map((g) => g.enemyId).sort()).toEqual(['bellows-hound', 'bellows-hound', 'cinder-mote', 'cinder-mote', 'kiln-tender', 'slag-golem']);
    const vents = landmarkDef('cinder-vents').nodes;
    expect(vents.some((n) => Math.hypot(n.tx - PYLON.tx, n.ty - PYLON.ty) <= SITE_SAFE_RADIUS)).toBe(true);
    expect(LINES_HOME).toContain('ash-kilns');
    expect(LEY_LINES['ash-kilns']?.[0]).toEqual({ tx: PYLON.tx, ty: PYLON.ty });
  });

  it('add a cinderite port on the foundry’s west wall at (1, 9)', () => {
    expect(FIXTURES.find((f) => f.raw === 'cinderite')).toMatchObject({ id: 'cinderite-port', kind: 'port', tx: 1, ty: 9, facing: 'right' });
  });

  it('cross the ring with the Slag River: slag stops feet, not shots; its bridges are walkable', () => {
    expect(WALKABLE).not.toContain(TILE.slag);
    expect(SHOT_THROUGH).toContain(TILE.slag);
    expect(WALKABLE).toContain(TILE.bridge);
    const slag = SLAG_RIVER_TILES.filter((t) => t.symbol === TILE.slag);
    const bridges = SLAG_RIVER_TILES.filter((t) => t.symbol === TILE.bridge);
    expect(slag.length).toBeGreaterThan(0);
    expect(bridges.length).toBeGreaterThan(0);
    for (const t of SLAG_RIVER_TILES) expect(at(t), `${t.tx},${t.ty}`).toBe(t.symbol);
    // It runs from the Hollows' cliff edge out to the ring's own, so the bridges are the only way over it.
    const rs = slag.map((t) => fromCentre(t.tx, t.ty));
    expect(Math.min(...rs)).toBeLessThan(EMBERWORKS.radii.inner + EMBERWORKS.wall);
    expect(Math.max(...rs)).toBeGreaterThan(EMBERWORKS.radii.outer);
  });

  it('put a Ruined Cache in the Outpost Forge and a Ley Spring on the far side of the ring from every ramp', () => {
    const forge = landmarkDef('outpost-forge');
    expect(forge.kind).toBe('ruined-cache');
    expect(forge.cache).toBeDefined();
    const spring = OVERWORLD.springs.find((x) => x.id === 'emberworks-spring');
    if (!spring) throw new Error('no spring');
    expect(spring.ring).toBe(4);
    expect(inEmberworks(spring.tx, spring.ty)).toBe(true);
    const bearing = bearingOf(spring.tx, spring.ty);
    for (const r of EMBERWORKS.ramps) expect(Math.abs((((bearing - r.bearing) % 360) + 540) % 360 - 180), r.id).toBeGreaterThan(90);
  });

  it('wall the Anvil Hall all round with a door the Emberworks’ barrier unlocks', () => {
    expect(ARENAS).toContain(ANVIL_ARENA);
    expect(ANVIL_ARENA).toMatchObject({ id: 'anvil-hall', name: 'Anvil Hall', boss: 'forgewright' });
    expect(ANVIL_ARENA.door.unlock).toBe('emberworks');
    const b = ANVIL_ARENA.bounds;
    for (const [tx, ty] of [[b.x0, b.y0], [b.x1, b.y1]] as const) expect(inEmberworks(tx, ty)).toBe(true);
  });
});

describe('the places (sim)', () => {
  it('are each reachable on foot from the ramps, their nodes, pylon and reliquary used from the tile below', () => {
    const seen = reachable(room, OVERWORLD.wake);
    for (const l of EMBERWORKS_SITES) for (const t of [...l.nodes, ...(l.pylon ? [l.pylon] : []), ...(l.cache ? [l.cache] : [])]) expect(seen.has(tileKey({ tx: t.tx, ty: t.ty + 1 })), `${l.id} ${tileKey(t)}`).toBe(true);
    expect(seen.has(tileKey(ANVIL_ARENA.door.leaveTo))).toBe(true);
  });

  it('give their first-discovery XP when first seen', () => {
    const s = emberworks();
    const c = tileCentre(PYLON);
    movePlayer(s, c.x, c.y + 32);
    expect(s.discovered).not.toContain('ash-kilns');
    run(s, 1);
    expect(s.events.discoveries.map((d) => d.landmark)).toContain('ash-kilns');
    expect(s.events.xp).toContainEqual({ amount: LANDMARK_XP, source: 'landmark' });
  });

  it('claim the Ash Kilns by held E, its guards cleared (061): it joins fast travel and supplies its new port', () => {
    const s = emberworks();
    const below = tileCentre({ tx: PYLON.tx, ty: PYLON.ty + 1 });
    movePlayer(s, below.x, below.y);
    run(s, 1, { interact: true });
    run(s, CLAIM_TICKS);
    expect(s.claims).toContain('ash-kilns');
    expect(claimedPylons(s).map((p) => p.pylon.site)).toContain('ash-kilns');
    expect(s.fixtures.some((f) => f.id === 'cinderite-port')).toBe(true);
    expect(summarize(s).ports.find((p) => p.raw === 'cinderite')).toMatchObject({ pylons: 1, perMinute: 15 });
    s.roomId = FOUNDRY_ROOM;
    runUntil(s, () => s.events.supplies.some((e) => e.itemId === 'cinderite'), 300);
  });

  it('let shots fly over the Slag River while feet stop at its bank', () => {
    const s = emberworks();
    const slag = SLAG_RIVER_TILES.find((t) => t.symbol === TILE.slag && fromCentre(t.tx, t.ty) > 95 && fromCentre(t.tx, t.ty) < 97);
    if (!slag) throw new Error('no slag');
    // From open ground beside it, east of the river: walk west into it, then fire west across it.
    let from = { tx: slag.tx + 3, ty: slag.ty };
    while (at(from) === TILE.slag) from = { tx: from.tx + 1, ty: from.ty };
    const c = tileCentre(from);
    movePlayer(s, c.x, c.y);
    run(s, 90, { moveX: -1 });
    expect(at({ tx: Math.floor(s.player.x / 32), ty: Math.floor(s.player.y / 32) })).not.toBe(TILE.slag);
    expect(s.player.x).toBeGreaterThan(slag.tx * 32);
    s.inventory = { arrow: 5 };
    hold(s, 'arrow');
    run(s, 1, fireAt(s.player.x - 400, s.player.y));
    let minX = s.player.x;
    runUntil(s, () => {
      const a = s.arrows[0];
      if (a) minX = Math.min(minX, a.x);
      return s.arrows.length === 0;
    }, 90);
    expect(minX).toBeLessThan((slag.tx - 1) * 32);
  });

  it('open the Outpost Forge’s cache with held E (no guards), its drops on the ground', () => {
    const s = emberworks();
    const cache = landmarkDef('outpost-forge').cache;
    if (!cache) throw new Error('no cache');
    const c = tileCentre({ tx: cache.tx, ty: cache.ty + 1 });
    movePlayer(s, c.x, c.y);
    run(s, 1, { interact: true });
    run(s, 70);
    expect(s.events.cacheOpens.length + s.caches.filter((x) => x.openedAt !== null).length).toBeGreaterThan(0);
    expect(s.caches.find((x) => x.id === 'outpost-forge')?.openedAt).not.toBeNull();
    expect(s.groundItems.length).toBeGreaterThan(0);
  });

  it('heal the player in the Emberworks’ Ley Spring', () => {
    const s = emberworks();
    const spring = OVERWORLD.springs.find((x) => x.id === 'emberworks-spring');
    if (!spring) throw new Error('no spring');
    s.player.health = 40;
    const c = tileCentre(spring);
    movePlayer(s, c.x, c.y);
    run(s, 60);
    expect(s.player.healing).toBe('spring');
    expect(s.player.health).toBeGreaterThan(40);
  });

  it('keep the Anvil Hall’s door sealed until the barrier falls, then E goes in', () => {
    const shut = createSim(3, { start: HOLLOWS_START });
    expect(summarize(shut).arenas.find((a) => a.id === 'anvil-hall')).toMatchObject({ unlocked: false });
    const s = emberworks();
    expect(summarize(s).arenas.find((a) => a.id === 'anvil-hall')).toMatchObject({ unlocked: true, inside: false });
    const c = tileCentre(ANVIL_ARENA.door.leaveTo);
    movePlayer(s, c.x, c.y);
    run(s, 1, { interact: true });
    expect({ x: s.player.x, y: s.player.y }).toEqual(tileCentre(ANVIL_ARENA.door.enterTo));
    expect(summarize(s).arenas.find((a) => a.id === 'anvil-hall')).toMatchObject({ inside: true });
  });

  it('keep shrine claims needed first: the Ash Kilns’ pylon is dormant until the shrine is claimed', () => {
    const s = createSim(3);
    s.bossDefeats.push('bulwark');
    s.enemies = [];
    const below = tileCentre({ tx: PYLON.tx, ty: PYLON.ty + 1 });
    movePlayer(s, below.x, below.y);
    run(s, 1, { interact: true });
    expect(s.claimHold).toBeNull();
    claim(s, SHRINE_SITE);
    run(s, 1, { interact: true });
    expect(s.claimHold).toEqual({ site: 'ash-kilns', progress: 1 });
  });
});
