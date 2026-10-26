import { describe, expect, it } from 'vitest';
import type { Blueprint } from '../../src/sim/blueprints';
import { transformBlueprint } from '../../src/sim/blueprintTransform';

// Turning and mirroring a blueprint (063): R turns it 90° clockwise (every piece's tile, facing and conduit side with
// it), the flip key mirrors it left to right (facings, conduit sides and a splitter's side mirrored). A ghost is held
// as a mirror, then turns.

const BP: Pick<Blueprint, 'w' | 'h' | 'pieces'> = {
  w: 4,
  h: 2,
  pieces: [
    { pieceId: 'conduit', dx: 0, dy: 0, facing: 'right', inFrom: 'down' },
    { pieceId: 'splitter', dx: 3, dy: 1, facing: 'up' },
    { pieceId: 'assembler', dx: 1, dy: 1, facing: 'up' },
  ],
};

describe('turning (063)', () => {
  it('moves (x, y) to (h-1-y, x) and turns facings and conduit sides clockwise', () => {
    expect(transformBlueprint(BP, 1, false)).toEqual({
      w: 2,
      h: 4,
      pieces: [
        { pieceId: 'conduit', dx: 1, dy: 0, facing: 'down', inFrom: 'left' },
        { pieceId: 'splitter', dx: 0, dy: 3, facing: 'right' },
        { pieceId: 'assembler', dx: 0, dy: 1, facing: 'right' },
      ],
    });
  });

  it('comes back after four turns', () => {
    expect(transformBlueprint(BP, 4, false)).toEqual(BP);
    expect(transformBlueprint(BP, 0, false)).toEqual(BP);
  });
});

describe('mirroring (063)', () => {
  it("moves (x, y) to (w-1-x, y), swaps left and right, and flips a splitter's side", () => {
    expect(transformBlueprint(BP, 0, true)).toEqual({
      w: 4,
      h: 2,
      pieces: [
        { pieceId: 'conduit', dx: 3, dy: 0, facing: 'left', inFrom: 'down' },
        { pieceId: 'splitter', dx: 0, dy: 1, facing: 'up', mirrored: true },
        { pieceId: 'assembler', dx: 2, dy: 1, facing: 'up' },
      ],
    });
  });

  it('mirrors after the turns: a turned then mirrored ghost is (mirror, then the turns undone)', () => {
    // On screen: turn once, then mirror left to right.
    const turned = transformBlueprint(BP, 1, false);
    const onScreen = transformBlueprint(turned, 0, true);
    expect(transformBlueprint(BP, 3, true)).toEqual(onScreen);
    expect(transformBlueprint(transformBlueprint(BP, 0, true), 0, true)).toEqual(BP);
  });
});

describe('turned and mirrored together (063)', () => {
  it("keeps an underground pair's link and facing in line, and flips each splitter's side", () => {
    const pair: Pick<Blueprint, 'w' | 'h' | 'pieces'> = {
      w: 4,
      h: 2,
      pieces: [
        { pieceId: 'underground-entrance', dx: 0, dy: 0, facing: 'right', link: 1 },
        { pieceId: 'underground-exit', dx: 3, dy: 0, facing: 'right', link: 0 },
        { pieceId: 'splitter', dx: 1, dy: 1, facing: 'right' },
        { pieceId: 'splitter', dx: 2, dy: 1, facing: 'down', mirrored: true },
      ],
    };
    // Mirrored (the pair now runs left, entrance on the right), then turned once: it runs up, entrance at the bottom.
    expect(transformBlueprint(pair, 1, true)).toEqual({
      w: 2,
      h: 4,
      pieces: [
        { pieceId: 'underground-entrance', dx: 1, dy: 3, facing: 'up', link: 1 },
        { pieceId: 'underground-exit', dx: 1, dy: 0, facing: 'up', link: 0 },
        { pieceId: 'splitter', dx: 0, dy: 2, facing: 'up', mirrored: true },
        { pieceId: 'splitter', dx: 0, dy: 1, facing: 'left' },
      ],
    });
  });
});
