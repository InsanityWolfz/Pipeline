import { describe, expect, it } from 'vitest';
import { CLAIM_TICKS, FIXTURES, PORT_CYCLE, PORT_TICKS } from '../../src/data/claims';
import { FOUNDRY_ROOM, SHRINE_SITE } from '../../src/data/rooms';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { WORLD } from '../../src/sim/world';
import { claim, claimedPylonInReach } from '../../src/sim/claims';
import { fixtureDef, portFront } from '../../src/sim/fixtures';
import { damagePlayer } from '../../src/sim/health';
import { canPlace } from '../../src/sim/placement';
import type { ConduitState } from '../../src/sim/pieces';
import { createSim, type SimState } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { command, die, movePlayer, run, runUntil, SEED } from './fight';
import { put } from './foundryKit';

// 017: the shrine is a site in the overworld; its pylon carries the site id.
const SHRINE = WORLD[OVERWORLD_ROOM];
if (!SHRINE?.pylon) throw new Error('the shrine needs a pylon');
const PYLON = SHRINE.pylon;

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
  it('is walled, entered through the gap in its front wall', () => {
    const s = createSim(SEED);
    s.enemies = [];
    const gap = OVERWORLD.shrine.gate[1];
    if (!gap) throw new Error('no gate tile');
    const outside = tileCentre({ tx: gap.tx, ty: gap.ty + 2 });
    movePlayer(s, outside.x, outside.y);
    runUntil(s, (x) => x.player.y < tileCentre(gap).y - 32, 60, { moveY: -1 });
    expect(s.roomId).toBe(OVERWORLD_ROOM);
    // The front wall beside the gap is solid.
    const wall = tileCentre({ tx: gap.tx + 3, ty: gap.ty + 2 });
    movePlayer(s, wall.x, wall.y);
    run(s, 30, { moveY: -1 });
    expect(s.player.y).toBeGreaterThan(tileCentre(gap).y);
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

  it('claims after CLAIM_TICKS of standing still, adding the port and waystone', () => {
    const s = atPylon();
    run(s, 1, { interact: true });
    expect(s.claimHold).toEqual({ site: SHRINE_SITE, progress: 1 });
    run(s, CLAIM_TICKS - 2);
    expect(s.claims).toEqual([]);
    run(s, 1);
    expect(s.claims).toEqual([SHRINE_SITE]);
    expect(s.events.claims).toEqual([{ site: SHRINE_SITE }]);
    expect(s.fixtures.map((f) => f.id).sort()).toEqual(FIXTURES.map((f) => f.id).sort());
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
    const port = fixtureDef('supply-port');
    s.roomId = FOUNDRY_ROOM;
    put(s, 'crate', port.tx, port.ty);
    s.roomId = OVERWORLD_ROOM;
    claim(s, SHRINE_SITE);
    expect(s.foundry.pieces).toEqual([]);
    expect(s.fixtures.some((f) => f.id === 'supply-port')).toBe(true);
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
    const port = fixtureDef('supply-port');
    expect(canPlace(s, 'conduit', stash.tx, stash.ty, 'up')).toBe('occupied');
    expect(canPlace(s, 'conduit', port.tx, port.ty, 'up')).toBeNull();
    claim(s, SHRINE_SITE);
    expect(canPlace(s, 'conduit', port.tx, port.ty, 'up')).toBe('occupied');
    expect(canPlace(s, 'conduit', fixtureDef('waystone').tx, fixtureDef('waystone').ty, 'up')).toBe('occupied');
  });
});

describe('the supply port', () => {
  it('pushes exactly every PORT_TICKS', () => {
    const s = claimed();
    s.roomId = FOUNDRY_ROOM;
    movePlayer(s, tileCentre({ tx: 12, ty: 12 }).x, tileCentre({ tx: 12, ty: 12 }).y);
    const port = s.fixtures.find((f) => f.id === 'supply-port');
    if (!port) throw new Error('no port');
    const front = portFront(port);
    const c = put<ConduitState>(s, 'conduit', front.tx, front.ty, 'down');
    const at: number[] = [];
    for (let t = 0; t < PORT_TICKS * 3 + 5; t++) {
      run(s, 1);
      if (c.item) {
        at.push(s.tick);
        c.item = null;
      }
    }
    const gaps = at.slice(1).map((t, i) => t - (at[i] ?? 0));
    expect(gaps.slice(0, 2)).toEqual([PORT_TICKS, PORT_TICKS]);
  });

  it('reports each raw it produces as a supply (018), in the cycle, even while the player is out', () => {
    const s = claimed();
    const port = s.fixtures.find((f) => f.id === 'supply-port');
    if (!port) throw new Error('no port');
    const front = portFront(port);
    // Placed from inside the foundry; then the player heads back out.
    s.roomId = FOUNDRY_ROOM;
    const c = put<ConduitState>(s, 'conduit', front.tx, front.ty, 'down');
    s.roomId = OVERWORLD_ROOM;
    const supplies: string[] = [];
    for (let t = 0; t < PORT_TICKS * 2 + 5; t++) {
      run(s, 1);
      for (const e of summarize(s).events.supplies) supplies.push(e.itemId);
      // Empty the conduit each tick so the line never stalls.
      c.item = null;
    }
    expect(supplies).toEqual(PORT_CYCLE.slice(0, 2));
  });

  it('a raw the next piece cannot use stalls the line, as in 006', () => {
    const s = claimed();
    s.roomId = FOUNDRY_ROOM;
    movePlayer(s, tileCentre({ tx: 12, ty: 12 }).x, tileCentre({ tx: 12, ty: 12 }).y);
    const port = s.fixtures.find((f) => f.id === 'supply-port');
    if (!port) throw new Error('no port');
    const front = portFront(port);
    const c = put<ConduitState>(s, 'conduit', front.tx, front.ty, 'right');
    // A grinder only takes ley crystal: the first raw, wood, sticks at the end of the conduit.
    s.crafted = ['ley-shard'];
    put(s, 'grinder', front.tx + 1, front.ty, 'right');
    run(s, PORT_TICKS * 3);
    expect(c.item).toBe('wood');
    expect(port.item).toBe('stone');
  });

  it('pushes the raws in turn every PORT_TICKS into what faces it, and waits when refused', () => {
    const s = claimed();
    s.roomId = FOUNDRY_ROOM;
    const port = s.fixtures.find((f) => f.id === 'supply-port');
    if (!port) throw new Error('no port');
    const front = portFront(port);
    movePlayer(s, tileCentre({ tx: 12, ty: 12 }).x, tileCentre({ tx: 12, ty: 12 }).y);
    const c = put<ConduitState>(s, 'conduit', front.tx, front.ty, 'down');
    const got: string[] = [];
    for (let t = 0; t < PORT_TICKS * 4 + 10; t++) {
      run(s, 1);
      if (c.item) {
        got.push(c.item);
        c.item = null;
      }
    }
    expect(got).toEqual([...PORT_CYCLE]);
    // A full conduit refuses: the port holds its raw.
    c.item = 'wood';
    run(s, PORT_TICKS + 2);
    expect(s.fixtures.find((f) => f.id === 'supply-port')?.item).not.toBeNull();
  });
});

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
      run(s, PORT_TICKS * 3);
      return summarize(s);
    };
    expect(play()).toEqual(play());
  });
});
