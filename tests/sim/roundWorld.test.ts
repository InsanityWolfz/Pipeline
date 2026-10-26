import { SHRINE_ARENA } from '../../src/data/arenas';
import { describe, expect, it } from 'vitest';
import { EMBERWORKS, rampTiles } from '../../src/data/emberworks';
import { SLAG_RIVER_TILES } from '../../src/data/emberworksSites';
import { HOLLOWS, inHollows, regionAt } from '../../src/data/hollows';
import { LANDMARK_LIST } from '../../src/data/landmarks';
import { OVERWORLD, ringOf } from '../../src/data/overworld';
import { TILE, WALKABLE } from '../../src/data/rooms';
import { bearingOf, fromCentre, onBarrier, polar, WORLD_SHAPE } from '../../src/data/worldShape';
import { generateOverworld } from '../../src/sim/overworldGen';
import { WORLD } from '../../src/sim/world';
import { reachable, tileKey } from '../fixtures/reach';
import { arena, movePlayer, run } from './fight';

// The round world (053, D.1): Region 1 a circle round the foundry about twice the old region's area, its danger rings
// concentric bands inside it; Stonefall Hollows a ring round it of similar width with the barrier on the whole circle
// between them; a ragged cliff edge past it; every place reachable.

const room = generateOverworld();
const at = (tx: number, ty: number): string | undefined => room.rows[ty]?.[tx];
const { centre, region1, hollows, size } = WORLD_SHAPE;

/** The same map with every gate open: the barrier's band is open ground (the generator leaves it floor). */
const all = (): Set<string> => reachable(room, OVERWORLD.wake);

describe('the shape', () => {
  it('is a square grid with the foundry door at its centre', () => {
    expect(room.rows).toHaveLength(size);
    for (const row of room.rows) expect(row).toHaveLength(size);
    expect(OVERWORLD.entrance.door).toEqual(centre);
    expect(OVERWORLD.rings.centre).toEqual(centre);
  });

  it('makes Region 1 a circle about twice the old region (80 × 45 tiles), and the Hollows a ring 48 − 17 tiles wide round it (053.2)', () => {
    const area = Math.PI * region1 * region1;
    expect(area / (80 * 45)).toBeGreaterThan(1.9);
    expect(area / (80 * 45)).toBeLessThan(2.1);
    expect(hollows - region1).toBe(region1 - OVERWORLD.rings.bounds[0]);
    // Every tile is in Region 1 inside the circle and in the Hollows outside it, whichever way you go.
    for (let b = 0; b < 360; b += 15) {
      const inside = polar(b, region1 - 1);
      const outside = polar(b, region1 + 1);
      expect(regionAt(inside.tx, inside.ty), `${b}°`).toBe(1);
      expect(regionAt(outside.tx, outside.ty), `${b}°`).toBe(2);
      expect(inHollows(outside.tx, outside.ty)).toBe(true);
    }
  });

  it('keeps the danger rings concentric bands round the foundry, ring 3 the whole Hollows', () => {
    const [b0, b1] = OVERWORLD.rings.bounds;
    for (let b = 0; b < 360; b += 30) {
      const ring = (r: number) => {
        const t = polar(b, r);
        return ringOf(t.tx, t.ty);
      };
      expect([ring(b0 - 2), ring(b0 + 2), ring(b1 + 2), ring(region1 - 2), ring(region1 + 3), ring(hollows - 3)], `${b}°`).toEqual([0, 1, 2, 2, 3, 3]);
    }
  });

  it('ends past the Hollows in a cliff edge: solid out to the Emberworks past it but for its ramps (060), ragged inward, never a straight line', () => {
    // 060: and its Slag River's slag, which runs into it.
    const ramps = new Set([...EMBERWORKS.ramps.flatMap((r) => rampTiles(r)), ...SLAG_RIVER_TILES].map(tileKey));
    for (let ty = 0; ty < size; ty++) {
      for (let tx = 0; tx < size; tx++) {
        const d = fromCentre(tx, ty);
        if (d > hollows && d < hollows + EMBERWORKS.wall && !ramps.has(`${tx},${ty}`)) expect(at(tx, ty), `${tx},${ty}`).toBe(TILE.cliff);
      }
    }
    // Ragged: inside the outer circle some edge tiles are cliff and some open.
    const band = room.rows.flatMap((row, ty) => [...row].map((s, tx) => ({ s, d: fromCentre(tx, ty) }))).filter((t) => t.d > hollows - 1 && t.d <= hollows);
    expect(band.some((t) => t.s === TILE.cliff)).toBe(true);
    expect(band.some((t) => t.s !== TILE.cliff)).toBe(true);
  });

  it('is the same for the same seed and different for another', () => {
    expect(generateOverworld(OVERWORLD.seed).rows).toEqual(room.rows);
    expect(generateOverworld(OVERWORLD.seed + 1).rows).not.toEqual(room.rows);
  });
});

