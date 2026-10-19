import { describe, expect, it } from 'vitest';
import { straightAmmo } from '../../src/data/ammo';
import { BLASTFLETCH, OVERPRESSURE, SHATTERPOINT, TALENT_START } from '../../src/data/talents';
import { COLD } from '../../src/data/tags';
import { createArrow } from '../../src/sim/arrows';
import { chargeGround, overpressureBonus } from '../../src/sim/keystones';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { fireTicksOf } from '../../src/sim/tube';
import { arena, fireAt, HUSK, placeHusk, PLAYER_AT, run, runUntil } from './fight';

// The keystones (037): Blastfletch charges an arrow through a bomb's blast, Shatterpoint
// shatters a frozen enemy with a ley bolt, Overpressure ramps the fire rate while fire is held.

const taking = (s: SimState, ...ids: string[]): SimState => {
  s.talents = [TALENT_START, ...ids];
  return s;
};

/** A Husk held in place (a wind-up that never lands); hits don't end it. */
function still(s: SimState, x: number, y: number) {
  const e = placeHusk(s, x, y);
  e.mode = 'windup';
  e.modeTicks = -10_000;
  return e;
}

const ARROW = straightAmmo('arrow');

/** An arrow already flying right from `x` on the player's row. */
function flying(s: SimState, x: number, ammoId = 'arrow') {
  const a = createArrow(s.nextArrowId++, ammoId, s.roomId, x, PLAYER_AT.y, 1, 0);
  s.arrows.push(a);
  return a;
}

describe('Blastfletch', () => {
  it('a bomb’s blast charges its ground for 20 ticks, with an event; nothing without the keystone', () => {
    const s = taking(arena(), 'k1');
    s.inventory = { bomb: 2 };
    run(s, 1, { selectAmmo: 'bomb' });
    run(s, 1, fireAt(PLAYER_AT.x + 100, PLAYER_AT.y));
    runUntil(s, () => s.events.bursts.length > 0, 60);
    expect(s.events.blastCharges).toEqual([{ id: 0, x: PLAYER_AT.x + 100, y: PLAYER_AT.y, radius: 48 }]);
    expect(summarize(s).blastCharges).toEqual([{ id: 0, x: PLAYER_AT.x + 100, y: PLAYER_AT.y, radius: 48, ticks: BLASTFLETCH.chargeTicks }]);
    run(s, BLASTFLETCH.chargeTicks);
    expect(s.blastCharges).toHaveLength(1);
    run(s, 1);
    expect(s.blastCharges).toEqual([]);
    const plain = arena();
    plain.inventory = { bomb: 2 };
    run(plain, 1, { selectAmmo: 'bomb' });
    run(plain, 1, fireAt(PLAYER_AT.x + 100, PLAYER_AT.y));
    runUntil(plain, () => plain.events.bursts.length > 0, 60);
    expect(plain.blastCharges).toEqual([]);
  });

  it('an arrow through a charged area hits +50% on the next enemy and bursts 24 px there, spending the charge; it pierces on', () => {
    const s = taking(arena(), 'k1');
    chargeGround(s, { roomId: s.roomId, x: PLAYER_AT.x + 40, y: PLAYER_AT.y, radius: 48 });
    const first = still(s, PLAYER_AT.x + 160, PLAYER_AT.y);
    const beside = still(s, PLAYER_AT.x + 160, PLAYER_AT.y + 20);
    const far = still(s, PLAYER_AT.x + 220, PLAYER_AT.y);
    const a = flying(s, PLAYER_AT.x + 10);
    runUntil(s, () => a.charged, 10);
    runUntil(s, () => s.events.chargedBursts.length > 0, 30);
    expect(s.events.chargedBursts).toEqual([{ x: expect.any(Number), y: PLAYER_AT.y, radius: BLASTFLETCH.burstRadius }]);
    expect(first.health).toBeCloseTo(HUSK.maxHealth - ARROW.damage * BLASTFLETCH.damageScale, 9);
    // The burst hits the one beside for the charged arrow's damage.
    expect(beside.health).toBeCloseTo(HUSK.maxHealth - ARROW.damage * BLASTFLETCH.damageScale, 9);
    expect(a.charged).toBe(false);
    // The arrow pierces on, at its plain damage, with nothing charged left.
    runUntil(s, () => far.health < HUSK.maxHealth, 30);
    expect(far.health).toBeCloseTo(HUSK.maxHealth - ARROW.damage, 9);
  });

  it('charges neither an arrow outside the area, a ley bolt, nor anything without the keystone', () => {
    const s = taking(arena(), 'k1');
    chargeGround(s, { roomId: s.roomId, x: PLAYER_AT.x + 40, y: PLAYER_AT.y + 200, radius: 48 });
    const a = flying(s, PLAYER_AT.x + 10);
    run(s, 10);
    expect(a.charged).toBe(false);
    const t = taking(arena(), 'k1');
    chargeGround(t, { roomId: t.roomId, x: PLAYER_AT.x + 40, y: PLAYER_AT.y, radius: 48 });
    const bolt = flying(t, PLAYER_AT.x + 10, 'ley-bolt');
    run(t, 5);
    expect(bolt.charged).toBe(false);
    const u = arena();
    chargeGround(u, { roomId: u.roomId, x: PLAYER_AT.x + 40, y: PLAYER_AT.y, radius: 48 });
    expect(u.blastCharges).toEqual([]);
  });
});

