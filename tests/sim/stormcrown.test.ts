import { describe, expect, it } from 'vitest';
import { EMBERWORKS, inEmberworks } from '../../src/data/emberworks';
import { SLAG_RIVER_TILES } from '../../src/data/emberworksSites';
import { SKY_CHASM_TILES } from '../../src/data/stormcrownSites';
import { regionAt } from '../../src/data/hollows';
import { RING_XP } from '../../src/data/leveling';
import { OVERWORLD, ringOf } from '../../src/data/overworld';
import { HOLLOWS_START } from '../../src/data/playtest';
import { RING_SCALE } from '../../src/data/ringScale';
import { SHOT_THROUGH, TILE, WALKABLE } from '../../src/data/rooms';
import { inStormcrown, STORMCROWN, STORMCROWN_GATE, stormRampTiles } from '../../src/data/stormcrown';
import { fromCentre, polar, WORLD_SHAPE } from '../../src/data/worldShape';
import { createEnemy } from '../../src/sim/enemies';
import { generateOverworld } from '../../src/sim/overworldGen';
import { createSim } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { reachable, tileKey } from '../fixtures/reach';
import { arena, die, fireAt, hold, movePlayer, run, runUntil } from './fight';

// The Stormcrown (064): the fifth ring, from the Emberworks' cliff edge out to about 141 tiles, danger ring 5 (×10) and
// region 4, up a few ramps through the cliffs, each sealed at its top by the `stormcrown` ley barrier until the
// Forgewright's first kill. Its terrain is generated from the map's seed; past it a final ragged cliff edge.

const room = generateOverworld();
const at = (tx: number, ty: number): string | undefined => room.rows[ty]?.[tx];
const { inner, outer } = STORMCROWN.radii;

