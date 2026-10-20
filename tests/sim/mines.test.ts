import { describe, expect, it } from 'vitest';
import { ammoDef, lobAmmo, lobbedAmmo } from '../../src/data/ammo';
import { enemyDef, type BulwarkDef } from '../../src/data/enemies';
import { LOB_SPACING } from '../../src/data/foundry';
import { SLOT_AMMOS } from '../../src/data/tube';
import { TALENT_START } from '../../src/data/talents';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import { travelTo } from '../../src/sim/claims';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { OVERWORLD } from '../../src/data/overworld';
import { volleyShots } from '../../src/sim/volley';
import { createSim, type SimState } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { playerStats } from '../../src/sim/stats';
import { fireTicksOf } from '../../src/sim/tube';
import { arena, atEntrance, command, die, fireAt, HALL, HUSK, placeHusk, PLAYER_AT, run, runUntil } from './fight';

// Landmines (038): lobbed to the aim like a bomb, they arm where they land and burst
// `armTicks` later for large damage in a small radius. Only the timer sets them off;
// they never hurt the player, shields never block them, and they vanish on a room change or a KO.

const MINE = lobbedAmmo('landmine');
const BULWARK_HP = (enemyDef('bulwark') as BulwarkDef).maxHealth;

/** A sim in the meadow with landmines carried and selected. */
function armed(): SimState {
  const s = arena();
  s.inventory.landmine = 10;
  run(s, 1, { selectAmmo: 'landmine' });
  return s;
}

/** Holds an enemy in place: a wind-up that won't land for a long time. */
function hold(e: EnemyState): EnemyState {
  e.mode = 'windup';
  e.modeTicks = -10_000;
  return e;
}

/** Fires one landmine at (x, y) and runs until it lands and arms; returns the ticks its flight took. */
function lay(s: SimState, x: number, y: number): number {
  run(s, 1, fireAt(x, y));
  return runUntil(s, (t) => t.events.mineArms.length > 0, 120);
}

