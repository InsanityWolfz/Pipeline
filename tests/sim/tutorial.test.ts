import { describe, expect, it } from 'vitest';
import { OBJECTIVES } from '../../src/data/objectives';
import { PLAYTEST_START } from '../../src/data/playtest';
import { TUTORIAL_START } from '../../src/data/player';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { WORLD } from '../../src/sim/world';
import { ENTRANCE_CAPS, INTAKE, INTAKE_REACH } from '../../src/data/foundry';
import { currentObjective } from '../../src/sim/objectives';
import { createSim, type SimState } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { knownRecipe } from '../../src/sim/tutorial';
import { RECIPES } from '../../src/data/recipes';
import { placeNode } from './fight';
import { atEntrance, command, die, fireAt, movePlayer, run, runUntil, SEED } from './fight';

// 017: the tutorial wakes in the overworld's meadow, by the tube's stone.
const CLEARING_ROOM = OVERWORLD_ROOM;
const CLEARING = WORLD[CLEARING_ROOM];
if (!CLEARING?.tubeStone) throw new Error('the overworld needs its tube stone');
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
  it('wakes by the tube stone with nothing, no tube, and every gate shut', () => {
    const s = tutorial();
    expect(s.roomId).toBe(CLEARING_ROOM);
    expect({ x: s.player.x, y: s.player.y }).toEqual(tileCentre(OVERWORLD.wake));
    expect(s.inventory).toEqual({});
    expect(s.hasTube).toBe(false);
    expect(s.gates).toEqual({ foundry: false, shrine: false, hollows: false });
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

  it('without it, fire, use and a slot pick do not interrupt a harvest', () => {
    const s = tutorial();
    const n = placeNode(s, 'tree', s.player.x + 20, s.player.y, CLEARING_ROOM);
    run(s, 1, { interact: true });
    expect(s.harvest?.nodeId).toBe(n.id);
    run(s, 1, { fire: true, use: true, selectSlot: 2, aimX: s.player.x + 50, aimY: s.player.y });
    expect(s.harvest).not.toBeNull();
    expect(s.hotbar.selected).toBe(0);
  });

  it('a KO before the foundry is open wakes the player back by the stone', () => {
    const s = tutorial();
    movePlayer(s, tileCentre(OVERWORLD.field).x, tileCentre(OVERWORLD.field).y);
    die(s);
    expect(s.roomId).toBe(CLEARING_ROOM);
    expect({ x: s.player.x, y: s.player.y }).toEqual(tileCentre(OVERWORLD.wake));
    expect(s.link.attuned).toBe(false);
    s.gates.foundry = true;
    die(s);
    expect(s.roomId).toBe(FOUNDRY_ROOM);
  });

  it('its stone is solid', () => {
    const s = atStone();
    const y = s.player.y;
    run(s, 30, { moveY: -1 });
    expect(s.player.y).toBeGreaterThan(y - 16);
  });
});

describe('gates', () => {
  it("the foundry's stairs are solid and do nothing until the ruin field's pack is dead, then stay open", () => {
    const s = tutorial();
    s.hasTube = true;
    atEntrance(s);
    run(s, 30, { moveY: -1 });
    expect(s.roomId).toBe(OVERWORLD_ROOM);
    s.enemies = s.enemies.filter((e) => e.group !== 'field');
    run(s, 1);
    expect(s.gates.foundry).toBe(true);
    expect(s.events.gates).toEqual([{ gate: 'foundry' }]);
    runUntil(s, (x) => x.roomId === FOUNDRY_ROOM, 60, { moveY: -1 });
    die(s);
    expect(s.gates.foundry).toBe(true);
    expect(s.enemies.some((e) => e.group === 'field')).toBe(true);
  });

  it("the shrine site's gap is sealed until its gate opens (017)", () => {
    const s = tutorial();
    s.enemies = [];
    const gap = OVERWORLD.shrine.gate[1];
    if (!gap) throw new Error('no gate tile');
    const below = tileCentre({ tx: gap.tx, ty: gap.ty + 2 });
    movePlayer(s, below.x, below.y);
    run(s, 40, { moveY: -1 });
    expect(s.player.y).toBeGreaterThan(tileCentre(gap).y);
    s.gates.shrine = true;
    runUntil(s, (x) => x.player.y < tileCentre(gap).y - 32, 60, { moveY: -1 });
  });

  it('the shrine opens the first time an entrance fills', () => {
    const s = tutorial();
    const middle = s.link.entrances[1];
    if (!middle) throw new Error('no middle entrance');
    Object.assign(middle, { ammoId: 'arrow', count: (ENTRANCE_CAPS[0] ?? 30) - 1 });
    run(s, 1);
    expect(s.gates.shrine).toBe(false);
    middle.count = ENTRANCE_CAPS[0] ?? 30;
    run(s, 1);
    expect([s.firstLineFull, s.gates.shrine]).toEqual([true, true]);
    middle.count = 0;
    run(s, 1);
    expect(s.gates.shrine).toBe(true);
    die(s);
    expect(s.gates.shrine).toBe(true);
  });
});

