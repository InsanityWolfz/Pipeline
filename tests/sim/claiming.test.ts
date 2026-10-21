import { describe, expect, it } from 'vitest';
import { CLAIM_TICKS, FIXTURES, SUPPLY_TICKS } from '../../src/data/claims';
import { FOUNDRY_ROOM, SHRINE_SITE } from '../../src/data/rooms';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { WORLD } from '../../src/sim/world';
import { claim, claimedPylonInReach } from '../../src/sim/claims';
import { fixtureDef } from '../../src/sim/fixtures';
import { damagePlayer } from '../../src/sim/health';
import { canPlace } from '../../src/sim/placement';
import { createSim, type SimState } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { command, die, movePlayer, run, SEED } from './fight';
import { put } from './foundryKit';

// 017: the shrine is a site in the overworld; its pylon carries the site id.
const SHRINE = WORLD[OVERWORLD_ROOM];
const FOUND = SHRINE?.pylons?.find((p) => p.site === SHRINE_SITE);
if (!FOUND) throw new Error('the shrine needs a pylon');
const PYLON = FOUND;

/** The shrine, with the player standing just below its pylon; `clear` removes its enemies. */
function atPylon(clear = true): SimState {
  const s = createSim(SEED);
  s.roomId = OVERWORLD_ROOM;
  if (clear) s.enemies = s.enemies.filter((e) => e.group !== SHRINE_SITE);
  const below = tileCentre({ tx: PYLON.tx, ty: PYLON.ty + 1 });
  movePlayer(s, below.x, below.y);
  return s;
}

/** A claimed shrine with the player at its pylon. */
function claimed(): SimState {
  const s = atPylon();
  run(s, 1, { interact: true });
  run(s, CLAIM_TICKS);
  expect(s.claims).toEqual([SHRINE_SITE]);
  return s;
}

describe('the shrine', () => {
  it('is walled, entered by E at the door in its front wall (055)', () => {
    const s = createSim(SEED);
    s.enemies = [];
    const door = OVERWORLD.shrine.door[1];
    if (!door) throw new Error('no door tile');
    const outside = tileCentre({ tx: door.tx, ty: door.ty + 1 });
    movePlayer(s, outside.x, outside.y);
    run(s, 30, { moveY: -1 });
    expect(s.player.y).toBeGreaterThan(tileCentre(door).y);
    run(s, 1, { interact: true });
    expect(s.player.y).toBeLessThan(tileCentre(door).y);
    expect(s.roomId).toBe(OVERWORLD_ROOM);
    // The front wall beside the door is solid.
    const wall = tileCentre({ tx: door.tx + 3, ty: door.ty + 2 });
    movePlayer(s, wall.x, wall.y);
    run(s, 30, { moveY: -1 });
    expect(s.player.y).toBeGreaterThan(tileCentre(door).y);
  });

  it('holds Wisps, Husks and the Warden, and its pylon is solid', () => {
    const s = createSim(SEED);
    const kinds = s.enemies.filter((e) => e.group === SHRINE_SITE).map((e) => e.enemyId).sort();
    expect(kinds).toEqual(['husk', 'husk', 'pylon-warden', 'wisp', 'wisp', 'wisp']);
    const p = atPylon();
    const below = p.player.y;
    run(p, 30, { moveY: -1 });
    expect(p.player.y).toBeGreaterThan(below - 16);
  });
});

describe('claiming the pylon', () => {
  it('is sealed while enemies live', () => {
    const s = atPylon(false);
    run(s, 1, { interact: true });
    expect(s.events.sealed).toEqual([{ site: SHRINE_SITE }]);
    expect(s.claimHold).toBeNull();
  });

  it("claims after CLAIM_TICKS of standing still, adding the four ports and the waystone (not 034's ley-iron port, 049's resin port or 055's rimestone port: the shrine sends none of them)", () => {
    const s = atPylon();
    run(s, 1, { interact: true });
    expect(s.claimHold).toEqual({ site: SHRINE_SITE, progress: 1 });
    run(s, CLAIM_TICKS - 2);
    expect(s.claims).toEqual([]);
    run(s, 1);
    expect(s.claims).toEqual([SHRINE_SITE]);
    expect(s.events.claims).toEqual([{ site: SHRINE_SITE }]);
    expect(s.fixtures.map((f) => f.id).sort()).toEqual(FIXTURES.filter((f) => f.raw !== 'ley-iron' && f.raw !== 'husk-resin' && f.raw !== 'rimestone').map((f) => f.id).sort());
    expect(summarize(s).claims).toEqual([SHRINE_SITE]);
  });

  it("counts as a claimed pylon in reach by its site, though the player stands in the overworld room (017)", () => {
    const s = atPylon();
    expect(claimedPylonInReach(s)).toBe(false);
    claim(s, SHRINE_SITE);
    expect(claimedPylonInReach(s)).toBe(true);
    movePlayer(s, s.player.x + 200, s.player.y);
    expect(claimedPylonInReach(s)).toBe(false);
  });

  it.each([
    ['moving', { moveX: 1 as const }],
    ['firing', { fire: true }],
    ['rolling', { dodge: true }],
  ])('is cancelled by %s', (_name, c) => {
    const s = atPylon();
    run(s, 1, { interact: true });
    run(s, 10);
    run(s, 1, c);
    expect(s.claimHold).toBeNull();
    run(s, CLAIM_TICKS);
    expect(s.claims).toEqual([]);
  });

  it('is cancelled by a hit', () => {
    const s = atPylon();
    run(s, 1, { interact: true });
    run(s, 10);
    damagePlayer(s, 5, 0, 1, 0, 1);
    expect(s.claimHold).toBeNull();
  });

  it('a piece on a fixture tile is picked up into the inventory', () => {
    const s = atPylon();
    const port = fixtureDef('wood-port');
    s.roomId = FOUNDRY_ROOM;
    put(s, 'crate', port.tx, port.ty);
    s.roomId = OVERWORLD_ROOM;
    claim(s, SHRINE_SITE);
    expect(s.foundry.pieces).toEqual([]);
    expect(s.fixtures.some((f) => f.id === 'wood-port')).toBe(true);
  });

  it('lasts through a KO, and the shrine stays empty', () => {
    const s = claimed();
    die(s);
    expect(s.claims).toEqual([SHRINE_SITE]);
    expect(s.enemies.filter((e) => e.group === SHRINE_SITE)).toEqual([]);
    expect(s.enemies.filter((e) => e.group === 'field').length).toBeGreaterThan(0);
  });
});

