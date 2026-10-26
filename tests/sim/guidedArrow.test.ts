import { describe, expect, it } from 'vitest';
import { GUIDED_BUILDS, type Ghost } from '../../src/data/guidedBuilds';
import { OBJECTIVES } from '../../src/data/objectives';
import { TUTORIAL_START } from '../../src/data/player';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { buildLocked, guidedSubLine, nextGhost } from '../../src/sim/guided';
import { currentObjective } from '../../src/sim/objectives';
import { createSim, roomById, type SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer, run } from './fight';

// 067: after the shrine's claim, the travel to the foundry and the first guided build, the arrow line from the ports,
// on 058's ghosts and under its build lock (guidedTutorial.test.ts has the rest of the chain and the lock).

const at = (text: string): number => OBJECTIVES.findIndex((o) => o.text === text);
const TRAVEL = at('Travel to the foundry (E at the pylon)');
const ARROW = at('Build an arrow line into the middle entrance (B)');
const FILL = at('Wait for the tube to fill with arrows');

/** A new game standing in the foundry by its door with every goal before `goal` done, the tube attuned, the arrow chain hand-crafted. */
function tutorialAt(goal: number): SimState {
  const s = createSim(3, { start: TUTORIAL_START });
  s.objectives = OBJECTIVES.map((o, i) => i < goal && !o.cutIn);
  s.roomId = FOUNDRY_ROOM;
  const p = tileCentre(roomById(FOUNDRY_ROOM).spawn);
  movePlayer(s, p.x, p.y);
  s.link.attuned = true;
  s.hasTube = true;
  s.crafted = ['shaft', 'arrowhead', 'rope', 'arrow'];
  run(s, 1);
  return s;
}

/** Places a ghost by command, as the build bar would. */
function build(s: SimState, g: Ghost): void {
  if (g.kind === 'remove') run(s, 1, { pickUp: { tx: g.tx, ty: g.ty } });
  else run(s, 1, { place: { pieceId: g.piece, tx: g.tx, ty: g.ty, facing: g.facing } });
}

describe('the travel to the foundry (067)', () => {
  it('is done the tick the player is in the foundry once it is current, and the arrow line on ghosts follows', () => {
    const s = tutorialAt(TRAVEL);
    expect(s.objectives[TRAVEL]).toBe(true);
    expect(currentObjective(s)).toBe(TRAVEL + 1);
    expect(TRAVEL + 1).toBe(ARROW);
    expect(OBJECTIVES[ARROW]).toMatchObject({ guided: 'arrow-line', check: { kind: 'built', build: 'arrow-line' }, target: { kind: 'ghost' }, prompt: { key: 'B', over: 'player' } });
    expect(OBJECTIVES[ARROW + 1]?.text).toBe('Wait for the tube to fill with arrows');
  });

  it('is never done by a foundry visit before it is current', () => {
    const s = tutorialAt(TRAVEL - 2);
    expect(s.roomId).toBe(FOUNDRY_ROOM);
    expect(s.objectives[TRAVEL]).toBe(false);
    s.objectives[TRAVEL - 2] = true;
    s.objectives[TRAVEL - 1] = true;
    run(s, 1);
    expect(s.objectives[TRAVEL]).toBe(true);
  });
});

describe('the arrow line step (067)', () => {
  it('during the arrow line step (067) allows only its next ghost, and the line can be built through to the end', () => {
    const s = tutorialAt(ARROW);
    expect(buildLocked(s)).toBe(true);
    expect(nextGhost(s)?.ghost).toEqual(GUIDED_BUILDS['arrow-line'][0]);
    expect(nextGhost(s)?.ghost).toMatchObject({ kind: 'place', piece: 'conduit', tx: 2, ty: 4, facing: 'right' });
    for (const place of [{ pieceId: 'cutter', tx: 2, ty: 4, facing: 'right' }, { pieceId: 'conduit', tx: 18, ty: 12, facing: 'up' }] as const) {
      run(s, 1, { place });
      expect(s.events.placeFails.map((f) => f.reason)).toEqual(['ghost']);
    }
    for (const g of GUIDED_BUILDS['arrow-line']) build(s, g);
    expect(nextGhost(s)).toBeNull();
    run(s, 1);
    expect(s.objectives[ARROW]).toBe(true);
    expect(currentObjective(s)).toBe(FILL);
    // 058's lock holds on after it: nothing but the later guided steps' ghosts until the frost rune.
    expect(buildLocked(s)).toBe(true);
    run(s, 1, { place: { pieceId: 'conduit', tx: 18, ty: 12, facing: 'up' } });
    expect(s.events.placeFails.map((f) => f.reason)).toEqual(['tutorial']);
  });

  it("the arrow line's (067) starts with the wood port's nine conduits, then the cutter", () => {
    const s = tutorialAt(ARROW);
    expect(guidedSubLine(s)).toEqual({ pieceId: 'conduit', kind: 'place', built: 0, of: 9 });
    for (const g of GUIDED_BUILDS['arrow-line'].slice(0, 9)) build(s, g);
    expect(guidedSubLine(s)).toEqual({ pieceId: 'cutter', kind: 'place', built: 0, of: 1 });
  });
});