describe('the ring', () => {
  it('runs from the Emberworks’ outer radius out to about 141 tiles, as wide as the Emberworks', () => {
    expect(inner).toBe(EMBERWORKS.radii.outer);
    expect(outer).toBe(141);
    expect(outer - inner).toBe(EMBERWORKS.radii.outer - EMBERWORKS.radii.inner);
    expect(WORLD_SHAPE.size).toBeGreaterThanOrEqual(2 * (outer + STORMCROWN.edge.ragged));
  });

  it('is danger ring 5 and region 4 anywhere past its barrier; the Emberworks’ ground stops at its edge', () => {
    for (let b = 0; b < 360; b += 15) {
      for (const r of [STORMCROWN.ramp.gateAt + 1, (inner + outer) / 2, outer - 1, outer + 2]) {
        const t = polar(b, r);
        expect([ringOf(t.tx, t.ty), regionAt(t.tx, t.ty), inEmberworks(t.tx, t.ty), inStormcrown(t.tx, t.ty)], `${b}° ${r}`).toEqual([5, 4, false, true]);
      }
      const e = polar(b, inner - 1);
      expect([ringOf(e.tx, e.ty), regionAt(e.tx, e.ty), inEmberworks(e.tx, e.ty), inStormcrown(e.tx, e.ty)]).toEqual([4, 3, true, false]);
    }
    expect([STORMCROWN.ring, STORMCROWN.region]).toEqual([5, 4]);
  });

  it('starts its ring and region at its barrier’s circle (060’s rule): a ramp’s foot below it is still the Emberworks’', () => {
    const { gateAt } = STORMCROWN.ramp;
    for (const r of STORMCROWN.ramps) {
      const tiles = stormRampTiles(r);
      for (const t of tiles) expect([ringOf(t.tx, t.ty), regionAt(t.tx, t.ty)], `${r.id} ${t.tx},${t.ty}`).toEqual(fromCentre(t.tx, t.ty) >= gateAt ? [5, 4] : [4, 3]);
      expect(tiles.some((t) => fromCentre(t.tx, t.ty) < inner)).toBe(true);
    }
  });

  it('multiplies health and damage ×10 and kill XP ×10 (Shaun)', () => {
    expect(RING_SCALE[5]).toEqual({ health: 10, damage: 10 });
    expect(RING_XP[5]).toBe(10);
  });

  it('is generated the same every run, with slate ground, iron rods, cairns and chasms', () => {
    expect(generateOverworld(OVERWORLD.seed).rows).toEqual(room.rows);
    const symbols = new Set<string>();
    for (let ty = 0; ty < WORLD_SHAPE.size; ty++) for (let tx = 0; tx < WORLD_SHAPE.size; tx++) if (inStormcrown(tx, ty) && fromCentre(tx, ty) < outer) symbols.add(at(tx, ty) ?? '');
    for (const s of [TILE.floor, TILE.ironRod, TILE.cairn, TILE.chasm, TILE.ramp]) expect(symbols, s).toContain(s);
  });

  it('has rods and cairns that stop feet and straight shots, and chasms that stop feet only', () => {
    for (const s of [TILE.ironRod, TILE.cairn, TILE.chasm]) expect(WALKABLE).not.toContain(s);
    expect(SHOT_THROUGH).toContain(TILE.chasm);
    for (const s of [TILE.ironRod, TILE.cairn]) expect(SHOT_THROUGH).not.toContain(s);
  });

  it('ends past its outer radius in a ragged cliff edge out to the grid’s edge, never a bare wall', () => {
    for (let ty = 0; ty < WORLD_SHAPE.size; ty++) for (let tx = 0; tx < WORLD_SHAPE.size; tx++) if (fromCentre(tx, ty) > outer + 1) expect(at(tx, ty), `${tx},${ty}`).toBe(TILE.cliff);
    const band = room.rows.flatMap((row, ty) => [...row].map((s, tx) => ({ s, d: fromCentre(tx, ty) }))).filter((t) => t.d > outer - 1 && t.d <= outer);
    expect(band.some((t) => t.s === TILE.cliff)).toBe(true);
    expect(band.some((t) => t.s !== TILE.cliff)).toBe(true);
  });

  it('keeps the Emberworks’ cliff edge solid between the rings but for its ramps (and the Slag River’s end, 060, and the Sky-bridge’s chasm’s)', () => {
    const ramps = new Set([...STORMCROWN.ramps.flatMap(stormRampTiles), ...SLAG_RIVER_TILES, ...SKY_CHASM_TILES].map(tileKey));
    for (let ty = 0; ty < WORLD_SHAPE.size; ty++) {
      for (let tx = 0; tx < WORLD_SHAPE.size; tx++) {
        const d = fromCentre(tx, ty);
        if (d >= inner && d < inner + STORMCROWN.wall && !ramps.has(`${tx},${ty}`)) expect(at(tx, ty), `${tx},${ty}`).toBe(TILE.cliff);
      }
    }
    expect(STORMCROWN.ramps.length).toBe(3);
    for (const r of STORMCROWN.ramps) for (const t of stormRampTiles(r)) expect(at(t.tx, t.ty), `${r.id} ${t.tx},${t.ty}`).toBe(TILE.ramp);
  });

  it('has no packs while its barrier stands (065 fills ring 5 once it falls: stormcrownPacks.test.ts)', () => {
    const s = createSim(3, { start: HOLLOWS_START });
    s.populated = true;
    s.bossDefeats.push('bulwark');
    s.gates.emberworks = true;
    // Each slot is due at once (its `respawnAt` is 0), so a tick by each ramp's top would fill any that could fill.
    for (const r of STORMCROWN.ramps) {
      const top = tileCentre(polar(r.bearing, outer - 12));
      movePlayer(s, top.x, top.y);
      run(s, 2);
    }
    // 064: only the Conductor, in its spire (a boss, not a pack), and the Weathervane's guards (065).
    expect(s.gates.stormcrown).toBe(false);
    expect(s.enemies.filter((e) => e.roomId === OVERWORLD.id && e.ring === 5 && e.group !== 'weathervane').map((e) => [e.enemyId, e.group])).toEqual([['conductor', 'crown-spire']]);
    expect(s.enemies.some((e) => e.group.startsWith('pop-5-'))).toBe(false);
    expect(s.population.slots.filter((p) => p.ring === 5)).toHaveLength(12);
    // The same tick with the barrier down fills ring 5 at once.
    s.gates.stormcrown = true;
    run(s, 1);
    expect(s.enemies.some((e) => e.group.startsWith('pop-5-'))).toBe(true);
  });
});

describe('reaching it', () => {
  const gate = new Set(STORMCROWN_GATE.map(tileKey));
  const shut = { ...room, rows: room.rows.map((row, ty) => [...row].map((s, tx) => (gate.has(`${tx},${ty}`) ? TILE.wall : s)).join('')) };

  it('seals the top of every ramp: nothing past its barrier is reached while shut', () => {
    for (const key of reachable(shut, OVERWORLD.wake)) {
      const [tx = 0, ty = 0] = key.split(',').map(Number);
      expect(fromCentre(tx, ty) < STORMCROWN.ramp.gateAt, key).toBe(true);
      expect(ringOf(tx, ty), key).not.toBe(STORMCROWN.ring);
    }
    for (const r of STORMCROWN.ramps) expect(STORMCROWN_GATE.some((t) => stormRampTiles(r).some((x) => x.tx === t.tx && x.ty === t.ty)), r.id).toBe(true);
  });

  it('reaches every open Stormcrown tile from each ramp once the barrier is down', () => {
    const open = room.rows.flatMap((row, ty) => [...row].flatMap((s, tx) => (inStormcrown(tx, ty) && WALKABLE.includes(s) ? [`${tx},${ty}`] : [])));
    for (const r of STORMCROWN.ramps) {
      const foot = stormRampTiles(r).reduce((a, b) => (fromCentre(a.tx, a.ty) < fromCentre(b.tx, b.ty) ? a : b));
      const from = reachable(room, foot);
      const unreached = open.filter((k) => !from.has(k));
      // A walkable tile walled in by cairns, rods, chasms or the ragged edge may be cut off; no more than a few.
      expect(unreached.length / open.length, r.id).toBeLessThan(0.01);
    }
    for (const r of STORMCROWN.ramps) expect(reachable(room, OVERWORLD.wake).has(tileKey(stormRampTiles(r).reduce((a, b) => (fromCentre(a.tx, a.ty) < fromCentre(b.tx, b.ty) ? a : b)))), r.id).toBe(true);
  });
});

