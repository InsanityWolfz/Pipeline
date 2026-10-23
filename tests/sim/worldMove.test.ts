import { describe, expect, it } from 'vitest';
import { WORLD_SHAPE, WORLD_SHIFT } from '../../src/data/worldShape';
import SNAPSHOT from './worldOffsets.json';
import { worldOffsets } from './worldOffsets';

// 060 slice 1: the world grows to fit the Emberworks, and the centre moves to the grid's middle. The move is pure:
// every landmark, node, pack, road, ley line, pylon and arena tile keeps its offset from the foundry's door, taken
// from main before the move (worldOffsets.json), and the generated ground round the centre is the same.

describe('the world grows (060)', () => {
  it('puts the centre in the middle of a grid grown for the Emberworks', () => {
    expect(WORLD_SHAPE.size).toBe(230);
    expect(WORLD_SHAPE.centre).toEqual({ tx: 115, ty: 115 });
    expect(WORLD_SHIFT).toEqual({ dx: 31, dy: 31 });
  });

  it('keeps every hand-placed tile at its offset from the centre', () => {
    const now = worldOffsets() as typeof SNAPSHOT;
    expect(now.landmarks).toEqual(SNAPSHOT.landmarks);
    expect(now.overworld).toEqual(SNAPSHOT.overworld);
    expect(now.roads).toEqual(SNAPSHOT.roads);
    expect(now.roadPoints).toEqual(SNAPSHOT.roadPoints);
    expect(now.pylons).toEqual(SNAPSHOT.pylons);
    expect(now.arenas).toEqual(SNAPSHOT.arenas);
    expect(now.hollows).toEqual(SNAPSHOT.hollows);
  });

  it('generates the same ground round the centre', () => {
    const now = worldOffsets() as typeof SNAPSHOT;
    expect(now.region1Ground).toEqual(SNAPSHOT.region1Ground);
    expect(now.ground).toEqual(SNAPSHOT.ground);
  });
});
