import { describe, expect, it } from 'vitest';
import { dragTo, ghostShape, release, type ConduitLay, type HeldConduit } from '../../src/render/dragPath';
import type { Tile } from '../../src/sim/pieces';

/** Drags through `points` (cursor positions) from a press on the first, then releases. */
function drag(points: readonly Tile[], ghost: 'up' | 'down' | 'left' | 'right' = 'right'): ConduitLay[] {
  const [first, ...rest] = points;
  if (!first) return [];
  let held: HeldConduit = { tile: first };
  const laid: ConduitLay[] = [];
  for (const p of rest) {
    const step = dragTo(held, p);
    laid.push(...step.lay);
    held = step.held;
  }
  return [...laid, release(held, ghost)];
}

const at = (tx: number, ty: number): Tile => ({ tx, ty });

describe('conduit drags', () => {
  it('a click lays one conduit with the ghost facing and no side, so the sim auto-joins it', () => {
    expect(drag([at(3, 3)], 'up')).toEqual([{ tx: 3, ty: 3, facing: 'up' }]);
  });

  it('a straight drag lays a straight run facing the drag; only the first tile has no side', () => {
    expect(drag([at(0, 0), at(3, 0)], 'down')).toEqual([
      { tx: 0, ty: 0, facing: 'right' },
      { tx: 1, ty: 0, facing: 'right', inFrom: 'left' },
      { tx: 2, ty: 0, facing: 'right', inFrom: 'left' },
      { tx: 3, ty: 0, facing: 'right', inFrom: 'left' },
    ]);
  });

  it('an L makes the turn tile a corner from the side the drag came in by', () => {
    expect(drag([at(0, 0), at(0, 1), at(2, 1)])).toEqual([
      { tx: 0, ty: 0, facing: 'down' },
      { tx: 0, ty: 1, facing: 'right', inFrom: 'up' },
      { tx: 1, ty: 1, facing: 'right', inFrom: 'left' },
      { tx: 2, ty: 1, facing: 'right', inFrom: 'left' },
    ]);
  });

  it('a zig-zag turns at every bend', () => {
    const laid = drag([at(0, 0), at(1, 0), at(1, 1), at(2, 1), at(2, 2)]);
    expect(laid.map((l) => `${l.tx},${l.ty}:${l.inFrom ?? '-'}>${l.facing}`)).toEqual([
      '0,0:->right',
      '1,0:left>down',
      '1,1:up>right',
      '2,1:left>down',
      '2,2:up>down',
    ]);
  });

  it('a fast diagonal jump becomes a staircase of joined corners, with no gaps', () => {
    const laid = drag([at(0, 0), at(2, 2)]);
    expect(laid).toHaveLength(5);
    for (const [i, l] of laid.entries()) {
      const next = laid[i + 1];
      if (!next) continue;
      expect(Math.abs(next.tx - l.tx) + Math.abs(next.ty - l.ty)).toBe(1);
      // Each tile faces the next, and the next takes from this one's side.
      const back = { up: 'down', down: 'up', left: 'right', right: 'left' } as const;
      expect(next.inFrom).toBe(back[l.facing]);
    }
  });

  it('a U turns back on itself', () => {
    const laid = drag([at(0, 0), at(1, 0), at(1, 1), at(0, 1)]);
    expect(laid.map((l) => `${l.inFrom ?? '-'}>${l.facing}`)).toEqual(['->right', 'left>down', 'up>left', 'right>left']);
  });
});

describe('the ghost while dragging', () => {
  const autoJoin = () => 'left' as const;

  it('shows the held tile as it would be laid', () => {
    const held = { tx: 2, ty: 1, facing: 'down' as const, inFrom: 'up' as const };
    expect(ghostShape(held, at(2, 1), 'right', autoJoin)).toEqual({ facing: 'down', inFrom: 'up' });
  });

  it('elsewhere, or for a click, shows the ghost facing auto-joined', () => {
    expect(ghostShape(null, at(2, 1), 'up', autoJoin)).toEqual({ facing: 'up', inFrom: 'left' });
    expect(ghostShape({ tx: 2, ty: 1, facing: 'up' }, at(2, 1), 'up', autoJoin)).toEqual({ facing: 'up', inFrom: 'left' });
  });
});
