import { describe, expect, it } from 'vitest';
import { OBJECTIVES } from '../../src/data/objectives';
import { PLAYTEST_START } from '../../src/data/playtest';
import { TUTORIAL_START } from '../../src/data/player';
import { CLEARING_ROOM, FOUNDRY_ROOM, ROOMS } from '../../src/data/rooms';
import { RESERVOIR_CAP } from '../../src/data/tube';
import { arrivalTile } from '../../src/sim/doorways';
import { currentObjective } from '../../src/sim/objectives';
import { createSim, type SimState } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { knownRecipes } from '../../src/sim/tutorial';
import { command, die, fireAt, movePlayer, run, runUntil, SEED } from './fight';

const CLEARING = ROOMS[CLEARING_ROOM];
if (!CLEARING?.tubeStone) throw new Error('the clearing needs its tube stone');
const STONE = CLEARING.tubeStone;

function tutorial(): SimState {
  return createSim(SEED, { start: TUTORIAL_START });
}

/** The tutorial start, standing just below the tube stone. */
function atStone(): SimState {
  const s = tutorial();
  const below = tileCentre({ tx: STONE.tx, ty: STONE.ty + 1 });
  movePlayer(s, below.x, below.y);
  return s;
}

describe('the tutorial start', () => {
  it('wakes in the clearing with nothing, no tube, and every gate shut', () => {
    const s = tutorial();
    expect(s.roomId).toBe(CLEARING_ROOM);
    expect(s.inventory).toEqual({});
    expect(s.hasTube).toBe(false);
    expect(s.gates).toEqual({ foundry: false, shrine: false });
    expect(summarize(s).objective).toEqual({ index: 0, text: OBJECTIVES[0]?.text });
  });

  it('the playtest start skips it all: tube, attuned, gates open', () => {
    const s = createSim(SEED, { start: PLAYTEST_START });
    expect([s.hasTube, s.link.attuned, s.gates.foundry, s.gates.shrine]).toEqual([true, true, true, true]);
  });
});

describe('the tube', () => {
  it('fires nothing until taken from its stone, then stays through a KO', () => {
    const s = atStone();
    s.inventory = { arrow: 5 };
    run(s, 1, fireAt(s.player.x + 100, s.player.y));
    expect(s.arrows).toEqual([]);
    expect(s.inventory.arrow).toBe(5);
    run(s, 1, { interact: true });
    expect(s.hasTube).toBe(true);
    expect(s.events.tubeTaken).toBe(true);
    run(s, 20, fireAt(s.player.x + 100, s.player.y));
    expect(s.arrows.length).toBeGreaterThan(0);
    die(s);
    expect(s.hasTube).toBe(true);
  });

  it('its stone is solid', () => {
    const s = atStone();
    const y = s.player.y;
    run(s, 30, { moveY: -1 });
    expect(s.player.y).toBeGreaterThan(y - 16);
  });
});

describe('gates', () => {
  it("the foundry door is solid and does nothing until the hall's pack is dead, then stays open", () => {
    const s = createSim(SEED, { start: TUTORIAL_START, roomId: 'ruin-hall' });
    s.hasTube = true;
    const inside = tileCentre(arrivalTile('ruin-hall', 0));
    movePlayer(s, inside.x, inside.y);
    run(s, 30, { moveX: -1 });
    expect(s.roomId).toBe('ruin-hall');
    s.enemies = s.enemies.filter((e) => e.roomId !== 'ruin-hall');
    run(s, 1);
    expect(s.gates.foundry).toBe(true);
    expect(s.events.gates).toEqual([{ gate: 'foundry' }]);
    runUntil(s, (x) => x.roomId === FOUNDRY_ROOM, 60, { moveX: -1 });
    die(s);
    expect(s.gates.foundry).toBe(true);
    expect(s.enemies.some((e) => e.roomId === 'ruin-hall')).toBe(true);
  });

  it('the shrine opens the first time the reservoir fills', () => {
    const s = tutorial();
    s.link.reservoir = { itemId: 'arrow', count: RESERVOIR_CAP - 1 };
    run(s, 1);
    expect(s.gates.shrine).toBe(false);
    s.link.reservoir.count = RESERVOIR_CAP;
    run(s, 1);
    expect([s.firstLineFull, s.gates.shrine]).toEqual([true, true]);
    s.link.reservoir.count = 0;
    run(s, 1);
    expect(s.gates.shrine).toBe(true);
  });
});

describe('recipes', () => {
  it('only the arrow chain is known until the tube attunes', () => {
    const s = tutorial();
    expect(knownRecipes(s)).toEqual(['shaft', 'arrowhead', 'rope', 'arrow']);
    s.link.attuned = true;
    expect(knownRecipes(s)).toHaveLength(9);
  });
});

describe('objectives', () => {
  it('complete as their checks hold, the line showing the first unfinished one', () => {
    const s = atStone();
    run(s, 1, { interact: true });
    expect(s.objectives[0]).toBe(true);
    expect(currentObjective(s)).toBe(1);
    // Done out of order: entering the foundry ticks objective 4, the line still shows 1.
    s.roomId = FOUNDRY_ROOM;
    run(s, 1);
    expect(s.objectives[4]).toBe(true);
    expect(currentObjective(s)).toBe(1);
    expect(s.events.objectives).toEqual([{ index: 4 }]);
  });

  it('gathering counts each raw harvested', () => {
    const s = tutorial();
    s.gathered = ['wood', 'stone'];
    run(s, 1);
    expect(s.objectives[1]).toBe(false);
    s.gathered.push('fiber');
    run(s, 1);
    expect(s.objectives[1]).toBe(true);
  });

  it('the last completes after its time away with a line running, and ends the prototype', () => {
    const s = createSim(SEED, { start: PLAYTEST_START });
    s.objectives = OBJECTIVES.map((_, i) => i < OBJECTIVES.length - 1);
    s.roomId = FOUNDRY_ROOM;
    stepSim(s, command({ place: { pieceId: 'tube-socket', tx: 5, ty: 5, facing: 'right' } }));
    s.roomId = 'ruin-hall';
    const last = OBJECTIVES[OBJECTIVES.length - 1]?.check;
    const ticks = last?.kind === 'awayRunning' ? last.ticks : 0;
    run(s, ticks - 1);
    expect(s.prototypeComplete).toBe(false);
    run(s, 1);
    expect(s.prototypeComplete).toBe(true);
    expect(summarize(s).objective).toBeNull();
  });

  it('replay identically', () => {
    const play = () => {
      const s = atStone();
      run(s, 1, { interact: true });
      run(s, 300, (x) => ({ moveX: x.tick % 80 < 40 ? 1 : -1, interact: x.tick % 50 === 0 }));
      return summarize(s);
    };
    expect(play()).toEqual(play());
  });
});
