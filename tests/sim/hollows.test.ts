import { describe, expect, it } from 'vitest';
import { HOLLOWS, inHollows, regionAt } from '../../src/data/hollows';
import { fromCentre, polar, WORLD_SHAPE } from '../../src/data/worldShape';
import { LANDMARK_LIST } from '../../src/data/landmarks';
import { OVERWORLD, ringOf } from '../../src/data/overworld';
import { TILE, WALKABLE } from '../../src/data/rooms';
import { blocksShot, isSolid } from '../../src/sim/collision';
import { generateOverworld } from '../../src/sim/overworldGen';
import { summarize } from '../../src/sim/summary';
import { reachable, tileKey } from '../fixtures/reach';
import { arena, fireAt, hold, movePlayer, run, runUntil } from './fight';
import { tileCentre } from '../../src/sim/tiles';

// Stonefall Hollows (034): a region generated from the fixed seed with its own settings. Since 053 it is the ring round
// Region 1 (tests/sim/roundWorld.test.ts has the shape), opened by the barrier on the whole circle between them.

const room = generateOverworld();
const at = (tx: number, ty: number): string | undefined => room.rows[ty]?.[tx];
const { inner, outer } = HOLLOWS.radii;
/** Every tile of the ring itself (not the cliff edge past it). */
const RING = room.rows.flatMap((row, ty) => [...row].map((s, tx) => ({ s, tx, ty }))).filter((t) => fromCentre(t.tx, t.ty) >= inner && fromCentre(t.tx, t.ty) < outer);

describe('the map', () => {
  it('is generated the same every run, and the Hollows differ for another seed', () => {
    expect(generateOverworld().rows).toEqual(room.rows);
    const other = generateOverworld(OVERWORLD.seed + 1);
    expect(RING.some((t) => other.rows[t.ty]?.[t.tx] !== t.s)).toBe(true);
  });

  it('is grey-blue stone with cliff runs, rubble and quarry-cut terraces, and no trees', () => {
    const count = (s: string) => RING.filter((t) => t.s === s).length;
    expect(count(TILE.cliff)).toBeGreaterThan(200);
    expect(count(TILE.rock)).toBeGreaterThan(100);
    expect(count(TILE.terrace)).toBeGreaterThan(50);
    expect(count(TILE.tree)).toBe(0);
  });

  it('has broken aqueduct spans: solid pillars and fallen sections, walkable gaps under the arches', () => {
    expect([...room.rows.join('')].filter((c) => c === TILE.pillar).length).toBeGreaterThan(8);
    for (const symbol of [TILE.cliff, TILE.pillar, TILE.fallen]) {
      expect(isSolid({ ...room, rows: [symbol] }, 0, 0), symbol).toBe(true);
      expect(blocksShot({ ...room, rows: [symbol] }, 0, 0), symbol).toBe(true);
    }
    for (const symbol of [TILE.arch, TILE.terrace]) {
      expect(WALKABLE).toContain(symbol);
      expect(blocksShot({ ...room, rows: [symbol] }, 0, 0), symbol).toBe(false);
    }
  });

  it('keeps generated cliffs and rubble off the roads through it, and the barrier is gated `hollows` all round', () => {
    for (const road of OVERWORLD.paths) {
      for (const p of road) {
        const t = { tx: Math.round(p.tx), ty: Math.round(p.ty) };
        if (inHollows(t.tx, t.ty)) expect(WALKABLE, tileKey(t)).toContain(at(t.tx, t.ty));
      }
    }
    expect(room.gateTiles?.filter((g) => g.gate === 'hollows').map(({ tx, ty }) => ({ tx, ty }))).toEqual(HOLLOWS.gate);
  });
});

describe('rings and regions', () => {
  it('ring 3 and Region 2 anywhere in the Hollows, whatever the distance; Region 1 keeps its rings', () => {
    for (const t of RING) {
      expect(ringOf(t.tx, t.ty)).toBe(3);
      expect(regionAt(t.tx, t.ty)).toBe(2);
      expect(inHollows(t.tx, t.ty)).toBe(true);
    }
    const inside = polar(250, WORLD_SHAPE.region1 - 1);
    expect(ringOf(inside.tx, inside.ty)).toBe(2);
    expect(regionAt(inside.tx, inside.ty)).toBe(1);
    const e = OVERWORLD.rings.centre;
    expect(ringOf(e.tx, e.ty)).toBe(0);
  });

  it('are in the summary', () => {
    const s = arena();
    expect(summarize(s).area).toMatchObject({ ring: 0, region: 1 });
    const inside = tileCentre(HOLLOWS.start);
    movePlayer(s, inside.x, inside.y);
    expect(summarize(s).area).toMatchObject({ ring: 3, region: 2 });
  });
});

