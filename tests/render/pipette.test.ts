import { describe, expect, it } from 'vitest';
import { DEFAULT_BINDINGS, NEWER_ACTIONS } from '../../src/data/settings';
import { release } from '../../src/render/dragPath';
import { handFrom, turnHand } from '../../src/render/pipette';
import type { ConduitState, MachineState, SplitterState } from '../../src/sim/pieces';
import { unlockedPieces } from '../../src/sim/placement';
import { foundry, put } from '../sim/foundryKit';

// 069: the pipette (Q in build mode) copies the placed piece under the cursor into the hand: its piece, its facing and
// its settings (a conduit's turn, a splitter's side, a stage's round). Over nothing it empties the hand.

describe('the pipette (069)', () => {
  it('is Q, which nothing else used, and a newer action (a stored binding on Q leaves it unbound)', () => {
    expect(DEFAULT_BINDINGS.pipette).toBe('Q');
    expect(Object.entries(DEFAULT_BINDINGS).filter(([, k]) => k === 'Q').map(([a]) => a)).toEqual(['pipette']);
    expect(NEWER_ACTIONS).toContain('pipette');
  });

  it('copies a conduit with its facing and turn, a splitter with its side, a stage with its round', () => {
    const s = foundry();
    const c = put<ConduitState>(s, 'conduit', 3, 3, 'up');
    c.inFrom = 'left';
    const sp = put<SplitterState>(s, 'splitter', 5, 3, 'down');
    sp.mirrored = true;
    const st = put<MachineState>(s, 'frost-rune', 7, 3, 'left');
    st.made = 'bomb+frost';
    const cut = put<MachineState>(s, 'cutter', 9, 3, 'down');
    const unlocked = unlockedPieces(s);
    expect(handFrom(c, unlocked)).toEqual({ pieceId: 'conduit', facing: 'up', mirrored: false, turn: 'left', round: null });
    expect(handFrom(sp, unlocked)).toEqual({ pieceId: 'splitter', facing: 'down', mirrored: true, turn: null, round: null });
    expect(handFrom(st, unlocked)).toEqual({ pieceId: 'frost-rune', facing: 'left', mirrored: false, turn: null, round: 'bomb+frost' });
    expect(handFrom(cut, unlocked)).toEqual({ pieceId: 'cutter', facing: 'down', mirrored: false, turn: null, round: null });
  });

  it('over nothing empties the hand; a piece not on the bar leaves it as it is', () => {
    const s = foundry();
    const k = put(s, 'cutter', 3, 3, 'up');
    expect(handFrom(undefined, unlockedPieces(s))).toBeNull();
    expect(handFrom(k, unlockedPieces(s).filter((id) => id !== 'cutter'))).toBeUndefined();
  });

  it('turns a held conduit’s turn with its facing (R), and lays a click with it', () => {
    expect(turnHand('up', 'left')).toEqual({ facing: 'right', turn: 'up' });
    expect(turnHand('up', null)).toEqual({ facing: 'right', turn: null });
    // A click (no drag) lays the held turn; with none it auto-joins as before.
    expect(release({ tile: { tx: 2, ty: 2 } }, 'up', 'left')).toEqual({ tx: 2, ty: 2, facing: 'up', inFrom: 'left' });
    expect(release({ tile: { tx: 2, ty: 2 } }, 'up')).toEqual({ tx: 2, ty: 2, facing: 'up' });
    // A drag's own side wins over the held turn.
    expect(release({ tile: { tx: 2, ty: 2 }, inFrom: 'down' }, 'right', 'left')).toEqual({ tx: 2, ty: 2, facing: 'up', inFrom: 'down' });
  });
});
