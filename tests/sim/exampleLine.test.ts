import { describe, expect, it } from 'vitest';
import { EXAMPLE_LINE } from '../../src/data/exampleLine';
import { DEFAULT_START, TUTORIAL_START } from '../../src/data/player';
import { PLAYTEST_START } from '../../src/data/playtest';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import type { HopperState } from '../../src/sim/pieces';
import { place, removePieceAt } from '../../src/sim/placement';
import { createSim, roomById, type SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { summarize } from '../../src/sim/summary';
import { die, movePlayer, run } from './fight';

// 046 (note 10): on a new game's first foundry entry the example line already stands, built from ordinary pieces
// and stocked from data. It starts when the tube attunes (019), runs arrows into the centre entrance until its
// stock is used up, then stops. Other starts, and saves from before 046 (046.1), never get it.

/** A sim on `start` with the player just walked into the foundry (one tick there: the tube attunes). */
function entered(start = TUTORIAL_START, seed = 3): SimState {
  const s = createSim(seed, { start });
  s.roomId = FOUNDRY_ROOM;
  const at = tileCentre(roomById(FOUNDRY_ROOM).spawn);
  movePlayer(s, at.x, at.y);
  run(s, 1);
  return s;
}

/** Steps `ticks`, emptying the centre entrance each tick as firing would, and counts the arrows that went up. */
function drain(s: SimState, ticks: number): number {
  let arrows = 0;
  for (let t = 0; t < ticks; t++) {
    run(s, 1);
    arrows += s.events.refills.filter((r) => r.entrance === 1 && r.itemId === 'arrow').length;
    const e = s.link.entrances[1];
    if (e) {
      e.count = 0;
      e.ammoId = null;
    }
  }
  return arrows;
}

const shape = (s: SimState) => s.foundry.pieces.map((p) => ({ pieceId: p.pieceId, tx: p.tx, ty: p.ty, facing: p.facing }));

describe('the example line (046)', () => {
  it('is not there before the first entry; on it, the whole line stands as data lays it out, its hoppers stocked', () => {
    const before = createSim(3, { start: TUTORIAL_START });
    expect(before.foundry.pieces).toEqual([]);
    const s = entered();
    expect(s.link.attuned).toBe(true);
    expect(shape(s)).toEqual(EXAMPLE_LINE.map((p) => ({ pieceId: p.pieceId, tx: p.tx, ty: p.ty, facing: p.facing })));
    const stock = s.foundry.pieces.filter((p): p is HopperState => p.kind === 'hopper').map((h) => [h.item, h.count]);
    expect(stock).toEqual([
      ['wood', 4],
      ['stone', 4],
      ['fiber', 4],
    ]);
    // Ordinary pieces: getState reports them like any other.
    expect(summarize(s).foundry.pieces.map((p) => p.pieceId)).toEqual(EXAMPLE_LINE.map((p) => p.pieceId));
  });

  it('starts with the attune: arrows go up the tube into the centre entrance', () => {
    const s = entered();
    let ticks = 0;
    while ((s.link.entrances[1]?.count ?? 0) === 0 && ticks < 600) {
      run(s, 1);
      ticks += 1;
    }
    expect(s.link.entrances[1]).toMatchObject({ ammoId: 'arrow' });
    expect(ticks).toBeLessThan(600);
  });

  it('runs until its stock is used up, about 60 arrows (046.2), then stops', () => {
    const s = entered();
    expect(drain(s, 3000)).toBe(64);
    expect(drain(s, 600)).toBe(0);
    expect(s.foundry.pieces.filter((p) => p.kind === 'hopper').every((h) => h.kind === 'hopper' && h.count === 0)).toBe(true);
  });

  it('fills the entrance to its cap and backs up while nobody fires', () => {
    const s = entered();
    run(s, 2000);
    expect(s.link.entrances[1]).toMatchObject({ ammoId: 'arrow', count: 30 });
    expect(s.firstLineFull).toBe(true);
  });

  it('is laid once: a KO, a second entry or an emptied foundry never brings it back', () => {
    const s = entered();
    for (const p of [...s.foundry.pieces]) removePieceAt(s, p.tx, p.ty);
    expect(s.foundry.pieces).toEqual([]);
    die(s);
    s.roomId = FOUNDRY_ROOM;
    run(s, 2);
    expect(s.foundry.pieces).toEqual([]);
  });

  it('its pieces are ordinary: picked up with the usual refunds, and placed again', () => {
    const s = entered();
    const wood = s.inventory.wood ?? 0;
    removePieceAt(s, 11, 5);
    expect(s.inventory.wood).toBe(wood + 4);
    expect(s.events.pickUps).toMatchObject([{ pieceId: 'hopper', items: { wood: 4 } }]);
    s.crafted = [...s.crafted, 'shaft'];
    removePieceAt(s, 11, 4);
    // 058: once the tutorial's build lock has lifted.
    s.objectives = s.objectives.map(() => true);
    expect(place(s, 'cutter', 6, 6, 'up')).toMatchObject({ pieceId: 'cutter', tx: 6, ty: 6 });
  });

  it('never stands on any other start', () => {
    for (const start of [DEFAULT_START, { ...DEFAULT_START, attuned: true }, PLAYTEST_START]) expect(entered(start).foundry.pieces).toEqual([]);
  });

  it('replays identically', () => {
    const play = () => {
      const s = entered();
      drain(s, 900);
      return summarize(s);
    };
    expect(play()).toEqual(play());
  });
});
