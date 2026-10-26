import { describe, expect, it } from 'vitest';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { CROWN_SPIRE, standPoint } from '../../src/data/stormcrownSites';
import { hitRod } from '../../src/sim/conductorRods';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { lines } from './builds';
import { movePlayer, placeHusk, run, volleyAt } from './fight';
import { CONDUCTOR, spire, SPIRE_MIDDLE, topUp } from './spire';

// The Conductor's blink (064): every 240 ticks (150 enraged) it picks another standing rod by the seeded rng, never
// its own; that rod's 45-tick warning, then it vanishes and appears there. Shots at its old place miss; a homing round
// locked on it follows, and one that has lost its target re-locks onto the nearest within its lock radius (one that
// never locked flies straight). Grounded (fewer than 2 standing rods), it can't blink until one regrows.

const PHYSICAL = { knock: 0, flash: true, damageType: 'physical' } as const;

/** Its attacks held off, so only its blink runs. */
const noAttacks = (c: EnemyState): void => {
  c.conductor.attackCooldowns = [1e6, 1e6, 1e6];
};

/** A tick's command that keeps the player up. */
const safe = (s: SimState): Record<string, never> => {
  topUp(s);
  return {};
};

describe('the blink', () => {
  it('picks another standing rod after 240 ticks, warns 45, then moves there', () => {
    const { s, c } = spire();
    noAttacks(c);
    run(s, 1);
    const from = { x: c.x, y: c.y };
    let warnedAt = -1;
    for (let t = 1; t <= 240 && warnedAt < 0; t++) {
      run(s, 1, safe);
      if (s.events.blinkWarns.length > 0) warnedAt = t;
    }
    expect(warnedAt).toBeGreaterThanOrEqual(CONDUCTOR.blink.everyTicks - 2);
    const to = c.conductor.blinkTo;
    expect(to).not.toBe(CROWN_SPIRE.startRod);
    expect(to).toBeGreaterThanOrEqual(0);
    run(s, CONDUCTOR.blink.warnTicks - 1, safe);
    expect({ x: c.x, y: c.y }).toEqual(from);
    run(s, 1, safe);
    expect(s.events.blinks).toEqual([expect.objectContaining({ id: c.id, rod: to })]);
    expect({ x: c.x, y: c.y }).toEqual(standPoint(to));
    expect([c.conductor.rod, c.conductor.blinkTo]).toEqual([to, -1]);
  });

  it('never picks its own rod or a broken one; the pick is the seed’s, the same twice', () => {
    const picks = (seed: number): number[] => {
      const { s, c } = spire(0, seed);
      noAttacks(c);
      run(s, 1);
      for (const i of [0, 2]) hitRod(s, c, i, 200, PHYSICAL);
      const out: number[] = [];
      for (let t = 0; t < 1100; t++) {
        const own = c.conductor.rod;
        run(s, 1, safe);
        for (const w of s.events.blinkWarns) {
          expect(w.rod).not.toBe(own);
          expect([0, 2]).not.toContain(w.rod);
          out.push(w.rod);
        }
      }
      return out;
    };
    for (const seed of [1, 2, 3, 4]) {
      const a = picks(seed);
      expect(a.length).toBeGreaterThanOrEqual(3);
      expect(picks(seed)).toEqual(a);
    }
  });

  it('enraged below half health, it picks every 150 ticks', () => {
    const { s, c } = spire();
    noAttacks(c);
    run(s, 1);
    c.health = CONDUCTOR.maxHealth / 2 - 1;
    const at: number[] = [];
    for (let t = 1; t <= 700; t++) {
      run(s, 1, safe);
      if (s.events.blinkWarns.length > 0) at.push(t);
    }
    expect(c.enraged).toBe(true);
    expect(at.slice(1).map((t, i) => t - (at[i] ?? 0))).toEqual(at.slice(1).map(() => CONDUCTOR.enrage.blinkTicks));
  });

  it('grounded with fewer than 2 standing rods, it waits for one to regrow', () => {
    const { s, c } = spire();
    noAttacks(c);
    run(s, 1);
    for (const i of [0, 1, 2, 3, 4]) hitRod(s, c, i, 200, PHYSICAL);
    run(s, 600, safe);
    expect(s.events.blinkWarns).toEqual([]);
    let warned = false;
    for (let t = 0; t < CONDUCTOR.rods.regrowTicks && !warned; t++) {
      run(s, 1, safe);
      warned = s.events.blinkWarns.length > 0;
    }
    expect(warned).toBe(true);
  });

  it('a warned rod broken during the warning calls the blink off, and it picks again', () => {
    const { s, c } = spire();
    noAttacks(c);
    run(s, 1);
    c.conductor.blinkCooldown = 1;
    run(s, 1, safe);
    const first = c.conductor.blinkTo;
    expect(first).toBeGreaterThanOrEqual(0);
    hitRod(s, c, first, 200, PHYSICAL);
    run(s, 1, safe);
    expect(c.conductor.blinkTo).not.toBe(first);
    expect(s.events.blinkWarns).toHaveLength(1);
  });
});

