import { describe, expect, it } from 'vitest';
import { HOMING } from '../../src/data/tags';
import type { ArrowState } from '../../src/sim/arrows';
import type { SimState } from '../../src/sim/state';
import { arena, fireAt, placeHusk, PLAYER_AT, run, runUntil } from './fight';

// Homing (029): a homing round locks at launch onto the living enemy nearest the
// cursor within HOMING.lockRadius, then turns toward it by at most HOMING.turnDegrees a tick.

function homing(): SimState {
  const s = arena();
  s.inventory = { 'ley-bolt+homing': 10 };
  run(s, 1, { selectAmmo: 'ley-bolt' });
  return s;
}

const angle = (a: ArrowState): number => (Math.atan2(a.dy, a.dx) * 180) / Math.PI;

describe('a homing ley bolt', () => {
  it('locks onto the enemy nearest the cursor and curves in to hit it', () => {
    const s = homing();
    const near = placeHusk(s, PLAYER_AT.x + 150, PLAYER_AT.y);
    placeHusk(s, PLAYER_AT.x + 150, PLAYER_AT.y - 110);
    // The cursor is 50 px above the near Husk (inside the 64 px lock), aimed over its head.
    run(s, 1, fireAt(PLAYER_AT.x + 150, PLAYER_AT.y - 50));
    const bolt = s.arrows[0];
    if (!bolt) throw new Error('no bolt');
    expect(bolt.ammoId).toBe('ley-bolt+homing');
    expect(bolt.targetId).toBe(near.id);
    const start = angle(bolt);
    expect(start).toBeLessThan(-15);
    run(s, 1);
    // One tick turns it by exactly the cap toward the Husk below its line.
    expect(angle(bolt) - start).toBeCloseTo(HOMING.turnDegrees);
    runUntil(s, () => s.events.hits.length > 0, 90);
    expect(s.events.hits[0]).toMatchObject({ id: near.id });
  });

  it('flies straight with nobody within the lock radius of the cursor', () => {
    const s = homing();
    placeHusk(s, PLAYER_AT.x + 150, PLAYER_AT.y);
    run(s, 1, fireAt(PLAYER_AT.x + 150, PLAYER_AT.y - 70));
    const bolt = s.arrows[0];
    if (!bolt) throw new Error('no bolt');
    expect(bolt.targetId).toBeNull();
    const start = { dx: bolt.dx, dy: bolt.dy };
    run(s, 20);
    expect({ dx: bolt.dx, dy: bolt.dy }).toEqual(start);
  });

  it('flies on straight once its target is gone', () => {
    const s = homing();
    const e = placeHusk(s, PLAYER_AT.x + 200, PLAYER_AT.y);
    run(s, 1, fireAt(PLAYER_AT.x + 200, PLAYER_AT.y - 50));
    const bolt = s.arrows[0];
    if (!bolt) throw new Error('no bolt');
    expect(bolt.targetId).toBe(e.id);
    run(s, 3);
    s.enemies = s.enemies.filter((x) => x !== e);
    run(s, 1);
    const heading = { dx: bolt.dx, dy: bolt.dy };
    run(s, 10);
    expect({ dx: bolt.dx, dy: bolt.dy }).toEqual(heading);
  });

  it('never locks onto an enemy in another room', () => {
    const s = homing();
    placeHusk(s, PLAYER_AT.x + 150, PLAYER_AT.y - 40, 'foundry');
    run(s, 1, fireAt(PLAYER_AT.x + 150, PLAYER_AT.y - 50));
    expect(s.arrows[0]?.targetId).toBeNull();
  });

  it('keeps its speed and range', () => {
    const s = homing();
    placeHusk(s, PLAYER_AT.x + 290, PLAYER_AT.y + 150);
    run(s, 1, fireAt(PLAYER_AT.x + 250, PLAYER_AT.y + 150));
    const bolt = s.arrows[0];
    if (!bolt) throw new Error('no bolt');
    const before = { x: bolt.x, y: bolt.y };
    run(s, 1);
    expect(Math.hypot(bolt.x - before.x, bolt.y - before.y)).toBeCloseTo(5);
  });
});
