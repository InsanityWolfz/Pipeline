import { describe, expect, it } from 'vitest';
import type { MachineState } from '../../src/sim/pieces';
import { pieceAt } from '../../src/sim/pieces';
import { run } from './fight';
import { foundry } from './foundryKit';

// 069: the pipette copies a placed piece with its settings; a stage's round goes down with it, as a blueprint's does
// (063). The place command carries it as `round`.

describe('placing with a round (069)', () => {
  it('sets a stage machine’s round, as a stamped one keeps its saved round', () => {
    const s = foundry();
    run(s, 1, { place: { pieceId: 'frost-rune', tx: 4, ty: 4, facing: 'right', round: 'bomb+frost' } });
    expect(pieceAt(s.foundry, 4, 4)).toMatchObject({ kind: 'machine', made: 'bomb+frost' });
  });

  it('ignores a round the stage can’t make, and any round on a machine that isn’t a stage', () => {
    const s = foundry();
    run(s, 1, { place: { pieceId: 'frost-rune', tx: 4, ty: 4, facing: 'right', round: 'bomb+cluster' } });
    expect((pieceAt(s.foundry, 4, 4) as MachineState).made).toBe('arrow+frost');
    run(s, 1, { place: { pieceId: 'cutter', tx: 6, ty: 4, facing: 'right', round: 'bomb+frost' } });
    expect((pieceAt(s.foundry, 6, 4) as MachineState).made).toBe('shaft');
  });
});
