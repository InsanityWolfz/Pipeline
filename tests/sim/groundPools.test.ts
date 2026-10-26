import { describe, expect, it } from 'vitest';
import { inPool, layPool, stepFloodPools, toSegment, type FloodPool } from '../../src/sim/floodPools';
import { arena, movePlayer, PLAYER_AT, run } from './fight';
import { still } from './fireKit';

// Ground hazards (061): the flood's rect (060, unchanged: forgewright*.test.ts still hold it), a mote's circle and a
// hound's capsule, each beating its own damage once a second on a player standing in it, never on an enemy.

const BEAT = { ticks: 180, damage: 8, everyTicks: 60 } as const;
const owner = { id: 999, enemyId: 'cinder-mote', roomId: 'overworld' };
const shape = (p: Partial<FloodPool>): Pick<FloodPool, 'shape' | 'x0' | 'y0' | 'x1' | 'y1' | 'r'> => ({ shape: 'rect', x0: 0, y0: 0, x1: 0, y1: 0, r: 0, ...p });

describe('pool shapes', () => {
  it('a rect holds its inside, half-open at its far edges (060)', () => {
    const r = shape({ x0: 0, y0: 0, x1: 10, y1: 10 });
    expect(inPool(r, 0, 0)).toBe(true);
    expect(inPool(r, 9.9, 9.9)).toBe(true);
    expect(inPool(r, 10, 5)).toBe(false);
  });

  it('a circle hits inside its radius and misses outside', () => {
    const c = shape({ shape: 'circle', x0: 100, y0: 100, x1: 100, y1: 100, r: 32 });
    expect(inPool(c, 100, 100)).toBe(true);
    expect(inPool(c, 132, 100)).toBe(true);
    expect(inPool(c, 100 + 22.5, 100 + 22.5)).toBe(true);
    expect(inPool(c, 133, 100)).toBe(false);
    expect(inPool(c, 100 + 23, 100 + 23)).toBe(false);
  });

  it('a capsule hits along its segment and misses past its ends and sides', () => {
    const t = shape({ shape: 'capsule', x0: 0, y0: 0, x1: 200, y1: 0, r: 12 });
    for (const x of [0, 50, 100, 200]) expect(inPool(t, x, 11), `along at ${x}`).toBe(true);
    expect(inPool(t, 100, 13), 'its side').toBe(false);
    expect(inPool(t, 213, 0), 'past its far end').toBe(false);
    expect(inPool(t, -13, 0), 'past its near end').toBe(false);
    expect(toSegment(205, 0, 0, 0, 200, 0)).toBe(5);
  });
});

describe('a round pool on the ground', () => {
  it('beats its damage on its first tick and once a second after, on the player standing in it, then dries', () => {
    const s = arena();
    layPool(s, owner, 'circle', { x0: PLAYER_AT.x, y0: PLAYER_AT.y, x1: PLAYER_AT.x, y1: PLAYER_AT.y, r: 32 }, BEAT);
    const hits: number[] = [];
    for (let t = 0; t < 200; t++) {
      s.player.hurtTicks = 0;
      const before = s.player.health;
      stepFloodPools(s);
      if (s.player.health < before) hits.push(t);
    }
    expect(hits).toEqual([0, 60, 120]);
    expect(s.player.health).toBe(100 - 3 * BEAT.damage);
    expect(s.floodPools).toEqual([]);
  });

  it('misses a player outside it, and never hurts an enemy standing in it', () => {
    const s = arena();
    const husk = still(s, PLAYER_AT.x + 100, PLAYER_AT.y, 40);
    layPool(s, owner, 'capsule', { x0: husk.x - 50, y0: husk.y, x1: husk.x + 50, y1: husk.y, r: 12 }, BEAT);
    movePlayer(s, PLAYER_AT.x, PLAYER_AT.y + 64);
    run(s, BEAT.ticks + 5);
    expect(s.player.health).toBe(100);
    expect(husk.health).toBe(40);
  });
});