describe('the barrier (053.2)', () => {
  it('is a closed band on the whole circle between the regions: no way round it while shut', () => {
    expect(HOLLOWS.gate.length).toBeGreaterThan(2 * Math.PI * region1);
    for (const t of HOLLOWS.gate) expect(onBarrier(t.tx, t.ty)).toBe(true);
    // Walk from the wake tile with every gate tile solid: nothing past the band is reached.
    const gate = new Set(HOLLOWS.gate.map(tileKey));
    const shut = { ...room, rows: room.rows.map((row, ty) => [...row].map((s, tx) => (gate.has(`${tx},${ty}`) ? TILE.wall : s)).join('')) };
    for (const key of reachable(shut, OVERWORLD.wake)) {
      const [tx = 0, ty = 0] = key.split(',').map(Number);
      expect(fromCentre(tx, ty), key).toBeLessThan(region1);
    }
  });

  it('is open ground underneath, gated `hollows` in the world', () => {
    for (const t of HOLLOWS.gate) expect(WALKABLE, tileKey(t)).toContain(at(t.tx, t.ty));
    const gates = (WORLD[OVERWORLD.id]?.gateTiles ?? []).filter((g) => g.gate === 'hollows');
    expect(gates).toHaveLength(HOLLOWS.gate.length);
  });

  it('stops the player anywhere on the circle while shut, and lets them through once it falls', () => {
    const s = arena();
    // On the south road, a few tiles inside the circle; then walk straight out (south) long enough to cross it.
    const road = OVERWORLD.paths[0] ?? [];
    const p = road.find((t) => fromCentre(t.tx + 1, t.ty + 1) > region1 - 4) ?? centre;
    movePlayer(s, (Math.round(p.tx) + 1) * 32, (Math.round(p.ty) + 1) * 32);
    s.gates.hollows = false;
    const out = { moveY: 1 as const };
    run(s, 240, out);
    expect(fromCentre(s.player.x / 32, s.player.y / 32)).toBeLessThan(region1);
    s.gates.hollows = true;
    run(s, 240, out);
    expect(fromCentre(s.player.x / 32, s.player.y / 32)).toBeGreaterThan(region1);
  });

  it("names a crossing tile on the band, on the Cistern Terrace's road", () => {
    expect(onBarrier(HOLLOWS.crossing.tx, HOLLOWS.crossing.ty)).toBe(true);
    expect(at(HOLLOWS.crossing.tx, HOLLOWS.crossing.ty)).toBe(TILE.floor);
    const nearRoad = [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => at(HOLLOWS.crossing.tx + dx, HOLLOWS.crossing.ty + dy) === TILE.path));
    expect(nearRoad).toBe(true);
    expect(inHollows(HOLLOWS.start.tx, HOLLOWS.start.ty)).toBe(true);
    expect(at(HOLLOWS.start.tx, HOLLOWS.start.ty)).toBe(TILE.path);
  });
});

