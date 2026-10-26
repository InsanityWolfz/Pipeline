import { describe, expect, it } from 'vitest';
import { EMBERWORKS, EMBERWORKS_GATE, inEmberworks, rampTiles } from '../../src/data/emberworks';
import { SLAG_RIVER_TILES } from '../../src/data/emberworksSites';
import { STORMCROWN, stormRampTiles } from '../../src/data/stormcrown';
import { HOLLOWS, inHollows, regionAt } from '../../src/data/hollows';
import { RING_XP } from '../../src/data/leveling';
import { OVERWORLD, ringOf } from '../../src/data/overworld';
import { HOLLOWS_START } from '../../src/data/playtest';
import { RING_SCALE } from '../../src/data/ringScale';
import { TILE, WALKABLE } from '../../src/data/rooms';
import { fromCentre, polar, WORLD_SHAPE } from '../../src/data/worldShape';
import { createEnemy } from '../../src/sim/enemies';
import { generateOverworld } from '../../src/sim/overworldGen';
import { createSim } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { reachable, tileKey } from '../fixtures/reach';
import { arena, die, fireAt, hold, movePlayer, run, runUntil } from './fight';

// The Emberworks (060): the third ring, from the Hollows' cliff edge out to about 110 tiles, danger ring 4 and region 3,
// up a few ramps through the cliffs, each sealed at its top by the `emberworks` ley barrier until the Bulwark's first
// kill. Its terrain is generated from the map's seed; past it the ground rises into a ragged cliff edge.

const room = generateOverworld();
const at = (tx: number, ty: number): string | undefined => room.rows[ty]?.[tx];
const { inner, outer } = EMBERWORKS.radii;

