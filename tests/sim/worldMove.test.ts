import { describe, expect, it } from 'vitest';
import { EMBERWORKS } from '../../src/data/emberworks';
import { ROAD_DEFS, ROADS } from '../../src/data/roads';
import { STORMCROWN, stormRampTiles } from '../../src/data/stormcrown';
import { WORLD_SHAPE, WORLD_SHIFT } from '../../src/data/worldShape';
import { nearRoads } from '../../src/sim/genGrid';
import GROUND from './worldGround.json';
import SNAPSHOT from './worldOffsets.json';
import { groundRows, hash, SPAN, worldOffsets } from './worldOffsets';

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
    // But two: 064 slice 3 moved the Ley Grotto's and the Husk Hive's ley lines' arrivals at the ruin apart, to make room
    // for the Weathervane's between them (each still starts at its pylon and ends on the ruin; tests/data/leyLines.test.ts
    // holds them to the line rules).
    const { 'ley-grotto': grotto, 'husk-hive': hive, ...lines } = SNAPSHOT.overworld.leyLines;
    const then = { ...SNAPSHOT, overworld: { ...SNAPSHOT.overworld, leyLines: lines } };
    for (const k of ['landmarks', 'overworld', 'roads', 'roadPoints', 'pylons', 'arenas', 'hollows', 'emberworks'] as const) expect(unkept(now[k], then[k]), k).toEqual([]);
    expect(now.overworld.leyLines['ley-grotto']?.[0]).toEqual(grotto[0]);
    expect(now.overworld.leyLines['husk-hive']?.[0]).toEqual(hive[0]);
  });

  it('generates the same ground round the centre, out to the Hollows\' edge', () => {
    // The ground out to the Emberworks' edge was the same after the move itself (slice 1, `ground`); from slice 2 the
    // Stormcrown's roads and ramps cross the Emberworks, whose generator keeps off roads, so its ground is held to them.
    expect(now.region1Ground).toEqual(SNAPSHOT.region1Ground);
    expect(now.hollowsGround).toEqual(SNAPSHOT.hollowsGround);
  });

  it('changes the Emberworks\' ground only within roadClear of the Stormcrown\'s new roads and ramps (064)', () => {
    // worldGround.json is the snapshot's `ground` itself, row by row (taken at slice 1, after the move, before slice 2).
    expect(hash(GROUND.rows.join('\n'))).toBe(SNAPSHOT.ground.hash);
    const size = WORLD_SHAPE.size;
    const k = STORMCROWN.roadClear;
    const old = new Set(SNAPSHOT.roads.map((r) => r.id));
    const near = nearRoads(ROADS.filter((_, i) => !old.has(ROAD_DEFS[i]?.id ?? '')), k, size);
    for (const t of STORMCROWN.ramps.flatMap(stormRampTiles)) for (let ty = t.ty - k; ty <= t.ty + k; ty++) for (let tx = t.tx - k; tx <= t.tx + k; tx++) near.add(ty * size + tx);
    const now = groundRows(EMBERWORKS.radii.outer - 1);
    const { tx: cx, ty: cy } = WORLD_SHAPE.centre;
    const changed: string[] = [];
    const stray: string[] = [];
    GROUND.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        if (now[j]?.[i] === row[i]) continue;
        const tx = cx - SPAN + i;
        const ty = cy - SPAN + j;
        changed.push(`${tx},${ty}`);
        if (!near.has(ty * size + tx)) stray.push(`(${tx}, ${ty}): ${now[j]?.[i] ?? '?'}, was ${row[i] ?? '?'}`);
      }
    });
    expect(changed.length).toBeGreaterThan(0);
    expect(stray).toEqual([]);
  });
});
