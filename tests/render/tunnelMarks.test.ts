import { describe, expect, it } from 'vitest';
import { arrowSpots } from '../../src/render/foundryLayout';
import { tunnelLook } from '../../src/render/flatPieces';
import { tunnelMarks } from '../../src/render/tunnelMarks';
import { foundry, put } from '../sim/foundryKit';

// 052: the underground pair on the floor. Placing an entrance marks the tiles it reaches; with the exit selected,
// every free entrance's reach shows and the ghost in reach shows its tunnel; hovering either end of a pair shows the
// tunnel between them (Shaun: "just like Factorio").

const IN = 'underground-entrance';
const OUT = 'underground-exit';
const row = (from: number, to: number, ty: number) => Array.from({ length: to - from + 1 }, (_, i) => ({ tx: from + i, ty }));

describe('tunnel marks', () => {
  it("the entrance's ghost marks its reach, and the tunnel to a free exit it would pair with", () => {
    const s = foundry();
    expect(tunnelMarks(s.foundry, { building: true, selected: IN, cursor: { tx: 3, ty: 5 }, facing: 'right' })).toEqual([{ kind: 'reach', tiles: row(4, 9, 5), facing: 'right' }]);
    put(s, OUT, 7, 5, 'right');
    expect(tunnelMarks(s.foundry, { building: true, selected: IN, cursor: { tx: 3, ty: 5 }, facing: 'right' })).toContainEqual({ kind: 'tunnel', tiles: row(4, 6, 5), facing: 'right' });
  });

  it('with the exit selected, each free entrance shows its reach, and the ghost in reach its tunnel', () => {
    const s = foundry();
    put(s, IN, 3, 5, 'right');
    const free = { kind: 'reach', tiles: row(4, 9, 5), facing: 'right' };
    expect(tunnelMarks(s.foundry, { building: true, selected: OUT, cursor: { tx: 12, ty: 9 }, facing: 'right' })).toEqual([free]);
    expect(tunnelMarks(s.foundry, { building: true, selected: OUT, cursor: { tx: 8, ty: 5 }, facing: 'right' })).toEqual([free, { kind: 'tunnel', tiles: row(4, 7, 5), facing: 'right' }]);
    // Facing another way, it wouldn't pair.
    expect(tunnelMarks(s.foundry, { building: true, selected: OUT, cursor: { tx: 8, ty: 5 }, facing: 'left' })).toEqual([free]);
  });

  it('hovering either end of a pair shows its tunnel, building or not; other pieces show nothing', () => {
    const s = foundry();
    put(s, IN, 6, 3, 'down');
    put(s, OUT, 6, 7, 'down');
    const tunnel = { kind: 'tunnel', tiles: [4, 5, 6].map((ty) => ({ tx: 6, ty })), facing: 'down' };
    for (const ty of [3, 7]) expect(tunnelMarks(s.foundry, { building: false, selected: 'conduit', cursor: { tx: 6, ty }, facing: 'right' })).toEqual([tunnel]);
    expect(tunnelMarks(s.foundry, { building: false, selected: IN, cursor: { tx: 6, ty: 5 }, facing: 'right' })).toEqual([]);
    expect(tunnelMarks(s.foundry, { building: true, selected: 'conduit', cursor: null, facing: 'right' })).toEqual([]);
  });

  it('draws each end turned for its facing, with an input arrow on the entrance and an output on the exit', () => {
    expect(tunnelLook('tunnel-in', 'left')).toEqual({ frame: 'tunnel-in-side', flipX: true });
    expect(tunnelLook('tunnel-out', 'up')).toEqual({ frame: 'tunnel-out-up', flipX: false });
    expect(arrowSpots({ pieceId: IN, tx: 5, ty: 5, facing: 'right' }).map((a) => `${a.kind}:${a.edge}`)).toEqual(['in:left']);
    expect(arrowSpots({ pieceId: OUT, tx: 5, ty: 5, facing: 'right' }).map((a) => `${a.kind}:${a.edge}`)).toEqual(['out:right']);
  });
});
