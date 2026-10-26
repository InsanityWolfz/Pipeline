import { describe, expect, it } from 'vitest';
import { WORLD_SHAPE, WORLD_SHIFT } from '../../src/data/worldShape';
import SNAPSHOT from './worldOffsets.json';
import { worldOffsets } from './worldOffsets';

// 060 slice 1: the world grows to fit the Emberworks, and the centre moves to the grid's middle. The move is pure:
// every landmark, node, pack, road, ley line, pylon and arena tile keeps its offset from the foundry's door, taken
// before the move (worldOffsets.json), and the generated ground is the same. 064 slice 1 did it again for the
// Stormcrown, from a snapshot retaken before its move. New places, roads and the like are added after the old ones, so
// everything in the snapshot is still there, unchanged.

/** An entry's id, if it has one. */
const idOf = (v: unknown): unknown => (v !== null && typeof v === 'object' && 'id' in v ? v.id : undefined);

/**
 * Where `now` doesn't keep everything in `then`: each array entry (by its id if it has one, else at its index), each
 * object key, each value.
 */
function unkept(now: unknown, then: unknown, path = ''): string[] {
  if (Array.isArray(then)) {
    if (!Array.isArray(now)) return [`${path}: not an array`];
    return then.flatMap((v, i) => unkept(idOf(v) === undefined ? now[i] : now.find((x) => idOf(x) === idOf(v)), v, `${path}[${String(idOf(v) ?? i)}]`));
  }
  if (then !== null && typeof then === 'object') {
    if (now === null || typeof now !== 'object') return [`${path}: not an object`];
    return Object.entries(then).flatMap(([k, v]) => unkept((now as Record<string, unknown>)[k], v, `${path}.${k}`));
  }
  return Object.is(now, then) ? [] : [`${path}: ${String(now)}, was ${String(then)}`];
}

describe('the world grows (060, 064)', () => {
  const now = worldOffsets() as typeof SNAPSHOT;

  it('puts the centre in the middle of a grid grown for the Stormcrown (064)', () => {
    expect(WORLD_SHAPE.size).toBe(292);
    expect(WORLD_SHAPE.centre).toEqual({ tx: 146, ty: 146 });
    expect(WORLD_SHIFT).toEqual({ dx: 62, dy: 62 });
  });

  it('keeps every hand-placed tile at its offset from the centre', () => {
    for (const k of ['landmarks', 'overworld', 'roads', 'roadPoints', 'pylons', 'arenas', 'hollows', 'emberworks'] as const) expect(unkept(now[k], SNAPSHOT[k]), k).toEqual([]);
  });

  it('generates the same ground round the centre, out to the Hollows\' edge', () => {
    // The ground out to the Emberworks' edge was the same after the move itself (slice 1, `ground`); from slice 2 the
    // Stormcrown's roads and ramps cross the Emberworks, whose generator keeps off roads, so its ground is held to them.
    expect(now.region1Ground).toEqual(SNAPSHOT.region1Ground);
    expect(now.hollowsGround).toEqual(SNAPSHOT.hollowsGround);
  });
});