describe('landmines', () => {
  it('are a mine: lobbed like a bomb, 60 physical damage in 24 px after a 300-tick fuse, on key 4', () => {
    const bomb = lobAmmo('bomb');
    expect(MINE).toMatchObject({ kind: 'mine', speed: bomb.speed, maxRange: bomb.maxRange, arcPeak: bomb.arcPeak, armTicks: 300, damage: 60, radius: 24, damageType: 'physical', fireTicks: 40 });
    expect(SLOT_AMMOS[3]).toBe('landmine');
  });

  it('land at the aim in a bomb\'s flight time and arm there with their fuse at 0', () => {
    const s = armed();
    const ticks = lay(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    const b = arena();
    b.inventory.bomb = 1;
    run(b, 1, { selectAmmo: 'bomb' });
    run(b, 1, fireAt(PLAYER_AT.x + 100, PLAYER_AT.y));
    expect(ticks).toBe(runUntil(b, (t) => t.events.bursts.length > 0, 120));
    expect(s.mines.armed).toHaveLength(1);
    expect(s.mines.armed[0]).toMatchObject({ x: PLAYER_AT.x + 100, y: PLAYER_AT.y, elapsed: 0, armTicks: 300, roomId: HALL });
    expect(s.events.bursts).toEqual([]);
    expect(s.inventory.landmine).toBe(9);
  });

  it('burst 300 ticks after landing for 60 on every enemy within 24 px, and nothing outside', () => {
    const s = armed();
    const at = { x: PLAYER_AT.x + 120, y: PLAYER_AT.y };
    s.enemies.push(createEnemy(s.nextEnemyId++, 'bulwark', { x: at.x + 22, y: at.y }, HALL));
    const near = s.enemies[0];
    if (!near) throw new Error('no enemy');
    near.frozen = 10_000;
    const far = hold(placeHusk(s, at.x, at.y + 28));
    lay(s, at.x, at.y);
    run(s, 299);
    expect(s.events.mineBursts).toEqual([]);
    expect(near.health).toBe(BULWARK_HP);
    run(s, 1);
    expect(s.events.mineBursts).toEqual([{ x: at.x, y: at.y, radius: 24, damageType: 'physical' }]);
    expect(near.health).toBe(BULWARK_HP - 60);
    expect(far.health).toBe(HUSK.maxHealth);
    expect(s.mines.armed).toHaveLength(0);
  });

  it('ignore contact: an enemy standing on one sets nothing off', () => {
    const s = armed();
    const at = { x: PLAYER_AT.x + 120, y: PLAYER_AT.y };
    lay(s, at.x, at.y);
    const e = hold(placeHusk(s, at.x, at.y));
    run(s, 200);
    expect(s.mines.armed).toHaveLength(1);
    expect(e.health).toBe(HUSK.maxHealth);
    runUntil(s, (t) => t.events.mineBursts.length > 0, 120);
    expect(e.health).toBe(0);
  });

  it('never hurt the player, even underfoot', () => {
    const s = armed();
    lay(s, PLAYER_AT.x + 13, PLAYER_AT.y);
    runUntil(s, (t) => t.events.mineBursts.length > 0, 320);
    expect(s.player.health).toBe(playerStats(s).maxHealth);
  });

  it("land through a shield's front: the burst is never blocked", () => {
    const s = armed();
    const def = enemyDef('bulwark') as BulwarkDef;
    const e = createEnemy(s.nextEnemyId++, 'bulwark', { x: PLAYER_AT.x + 120, y: PLAYER_AT.y }, HALL);
    // Facing the player, the mine landing on its front side.
    e.angle = Math.PI;
    e.frozen = 10_000;
    s.enemies.push(e);
    lay(s, e.x - 16, e.y);
    runUntil(s, (t) => t.events.mineBursts.length > 0, 320);
    expect(e.health).toBe(def.maxHealth - 60);
    expect(s.events.blocked).toEqual([]);
  });

  it('have no cap: several stay armed at once', () => {
    const s = armed();
    for (let i = 0; i < 4; i++) {
      lay(s, PLAYER_AT.x + 60 + i * 30, PLAYER_AT.y);
      run(s, 40);
    }
    expect(s.mines.armed.length).toBe(4);
  });

  it('land side by side in a volley, LOB_SPACING apart across the aim', () => {
    const shots = volleyShots(['landmine', 'landmine'], 1, 0);
    expect(shots.map((x) => x.across)).toEqual([-LOB_SPACING / 2, LOB_SPACING / 2]);
    expect(shots.every((x) => x.dir[0] === 1 && x.dir[1] === 0)).toBe(true);
  });

  it('vanish, armed or in flight, when the player changes room or travels', () => {
    const s = armed();
    lay(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    run(s, 40);
    run(s, 1, fireAt(PLAYER_AT.x + 60, PLAYER_AT.y));
    expect(s.bombs).toHaveLength(1);
    expect(s.mines.armed).toHaveLength(1);
    travelTo(s, FOUNDRY_ROOM, { tx: 5, ty: 8 });
    run(s, 1);
    expect(s.mines.armed).toEqual([]);
    expect(s.bombs).toEqual([]);
    // Fast travel within the overworld counts too.
    const t = armed();
    lay(t, PLAYER_AT.x + 100, PLAYER_AT.y);
    travelTo(t, HALL, OVERWORLD.wake);
    run(t, 1);
    expect(t.mines.armed).toEqual([]);
  });

  it('vanish when the player walks through a door', () => {
    const s = armed();
    lay(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    atEntrance(s);
    runUntil(s, (t) => t.roomId === FOUNDRY_ROOM, 120, { moveY: -1 });
    expect(s.mines.armed).toEqual([]);
  });

  it('take cluster bombs still in flight with them on a room change, so no bomblets are left behind', () => {
    const s = arena();
    s.inventory = { 'bomb+cluster': 2 };
    run(s, 1, { selectAmmo: 'bomb' });
    run(s, 1, fireAt(PLAYER_AT.x + 150, PLAYER_AT.y));
    expect(s.bombs).toHaveLength(1);
    travelTo(s, FOUNDRY_ROOM, { tx: 5, ty: 8 });
    let bursts = 0;
    for (let t = 0; t < 60; t++) {
      run(s, 1);
      bursts += s.events.bursts.length + s.events.bombletBursts.length;
    }
    expect(s.bombs).toEqual([]);
    expect(s.mines.bomblets).toEqual([]);
    expect(bursts).toBe(0);
  });

  it('never leave a Pool: Blastfletch’s line is scoped Bomb, a landmine is Landmine (039)', () => {
    const s = armed();
    s.talents = [TALENT_START, 'a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'k1'];
    lay(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    runUntil(s, (t) => t.events.mineBursts.length > 0, 320);
    expect(s.pools).toEqual([]);
    expect(s.nextPoolId).toBe(0);
  });

  it("fire faster with Oiled Breech (all ammo's fire rate)", () => {
    const s = armed();
    expect(fireTicksOf(s, 'landmine')).toBe(40);
    s.talents = [TALENT_START, 't1'];
    expect(fireTicksOf(s, 'landmine')).toBeCloseTo(40 / 1.08, 9);
  });

  it("vanish on a KO", () => {
    const s = armed();
    lay(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    die(s);
    expect(s.mines.armed).toEqual([]);
  });

  it('take all-ammo damage talents but not the bomb lane\'s', () => {
    const damageOf = (talents: string[]) => {
      const s = armed();
      s.talents = [TALENT_START, ...talents];
      lay(s, PLAYER_AT.x + 100, PLAYER_AT.y);
      return s.mines.armed[0]?.damage;
    };
    expect(damageOf([])).toBe(60);
    // t3 Hard Bore: +6% all ammo. b1 Black Powder: bomb damage only.
    expect(damageOf(['t1', 't2', 't3'])).toBeCloseTo(60 * 1.06);
    expect(damageOf(['b1'])).toBe(60);
    expect(ammoDef('landmine').base).toBe('landmine');
  });

  it('play out the same from the same seed', () => {
    const play = () => {
      const s = createSim(3);
      s.inventory.landmine = 4;
      s.hasTube = true;
      for (let t = 0; t < 600; t++) stepSim(s, command({ ...fireAt(s.player.x + 80, s.player.y + 20), fire: t % 50 === 0, selectAmmo: t === 0 ? 'landmine' : null }));
      return JSON.stringify({ mines: s.mines, enemies: s.enemies.map((e) => e.health) });
    };
    expect(play()).toBe(play());
  });
});
