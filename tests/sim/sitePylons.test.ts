import { describe, expect, it } from 'vitest';
import { CLAIM_TICKS, FIXTURES } from '../../src/data/claims';
import { TILE_SIZE } from '../../src/data/config';
import { LANDMARK_LIST } from '../../src/data/landmarks';
import { OBJECTIVES } from '../../src/data/objectives';
import { OVERWORLD, OVERWORLD_ROOM, type TilePos } from '../../src/data/overworld';
import { POPULATION } from '../../src/data/population';
import { FOUNDRY_ROOM, SHRINE_SITE } from '../../src/data/rooms';
import { claim, claimedPylons } from '../../src/sim/claims';
import { fixtureDef } from '../../src/sim/fixtures';
import { safeZoneAt } from '../../src/sim/population';
import { createSim, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { arena, die, movePlayer, run, SEED } from './fight';

// Landmark pylons (032): each resource site has a ley pylon, dormant until the shrine is
// claimed, sealed while its guards live, claimed like the shrine's; every claimed pylon is
// a deposit point, a safe zone at its own radius and a waystone destination.

const SITES = LANDMARK_LIST.filter((l) => l.kind === 'resource-site');
const pylonOf = (site: string): TilePos => {
  if (site === SHRINE_SITE) return OVERWORLD.shrine.pylon;
  const p = LANDMARK_LIST.find((l) => l.pylon?.site === site)?.pylon;
  if (!p) throw new Error(`no pylon for ${site}`);
  return p;
};

/** Stands the player in the overworld one tile below a tile. */
function below(s: SimState, t: TilePos): void {
  s.roomId = OVERWORLD_ROOM;
  const at = tileCentre({ tx: t.tx, ty: t.ty + 1 });
  movePlayer(s, at.x, at.y);
}

/** Holds E at a pylon until it's claimed. */
function claimAt(s: SimState, site: string): void {
  s.enemies = s.enemies.filter((e) => e.group !== site);
  below(s, pylonOf(site));
  run(s, 1, { interact: true });
  run(s, CLAIM_TICKS);
}

const STONE_PORT = FIXTURES.find((f) => f.kind === 'port' && f.raw === 'stone')?.id ?? '';
const SECOND = OBJECTIVES.findIndex((o) => o.check.kind === 'claimedCount');

describe('a resource-site pylon', () => {
  it('is dormant until the shrine is claimed: E starts no claim', () => {
    const s = createSim(SEED);
    s.enemies = s.enemies.filter((e) => e.group !== 'quarry');
    below(s, pylonOf('quarry'));
    run(s, 1, { interact: true });
    expect(s.claimHold).toBeNull();
    run(s, CLAIM_TICKS);
    expect(s.claims).toEqual([]);
    claim(s, SHRINE_SITE);
    run(s, 1, { interact: true });
    expect(s.claimHold).toEqual({ site: 'quarry', progress: 1 });
  });

  it('is sealed while any of its guards lives', () => {
    const s = createSim(SEED);
    claim(s, SHRINE_SITE);
    expect(s.enemies.filter((e) => e.group === 'quarry').length).toBeGreaterThanOrEqual(3);
    below(s, pylonOf('quarry'));
    run(s, 1, { interact: true });
    expect(s.events.sealed).toEqual([{ site: 'quarry' }]);
    expect(s.claimHold).toBeNull();
  });

  it('claims each site in turn: a deposit point and a safe zone at its own radius (7, the shrine 10)', () => {
    const s = createSim(SEED);
    claimAt(s, SHRINE_SITE);
    for (const l of SITES) {
      claimAt(s, l.id);
      expect(s.claims, l.id).toContain(l.id);
      s.inventory = { stone: 2 };
      run(s, 1, { pylon: 'deposit' });
      expect(s.inventory, l.id).toEqual({});
      const c = tileCentre(pylonOf(l.id));
      expect(safeZoneAt(s, OVERWORLD_ROOM, c.x, c.y + 6.5 * TILE_SIZE)?.r, l.id).toBe(7 * TILE_SIZE);
      expect(safeZoneAt(s, OVERWORLD_ROOM, c.x, c.y + 7.5 * TILE_SIZE), l.id).toBeNull();
    }
    const shrine = tileCentre(OVERWORLD.shrine.pylon);
    expect(safeZoneAt(s, OVERWORLD_ROOM, shrine.x, shrine.y + 9.5 * TILE_SIZE)?.r).toBe(10 * TILE_SIZE);
    expect(s.claims).toEqual([SHRINE_SITE, ...SITES.map((l) => l.id)]);
    expect(summarize(s).claims).toEqual(s.claims);
  });

  it("raises its port's pylon count and rate: the Quarry takes the stone port to ×2, 30 a minute", () => {
    const s = createSim(SEED);
    claim(s, SHRINE_SITE);
    expect(summarize(s).ports.find((p) => p.id === STONE_PORT)).toMatchObject({ pylons: 1, perMinute: 15 });
    claim(s, 'quarry');
    expect(summarize(s).ports.find((p) => p.id === STONE_PORT)).toMatchObject({ pylons: 2, perMinute: 30 });
    expect(summarize(s).ports.find((p) => p.raw === 'wood')).toMatchObject({ pylons: 1 });
    claim(s, 'old-grove');
    expect(summarize(s).ports.find((p) => p.raw === 'wood')).toMatchObject({ pylons: 2, perMinute: 30 });
  });

  it("takes its guards away for good, and any guard whose home its zone takes in; they don't come back after a KO", () => {
    const s = createSim(SEED);
    claim(s, SHRINE_SITE);
    claim(s, 'quarry');
    expect(s.enemies.filter((e) => e.group === 'quarry')).toEqual([]);
    die(s);
    expect(s.enemies.filter((e) => e.group === 'quarry')).toEqual([]);
    expect(s.claims).toContain('quarry');
    for (const e of s.enemies) expect(safeZoneAt(s, e.roomId, e.homeX, e.homeY), `${e.group} ${e.enemyId}`).toBeNull();
  });
});

describe('the waystone', () => {
  /** Into the foundry, standing just below the waystone. */
  function atWaystone(s: SimState): void {
    s.roomId = FOUNDRY_ROOM;
    s.link.attuned = true;
    const way = fixtureDef('waystone');
    const by = tileCentre({ tx: way.tx, ty: way.ty + 1 });
    movePlayer(s, by.x, by.y);
  }

  it('with one claimed pylon, E carries the player straight there', () => {
    const s = createSim(SEED);
    claim(s, SHRINE_SITE);
    atWaystone(s);
    run(s, 1, { interact: true });
    expect(s.roomId).toBe(OVERWORLD_ROOM);
    expect({ x: s.player.x, y: s.player.y }).toEqual(tileCentre({ tx: OVERWORLD.shrine.pylon.tx, ty: OVERWORLD.shrine.pylon.ty + 1 }));
  });

  it('with two or more, E opens the menu (render) and the chosen site comes back as `travel`', () => {
    const s = createSim(SEED);
    claim(s, SHRINE_SITE);
    claim(s, 'quarry');
    expect(claimedPylons(s).map((p) => [p.pylon.site, p.pylon.name])).toEqual([
      [SHRINE_SITE, 'Shrine'],
      ['quarry', 'Quarry'],
    ]);
    atWaystone(s);
    run(s, 1, { interact: true });
    expect(s.roomId).toBe(FOUNDRY_ROOM);
    run(s, 1, { travel: 'quarry' });
    expect(s.roomId).toBe(OVERWORLD_ROOM);
    expect({ x: s.player.x, y: s.player.y }).toEqual(tileCentre({ tx: pylonOf('quarry').tx, ty: pylonOf('quarry').ty + 1 }));
    expect(s.events.travels).toEqual([{ from: FOUNDRY_ROOM, to: OVERWORLD_ROOM }]);
  });

  it('ignores a travel choice away from the waystone or to an unclaimed site', () => {
    const s = createSim(SEED);
    claim(s, SHRINE_SITE);
    claim(s, 'quarry');
    atWaystone(s);
    run(s, 1, { travel: 'old-grove' });
    expect(s.roomId).toBe(FOUNDRY_ROOM);
    movePlayer(s, s.player.x - 6 * TILE_SIZE, s.player.y + 4 * TILE_SIZE);
    run(s, 1, { travel: 'quarry' });
    expect(s.roomId).toBe(FOUNDRY_ROOM);
  });
});

describe('the goal chain', () => {
  it('appends "Claim a second pylon" after 029\'s goals, done on the second claim', () => {
    expect(SECOND).toBe(OBJECTIVES.length - 1);
    expect(OBJECTIVES[SECOND]).toMatchObject({ text: 'Claim a second pylon', milestone: 'm1', check: { kind: 'claimedCount', min: 2 }, marker: 'sitePylon' });
    expect(OBJECTIVES[SECOND - 1]?.check).toEqual({ kind: 'craftedAny', items: ['ley-bolt+homing', 'ley-bolt+star'] });
    const s = createSim(SEED);
    claim(s, SHRINE_SITE);
    run(s, 1);
    expect(s.objectives[SECOND]).toBe(false);
    claim(s, 'reed-marsh');
    run(s, 1);
    expect(s.objectives[SECOND]).toBe(true);
  });
});

describe('the population with every site claimed', () => {
  it('still reaches every ring\'s pack target', () => {
    const s = arena();
    for (const site of [SHRINE_SITE, ...SITES.map((l) => l.id)]) claim(s, site);
    s.populated = true;
    const target = POPULATION.rings[1].packs + POPULATION.rings[2].packs;
    const packs = () => new Set(s.enemies.filter((e) => e.group.startsWith('pop-')).map((e) => e.group));
    for (let t = 0; t < 600 && packs().size < target; t++) run(s, 1);
    for (const ring of [1, 2] as const) expect([...packs()].filter((g) => g.startsWith(`pop-${ring}-`)), `ring ${ring}`).toHaveLength(POPULATION.rings[ring].packs);
    for (const e of s.enemies) expect(safeZoneAt(s, e.roomId, e.homeX, e.homeY)).toBeNull();
  });
});