describe('the ring', () => {
  it('runs from the Hollows’ outer radius out to about 110 tiles, as wide as the Hollows', () => {
    expect(inner).toBe(WORLD_SHAPE.hollows);
    expect(outer).toBe(WORLD_SHAPE.emberworks);
    expect(outer - inner).toBe(HOLLOWS.radii.outer - HOLLOWS.radii.inner);
    expect(WORLD_SHAPE.size).toBeGreaterThanOrEqual(2 * (outer + EMBERWORKS.edge.ragged));
  });

  it('is danger ring 4 and region 3 anywhere in it past its barrier; the Hollows’ ground stops at its edge', () => {
    for (let b = 0; b < 360; b += 15) {
      // 064: past `outer` is the Stormcrown's cliff edge, still ring 4 and region 3 to its barrier, in the Stormcrown's look (tests/sim/stormcrown.test.ts).
      for (const r of [EMBERWORKS.ramp.gateAt + 1, (inner + outer) / 2, outer - 1, outer + 1]) {
        const t = polar(b, r);
        expect(ringOf(t.tx, t.ty), `${b}° ${r}`).toBe(4);
        expect(regionAt(t.tx, t.ty), `${b}° ${r}`).toBe(3);
        expect(inHollows(t.tx, t.ty), `${b}° ${r}`).toBe(false);
        expect(inEmberworks(t.tx, t.ty), `${b}° ${r}`).toBe(r < outer);
      }
      const h = polar(b, inner - 1);
      expect([ringOf(h.tx, h.ty), regionAt(h.tx, h.ty), inHollows(h.tx, h.ty), inEmberworks(h.tx, h.ty)]).toEqual([3, 2, true, false]);
    }
    expect(EMBERWORKS.ring).toBe(4);
    expect(EMBERWORKS.region).toBe(3);
  });

  it('starts its ring and region at its barrier’s circle, not the ramps’ feet: below it is still the Hollows’ ring 3 and region 2', () => {
    const { gateAt } = EMBERWORKS.ramp;
    expect(gateAt).toBeGreaterThan(inner);
    for (let ty = 0; ty < WORLD_SHAPE.size; ty++) {
      for (let tx = 0; tx < WORLD_SHAPE.size; tx++) {
        const d = fromCentre(tx, ty);
        if (d >= inner - 1 && d <= gateAt + 2) expect([ringOf(tx, ty), regionAt(tx, ty)], `${tx},${ty}`).toEqual(d >= gateAt ? [4, 3] : [3, 2]);
      }
    }
    for (const r of EMBERWORKS.ramps) {
      const tiles = rampTiles(r);
      const below = tiles.filter((t) => fromCentre(t.tx, t.ty) < gateAt);
      expect(below.some((t) => fromCentre(t.tx, t.ty) >= inner), r.id).toBe(true);
      for (const t of below) expect([ringOf(t.tx, t.ty), regionAt(t.tx, t.ty)], `${r.id} ${t.tx},${t.ty}`).toEqual([3, 2]);
      for (const t of tiles.filter((x) => fromCentre(x.tx, x.ty) >= gateAt)) expect([ringOf(t.tx, t.ty), regionAt(t.tx, t.ty)], `${r.id} ${t.tx},${t.ty}`).toEqual([4, 3]);
    }
  });

  it('multiplies health and damage ×4 and kill XP ×4', () => {
    expect(RING_SCALE[4]).toEqual({ health: 4, damage: 4 });
    expect(RING_XP[4]).toBe(4);
  });

  it('is generated the same every run, with ash ground, kilns and chimneys', () => {
    expect(generateOverworld(OVERWORLD.seed).rows).toEqual(room.rows);
    const symbols = new Set<string>();
    for (let ty = 0; ty < WORLD_SHAPE.size; ty++) for (let tx = 0; tx < WORLD_SHAPE.size; tx++) if (inEmberworks(tx, ty) && fromCentre(tx, ty) < outer) symbols.add(at(tx, ty) ?? '');
    for (const s of [TILE.floor, TILE.kiln, TILE.chimney, TILE.ramp]) expect(symbols, s).toContain(s);
  });

  it('has kilns and chimneys that stop feet and straight shots', () => {
    for (const s of [TILE.kiln, TILE.chimney]) expect(WALKABLE).not.toContain(s);
    expect(WALKABLE).toContain(TILE.ramp);
  });

  it('ends past its outer radius in a ragged cliff edge, never a bare wall (064: the Stormcrown past it, up its ramps)', () => {
    // 060 slice 3: the Slag River runs half a tile into it, solid to feet too.
    const river = new Set([...SLAG_RIVER_TILES, ...STORMCROWN.ramps.flatMap(stormRampTiles)].map(tileKey));
    const foot = STORMCROWN.radii.inner + STORMCROWN.wall;
    for (let ty = 0; ty < WORLD_SHAPE.size; ty++) for (let tx = 0; tx < WORLD_SHAPE.size; tx++) if (fromCentre(tx, ty) > outer && fromCentre(tx, ty) < foot && !river.has(`${tx},${ty}`)) expect(at(tx, ty), `${tx},${ty}`).toBe(TILE.cliff);
    for (const t of SLAG_RIVER_TILES) if (fromCentre(t.tx, t.ty) > outer) expect(t.symbol).toBe(TILE.slag);
    const band = room.rows.flatMap((row, ty) => [...row].map((s, tx) => ({ s, d: fromCentre(tx, ty) }))).filter((t) => t.d > outer - 1 && t.d <= outer);
    expect(band.some((t) => t.s === TILE.cliff)).toBe(true);
    expect(band.some((t) => t.s !== TILE.cliff)).toBe(true);
  });

  it('keeps the Hollows’ cliff edge solid between the rings but for its ramps (and the Slag River’s slag at its foot)', () => {
    const ramps = new Set(EMBERWORKS.ramps.flatMap((r) => rampTiles(r)).map(tileKey));
    for (const t of SLAG_RIVER_TILES) if (fromCentre(t.tx, t.ty) < inner + EMBERWORKS.wall) expect(t.symbol).toBe(TILE.slag);
    const river = new Set(SLAG_RIVER_TILES.map(tileKey));
    for (let ty = 0; ty < WORLD_SHAPE.size; ty++) {
      for (let tx = 0; tx < WORLD_SHAPE.size; tx++) {
        const d = fromCentre(tx, ty);
        if (d >= inner && d < inner + EMBERWORKS.wall && !ramps.has(`${tx},${ty}`) && !river.has(`${tx},${ty}`)) expect(at(tx, ty), `${tx},${ty}`).toBe(TILE.cliff);
      }
    }
    expect(EMBERWORKS.ramps.length).toBeGreaterThanOrEqual(2);
    for (const r of EMBERWORKS.ramps) for (const t of rampTiles(r)) expect(at(t.tx, t.ty), `${r.id} ${t.tx},${t.ty}`).toBe(TILE.ramp);
  });

  it("holds only the Forgewright in its hall, the Ash Kilns' guards and (061) its own packs", () => {
    const s = createSim(3, { start: HOLLOWS_START });
    s.populated = true;
    s.bossDefeats.push('bulwark');
    for (const r of EMBERWORKS.ramps) {
      const top = tileCentre(polar(r.bearing, outer - 12));
      movePlayer(s, top.x, top.y);
      run(s, 300);
    }
    const ring4 = s.enemies.filter((e) => e.roomId === OVERWORLD.id && ringOf(Math.floor(e.x / 32), Math.floor(e.y / 32)) === 4);
    expect(ring4.filter((e) => e.enemyId === 'forgewright').map((e) => e.group)).toEqual(['anvil-hall']);
    for (const e of ring4.filter((x) => x.enemyId !== 'forgewright')) expect(e.group === 'ash-kilns' || e.group.startsWith('pop-4-'), e.group).toBe(true);
    expect(s.population.slots.filter((p) => p.ring === 4).length).toBe(12);
    expect(ring4.some((e) => e.group.startsWith('pop-4-'))).toBe(true);
  });
});