describe('fixture tiles', () => {
  it('are never buildable once the fixture is there; the port tile is free before the claim', () => {
    const s = createSim(SEED);
    s.roomId = FOUNDRY_ROOM;
    movePlayer(s, tileCentre({ tx: 12, ty: 12 }).x, tileCentre({ tx: 12, ty: 12 }).y);
    const stash = fixtureDef('stash');
    const port = fixtureDef('fiber-port');
    expect(canPlace(s, 'conduit', stash.tx, stash.ty, 'up')).toBe('occupied');
    expect(canPlace(s, 'conduit', port.tx, port.ty, 'up')).toBeNull();
    claim(s, SHRINE_SITE);
    expect(canPlace(s, 'conduit', port.tx, port.ty, 'up')).toBe('occupied');
    expect(canPlace(s, 'conduit', fixtureDef('waystone').tx, fixtureDef('waystone').ty, 'up')).toBe('occupied');
  });
});

// The supply ports (028) are tested in ports.test.ts.

describe('the claimed pylon, stash and waystone', () => {
  it('sends the haul to the stash, then the stash gives it back', () => {
    const s = claimed();
    s.inventory = { wood: 3, arrow: 5 };
    run(s, 1, { pylon: 'deposit' });
    expect(s.inventory).toEqual({});
    expect(s.stash).toEqual({ wood: 3, arrow: 5 });
    expect(s.events.stashDeposits).toEqual([{ items: { wood: 3, arrow: 5 } }]);
    s.player.vx = 2;
    s.building = true;
    // Already attuned, so arriving plays no attune.
    s.link.attuned = true;
    run(s, 1, { pylon: 'travel' });
    expect(s.roomId).toBe(FOUNDRY_ROOM);
    expect([s.player.vx, s.player.vy, s.building]).toEqual([0, 0, false]);
    expect(s.events.travels).toEqual([{ from: OVERWORLD_ROOM, to: FOUNDRY_ROOM }]);
    const stash = fixtureDef('stash');
    const by = tileCentre({ tx: stash.tx, ty: stash.ty + 1 });
    movePlayer(s, by.x, by.y);
    run(s, 1, { takeStash: { itemId: 'wood' } });
    expect(s.inventory).toEqual({ wood: 3 });
    run(s, 1, { takeStash: { itemId: null } });
    expect(s.inventory).toEqual({ wood: 3, arrow: 5 });
    expect(s.stash).toEqual({});
  });

  it('the waystone carries the player to just below the pylon', () => {
    const s = claimed();
    run(s, 1, { pylon: 'travel' });
    const way = fixtureDef('waystone');
    const by = tileCentre({ tx: way.tx, ty: way.ty + 1 });
    movePlayer(s, by.x, by.y);
    run(s, 1, { interact: true });
    expect(s.roomId).toBe(OVERWORLD_ROOM);
    expect({ x: s.player.x, y: s.player.y }).toEqual(tileCentre({ tx: PYLON.tx, ty: PYLON.ty + 1 }));
  });

  it('the pylon menu does nothing unclaimed or out of reach', () => {
    const s = atPylon();
    s.inventory = { wood: 1 };
    run(s, 1, { pylon: 'deposit' });
    expect(s.stash).toEqual({});
    const c = claimed();
    movePlayer(c, tileCentre(OVERWORLD.field).x, tileCentre(OVERWORLD.field).y);
    run(c, 1, { pylon: 'travel' });
    expect(c.roomId).toBe(OVERWORLD_ROOM);
  });

  it('replays a claim, deposit and travel identically', () => {
    const play = () => {
      const s = claimed();
      s.inventory = { stone: 2 };
      stepSim(s, command({ pylon: 'deposit' }));
      stepSim(s, command({ pylon: 'travel' }));
      run(s, SUPPLY_TICKS * 3);
      return summarize(s);
    };
    expect(play()).toEqual(play());
  });
});