describe('the barrier (064)', () => {
  const ramp = STORMCROWN.ramps[0];
  if (!ramp) throw new Error('no ramp');
  const BELOW = tileCentre(polar(ramp.bearing, STORMCROWN.ramp.gateAt - 3));
  const ABOVE = tileCentre(polar(ramp.bearing, STORMCROWN.ramp.gateAt + 4));
  const gateR = STORMCROWN.ramp.gateAt * 32;
  const out = (p: { x: number; y: number }): number => Math.hypot(p.x - (WORLD_SHAPE.centre.tx + 0.5) * 32, p.y - (WORLD_SHAPE.centre.ty + 0.5) * 32);
  const up = { moveX: Math.sign(ABOVE.x - BELOW.x) as -1 | 0 | 1, moveY: Math.sign(ABOVE.y - BELOW.y) as -1 | 0 | 1 };

  /** Past the Bulwark, below the Stormcrown's barrier on its north-west ramp, the Forgewright alone left. */
  const emberworks = () => {
    const s = createSim(3, { start: HOLLOWS_START });
    s.bossDefeats.push('bulwark');
    s.enemies = s.enemies.filter((e) => e.enemyId === 'forgewright');
    run(s, 1);
    movePlayer(s, BELOW.x, BELOW.y);
    return s;
  };

  it('is shut on every start, and reported', () => {
    expect(createSim(1).gates.stormcrown).toBe(false);
    expect(createSim(1, { start: HOLLOWS_START }).gates.stormcrown).toBe(false);
    expect(summarize(createSim(1)).gates).toEqual({ foundry: true, shrine: true, hollows: false, emberworks: false, stormcrown: false });
  });

  it('blocks the player walking up the ramp, and enemies walking down', () => {
    const s = emberworks();
    run(s, 240, up);
    expect(out(s.player)).toBeLessThan(gateR);
    const e = createEnemy(s.nextEnemyId++, 'husk', ABOVE, s.roomId);
    s.enemies.push(e);
    run(s, 240);
    expect(out(e)).toBeGreaterThan(gateR);
  });

  it('stops arrows and bombs at its tiles', () => {
    const s = emberworks();
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
    const b = emberworks();
    b.inventory = { bomb: 1 };
    hold(b, 'bomb');
    run(b, 1, fireAt(ABOVE.x, ABOVE.y));
    runUntil(b, () => b.events.bursts.length > 0, 120);
    const burst = b.events.bursts[0];
    expect(burst && out(burst)).toBeLessThan(gateR + 32);
  });

  it('opens on the Forgewright’s first kill, with its gate event, and lets the player up the ramp', () => {
    const s = emberworks();
    const boss = s.enemies.find((e) => e.enemyId === 'forgewright');
    if (!boss) throw new Error('no Forgewright');
    boss.health = 0;
    runUntil(s, () => s.bossDefeats.includes('forgewright'), 120);
    run(s, 1);
    expect(s.gates.stormcrown).toBe(true);
    movePlayer(s, BELOW.x, BELOW.y);
    run(s, 240, up);
    expect(out(s.player)).toBeGreaterThan(gateR + 32);
    expect(summarize(s).area).toMatchObject({ ring: 5, region: 4 });
  });

  it('opens on nothing else, and never comes back: a KO keeps it down', () => {
    const s = createSim(3, { start: HOLLOWS_START });
    s.bossDefeats.push('bulwark', 'pylon-warden');
    run(s, 2);
    expect(s.gates.stormcrown).toBe(false);
    const k = arena();
    k.bossDefeats.push('forgewright');
    run(k, 1);
    expect(k.events.gates).toEqual([{ gate: 'stormcrown' }]);
    die(k);
    run(k, 1);
    expect(k.gates.stormcrown).toBe(true);
    expect(k.events.gates).toEqual([]);
  });
});
