import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../../src/data/config';
import { EMBERWORKS } from '../../src/data/emberworks';
import { HOLLOWS } from '../../src/data/hollows';
import { OVERWORLD_ROOM } from '../../src/data/overworld';
import { HOLLOWS_START } from '../../src/data/playtest';
import type { GateId, Room } from '../../src/data/rooms';
import { STORMCROWN } from '../../src/data/stormcrown';
import { fromCentre, polar } from '../../src/data/worldShape';
import { createEnemy } from '../../src/sim/enemies';
import { flyBox } from '../../src/sim/flight';
import { createSim, type SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { WORLD } from '../../src/sim/world';
import { movePlayer, run, runUntil } from './fight';

// Flight and the barriers (065, review B1): a shut gate's barrier "blocks the player, enemies and every projectile"
// (060), so a flier never crosses it either: not over its ramp's band, nor over the cliffs either side. Its line is
// the barrier's whole circle, where its ring starts. A flier whose player is beyond a shut barrier stays home.

const BOX = { w: 16, h: 8 };
const room = WORLD[OVERWORLD_ROOM] as Room;
const tileOf = (v: number): number => Math.floor(v / TILE_SIZE);
const rOf = (p: { x: number; y: number }): number => fromCentre(tileOf(p.x), tileOf(p.y));

/** Each ring barrier's radius, tiles: a flier can't cross it while its gate is shut. */
const BARRIERS: [GateId, number][] = [
  ['hollows', HOLLOWS.radii.inner],
  ['emberworks', EMBERWORKS.ramp.gateAt],
  ['stormcrown', STORMCROWN.ramp.gateAt],
];

/** Flies a point 3 tiles one side of a barrier 8 tiles across it, at a bearing away from every ramp, in 4 px steps. */
function flyAcross(gate: GateId, r: number, outward: boolean, shut: readonly GateId[]): { x: number; y: number } {
  const bearing = 100;
  const from = tileCentre(polar(bearing, outward ? r - 3 : r + 3));
  const to = tileCentre(polar(bearing, outward ? r + 5 : r - 5));
  const pos = { ...from };
  const n = Math.ceil(Math.hypot(to.x - pos.x, to.y - pos.y) / 4);
  for (let i = 0; i < n; i++) flyBox(room, OVERWORLD_ROOM, pos, BOX, (to.x - from.x) / n, (to.y - from.y) / n, shut);
  return pos;
}

describe('flight and the barriers', () => {
  for (const [gate, r] of BARRIERS) {
    it(`never carries a flier across the ${gate} barrier while it is shut, either way; open, it crosses`, () => {
      expect(rOf(flyAcross(gate, r, false, [gate]))).toBeGreaterThanOrEqual(r);
      expect(rOf(flyAcross(gate, r, true, [gate]))).toBeLessThan(r);
      expect(rOf(flyAcross(gate, r, false, []))).toBeLessThan(r);
      expect(rOf(flyAcross(gate, r, true, []))).toBeGreaterThanOrEqual(r);
    });
  }
});

/** The reviewer's case: the Emberworks open, the Stormcrown shut, the player in ring 4 below the Weathervane. */
function belowWeathervane(stormOpen: boolean): SimState {
  const s = createSim(7, { start: HOLLOWS_START });
  s.gates.emberworks = true;
  s.gates.stormcrown = stormOpen;
  const at = tileCentre({ tx: 254, ty: 127 });
  movePlayer(s, at.x, at.y);
  return s;
}

const guardHawks = (s: SimState) => s.enemies.filter((e) => e.group === 'weathervane' && e.enemyId === 'thunderhawk');

describe("the Weathervane's hawks and a shut barrier", () => {
  it('never reach a player in ring 4 while the Stormcrown is shut: they stay home, past the barrier', () => {
    const s = belowWeathervane(false);
    const hawks = guardHawks(s);
    expect(hawks).toHaveLength(2);
    const full = s.player.health;
    for (let t = 0; t < 400; t++) {
      run(s, 1);
      expect(s.events.dives).toEqual([]);
      for (const h of hawks) expect(rOf(h), `tick ${t}`).toBeGreaterThanOrEqual(STORMCROWN.ramp.gateAt);
    }
    expect(s.player.health).toBe(full);
    for (const h of hawks) expect(Math.hypot(h.x - h.homeX, h.y - h.homeY)).toBeLessThanOrEqual(TILE_SIZE);
  });

  it('reach and dive on the same player once the Stormcrown is open', () => {
    const s = belowWeathervane(true);
    const full = s.player.health;
    runUntil(s, (x) => x.events.dives.length > 0, 400);
    runUntil(s, (x) => x.player.health < full, 120);
  });

  it('turn for home once the player is beyond a shut barrier, even mid-chase', () => {
    const s = belowWeathervane(false);
    const hawk = guardHawks(s)[0];
    if (!hawk) throw new Error('no hawk');
    // Off its post toward the barrier, chasing.
    hawk.y += 2 * TILE_SIZE;
    hawk.mode = 'chase';
    run(s, 1);
    expect(hawk.mode).toBe('return');
    runUntil(s, () => hawk.mode === 'idle', 120);
  });
});

describe('a flier placed by hand', () => {
  it('stays past a shut barrier when its home is there', () => {
    const s = belowWeathervane(false);
    s.enemies = [];
    const home = tileCentre(polar(100, STORMCROWN.ramp.gateAt + 2));
    const hawk = createEnemy(s.nextEnemyId++, 'thunderhawk', home, OVERWORLD_ROOM, 'pack');
    s.enemies.push(hawk);
    const below = tileCentre(polar(100, STORMCROWN.ramp.gateAt - 4));
    movePlayer(s, below.x, below.y);
    run(s, 300);
    expect(rOf(hawk)).toBeGreaterThanOrEqual(STORMCROWN.ramp.gateAt);
  });
});