describe('shots and the blink', () => {
  it('a straight shot at its old place misses once it has blinked', () => {
    const { s, c } = spire();
    lines(s, 'arrow');
    noAttacks(c);
    run(s, 1);
    // From across its rod's tangent, so the shot passes its old place and no rod.
    const at = { x: c.x, y: c.y };
    movePlayer(s, at.x - 200, at.y - 40);
    run(s, 1, volleyAt(at.x, at.y - 24 - 40 / 5));
    c.conductor.blinkTo = 2;
    c.conductor.blinkWarn = 1;
    run(s, 40, safe);
    expect(c.conductor.rod).toBe(2);
    expect(c.health).toBe(CONDUCTOR.maxHealth);
  });

  it('a homing round locked on it follows it after a blink', () => {
    const { s, c } = spire();
    lines(s, 'ley-bolt+homing');
    noAttacks(c);
    run(s, 1);
    movePlayer(s, c.x - 200, c.y + 60);
    run(s, 1, volleyAt(c.x, c.y));
    const bolt = s.arrows[0];
    expect(bolt?.targetId).toBe(c.id);
    c.conductor.blinkTo = 4;
    c.conductor.blinkWarn = 1;
    run(s, 1, safe);
    expect(c.conductor.rod).toBe(4);
    expect(s.arrows[0]?.targetId).toBe(c.id);
  });

  it('a homing round that never locked flies straight past it: no re-lock', () => {
    const { s, c } = spire();
    lines(s, 'ley-bolt+homing');
    noAttacks(c);
    run(s, 1);
    // Aimed past it, far from it at launch: no lock; its flight passes within 64 px of it.
    movePlayer(s, c.x - 130, c.y - 40);
    run(s, 1, volleyAt(c.x + 400, c.y - 40));
    expect(s.arrows[0]?.targetId).toBeNull();
    for (let t = 0; t < 120 && s.arrows.length > 0; t++) {
      run(s, 1, safe);
      expect(s.arrows[0]?.targetId ?? null).toBeNull();
    }
  });

  /** A homing round fired at a Husk beside the spire's middle, locked on it, then the Husk gone: a lost target. */
  const lostBolt = () => {
    const { s, c } = spire();
    lines(s, 'ley-bolt+homing');
    noAttacks(c);
    run(s, 1);
    const husk = placeHusk(s, SPIRE_MIDDLE.x, SPIRE_MIDDLE.y + 40);
    run(s, 1, volleyAt(husk.x, husk.y));
    const bolt = s.arrows[0];
    if (!bolt) throw new Error('no bolt');
    expect(bolt.targetId).toBe(husk.id);
    s.enemies = s.enemies.filter((e) => e !== husk);
    return { s, c, bolt };
  };

  it('a homing round that lost its target re-locks onto it when it comes within its lock radius', () => {
    const { s, c, bolt } = lostBolt();
    // Set 30 px below its feet, flying away from it: clear of its hurtbox and its rods.
    Object.assign(bolt, { x: c.x, y: c.y + 30, dx: 0, dy: 1 });
    run(s, 1, safe);
    expect(s.arrows[0]?.targetId).toBe(c.id);
  });

  it('re-locks onto the nearest Conductor in reach, not the first in the list', () => {
    const { s, c, bolt } = lostBolt();
    const far = createEnemy(s.nextEnemyId++, 'conductor', { x: c.x + 50, y: c.y + 30 }, c.roomId, c.group);
    s.enemies.unshift(far);
    Object.assign(bolt, { x: c.x, y: c.y + 30, dx: 0, dy: 1 });
    run(s, 1, safe);
    expect(s.arrows[0]?.targetId).toBe(c.id);
  });

  it('re-locks only in the player’s room', () => {
    const { s, c, bolt } = lostBolt();
    Object.assign(bolt, { x: c.x, y: c.y + 30, dx: 0, dy: 1 });
    s.roomId = FOUNDRY_ROOM;
    run(s, 1, safe);
    expect(s.arrows[0]?.targetId ?? null).toBeNull();
  });
});
