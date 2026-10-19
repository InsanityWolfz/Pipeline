import { describe, expect, it } from 'vitest';
import { defOf } from '../../src/sim/champions';
import { MELEE } from '../../src/data/combat';
import { ENEMIES, enemyDef } from '../../src/data/enemies';
import { TILE_SIZE } from '../../src/data/config';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { ROLL_TICKS } from '../../src/data/player';
import { isSolid } from '../../src/sim/collision';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import { sectorHitsBox } from '../../src/sim/sector';
import { roomById, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { hasRoundToFire } from '../../src/sim/tube';
import { arena, fireAt, HALL, movePlayer, PLAYER_AT, placeHusk, run } from './fight';

// 023: with no tube, or nothing to fire, the fire button punches.

const P = PLAYER_AT;

/** The arena with the tube not yet taken. */
function bare(): SimState {
  const s = arena();
  s.hasTube = false;
  return s;
}

/** One tick of fire held toward a point `dx, dy` px from the player. */
function punchToward(s: SimState, dx: number, dy: number): void {
  run(s, 1, fireAt(s.player.x + dx, s.player.y + dy));
}

function placeWarden(s: SimState, x: number, y: number): EnemyState {
  const e = createEnemy(s.nextEnemyId++, 'pylon-warden', { x, y }, HALL);
  s.enemies.push(e);
  return e;
}

describe('the punch', () => {
  it('with no tube, hits a Husk in the arc and misses one behind the player', () => {
    const s = bare();
    const ahead = placeHusk(s, P.x + 20, P.y);
    const behind = placeHusk(s, P.x - 20, P.y);
    punchToward(s, 100, 0);
    expect(ahead.health).toBe(enemyDef('husk').maxHealth - MELEE.damage);
    expect(behind.health).toBe(enemyDef('husk').maxHealth);
    expect(s.events.melees).toEqual([{ x: s.player.x, y: s.player.y, angle: 0, hits: [ahead.id] }]);
    expect(s.events.hits).toEqual([expect.objectContaining({ target: 'enemy', id: ahead.id, damage: MELEE.damage, damageType: 'physical', melee: true })]);
    expect(ahead.flash).toBeGreaterThan(0);
    expect(s.arrows).toHaveLength(0);
  });

  it('aims toward the cursor, at any angle', () => {
    const s = bare();
    const below = placeHusk(s, P.x, P.y + 22);
    punchToward(s, 0, 100);
    expect(s.events.melees[0]?.angle).toBeCloseTo(Math.PI / 2);
    expect(s.events.melees[0]?.hits).toEqual([below.id]);
    expect(s.player.facing).toBe('down');
  });

  it('misses a Husk beyond reach', () => {
    const s = bare();
    const half = enemyDef('husk').hurtbox.w / 2;
    const far = placeHusk(s, P.x + MELEE.reach + half + 3, P.y);
    punchToward(s, 100, 0);
    expect(far.health).toBe(enemyDef('husk').maxHealth);
    expect(s.events.melees).toEqual([expect.objectContaining({ hits: [] })]);
  });

  it('misses a Husk across a wall tile, though its hit box is within reach', () => {
    // A wall tile with open floor above and below it.
    const room = roomById(HALL);
    let wall: { tx: number; ty: number } | undefined;
    for (let ty = 1; ty < room.rows.length - 1 && !wall; ty++) {
      for (let tx = 0; tx < (room.rows[ty]?.length ?? 0) && !wall; tx++) {
        if (isSolid(room, tx, ty) && !isSolid(room, tx, ty - 1) && !isSolid(room, tx, ty + 1)) wall = { tx, ty };
      }
    }
    if (!wall) throw new Error('no one-tile wall in the room');
    const s = bare();
    const x = (wall.tx + 0.5) * TILE_SIZE;
    // Feet just above the wall, the Husk's feet just below it.
    movePlayer(s, x, wall.ty * TILE_SIZE - 5);
    const husk = placeHusk(s, x, (wall.ty + 1) * TILE_SIZE + 5);
    const { hurtbox } = enemyDef('husk');
    expect(husk.y + hurtbox.offsetY - hurtbox.h / 2 - s.player.y).toBeLessThan(MELEE.reach);
    punchToward(s, 0, 100);
    expect(husk.health).toBe(defOf(husk).maxHealth); // its own full health (041: scaled by its ring)
    expect(s.events.melees[0]?.hits).toEqual([]);
  });

  it('knocks a Husk straight away from the player', () => {
    const s = bare();
    const husk = placeHusk(s, P.x + 16, P.y + 12);
    punchToward(s, 100, 0);
    const [ux, uy] = [husk.x - s.player.x, husk.y - s.player.y].map((v) => v / Math.hypot(husk.x - s.player.x, husk.y - s.player.y)) as [number, number];
    expect(husk.knockTicks).toBe(MELEE.knockTicks);
    expect(husk.knockX).toBeCloseTo((ux * MELEE.knockback) / MELEE.knockTicks);
    expect(husk.knockY).toBeCloseTo((uy * MELEE.knockback) / MELEE.knockTicks);
  });

  it('the Warden takes the damage but no knockback', () => {
    const s = bare();
    const warden = placeWarden(s, P.x + 24, P.y);
    punchToward(s, 100, 0);
    expect(warden.health).toBe(enemyDef('pylon-warden').maxHealth - MELEE.damage);
    expect(warden.knockTicks).toBe(0);
    expect(s.events.melees[0]?.hits).toEqual([warden.id]);
  });

  it('repeats every MELEE.cooldownTicks while fire is held, and reports the cooldown', () => {
    const s = bare();
    const punches: number[] = [];
    for (let t = 1; t <= MELEE.cooldownTicks * 2 + 1; t++) {
      punchToward(s, 100, 0);
      if (s.events.melees.length > 0) punches.push(t);
      if (t === 1) expect(summarize(s).tube.meleeCooldown).toBe(MELEE.cooldownTicks);
    }
    expect(punches).toEqual([1, 1 + MELEE.cooldownTicks, 1 + MELEE.cooldownTicks * 2]);
    expect(summarize(s).events.melees).toHaveLength(1);
  });

  it('never punches in the foundry', () => {
    const s = bare();
    s.roomId = FOUNDRY_ROOM;
    run(s, 30, fireAt(s.player.x + 100, s.player.y));
    expect(s.tube.meleeCooldown).toBe(0);
  });

  it('never punches while rolling, then punches once the roll ends if still held', () => {
    const s = bare();
    const at: number[] = [];
    for (let t = 1; t <= ROLL_TICKS + 2; t++) {
      run(s, 1, { ...fireAt(s.player.x + 100, s.player.y), moveX: 1, dodge: t === 1 });
      if (s.events.melees.length > 0) at.push(t);
    }
    expect(at).toEqual([ROLL_TICKS + 1]);
  });

  it('never slows the walk', () => {
    const s = bare();
    run(s, 1, fireAt(s.player.x + 100, s.player.y));
    expect(s.tube.firing).toBe(false);
  });
});

describe('when the tube has nothing to fire', () => {
  it('empty entrances and no carried rounds punch', () => {
    const s = arena();
    s.inventory = {};
    expect(hasRoundToFire(s)).toBe(false);
    punchToward(s, 100, 0);
    expect(s.events.melees).toHaveLength(1);
    expect(s.events.shots).toHaveLength(0);
  });

  it('a carried round shoots instead', () => {
    const s = arena();
    s.inventory = { arrow: 1 };
    expect(hasRoundToFire(s)).toBe(true);
    punchToward(s, 100, 0);
    expect(s.events.melees).toHaveLength(0);
    expect(s.events.shots).toHaveLength(1);
  });

  it('a round in any open entrance shoots, whatever ammo is selected (024); a capped one punches', () => {
    const s = arena();
    s.inventory = {};
    Object.assign(s.link.entrances[1] ?? {}, { ammoId: 'bomb', count: 1 });
    expect(hasRoundToFire(s)).toBe(true);
    punchToward(s, 100, 0);
    expect([s.events.shots.length, s.events.melees.length]).toEqual([1, 0]);

    const capped = arena();
    capped.inventory = {};
    Object.assign(capped.link.entrances[0] ?? {}, { ammoId: 'arrow', count: 5 });
    expect(hasRoundToFire(capped)).toBe(false);
    punchToward(capped, 100, 0);
    expect([capped.events.shots.length, capped.events.melees.length]).toEqual([0, 1]);
    expect(capped.link.entrances[0]?.count).toBe(5);
  });

  it('no tube is never a round to fire', () => {
    const s = bare();
    expect(hasRoundToFire(s)).toBe(false);
  });

  it('the punch after the last shot waits out the tube interval', () => {
    const s = arena();
    s.inventory = { arrow: 1 };
    const punches: number[] = [];
    for (let t = 1; t <= 40; t++) {
      punchToward(s, 100, 0);
      if (s.events.melees.length > 0) punches.push(t);
    }
    expect(punches[0]).toBe(1 + 15);
  });
});

describe('the arc against a box', () => {
  const arc = { x: 0, y: 0, dirX: 1, dirY: 0, reach: 28, arcDegrees: 100 };
  it('hits a box whose near edge is just within reach, and not one just past it', () => {
    expect(sectorHitsBox(arc, { x: 37, y: 0, w: 20, h: 20 })).toBe(true);
    expect(sectorHitsBox(arc, { x: 39, y: 0, w: 20, h: 20 })).toBe(false);
  });
  it('hits a box the player stands in, whichever way the arc points', () => {
    expect(sectorHitsBox(arc, { x: -2, y: 0, w: 20, h: 20 })).toBe(true);
  });
  it('hits a box straddling an edge of the arc, and misses one just outside it', () => {
    // The upper edge runs at -50°: a box centred on it is hit; one well above it, within reach, is not.
    const a = (-50 * Math.PI) / 180;
    expect(sectorHitsBox(arc, { x: Math.cos(a) * 20, y: Math.sin(a) * 20, w: 4, h: 4 })).toBe(true);
    expect(sectorHitsBox(arc, { x: 2, y: -20, w: 4, h: 4 })).toBe(false);
  });
  it('hits a box the arc cuts across, with no corner inside it', () => {
    // A tall thin box crossing the arc's rim, its corners all outside the sector.
    expect(sectorHitsBox(arc, { x: 27, y: 0, w: 2, h: 100 })).toBe(true);
  });
});

describe('boss flags', () => {
  it('every enemy has one, and only the Pylon Warden and the Bulwark (034) are bosses', () => {
    const bosses = Object.values(ENEMIES)
      .filter((e) => e.boss)
      .map((e) => e.id);
    expect(bosses).toEqual(['pylon-warden', 'bulwark']);
    for (const e of Object.values(ENEMIES)) expect(typeof e.boss).toBe('boolean');
  });
});