describe('reaching it', () => {
  const gate = new Set(EMBERWORKS_GATE.map(tileKey));
  const shut = { ...room, rows: room.rows.map((row, ty) => [...row].map((s, tx) => (gate.has(`${tx},${ty}`) ? TILE.wall : s)).join('')) };

  it('seals the top of every ramp: nothing past the Hollows but the ramps’ feet is reached while shut', () => {
    const ramps = new Set(EMBERWORKS.ramps.flatMap((r) => rampTiles(r)).map(tileKey));
    for (const key of reachable(shut, OVERWORLD.wake)) {
      const [tx = 0, ty = 0] = key.split(',').map(Number);
      expect(fromCentre(tx, ty) < inner || (ramps.has(key) && fromCentre(tx, ty) < EMBERWORKS.ramp.gateAt), key).toBe(true);
      // So "Reach the Emberworks" (region 3) and ring 4 are never reached while shut.
      expect(ringOf(tx, ty), key).not.toBe(EMBERWORKS.ring);
      expect(regionAt(tx, ty), key).not.toBe(EMBERWORKS.region);
    }
    for (const r of EMBERWORKS.ramps) expect(EMBERWORKS_GATE.some((t) => rampTiles(r).some((x) => x.tx === t.tx && x.ty === t.ty)), r.id).toBe(true);
  });

  it('reaches every open Emberworks tile from each ramp once the barrier is down', () => {
    const open = room.rows.flatMap((row, ty) => [...row].flatMap((s, tx) => (inEmberworks(tx, ty) && WALKABLE.includes(s) ? [`${tx},${ty}`] : [])));
    for (const r of EMBERWORKS.ramps) {
      const foot = rampTiles(r).reduce((a, b) => (fromCentre(a.tx, a.ty) < fromCentre(b.tx, b.ty) ? a : b));
      const from = reachable(room, foot);
      const unreached = open.filter((k) => !from.has(k));
      // A walkable tile walled in by kilns or the ragged edge may be cut off; no more than a few of the ring's tiles.
      expect(unreached.length / open.length, r.id).toBeLessThan(0.01);
    }
    expect(reachable(room, OVERWORLD.wake).has(tileKey(polar(EMBERWORKS.ramps[0]?.bearing ?? 0, outer - 10)))).toBe(true);
  });
});

