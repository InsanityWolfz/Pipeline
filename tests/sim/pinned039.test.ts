import { describe, expect, it } from 'vitest';
import { ammoDef } from '../../src/data/ammo';
import { TALENT_START } from '../../src/data/talents';
import { chillEnemy } from '../../src/sim/cold';
import { createEnemy, damageEnemy, type EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { arena, fireAt, HALL, placeHusk, PLAYER_AT, run, runUntil } from './fight';

// 039 pins today's numbers before the keyword refactor (spec 039: "the numbers stay as
// they are"). Everything here must hold after it; the spec's listed changes are pinned in
// their own describe and move in the commit that changes them.

const taking = (s: SimState, ...ids: string[]): SimState => {
  s.talents = [TALENT_START, ...ids];
  return s;
};

const FAR = { x: PLAYER_AT.x + 1000, y: PLAYER_AT.y };

/** The damage the first round of `item` leaves the tube with, `slot` selected, these talents taken. */
function launchDamage(item: string, slot: string, ...talents: string[]): number {
  const s = taking(arena(), ...talents);
  s.inventory = { [item]: 5 };
  run(s, 1, { selectAmmo: slot });
  run(s, 1, fireAt(FAR.x, FAR.y));
  const shot = s.arrows[0] ?? s.bombs[0];
  if (!shot) throw new Error('no shot');
  return shot.damage;
}

/** A Husk held in place: a wind-up that never lands. */
function still(s: SimState, x: number, y: number): EnemyState {
  const e = placeHusk(s, x, y);
  e.mode = 'windup';
  e.modeTicks = -10_000;
  return e;
}

/** The ticks (from 1) on which a shot leaves the tube over `ticks` of held fire, `item` carried in plenty. */
function shotTicks(item: string, slot: string, ticks: number, ...talents: string[]): number[] {
  const s = taking(arena(), ...talents);
  s.inventory = { [item]: 999 };
  run(s, 1, { selectAmmo: slot });
  const out: number[] = [];
  for (let t = 1; t <= ticks; t++) {
    run(s, 1, fireAt(FAR.x, FAR.y));
    if (s.events.shots.length > 0) out.push(t);
  }
  return out;
}

/** Shots every `step` ticks from tick 1. */
const every = (step: number, ticks: number): number[] => Array.from({ length: Math.ceil(ticks / step) }, (_, i) => 1 + i * step).filter((t) => t <= ticks);

describe('039 pins: launch damage', () => {
  it('arrows and ley bolts with each damage talent', () => {
    expect(launchDamage('arrow', 'arrow')).toBe(10);
    expect(launchDamage('arrow', 'arrow', 'a1')).toBeCloseTo(11, 9);
    expect(launchDamage('arrow', 'arrow', 'a1', 't3')).toBeCloseTo(11.6, 9);
    expect(launchDamage('arrow+frost', 'arrow', 'a1', 't3')).toBeCloseTo(11.6, 9);
    expect(launchDamage('arrow', 'arrow', 'l1', 'b1')).toBe(10);
    expect(launchDamage('ley-bolt', 'ley-bolt')).toBe(14);
    expect(launchDamage('ley-bolt', 'ley-bolt', 'l1', 't3')).toBeCloseTo(16.24, 9);
    expect(launchDamage('ley-bolt+homing', 'ley-bolt', 'l1')).toBeCloseTo(15.4, 9);
  });

  it('bombs and landmines: Black Powder reaches bombs, not landmines; Hard Bore both', () => {
    expect(launchDamage('bomb', 'bomb')).toBe(15);
    expect(launchDamage('bomb', 'bomb', 'b1', 't3')).toBeCloseTo(17.4, 9);
    expect(launchDamage('bomb+cluster', 'bomb', 'b1')).toBeCloseTo(16.5, 9);
    expect(launchDamage('landmine', 'landmine')).toBe(60);
    expect(launchDamage('landmine', 'landmine', 'b1')).toBe(60);
    expect(launchDamage('landmine', 'landmine', 't3')).toBeCloseTo(63.6, 9);
  });
});

describe('039 pins: children and statuses', () => {
  it('a cluster bomb’s bomblets: 8 × the bomb bonus, 20 px (23 with Wide Casing)', () => {
    for (const [talents, damage, radius] of [
      [[], 8, 20],
      [['b1', 't3'], 9.28, 20],
      [['b2'], 8, 23],
    ] as const) {
      const s = taking(arena(), ...talents);
      s.inventory = { 'bomb+cluster': 2 };
      run(s, 1, { selectAmmo: 'bomb' });
      run(s, 1, fireAt(PLAYER_AT.x + 100, PLAYER_AT.y));
      runUntil(s, () => s.mines.bomblets.length > 0, 80);
      const b = s.mines.bomblets[0];
      expect(b?.damage).toBeCloseTo(damage, 9);
      expect(b?.radius).toBeCloseTo(radius, 9);
    }
  });

  it('a split bolt’s shards: 5 (7 with Splinter), 4 × the ley bonus each', () => {
    const shards = (...talents: string[]) => {
      const s = taking(arena(), ...talents);
      s.inventory = { 'ley-bolt+split': 5 };
      still(s, PLAYER_AT.x + 100, PLAYER_AT.y);
      run(s, 1, { selectAmmo: 'ley-bolt' });
      run(s, 1, fireAt(FAR.x, FAR.y));
      runUntil(s, () => s.arrows.some((a) => a.ammoId !== 'ley-bolt+split'), 60);
      return s.arrows.filter((a) => a.ammoId !== 'ley-bolt+split');
    };
    expect(shards()).toHaveLength(5);
    expect(shards('l3')).toHaveLength(7);
    expect(shards('l1', 't3')[0]?.damage).toBeCloseTo(4.64, 9);
  });

  it('Rimecraft: 3 cold hits freeze for 120 ticks (a boss 75); without it 4 hits, 90 (a boss 45)', () => {
    const freeze = (enemyId: string, ...talents: string[]): [number, number] => {
      const s = taking(arena(), ...talents);
      const e = createEnemy(s.nextEnemyId++, enemyId, { x: PLAYER_AT.x + 100, y: PLAYER_AT.y }, HALL);
      s.enemies.push(e);
      let hits = 0;
      while (e.frozen === 0 && hits < 10) {
        chillEnemy(s, e);
        hits += 1;
      }
      return [hits, e.frozen];
    };
    expect(freeze('husk')).toEqual([4, 90]);
    expect(freeze('husk', 'a3')).toEqual([3, 120]);
    expect(freeze('pylon-warden')).toEqual([4, 45]);
    expect(freeze('pylon-warden', 'a3')).toEqual([3, 75]);
  });

  it('Seeker’s Lens: a homing bolt turns 5.2° a tick (4 without)', () => {
    const turn = (...talents: string[]) => {
      const s = taking(arena(), ...talents);
      s.inventory = { 'ley-bolt+homing': 5 };
      still(s, PLAYER_AT.x + 150, PLAYER_AT.y);
      run(s, 1, { selectAmmo: 'ley-bolt' });
      run(s, 1, fireAt(PLAYER_AT.x + 150, PLAYER_AT.y - 50));
      const bolt = s.arrows[0];
      if (!bolt) throw new Error('no bolt');
      const before = Math.atan2(bolt.dy, bolt.dx);
      run(s, 1);
      return ((Math.atan2(bolt.dy, bolt.dx) - before) * 180) / Math.PI;
    };
    expect(turn()).toBeCloseTo(4, 6);
    expect(turn('l2')).toBeCloseTo(5.2, 6);
  });
});

describe('039 pins: timing', () => {
  it('held fire with no bonus: a shot every fireTicks, tick for tick', () => {
    expect(shotTicks('arrow', 'arrow', 600)).toEqual(every(ammoDef('arrow').fireTicks, 600));
    expect(shotTicks('ley-bolt', 'ley-bolt', 600)).toEqual(every(ammoDef('ley-bolt').fireTicks, 600));
    expect(shotTicks('bomb', 'bomb', 600)).toEqual(every(ammoDef('bomb').fireTicks, 600));
    expect(shotTicks('landmine', 'landmine', 600)).toEqual(every(ammoDef('landmine').fireTicks, 600));
  });

  it('a fed entrance with no bonus: a shot every fireTicks, tick for tick', () => {
    const s = arena();
    s.link.attuned = true;
    const e = s.link.entrances[1];
    if (!e) throw new Error('no entrance');
    Object.assign(e, { open: true, ammoId: 'ley-bolt', count: 999 });
    const out: number[] = [];
    for (let t = 1; t <= 600; t++) {
      run(s, 1, fireAt(FAR.x, FAR.y));
      if (s.events.entranceFires.length > 0) out.push(t);
    }
    expect(out).toEqual(every(ammoDef('ley-bolt').fireTicks, 600));
  });

  it('a bomb lands on the same tick with and without Swift Arc’s quarter off', () => {
    const lands = (...talents: string[]) => {
      const s = taking(arena(), ...talents);
      s.inventory = { bomb: 2 };
      run(s, 1, { selectAmmo: 'bomb' });
      run(s, 1, fireAt(PLAYER_AT.x + 150, PLAYER_AT.y));
      return runUntil(s, () => s.events.bursts.length > 0, 120);
    };
    expect(lands()).toBe(42);
    expect(lands('b3')).toBe(32);
  });
});

describe('039 pins: knockback', () => {
  it('an arrow pushes each non-boss its own distance over 4 ticks', () => {
    const push = (enemyId: string): number => {
      const s = arena();
      const e = createEnemy(s.nextEnemyId++, enemyId, { x: PLAYER_AT.x + 200, y: PLAYER_AT.y }, HALL);
      s.enemies.push(e);
      damageEnemy(s, e, 1, 1, 0);
      return Math.hypot(e.knockX, e.knockY) * e.knockTicks;
    };
    const pushes = Object.fromEntries(['husk', 'wisp', 'charger', 'burrower', 'shardback', 'sniper', 'bulwark'].map((id) => [id, push(id)]));
    expect(pushes.husk).toBeCloseTo(6, 9);
    expect(pushes.wisp).toBeCloseTo(8, 9);
    expect(pushes.charger).toBeCloseTo(3, 9);
    expect(pushes.burrower).toBeCloseTo(6, 9);
    expect(pushes.shardback).toBeCloseTo(2, 9);
    expect(pushes.sniper).toBeCloseTo(6, 9);
    expect(pushes.bulwark).toBe(0);
  });
});

describe('039 pins: what the spec changes (each flips in its own commit)', () => {
  it('today the Warden is pushed 1 px by an arrow', () => {
    const s = arena();
    const e = createEnemy(s.nextEnemyId++, 'pylon-warden', { x: PLAYER_AT.x + 200, y: PLAYER_AT.y }, HALL);
    s.enemies.push(e);
    damageEnemy(s, e, 1, 1, 0);
    expect(Math.hypot(e.knockX, e.knockY) * e.knockTicks).toBeCloseTo(1, 9);
  });

  it('039 changed: Quick Nock’s interval is exactly 15 / 1.1 (it was rounded to 14 ticks: 1, 15, 29, 43)', () => {
    const ticks = shotTicks('arrow', 'arrow', 100, 'a2');
    expect(ticks.slice(0, 4)).toEqual([1, 15, 29, 42]);
  });
});
