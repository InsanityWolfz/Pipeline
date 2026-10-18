import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../../src/data/config';
import { OVERWORLD, ringOf } from '../../src/data/overworld';
import { POPULATION, SAFE_RADIUS } from '../../src/data/population';
import { SHRINE_SITE } from '../../src/data/rooms';
import { RESERVOIR_CAP } from '../../src/data/tube';
import { claim } from '../../src/sim/claims';
import type { EnemyState } from '../../src/sim/enemies';
import { damageEnemy } from '../../src/sim/enemies';
import { enemiesNearPlayer, inSafeZone, resetPopulation, viewRect } from '../../src/sim/population';
import { createSim, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { arena, die, movePlayer, placeHusk, PLAYER_AT, run, SEED } from './fight';

// The living population (017): once the first line fills the tube, the land fills with packs.

const TARGET = POPULATION.rings[1].packs + POPULATION.rings[2].packs;
const pop = (s: SimState): EnemyState[] => s.enemies.filter((e) => e.group.startsWith('pop-'));
const packs = (s: SimState): Set<string> => new Set(pop(s).map((e) => e.group));

/** The sandbox, with the field pack and shrine guards gone, populated from now. */
function populated(): SimState {
  const s = arena();
  s.populated = true;
  return s;
}

describe('the living population', () => {
  it('is out only once the first line fills the tube', () => {
    const s = createSim(SEED);
    run(s, 120);
    expect(pop(s)).toEqual([]);
    expect(summarize(s).populated).toBe(false);
    s.link.reservoir = { itemId: 'arrow', count: RESERVOIR_CAP };
    run(s, 1);
    expect(s.populated).toBe(true);
    run(s, 1);
    expect(packs(s).size).toBe(TARGET);
  });

  it('keeps each ring its packs, sized and made up from data, ring 0 calm', () => {
    const s = populated();
    run(s, 1);
    for (const ring of [1, 2] as const) {
      const def = POPULATION.rings[ring];
      const groups = [...packs(s)].filter((g) => g.startsWith(`pop-${ring}-`));
      expect(groups).toHaveLength(def.packs);
      for (const g of groups) {
        const members = pop(s).filter((e) => e.group === g);
        expect(members.length).toBeGreaterThanOrEqual(def.size[0]);
        expect(members.length).toBeLessThanOrEqual(def.size[1]);
        for (const e of members) expect(def.enemies).toContain(e.enemyId);
      }
    }
    for (const e of pop(s)) expect(ringOf(Math.floor(e.homeX / TILE_SIZE), Math.floor(e.homeY / TILE_SIZE))).not.toBe(0);
  });

  it('spawns out of view of the player, never in a safe zone', () => {
    const s = populated();
    claim(s, SHRINE_SITE);
    run(s, 1);
    expect(packs(s).size).toBe(TARGET);
    const slack = (POPULATION.spread + 1) * TILE_SIZE;
    for (const e of pop(s)) {
      expect(Math.hypot(e.homeX - PLAYER_AT.x, e.homeY - PLAYER_AT.y)).toBeGreaterThanOrEqual(POPULATION.spawnDistance - slack);
      expect(inSafeZone(s, e.roomId, e.homeX, e.homeY)).toBe(false);
    }
  });

  it('places every member out of any safe zone and outside the clamped view, even at the map edge, over many spawns', () => {
    const s = populated();
    claim(s, SHRINE_SITE);
    // Near the west edge in ring 2 the camera stops following, so the view is not centred on the player.
    movePlayer(s, 3 * TILE_SIZE, 20 * TILE_SIZE);
    const v = viewRect(s);
    expect(v.x0).toBe(0);
    const m = POPULATION.viewMargin;
    for (let round = 0; round < 25; round++) {
      s.enemies = s.enemies.filter((e) => !e.group.startsWith('pop-'));
      resetPopulation(s);
      run(s, 1);
      for (const e of pop(s)) {
        expect(inSafeZone(s, e.roomId, e.homeX, e.homeY)).toBe(false);
        const seen = e.homeX >= v.x0 - m && e.homeX <= v.x1 + m && e.homeY >= v.y0 - m && e.homeY <= v.y1 + m;
        expect(seen).toBe(false);
      }
    }
  });

  it('brings a wiped-out pack back after the delay, out of view', () => {
    const s = populated();
    run(s, 1);
    const gone = [...packs(s)][0] ?? '';
    s.enemies = s.enemies.filter((e) => e.group !== gone);
    run(s, POPULATION.respawnTicks);
    expect(packs(s).has(gone)).toBe(false);
    run(s, 1);
    expect(packs(s).has(gone)).toBe(true);
  });

  it('waits while a screen near the player is already full', () => {
    const s = populated();
    run(s, 1);
    const gone = [...packs(s)][0] ?? '';
    s.enemies = s.enemies.filter((e) => e.group !== gone);
    for (let i = 0; i < POPULATION.screenCap; i++) placeHusk(s, PLAYER_AT.x + 200 + (i % 5) * 20, PLAYER_AT.y + Math.floor(i / 5) * 20);
    // They'll wake and swing; the player has to outlast the wait, since a KO resets the land.
    s.player.health = 1e9;
    run(s, POPULATION.respawnTicks + 30);
    expect(packs(s).has(gone)).toBe(false);
  });

  it('holds a pack back when even its largest size would take the screen past the cap', () => {
    const s = populated();
    run(s, 1);
    const gone = [...packs(s)].find((g) => g.startsWith('pop-2-')) ?? '';
    s.enemies = s.enemies.filter((e) => e.group !== gone);
    // Fill the screen to one past where the largest ring-2 pack still fits under the cap.
    const fill = POPULATION.screenCap - POPULATION.rings[2].size[1] + 1 - enemiesNearPlayer(s);
    for (let i = 0; i < fill; i++) placeHusk(s, PLAYER_AT.x + 200 + (i % 5) * 20, PLAYER_AT.y + Math.floor(i / 5) * 20, OVERWORLD.id);
    s.player.health = 1e9;
    run(s, POPULATION.respawnTicks + 30);
    expect(packs(s).has(gone)).toBe(false);
  });

  it('wakes everything on screen, however many, with no cap (Shaun: a player who rounds them up gets the crowd)', () => {
    const s = populated();
    s.populated = false;
    for (let i = 0; i < POPULATION.screenCap + 5; i++) placeHusk(s, PLAYER_AT.x - 250 + (i % 10) * 50, PLAYER_AT.y - 100 + Math.floor(i / 10) * 100);
    run(s, 1);
    expect(s.enemies.filter((e) => e.mode !== 'idle')).toHaveLength(POPULATION.screenCap + 5);
    expect(summarize(s).nearPlayer).toBe(POPULATION.screenCap + 5);
  });

  it('a hit wakes an enemy, however many are already awake', () => {
    const s = populated();
    s.populated = false;
    for (let i = 0; i < POPULATION.screenCap; i++) placeHusk(s, PLAYER_AT.x - 250 + (i % 10) * 50, PLAYER_AT.y - 100);
    run(s, 1);
    // Out of view, so only the hit can wake it.
    const far = placeHusk(s, PLAYER_AT.x + 500, PLAYER_AT.y + 300);
    damageEnemy(s, far, 1, 1, 0);
    expect(far.mode).not.toBe('idle');
  });

  it('comes back in full after a death, and claims stay', () => {
    const s = populated();
    claim(s, SHRINE_SITE);
    run(s, 1);
    s.enemies = [];
    die(s);
    expect(s.claims).toEqual([SHRINE_SITE]);
    run(s, 1);
    expect(packs(s).size).toBe(TARGET);
  });
});

describe('safe zones', () => {
  const pylon = tileCentre(OVERWORLD.shrine.pylon);

  it('a new claim clears packs whose home is inside, and nothing spawns there after', () => {
    const s = populated();
    const inside = placeHusk(s, pylon.x + 3 * TILE_SIZE, pylon.y + 5 * TILE_SIZE);
    inside.group = 'pop-2-0';
    const outside = placeHusk(s, pylon.x, pylon.y + (SAFE_RADIUS + 3) * TILE_SIZE);
    claim(s, SHRINE_SITE);
    expect(s.enemies).not.toContain(inside);
    expect(s.enemies).toContain(outside);
  });

  it('chasers stop at the edge', () => {
    const s = populated();
    s.populated = false;
    claim(s, SHRINE_SITE);
    // The player inside the zone, a Husk chasing from just outside it.
    movePlayer(s, pylon.x, pylon.y + 2 * TILE_SIZE);
    const e = placeHusk(s, pylon.x, pylon.y + (SAFE_RADIUS + 1) * TILE_SIZE);
    e.mode = 'chase';
    run(s, 120);
    expect(Math.hypot(e.x - pylon.x, e.y - pylon.y)).toBeGreaterThan(SAFE_RADIUS * TILE_SIZE - 1);
  });

  it('a knock never carries an enemy into the zone', () => {
    const s = populated();
    s.populated = false;
    claim(s, SHRINE_SITE);
    movePlayer(s, pylon.x, pylon.y + 2 * TILE_SIZE);
    // Just outside the edge, hit hard from outside so the knock points in.
    const e = placeHusk(s, pylon.x, pylon.y + SAFE_RADIUS * TILE_SIZE + 4);
    damageEnemy(s, e, 1, 0, -1);
    run(s, 30);
    expect(Math.hypot(e.x - pylon.x, e.y - pylon.y)).toBeGreaterThan(SAFE_RADIUS * TILE_SIZE);
  });
});
