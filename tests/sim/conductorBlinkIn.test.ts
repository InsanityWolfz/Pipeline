import { describe, expect, it } from 'vitest';
import { standPoint } from '../../src/data/stormcrownSites';
import { createArrow } from '../../src/sim/arrows';
import { blastArea } from '../../src/sim/blast';
import { grounded, hitRod, rodPoint, standingRods, stormShielded } from '../../src/sim/conductorRods';
import { targetable, type EnemyState } from '../../src/sim/enemies';
import { punch } from '../../src/sim/melee';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { movePlayer, run } from './fight';
import { CONDUCTOR, spire, topUp } from './spire';

// The Conductor's blink-in window (068): for `blinkInTicks` (30) after he appears at a rod he can't be hit. Shots pass
// through him as through a burrowed enemy (nothing clangs: he isn't there yet); Bursts and punches find nothing; his
// rods still take hits. A homing round locked on him keeps following through the window and lands once it ends.
// Grounded (fewer than 2 standing) he can't blink, so there is no window.

const PHYSICAL = { knock: 0, flash: true, damageType: 'physical' } as const;

/** Keeps the player up and his attacks held off. */
const calm = (s: SimState, c: EnemyState) => (): Record<string, never> => {
  topUp(s);
  c.conductor.attackCooldowns = [1e6, 1e6, 1e6];
  return {};
};

/** Awake, with only his own rod and `to` standing (shield down), then blinked to `to`: the tick he appears. */
function blinkedIn(to = 2): { s: SimState; c: EnemyState } {
  const { s, c } = spire();
  run(s, 1, calm(s, c));
  for (const i of c.conductor.rods.keys()) if (i !== c.conductor.rod && i !== to) hitRod(s, c, i, CONDUCTOR.rods.health, PHYSICAL);
  expect([standingRods(c), stormShielded(c), grounded(c)]).toEqual([2, false, false]);
  c.conductor.blinkTo = to;
  c.conductor.blinkWarn = 1;
  run(s, 1, calm(s, c));
  expect(s.events.blinks).toHaveLength(1);
  expect({ x: c.x, y: c.y }).toEqual(standPoint(to));
  // No blink again while the test runs.
  c.conductor.blinkCooldown = 1e6;
  return { s, c };
}

describe('the blink-in window (068)', () => {
  it('lasts `blinkInTicks` (30) from the tick he appears: untargetable, then targetable', () => {
    expect(CONDUCTOR.blinkInTicks).toBe(30);
    const { s, c } = blinkedIn();
    expect(c.conductor.blinkIn).toBe(CONDUCTOR.blinkInTicks);
    expect(summarize(s).bosses).toEqual([expect.objectContaining({ enemyId: 'conductor', blinkIn: CONDUCTOR.blinkInTicks })]);
    expect(targetable(c)).toBe(false);
    run(s, CONDUCTOR.blinkInTicks - 1, calm(s, c));
    expect(targetable(c)).toBe(false);
    run(s, 1, calm(s, c));
    expect([c.conductor.blinkIn, targetable(c)]).toEqual([0, true]);
  });

  it('a Burst and a punch find nothing in the window (no damage, no clang); after it they land', () => {
    const { s, c } = blinkedIn();
    blastArea(s, c.roomId, c.x, c.y, 30, 50, 'physical');
    movePlayer(s, c.x, c.y + 20);
    s.tube.meleeCooldown = 0;
    s.tube.fireCooldown = 0;
    punch(s, 0, -1);
    expect(c.health).toBe(CONDUCTOR.maxHealth);
    expect(s.events.blocked).toEqual([]);
    run(s, CONDUCTOR.blinkInTicks, calm(s, c));
    blastArea(s, c.roomId, c.x, c.y, 30, 50, 'physical');
    expect(c.health).toBe(CONDUCTOR.maxHealth - 50);
  });

  it('a shot passes through him in the window, as through a burrowed enemy', () => {
    const { s, c } = blinkedIn();
    const y = c.y + CONDUCTOR.hurtbox.offsetY;
    const bolt = createArrow(s.nextArrowId++, 'ley-bolt', c.roomId, c.x - 30, y, 1, 0);
    s.arrows.push(bolt);
    // Through his 40 px body in the window (it flies about 5 px a tick).
    run(s, 20, calm(s, c));
    expect(c.conductor.blinkIn).toBeGreaterThan(0);
    expect(c.health).toBe(CONDUCTOR.maxHealth);
    expect(bolt.x).toBeGreaterThan(c.x + CONDUCTOR.hurtbox.w / 2);
    expect(s.arrows).toContain(bolt);
  });

  it('his rods still take hits in the window', () => {
    const { s, c } = blinkedIn();
    const p = rodPoint(c.conductor.rod);
    blastArea(s, c.roomId, p.x, p.y, 10, 50, 'physical');
    expect(c.conductor.rods[c.conductor.rod]?.health).toBe(CONDUCTOR.rods.health - 50);
  });

  it('a homing round locked on him follows him through the window and lands once it ends', () => {
    const { s, c } = blinkedIn();
    const y = c.y + CONDUCTOR.hurtbox.offsetY;
    // Locked on at launch, flying straight at his body from just beside it: it reaches him inside the window.
    const bolt = createArrow(s.nextArrowId++, 'ley-bolt+homing', c.roomId, c.x - 40, y, 1, 0, c.id);
    s.arrows.push(bolt);
    let landed = -1;
    for (let t = 1; t <= 180 && landed < 0; t++) {
      run(s, 1, calm(s, c));
      if (t < CONDUCTOR.blinkInTicks) expect(bolt.targetId, `tick ${t}`).toBe(c.id);
      if (c.health < CONDUCTOR.maxHealth) landed = t;
    }
    expect(landed).toBeGreaterThanOrEqual(CONDUCTOR.blinkInTicks);
  });

  it('grounded (fewer than 2 standing) he never blinks, so no window opens', () => {
    const { s, c } = spire();
    run(s, 1, calm(s, c));
    for (const i of c.conductor.rods.keys()) if (i !== c.conductor.rod) hitRod(s, c, i, CONDUCTOR.rods.health, PHYSICAL);
    expect(grounded(c)).toBe(true);
    for (let t = 0; t < 600; t++) {
      run(s, 1, calm(s, c));
      expect(s.events.blinks).toEqual([]);
      expect(c.conductor.blinkIn).toBe(0);
    }
  });
});