describe('the barrier (060)', () => {
  const ramp = EMBERWORKS.ramps[0];
  if (!ramp) throw new Error('no ramp');
  /** Below the gate on the ramp's centre line, and above it. */
  const BELOW = tileCentre(polar(ramp.bearing, EMBERWORKS.ramp.gateAt - 3));
  const ABOVE = tileCentre(polar(ramp.bearing, EMBERWORKS.ramp.gateAt + 4));
  const gateR = EMBERWORKS.ramp.gateAt * 32;
  const out = (p: { x: number; y: number }): number => Math.hypot(p.x - (WORLD_SHAPE.centre.tx + 0.5) * 32, p.y - (WORLD_SHAPE.centre.ty + 0.5) * 32);
  /** One step outward along the ramp, as a command. */
  const up = { moveX: Math.sign(ABOVE.x - BELOW.x) as -1 | 0 | 1, moveY: Math.sign(ABOVE.y - BELOW.y) as -1 | 0 | 1 };

  const hollows = () => {
    const s = createSim(3, { start: HOLLOWS_START });
    s.enemies = s.enemies.filter((e) => e.enemyId === 'bulwark');
    movePlayer(s, BELOW.x, BELOW.y);
    return s;
  };

  it('is shut on every start, and reported', () => {
    expect(createSim(1).gates.emberworks).toBe(false);
    expect(createSim(1, { start: HOLLOWS_START }).gates.emberworks).toBe(false);
    expect(summarize(createSim(1)).gates).toEqual({ foundry: true, shrine: true, hollows: false, emberworks: false, stormcrown: false });
  });

  it('blocks the player walking up the ramp', () => {
    const s = hollows();
    run(s, 240, up);
    expect(out(s.player)).toBeLessThan(gateR);
  });

  it('blocks enemies walking down out of it', () => {
    const s = hollows();
    const e = createEnemy(s.nextEnemyId++, 'husk', ABOVE, s.roomId);
    s.enemies.push(e);
    run(s, 240);
    expect(out(e)).toBeGreaterThan(gateR);
  });

  it('stops arrows and bombs at its tiles', () => {
    const s = hollows();
    s.inventory = { ...s.inventory, arrow: 5 };
    hold(s, 'arrow');
    run(s, 1, fireAt(ABOVE.x + (ABOVE.x - BELOW.x) * 4, ABOVE.y + (ABOVE.y - BELOW.y) * 4));
    let last = { x: BELOW.x, y: BELOW.y };
    runUntil(s, () => {
      const a = s.arrows[0];
      if (a) last = { x: a.x, y: a.y };
      return s.arrows.length === 0;
    }, 90);
    expect(out(last)).toBeLessThan(gateR + 32);
    const b = hollows();
    b.inventory = { bomb: 1 };
    hold(b, 'bomb');
    run(b, 1, fireAt(ABOVE.x, ABOVE.y));
    runUntil(b, () => b.events.bursts.length > 0, 120);
    const burst = b.events.bursts[0];
    expect(burst && out(burst)).toBeLessThan(gateR + 32);
  });

  it('opens on the Bulwark’s first kill, with its gate event, and lets the player up the ramp', () => {
    const s = hollows();
    const boss = s.enemies.find((e) => e.enemyId === 'bulwark');
    if (!boss) throw new Error('no Bulwark');
    expect(s.gates.emberworks).toBe(false);
    boss.health = 0;
    runUntil(s, () => s.bossDefeats.includes('bulwark'), 120);
    run(s, 1);
    expect(s.gates.emberworks).toBe(true);
    movePlayer(s, BELOW.x, BELOW.y);
    run(s, 240, up);
    expect(out(s.player)).toBeGreaterThan(gateR + 32);
    expect(summarize(s).area).toMatchObject({ ring: 4, region: 3 });
  });

  it('opens on nothing else: claims and other bosses leave it shut', () => {
    const s = createSim(3, { start: HOLLOWS_START });
    s.claims.push('cistern-terrace');
    s.bossDefeats.push('pylon-warden');
    run(s, 2);
    expect(s.gates.emberworks).toBe(false);
  });

  it('never comes back: a KO keeps it down', () => {
    const s = arena();
    s.bossDefeats.push('bulwark');
    run(s, 1);
    expect(s.events.gates).toEqual([{ gate: 'emberworks' }]);
    die(s);
    run(s, 1);
    expect(s.gates.emberworks).toBe(true);
    expect(s.events.gates).toEqual([]);
  });
});