describe('Shatterpoint', () => {
  it('a ley bolt on a frozen enemy ends the freeze for double damage and bursts 4 cold ice shards for half', () => {
    const s = taking(arena(), 'k2');
    const e = still(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    e.frozen = 60;
    const bolt = flying(s, PLAYER_AT.x + 40, 'ley-bolt');
    runUntil(s, () => s.events.shatters.length > 0, 30);
    expect(s.events.shatters).toEqual([{ id: e.id, x: e.x, y: e.y }]);
    expect(e.frozen).toBe(0);
    expect(e.refreeze).toBe(COLD.refreezeTicks);
    expect(s.events.thaws).toEqual([{ id: e.id, x: e.x, y: e.y }]);
    const BOLT = straightAmmo('ley-bolt');
    expect(e.health).toBeCloseTo(HUSK.maxHealth - BOLT.damage * SHATTERPOINT.damageScale, 9);
    const shards = s.arrows.filter((a) => a.ammoId === SHATTERPOINT.projectile);
    expect(shards).toHaveLength(SHATTERPOINT.shards);
    for (const sh of shards) expect(sh).toMatchObject({ damage: BOLT.damage * SHATTERPOINT.shardScale, damageType: 'cold', range: SHATTERPOINT.range, speed: SHATTERPOINT.speed, hitIds: [e.id], pierce: false });
    expect(s.arrows).not.toContain(bolt);
  });

  it('does nothing on an enemy that isn’t frozen, nor without the keystone, nor for an arrow', () => {
    const s = taking(arena(), 'k2');
    still(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    flying(s, PLAYER_AT.x + 40, 'ley-bolt');
    runUntil(s, () => s.events.hits.length > 0, 30);
    expect(s.events.shatters).toEqual([]);
    const t = arena();
    const f = still(t, PLAYER_AT.x + 100, PLAYER_AT.y);
    f.frozen = 60;
    flying(t, PLAYER_AT.x + 40, 'ley-bolt');
    runUntil(t, () => t.events.hits.length > 0, 30);
    expect(t.events.shatters).toEqual([]);
    expect(f.frozen).toBeGreaterThan(0);
    const u = taking(arena(), 'k2');
    const g = still(u, PLAYER_AT.x + 100, PLAYER_AT.y);
    g.frozen = 60;
    flying(u, PLAYER_AT.x + 40, 'arrow');
    runUntil(u, () => u.events.hits.length > 0, 30);
    expect(u.events.shatters).toEqual([]);
  });
});

describe('Overpressure', () => {
  it('ramps the fire rate up to +25% over 120 ticks of held fire, and resets when fire is released', () => {
    const s = taking(arena(), 'k3');
    s.inventory = { arrow: 999 };
    const aim = fireAt(PLAYER_AT.x + 1000, PLAYER_AT.y);
    expect(fireTicksOf(s, 'arrow')).toBe(15);
    run(s, 60, aim);
    expect(s.tube.overpressure).toBe(60);
    expect(overpressureBonus(s)).toBeCloseTo(OVERPRESSURE.maxBonus / 2, 9);
    run(s, 100, aim);
    expect(s.tube.overpressure).toBe(OVERPRESSURE.rampTicks);
    expect(overpressureBonus(s)).toBeCloseTo(OVERPRESSURE.maxBonus, 9);
    expect(fireTicksOf(s, 'arrow')).toBe(12);
    expect(summarize(s).overpressure).toEqual({ ticks: OVERPRESSURE.rampTicks, bonus: OVERPRESSURE.maxBonus });
    run(s, 1);
    expect(s.tube.overpressure).toBe(0);
    expect(fireTicksOf(s, 'arrow')).toBe(15);
  });

  it('fires more often once ramped: more arrows over the same held stretch', () => {
    const shots = (s: SimState) => {
      s.inventory = { arrow: 999 };
      let n = 0;
      for (let t = 0; t < 600; t++) {
        run(s, 1, fireAt(PLAYER_AT.x + 1000, PLAYER_AT.y));
        n += s.events.shots.length;
      }
      return n;
    };
    expect(shots(taking(arena(), 'k3'))).toBeGreaterThan(shots(arena()));
  });

  it('doesn’t ramp without the keystone', () => {
    const s = arena();
    s.inventory = { arrow: 99 };
    run(s, 60, fireAt(PLAYER_AT.x + 1000, PLAYER_AT.y));
    expect(s.tube.overpressure).toBe(0);
  });
});