describe('cliffs against shots', () => {
  it('stop arrows, while a bomb lands beyond them', () => {
    const s = arena();
    s.gates.hollows = true;
    // The Cut's quarry face, from the south (034's tiles moved by 053: +96 rows; 060 and 064: +31, +31 each).
    const below = tileCentre({ tx: 87, ty: 165 });
    movePlayer(s, below.x, below.y);
    run(s, 1, fireAt(below.x, 0));
    let lastY = below.y;
    runUntil(s, () => {
      lastY = s.arrows[0]?.y ?? lastY;
      return s.arrows.length === 0;
    }, 60);
    expect(lastY).toBeGreaterThanOrEqual(163 * 32 - 8);
    // A bomb over the aqueduct's fallen span lands on its far side (moved by 053: +65, +126; 060 and 064: +31, +31 each).
    const s2 = arena(undefined, tileCentre({ tx: 133, ty: 211 }));
    s2.gates.hollows = true;
    s2.inventory = { bomb: 1 };
    hold(s2, 'bomb');
    run(s2, 1, fireAt(tileCentre({ tx: 133, ty: 205 }).x, tileCentre({ tx: 133, ty: 205 }).y));
    runUntil(s2, () => s2.events.bursts.length > 0, 120);
    expect(s2.events.bursts[0]?.y).toBeLessThan(207 * 32);
  });
});

describe('reachability', () => {
  it('reaches every Hollows landmark, node, guard, the pylon, the altar and the forum on foot from the barrier', () => {
    const seen = reachable(room, HOLLOWS.start);
    const hollows = LANDMARK_LIST.filter((l) => l.ring === 3);
    expect(hollows.map((l) => l.id).sort()).toEqual(['broken-aqueduct', 'cistern-terrace', 'hollows-spring', 'ley-iron-cut']);
    for (const l of hollows) {
      for (const g of l.guards) expect(seen.has(tileKey(g)), `${l.id} guard ${tileKey(g)}`).toBe(true);
      for (const t of [...l.nodes, ...(l.pylon ? [l.pylon] : [])]) expect(seen.has(tileKey({ tx: t.tx, ty: t.ty + 1 })), `${l.id} ${tileKey(t)}`).toBe(true);
    }
    for (const n of HOLLOWS.nodes) expect(seen.has(tileKey({ tx: n.tx, ty: n.ty + 1 })), tileKey(n)).toBe(true);
    const a = HOLLOWS.arena;
    expect(seen.has(tileKey(a.start))).toBe(true);
    expect(seen.has(tileKey({ tx: a.altar.tx + 1, ty: a.altar.ty }))).toBe(true);
    // And from Region 1's wake tile, across the barrier's band.
    expect(reachable(room, OVERWORLD.wake).has(tileKey(a.start))).toBe(true);
  });

  it("puts the forum's one wide way in on its north side, and the boss's start and the altar inside it", () => {
    const a = HOLLOWS.arena;
    const inside = (t: { tx: number; ty: number }) => t.tx >= a.inside.x0 && t.tx <= a.inside.x1 && t.ty >= a.inside.y0 && t.ty <= a.inside.y1;
    expect(inside(a.start)).toBe(true);
    expect(inside(a.altar)).toBe(true);
    const open: number[] = [];
    for (let tx = a.bounds.x0; tx <= a.bounds.x1; tx++) if (!isSolid(room, tx, a.bounds.y0)) open.push(tx);
    // 055: the way in is a door now, part of the wall.
    expect(open).toEqual([]);
    expect(a.door.tiles).toHaveLength(5);
    for (let ty = a.bounds.y0 + 1; ty <= a.bounds.y1; ty++) {
      expect(isSolid(room, a.bounds.x0, ty)).toBe(true);
      expect(isSolid(room, a.bounds.x1, ty)).toBe(true);
    }
    for (let tx = a.bounds.x0; tx <= a.bounds.x1; tx++) expect(isSolid(room, tx, a.bounds.y1)).toBe(true);
    expect(room.altars?.[0]).toEqual({ id: a.altar.id, tx: a.altar.tx, ty: a.altar.ty, boss: 'bulwark' });
  });
});
