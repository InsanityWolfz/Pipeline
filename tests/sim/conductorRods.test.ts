import { describe, expect, it } from 'vitest';
import { MELEE } from '../../src/data/combat';
import { CROWN_SPIRE } from '../../src/data/stormcrownSites';
import { blastArea } from '../../src/sim/blast';
import { partAt } from '../../src/sim/bossParts';
import { grounded, hitRod, rodAt, rodBox, rodPoint, standingRods } from '../../src/sim/conductorRods';
import { punch } from '../../src/sim/melee';
import { lines } from './builds';
import { movePlayer, run, volleyAt } from './fight';
import type { SimState } from '../../src/sim/state';
import { CONDUCTOR, spire, SPIRE_MIDDLE, topUp } from './spire';

// The Conductor's six arena rods (064): one at each socket round the spire's middle, each with its own hurtbox and
// 200 health, hit by rounds, Bursts and punches before its body (the Forgewright's part routing); a broken rod is shot
// through and regrows whole after 1200 ticks. With fewer than 2 standing, it is grounded.

const PHYSICAL = { knock: 0, flash: true, damageType: 'physical' } as const;

/** A tick's command that keeps the player up through the Conductor's attacks. */
const safe = (s: SimState): Record<string, never> => {
  topUp(s);
  return {};
};

describe('the rods', () => {
  it('stand at the six sockets, a hexagon round the middle, each with 200 health', () => {
    const { c } = spire();
    expect(c.conductor.rods).toHaveLength(6);
    expect(CROWN_SPIRE.sockets).toHaveLength(6);
    for (const [i, p] of CROWN_SPIRE.sockets.entries()) {
      expect(Math.round(Math.hypot(p.x - SPIRE_MIDDLE.x, p.y - SPIRE_MIDDLE.y))).toBe(192);
      expect(rodPoint(i)).toEqual(p);
      const box = rodBox(CONDUCTOR, i);
      expect(rodAt(c, box.x, box.y)).toBe(i);
      expect(partAt(c, box.x, box.y)).toBe(i);
    }
    expect(c.conductor.rods.every((r) => r.health === 200)).toBe(true);
  });

  it('take a hit for their own health, not the Conductor’s; at 0 a rod breaks, is shot through, and regrows after 1200 ticks', () => {
    const { s, c } = spire();
    run(s, 1);
    hitRod(s, c, 0, 150, PHYSICAL);
    expect([c.conductor.rods[0]?.health, c.health]).toEqual([50, CONDUCTOR.maxHealth]);
    expect(s.events.hits).toContainEqual(expect.objectContaining({ id: c.id, damage: 150, part: 0 }));
    hitRod(s, c, 0, 60, PHYSICAL);
    expect(c.conductor.rods[0]).toEqual({ health: 0, regrow: 1200 });
    expect(s.events.rodBreaks).toEqual([expect.objectContaining({ id: c.id, rod: 0 })]);
    const box = rodBox(CONDUCTOR, 0);
    expect(rodAt(c, box.x, box.y)).toBeNull();
    run(s, 1199, safe);
    expect(c.conductor.rods[0]?.regrow).toBe(1);
    run(s, 1, safe);
    expect(c.conductor.rods[0]).toEqual({ health: 200, regrow: 0 });
  });

  it('a straight shot at a rod hits the rod, not the Conductor', () => {
    const { s, c } = spire(0, 11, -100);
    lines(s, 'arrow');
    // Rod 3 is the west one; the player stands between it and the middle.
    const box = rodBox(CONDUCTOR, 3);
    movePlayer(s, box.x + 120, rodPoint(3).y);
    run(s, 1);
    s.player.health = 100;
    run(s, 1, volleyAt(box.x, box.y));
    run(s, 40, () => ({}));
    expect(c.conductor.rods[3]?.health).toBeLessThan(200);
    expect(c.health).toBe(CONDUCTOR.maxHealth);
  });

  it('a Burst hits each rod in reach, and the Conductor too if it’s in reach', () => {
    const { s, c } = spire();
    run(s, 1);
    const p = rodPoint(CROWN_SPIRE.startRod);
    blastArea(s, c.roomId, p.x, p.y, 30, 50, 'physical');
    expect(c.conductor.rods[CROWN_SPIRE.startRod]?.health).toBe(150);
    expect(c.health).toBe(CONDUCTOR.maxHealth);
    blastArea(s, c.roomId, (p.x + c.x) / 2, (p.y + c.y) / 2, 40, 50, 'physical');
    expect(c.conductor.rods[CROWN_SPIRE.startRod]?.health).toBe(100);
    expect(c.health).toBe(CONDUCTOR.maxHealth - 50);
  });

  it('a punch at a rod hits the rod', () => {
    const { s, c } = spire();
    run(s, 1);
    const p = rodPoint(0);
    movePlayer(s, p.x + 20, p.y);
    s.tube.meleeCooldown = 0;
    s.tube.fireCooldown = 0;
    punch(s, -1, 0);
    expect(c.conductor.rods[0]?.health).toBe(200 - MELEE.damage);
  });

  it('is grounded with fewer than 2 standing, until one regrows', () => {
    const { s, c } = spire();
    run(s, 1);
    for (const i of [0, 1, 2, 3]) hitRod(s, c, i, 200, PHYSICAL);
    expect([standingRods(c), grounded(c)]).toEqual([2, false]);
    hitRod(s, c, 4, 200, PHYSICAL);
    expect([standingRods(c), grounded(c)]).toEqual([1, true]);
    run(s, CONDUCTOR.rods.regrowTicks, safe);
    expect(grounded(c)).toBe(false);
  });
});
