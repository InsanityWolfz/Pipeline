import { describe, expect, it } from 'vitest';
import { WORLD_SHAPE, WORLD_SHIFT } from '../../src/data/worldShape';
import SNAPSHOT from './worldOffsets.json';
import { worldOffsets } from './worldOffsets';

// 060 slice 1: the world grows to fit the Emberworks, and the centre moves to the grid's middle. The move is pure:
// every landmark, node, pack, road, ley line, pylon and arena tile keeps its offset from the foundry's door, taken
// from main before the move (worldOffsets.json), and Region 1's generated ground is the same. 060's new places, roads
// and the like are added after the old ones, so everything in the snapshot is still there, unchanged.

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

describe('the world grows (060)', () => {
  const now = worldOffsets() as typeof SNAPSHOT;

  it('puts the centre in the middle of a grid grown for the Emberworks', () => {
    expect(WORLD_SHAPE.size).toBe(230);
    expect(WORLD_SHAPE.centre).toEqual({ tx: 115, ty: 115 });
    expect(WORLD_SHIFT).toEqual({ dx: 31, dy: 31 });
  });

  it('keeps every hand-placed tile at its offset from the centre', () => {
    // But one: 060 slice 3 moved the Cistern Terrace's ley line's last stretch south to make room for the Ash Kilns'
    // (it still starts at its pylon and ends on the ruin; tests/data/leyLines.test.ts holds it to the line rules).
    const { 'cistern-terrace': moved, ...lines } = SNAPSHOT.overworld.leyLines;
    const then = { ...SNAPSHOT, overworld: { ...SNAPSHOT.overworld, leyLines: lines } };
    for (const k of ['landmarks', 'overworld', 'roads', 'roadPoints', 'pylons', 'arenas', 'hollows'] as const) expect(unkept(now[k], then[k]), k).toEqual([]);
    expect(now.overworld.leyLines['cistern-terrace']?.[0]).toEqual(moved[0]);
  });

  it('generates the same Region 1 round the centre', () => {
    expect(now.region1Ground).toEqual(SNAPSHOT.region1Ground);
  });
});
