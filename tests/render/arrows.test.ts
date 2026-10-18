import { describe, expect, it } from 'vitest';
import { arrowSpots } from '../../src/render/foundryLayout';

const dirs = (pieceId: string, facing: 'up' | 'down' | 'left' | 'right', tx = 5, ty = 5) =>
  arrowSpots({ pieceId, tx, ty, facing })
    .map((a) => `${a.kind}:${a.tx},${a.ty}:${a.points}`)
    .sort();

describe('facing arrows', () => {
  it('a 1x1 machine: one output out its front, inputs pointing in on the other three sides', () => {
    expect(dirs('cutter', 'right')).toEqual(
      ['in:5,5:down', 'in:5,5:right', 'in:5,5:up', 'out:5,5:right'].sort(),
    );
  });

  it('a 3x1 machine: inputs along its back and on both ends, none along its front', () => {
    // Facing down: covers (4..6, 5); back is the top edge.
    expect(dirs('assembler', 'down')).toEqual(
      ['in:4,5:down', 'in:5,5:down', 'in:6,5:down', 'in:4,5:right', 'in:6,5:left', 'out:5,5:down'].sort(),
    );
  });

  it('a hopper only has an output; a crate only has inputs, on all four sides', () => {
    expect(dirs('hopper', 'up')).toEqual(['out:5,5:up']);
    expect(dirs('crate', 'left')).toEqual(['in:5,5:down', 'in:5,5:left', 'in:5,5:right', 'in:5,5:up']);
  });

  it('a conduit has one input arrow on the side it takes from: its back when straight, its side on a corner', () => {
    expect(dirs('conduit', 'up')).toEqual(['in:5,5:up']);
    const corner = arrowSpots({ pieceId: 'conduit', tx: 5, ty: 5, facing: 'up', inFrom: 'left' });
    expect(corner.map((a) => `${a.kind}:${a.edge}:${a.points}`)).toEqual(['in:left:right']);
  });
});