describe('places on the circle', () => {
  const mid = (r: { x0: number; y0: number; x1: number; y1: number }) => ({ tx: (r.x0 + r.x1) / 2, ty: (r.y0 + r.y1) / 2 });

  it("puts the Warden's shrine wholly in one quadrant (the north-east)", () => {
    const a = OVERWORLD.shrine.area;
    expect(a.x0).toBeGreaterThan(centre.tx);
    expect(a.y1).toBeLessThan(centre.ty);
  });

  it("puts the Bulwark's forum wholly in the Hollows' ring", () => {
    const b = HOLLOWS.arena.bounds;
    for (const [tx, ty] of [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]] as const) {
      expect(inHollows(tx, ty)).toBe(true);
      expect(fromCentre(tx, ty)).toBeLessThan(hollows - HOLLOWS.edge.ragged);
    }
  });

  it('spreads the pylons and landmarks round the circle: every quadrant of Region 1 holds a pylon', () => {
    const pylons = (WORLD[OVERWORLD.id]?.pylons ?? []).filter((p) => !inHollows(p.tx, p.ty));
    for (let q = 0; q < 4; q++) expect(pylons.some((p) => Math.floor(bearingOf(p.tx, p.ty) / 90) === q), `quadrant ${q}`).toBe(true);
    const places = [...LANDMARK_LIST.filter((l) => l.ring !== 3).map((l) => l.area), OVERWORLD.shrine.area].map((a) => bearingOf(mid(a).tx, mid(a).ty));
    for (let q = 0; q < 4; q++) expect(places.some((b) => Math.floor(b / 90) === q), `quadrant ${q}`).toBe(true);
  });

  it('can reach every landmark, pylon, spring, node, guard and arena on foot from the wake tile, the barrier down', () => {
    const seen = all();
    const has = (t: { tx: number; ty: number }) => seen.has(tileKey(t));
    for (const p of OVERWORLD.packs) expect(has(p), `${p.enemyId} at ${tileKey(p)}`).toBe(true);
    for (const n of OVERWORLD.nodes) expect(has({ tx: n.tx, ty: n.ty + 1 }), `${n.nodeId} at ${tileKey(n)}`).toBe(true);
    for (const p of WORLD[OVERWORLD.id]?.pylons ?? []) expect(has({ tx: p.tx, ty: p.ty + 1 }), p.site).toBe(true);
    for (const s of OVERWORLD.springs) expect(has(s), s.id).toBe(true);
    expect(has(HOLLOWS.arena.start)).toBe(true);
    expect(has(HOLLOWS.arena.door.leaveTo)).toBe(true);
    expect(has({ tx: HOLLOWS.arena.altar.tx, ty: HOLLOWS.arena.altar.ty + 1 })).toBe(true);
    expect(has(SHRINE_ARENA.door.enterTo)).toBe(true);
  });

  it('can reach every Region 1 site, pylon, node, spring and guard from the wake tile with the barrier shut', () => {
    const gate = new Set(HOLLOWS.gate.map(tileKey));
    const shut = { ...room, rows: room.rows.map((row, ty) => [...row].map((s, tx) => (gate.has(`${tx},${ty}`) ? TILE.wall : s)).join('')) };
    const seen = reachable(shut, OVERWORLD.wake);
    const has = (t: { tx: number; ty: number }) => seen.has(tileKey(t));
    const inside = (t: { tx: number; ty: number }) => fromCentre(t.tx, t.ty) < region1 - 1;
    for (const p of OVERWORLD.packs.filter(inside)) expect(has(p), `${p.enemyId} at ${tileKey(p)}`).toBe(true);
    for (const n of OVERWORLD.nodes.filter(inside)) expect(has({ tx: n.tx, ty: n.ty + 1 }), `${n.nodeId} at ${tileKey(n)}`).toBe(true);
    const pylons = (room.pylons ?? []).filter(inside);
    expect(pylons.length).toBeGreaterThan(0);
    for (const p of pylons) expect(has({ tx: p.tx, ty: p.ty + 1 }), p.site).toBe(true);
    for (const s of OVERWORLD.springs.filter(inside)) expect(has(s), s.id).toBe(true);
    for (const l of LANDMARK_LIST.filter((l) => l.ring < 3)) expect(has(l.pylon ? { tx: l.pylon.tx, ty: l.pylon.ty + 1 } : { tx: Math.floor(mid(l.area).tx), ty: Math.floor(mid(l.area).ty) }), l.id).toBe(true);
    expect(has(SHRINE_ARENA.door.enterTo)).toBe(true);
  });

  it('leaves most of the open Hollows reachable, and no pocket of Region 1 cut off but behind landmark walls', () => {
    const seen = all();
    let open = 0;
    let got = 0;
    for (let ty = 0; ty < size; ty++) {
      for (let tx = 0; tx < size; tx++) {
        const s = at(tx, ty);
        if (s === undefined || !WALKABLE.includes(s)) continue;
        open++;
        if (seen.has(`${tx},${ty}`)) got++;
      }
    }
    expect(got / open).toBeGreaterThan(0.97);
  });
});