describe('recipes', () => {
  it('only the arrow chain is known until the tube attunes', () => {
    const s = tutorial();
    const known = () => Object.keys(RECIPES).filter((id) => knownRecipe(s, id));
    expect(known()).toEqual(['shaft', 'arrowhead', 'rope', 'arrow']);
    s.link.attuned = true;
    expect(known()).toHaveLength(9);
  });
});

describe('objectives', () => {
  it('complete as their checks hold, the line showing the first unfinished one', () => {
    const s = atStone();
    run(s, 1, { interact: true });
    expect(s.objectives[0]).toBe(true);
    expect(currentObjective(s)).toBe(1);
    // Done out of order: entering the foundry ticks objective 4, the line still shows 1 (046: the example line, laid
    // on this entry, ticks nothing itself).
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

  it('restoring a second entrance, then feeding two, complete the spread goals (033: one entrance per core)', () => {
    const s = createSim(SEED, { start: PLAYTEST_START });
    const open = OBJECTIVES.findIndex((o) => o.check.kind === 'restored' && o.check.node === 'entrance-2');
    const fed = OBJECTIVES.findIndex((o) => o.check.kind === 'volley');
    expect(OBJECTIVES[open]?.text).toBe('Restore a second intake entrance (E at a cap with the warden core)');
    expect(OBJECTIVES[fed]?.text).toBe('Feed two entrances to fire a spread');
    // 046: the second-line goal sits between them.
    expect(OBJECTIVES[open + 1]?.text).toBe('Build a second arrow line into the new entrance');
    expect(fed).toBe(open + 2);
    s.roomId = FOUNDRY_ROOM;
    // Under the west cap.
    const under = INTAKE.entrances[0] ?? { tx: 11, ty: 0 };
    s.player.x = (under.tx + 0.5) * 32;
    s.player.y = (under.ty + 1.5) * 32;
    expect(INTAKE_REACH).toBeGreaterThan(0);
    run(s, 1);
    expect([s.objectives[open], s.objectives[fed]]).toEqual([false, false]);
    // E alone does nothing in the sim now: render opens the restore panel, whose Restore sends `restore`.
    run(s, 1, { interact: true });
    expect(s.objectives[open]).toBe(false);
    run(s, 1, { restore: 'entrance-2' });
    expect(s.objectives[open]).toBe(true);
    expect(s.link.entrances.map((e) => e.open)).toEqual([true, true, false]);
    Object.assign(s.link.entrances[1] ?? {}, { ammoId: 'ley-bolt', count: 4 });
    run(s, 1);
    expect(s.objectives[fed]).toBe(false);
    Object.assign(s.link.entrances[0] ?? {}, { ammoId: 'arrow', count: 1 });
    run(s, 1);
    expect(s.objectives[fed]).toBe(true);
  });

  it("the prototype's last completes after its time away with a line running, and ends the prototype", () => {
    const s = createSim(SEED, { start: PLAYTEST_START });
    const away = OBJECTIVES.findIndex((o) => o.check.kind === 'awayRunning');
    s.objectives = OBJECTIVES.map((_, i) => i < away);
    s.roomId = FOUNDRY_ROOM;
    // A conduit feeding the intake's middle mouth tile (019) is a line running.
    stepSim(s, command({ place: { pieceId: 'conduit', tx: 12, ty: 1, facing: 'up' } }));
    s.roomId = OVERWORLD_ROOM;
    const last = OBJECTIVES[away]?.check;
    const ticks = last?.kind === 'awayRunning' ? last.ticks : 0;
    run(s, ticks - 1);
    expect(s.prototypeComplete).toBe(false);
    run(s, 1);
    expect(s.prototypeComplete).toBe(true);
    // The line moves on to Milestone 1's first goal (028).
    expect(summarize(s).objective).toEqual({ index: away + 1, text: 'Run a supply port into your line' });
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
