import { describe, expect, it } from 'vitest';
import { CLAIM_TICKS, FIXTURES, SITE_SAFE_RADIUS, SITE_SUPPLY } from '../../src/data/claims';
import { ITEMS } from '../../src/data/items';
import { LANDMARK_XP } from '../../src/data/leveling';
import { LANDMARK_LIST, landmarkDef } from '../../src/data/landmarks';
import { LEY_LINES, LINES_HOME } from '../../src/data/leyLines';
import { NODES } from '../../src/data/nodes';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { HOLLOWS_START } from '../../src/data/playtest';
import { FOUNDRY_ROOM, SHOT_THROUGH, SHRINE_SITE, TILE, WALKABLE } from '../../src/data/rooms';
import { STORMCROWN, stormRampTiles } from '../../src/data/stormcrown';
import { CROWN_SPIRE, SKY_CHASM_TILES, STORMCROWN_SITES } from '../../src/data/stormcrownSites';
import { bearingOf, fromCentre } from '../../src/data/worldShape';
import { claim, claimedPylons } from '../../src/sim/claims';
import { createSim, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { WORLD } from '../../src/sim/world';
import { reachable, tileKey } from '../fixtures/reach';
import { fireAt, hold, movePlayer, run, runUntil } from './fight';

// The Stormcrown's places (064): the Rod Field (storm rods, no pylon), the Weathervane (a claimable pylon that sends
// stormglass home, overlooking the rods), the Broken Sky-bridge over a chasm across the ring, a Ley Spring on the far
// side of the ring from the nearest ramp, and the Crown Spire's walls, door and rod sockets. Each is hidden until found
// and gives its first-discovery XP.

const room = WORLD[OVERWORLD_ROOM];
if (!room) throw new Error('no overworld');
const at = (t: { tx: number; ty: number }): string | undefined => room.rows[t.ty]?.[t.tx];
const IDS = ['weathervane', 'rod-field', 'sky-bridge', 'stormcrown-spring'];
const VANE = landmarkDef('weathervane');
const PYLON = VANE.pylon ?? { tx: 0, ty: 0, site: '', supplies: [] };
const gap = (a: number, b: number): number => Math.abs((((a - b) % 360) + 540) % 360 - 180);

/** The Hollows start with the Stormcrown's barrier down (the Bulwark and the Forgewright beaten) and the land calm. */
function stormcrown(): SimState {
  const s = createSim(3, { start: HOLLOWS_START });
  s.bossDefeats.push('bulwark', 'forgewright');
  s.enemies = [];
  run(s, 1);
  return s;
}

describe('the places (data)', () => {
  it('are each a landmark in ring 5, inside the ring clear of its ragged edges', () => {
    const ring5 = LANDMARK_LIST.filter((l) => l.ring === 5);
    expect(ring5.map((l) => l.id).sort()).toEqual([...IDS].sort());
    expect(STORMCROWN_SITES.every((l) => ring5.includes(l))).toBe(true);
    for (const l of ring5) {
      for (const [tx, ty] of [[l.area.x0, l.area.y0], [l.area.x1, l.area.y0], [l.area.x0, l.area.y1], [l.area.x1, l.area.y1]] as const) {
        expect(fromCentre(tx, ty), `${l.id} ${tx},${ty}`).toBeGreaterThan(STORMCROWN.radii.inner + STORMCROWN.wall);
        expect(fromCentre(tx, ty), `${l.id} ${tx},${ty}`).toBeLessThan(STORMCROWN.radii.outer - STORMCROWN.edge.ragged);
      }
    }
  });

  it('give stormglass: a raw with an icon, gathered at the Rod Field’s storm-rod nodes', () => {
    expect(ITEMS.stormglass).toMatchObject({ id: 'stormglass', name: 'Stormglass', kind: 'raw', group: 'raw' });
    expect(NODES['storm-rod']).toMatchObject({ itemId: 'stormglass', placement: 'rod-field' });
    const rods = landmarkDef('rod-field');
    expect(rods.kind).toBe('resource-site');
    expect(rods.nodes.length).toBeGreaterThanOrEqual(5);
    for (const n of rods.nodes) expect(n.nodeId).toBe('storm-rod');
    expect(rods.pylon).toBeUndefined();
    // No guards until 065.
    expect(rods.guards).toEqual([]);
  });

  it('make the Weathervane a claimable site whose pylon sends stormglass, with a rod in its zone and a ley line home', () => {
    expect(VANE.kind).toBe('resource-site');
    expect(PYLON).toMatchObject({ site: 'weathervane', supplies: ['stormglass'] });
    expect(SITE_SUPPLY.weathervane).toEqual(['stormglass']);
    expect(VANE.guards).toEqual([]);
    const rods = landmarkDef('rod-field').nodes;
    expect(rods.some((n) => Math.hypot(n.tx - PYLON.tx, n.ty - PYLON.ty) <= SITE_SAFE_RADIUS)).toBe(true);
    expect(LINES_HOME).toContain('weathervane');
    expect(LEY_LINES.weathervane?.[0]).toEqual({ tx: PYLON.tx, ty: PYLON.ty });
  });

  it('add a stormglass port on the foundry’s west wall at (1, 5)', () => {
    expect(FIXTURES.find((f) => f.raw === 'stormglass')).toMatchObject({ id: 'stormglass-port', kind: 'port', tx: 1, ty: 5, facing: 'right' });
  });

  it('cross the ring with the Sky-bridge’s chasm: the chasm stops feet, not shots; the bridge’s deck is walkable', () => {
    expect(WALKABLE).not.toContain(TILE.chasm);
    expect(SHOT_THROUGH).toContain(TILE.chasm);
    const rift = SKY_CHASM_TILES.filter((t) => t.symbol === TILE.chasm);
    const deck = SKY_CHASM_TILES.filter((t) => t.symbol === TILE.bridge);
    expect(rift.length).toBeGreaterThan(0);
    expect(deck.length).toBeGreaterThan(0);
    for (const t of SKY_CHASM_TILES) expect(at(t), `${t.tx},${t.ty}`).toBe(t.symbol);
    const rs = rift.map((t) => fromCentre(t.tx, t.ty));
    expect(Math.min(...rs)).toBeLessThan(STORMCROWN.radii.inner + STORMCROWN.wall);
    expect(Math.max(...rs)).toBeGreaterThan(STORMCROWN.radii.outer);
  });

  it('put a Ley Spring on the far side of the ring from the nearest ramp', () => {
    const spring = OVERWORLD.springs.find((x) => x.id === 'stormcrown-spring');
    if (!spring) throw new Error('no spring');
    expect(spring.ring).toBe(5);
    const b = bearingOf(spring.tx, spring.ty);
    const nearest = Math.min(...STORMCROWN.ramps.map((r) => gap(b, r.bearing)));
    // The middle of the widest gap between ramps (60°–200°): 70° from each.
    expect(nearest).toBeGreaterThanOrEqual(65);
  });

  it('wall the Crown Spire all round, its door in the south wall, six rod sockets ringing its middle', () => {
    expect(CROWN_SPIRE).toMatchObject({ id: 'crown-spire', name: 'Crown Spire', boss: 'conductor' });
    expect(CROWN_SPIRE.door.unlock).toBe('stormcrown');
    for (const t of CROWN_SPIRE.walls) expect(at(t), `${t.tx},${t.ty}`).toBe(t.symbol);
    expect(CROWN_SPIRE.walls.filter((t) => t.symbol === TILE.arenaDoor)).toHaveLength(5);
    const b = CROWN_SPIRE.inside;
    for (let ty = b.y0; ty <= b.y1; ty++) for (let tx = b.x0; tx <= b.x1; tx++) expect(at({ tx, ty }), `${tx},${ty}`).toBe(TILE.floor);
    expect(CROWN_SPIRE.sockets).toHaveLength(6);
    const mid = { x: (CROWN_SPIRE.middle.tx + 0.5) * 32, y: (CROWN_SPIRE.middle.ty + 0.5) * 32 };
    for (const p of CROWN_SPIRE.sockets) {
      expect(Math.hypot(p.x - mid.x, p.y - mid.y)).toBeCloseTo(192, 0);
      expect(p.x > b.x0 * 32 && p.x < (b.x1 + 1) * 32 && p.y > b.y0 * 32 && p.y < (b.y1 + 1) * 32).toBe(true);
    }
  });
});

describe('the places (sim)', () => {
  it('are each reachable on foot from each ramp: nodes and pylon from the tile below, the spire’s door from outside', () => {
    for (const r of STORMCROWN.ramps) {
      const foot = stormRampTiles(r).reduce((a, b) => (fromCentre(a.tx, a.ty) < fromCentre(b.tx, b.ty) ? a : b));
      const seen = reachable(room, foot);
      for (const l of STORMCROWN_SITES) for (const t of [...l.nodes, ...(l.pylon ? [l.pylon] : [])]) expect(seen.has(tileKey({ tx: t.tx, ty: t.ty + 1 })), `${r.id}: ${l.id} ${tileKey(t)}`).toBe(true);
      expect(seen.has(tileKey(CROWN_SPIRE.door.leaveTo)), r.id).toBe(true);
      const spring = OVERWORLD.springs.find((x) => x.id === 'stormcrown-spring');
      expect(spring && seen.has(tileKey(spring)), r.id).toBe(true);
    }
  });

  it('give their first-discovery XP when first seen', () => {
    const s = stormcrown();
    const c = tileCentre(PYLON);
    movePlayer(s, c.x, c.y + 32);
    expect(s.discovered).not.toContain('weathervane');
    run(s, 1);
    expect(s.events.discoveries.map((d) => d.landmark)).toContain('weathervane');
    expect(s.events.xp).toContainEqual({ amount: LANDMARK_XP, source: 'landmark' });
  });

  it('claim the Weathervane by held E (no guards until 065): it joins fast travel and supplies its new port', () => {
    const s = stormcrown();
    const below = tileCentre({ tx: PYLON.tx, ty: PYLON.ty + 1 });
    movePlayer(s, below.x, below.y);
    run(s, 1, { interact: true });
    run(s, CLAIM_TICKS);
    expect(s.claims).toContain('weathervane');
    expect(claimedPylons(s).map((p) => p.pylon.site)).toContain('weathervane');
    expect(s.fixtures.some((f) => f.id === 'stormglass-port')).toBe(true);
    expect(summarize(s).ports.find((p) => p.raw === 'stormglass')).toMatchObject({ pylons: 1, perMinute: 15 });
    s.roomId = FOUNDRY_ROOM;
    runUntil(s, () => s.events.supplies.some((e) => e.itemId === 'stormglass'), 300);
  });

  it('keep shrine claims needed first: the Weathervane’s pylon is dormant until the shrine is claimed', () => {
    const s = createSim(3);
    s.bossDefeats.push('bulwark', 'forgewright');
    s.enemies = [];
    const below = tileCentre({ tx: PYLON.tx, ty: PYLON.ty + 1 });
    movePlayer(s, below.x, below.y);
    run(s, 1, { interact: true });
    expect(s.claimHold).toBeNull();
    claim(s, SHRINE_SITE);
    run(s, 1, { interact: true });
    expect(s.claimHold).toEqual({ site: 'weathervane', progress: 1 });
  });

  it('let shots fly over the chasm while feet stop at its edge, and walk across on the Sky-bridge’s deck', () => {
    const s = stormcrown();
    const rift = SKY_CHASM_TILES.find((t) => t.symbol === TILE.chasm && Math.abs(fromCentre(t.tx, t.ty) - 120) < 1);
    if (!rift) throw new Error('no chasm');
    // It runs west-south-west, so from open ground north of it: walk south into it, then fire south across it.
    let from = { tx: rift.tx, ty: rift.ty - 2 };
    while (at(from) !== TILE.floor) from = { tx: from.tx, ty: from.ty - 1 };
    const c = tileCentre(from);
    movePlayer(s, c.x, c.y);
    run(s, 90, { moveY: 1 });
    expect(s.player.y).toBeLessThan(rift.ty * 32);
    s.inventory = { arrow: 5 };
    hold(s, 'arrow');
    run(s, 1, fireAt(s.player.x, s.player.y + 400));
    let maxY = s.player.y;
    runUntil(s, () => {
      const a = s.arrows[0];
      if (a) maxY = Math.max(maxY, a.y);
      return s.arrows.length === 0;
    }, 90);
    expect(maxY).toBeGreaterThan((rift.ty + 2) * 32);
    // The deck carries feet over: every deck tile is reachable from the near side.
    const seen = reachable(room, from);
    for (const t of SKY_CHASM_TILES.filter((x) => x.symbol === TILE.bridge)) expect(seen.has(tileKey(t)), tileKey(t)).toBe(true);
  });

  it('heal the player in the Stormcrown’s Ley Spring', () => {
    const s = stormcrown();
    const spring = OVERWORLD.springs.find((x) => x.id === 'stormcrown-spring');
    if (!spring) throw new Error('no spring');
    s.player.health = 40;
    const c = tileCentre(spring);
    movePlayer(s, c.x, c.y);
    run(s, 60);
    expect(s.player.healing).toBe('spring');
    expect(s.player.health).toBeGreaterThan(40);
  });
});
