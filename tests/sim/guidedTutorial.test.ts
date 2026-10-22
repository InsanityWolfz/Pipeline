import { describe, expect, it } from 'vitest';
import { PYLON_MENU_TEXT } from '../../src/data/claims';
import { GUIDED_BUILDS, GUIDED_TEXT, type Ghost } from '../../src/data/guidedBuilds';
import { OBJECTIVES } from '../../src/data/objectives';
import { PLAYTEST_START } from '../../src/data/playtest';
import { TUTORIAL_START } from '../../src/data/player';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { OVERWORLD_ROOM } from '../../src/data/overworld';
import { placeExampleLine } from '../../src/sim/exampleLine';
import { buildLocked, guidedSubLine, nextGhost } from '../../src/sim/guided';
import { currentObjective, objectiveLine } from '../../src/sim/objectives';
import type { HopperState } from '../../src/sim/pieces';
import { diagrams } from '../../src/sim/research';
import { createSim, roomById, type SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer, run } from './fight';

// 058: the guided tutorial's chain, its talent cut-in, and the build lock around its two guided builds.

const TEXTS = [
  'Pick up the tube (E)',
  'Gather wood, stone and fiber (E)',
  'Craft arrows (C)',
  'Clear the ruin field of Husks',
  'Craft bombs and ley bolts (C)',
  'Enter the foundry',
  'Wait for the tube to fill with arrows',
  'Identify your armor at the bench (E)',
  'Equip a piece of armor at the bench (E)',
  "Claim the shrine's pylon",
  'Fast-travel to the foundry from the pylon (E)',
  'Refill the hoppers in the foundry with wood, stone and fiber (E)',
  'Restore the right intake entrance (E with the warden core)',
  'Put ley bolts into the second entrance (B)',
  'Leave the foundry',
  'Gather rimestone at the Frozen Grotto',
  "Claim the Frozen Grotto's pylon",
  'Craft frost arrows (C)',
  'Build a frost rune into your arrow line',
  'Find the Husk Hive and claim its pylon',
  'Reach Stonefall Hollows',
  "Claim the Cistern Terrace's pylon",
  'Defeat the Bulwark',
  "Restore the intake's third entrance (E with the Bulwark core)",
  'Feed all three entrances',
];
const REMOVED = [
  'Feed ammo into the new entrance',
  'Feed two entrances to fire a spread',
  'Head back out — the foundry keeps running',
  'Run a supply port into your line',
  'Put a second kind of ammo in another entrance',
  'Craft homing or split ley bolts (C)',
  'Claim a second pylon',
  'Explore beyond the shrine',
  'Fill the tube from your line',
  'Breach Stonefall Hollows',
];
const at = (text: string): number => OBJECTIVES.findIndex((o) => o.text === text);
const TALENT = at('Press T to spend a talent point');
const LEY = at('Put ley bolts into the second entrance (B)');
const FROST = at('Build a frost rune into your arrow line');
const TRAVEL = at('Fast-travel to the foundry from the pylon (E)');
const REFILL = at('Refill the hoppers in the foundry with wood, stone and fiber (E)');
const LEAVE = at('Leave the foundry');

/** A new game standing in the foundry by its door with every goal before `goal` done, the tube attuned. */
function tutorialAt(goal: number): SimState {
  const s = createSim(3, { start: TUTORIAL_START });
  s.objectives = OBJECTIVES.map((o, i) => i < goal && !o.cutIn);
  s.roomId = FOUNDRY_ROOM;
  const p = tileCentre(roomById(FOUNDRY_ROOM).spawn);
  movePlayer(s, p.x, p.y);
  s.link.attuned = true;
  s.hasTube = true;
  s.crafted = ['arrow', 'ley-dust', 'ley-bolt', 'bomb', 'arrow+frost'];
  placeExampleLine(s);
  run(s, 1);
  return s;
}

/** Places a ghost by command, as the build bar would. */
function build(s: SimState, g: Ghost): void {
  if (g.kind === 'remove') run(s, 1, { pickUp: { tx: g.tx, ty: g.ty } });
  else run(s, 1, { place: { pieceId: g.piece, tx: g.tx, ty: g.ty, facing: g.facing } });
}

describe('the chain (058)', () => {
  it('runs in the order and words of the spec, the talent cut-in apart', () => {
    expect(OBJECTIVES.filter((o) => !o.cutIn).map((o) => o.text)).toEqual(TEXTS);
    expect(OBJECTIVES[TALENT]?.cutIn).toBe(true);
    for (const old of REMOVED) expect(OBJECTIVES.map((o) => o.text)).not.toContain(old);
  });

  it('ends with no line at all once every goal is done (no frontier line)', () => {
    const s = tutorialAt(0);
    s.objectives = OBJECTIVES.map(() => true);
    expect(currentObjective(s)).toBeNull();
    expect(objectiveLine(s)).toEqual({ index: null, text: '' });
  });

  it('ends with the last goal, even with the talent cut-in still open', () => {
    const s = tutorialAt(0);
    s.objectives = OBJECTIVES.map((o) => !o.cutIn);
    s.talentPoints = 1;
    expect(currentObjective(s)).toBeNull();
  });
});

describe('the refill step', () => {
  it('shows after the fast travel when the line has run dry', () => {
    const s = tutorialAt(TRAVEL);
    s.lineRanDry = true;
    s.travelled = true;
    run(s, 1);
    expect(s.objectives[TRAVEL]).toBe(true);
    expect(currentObjective(s)).toBe(REFILL);
  });

  it('is skipped when the line is still running as the fast travel lands', () => {
    const s = tutorialAt(TRAVEL);
    s.travelled = true;
    run(s, 1);
    expect(s.lineRanDry).toBe(false);
    expect(s.objectives[REFILL]).toBe(true);
    expect(currentObjective(s)).toBe(REFILL + 1);
  });
});

describe('leaving the foundry', () => {
  it('is never done before it is current, and is done the first tick outside once it is', () => {
    const s = tutorialAt(LEAVE - 1);
    s.roomId = OVERWORLD_ROOM;
    run(s, 1);
    expect(s.objectives[LEAVE]).toBe(false);
    s.objectives[LEAVE - 1] = true;
    s.roomId = FOUNDRY_ROOM;
    run(s, 1);
    expect(s.objectives[LEAVE]).toBe(false);
    s.roomId = OVERWORLD_ROOM;
    run(s, 1);
    expect(s.objectives[LEAVE]).toBe(true);
    expect(currentObjective(s)).toBe(LEAVE + 1);
  });
});

describe('the talent cut-in', () => {
  it('cuts in with the first point, and the interrupted goal comes back once one is spent', () => {
    const s = tutorialAt(3);
    s.roomId = OVERWORLD_ROOM;
    expect(currentObjective(s)).toBe(3);
    s.talentPoints = 1;
    expect(currentObjective(s)).toBe(TALENT);
    s.talents.push('a-talent');
    s.talentPoints = 0;
    run(s, 1);
    expect(s.objectives[TALENT]).toBe(true);
    expect(currentObjective(s)).toBe(3);
  });

  it('waits while a guided build is current (058.4)', () => {
    for (const goal of [LEY, FROST]) {
      const s = tutorialAt(goal);
      s.talentPoints = 1;
      expect(currentObjective(s)).toBe(goal);
      s.objectives[goal] = true;
      expect(currentObjective(s)).toBe(TALENT);
    }
  });
});

describe('the build lock', () => {
  it('refuses placing and picking up in a guided game until the frost rune step is done', () => {
    const s = tutorialAt(7);
    expect(buildLocked(s)).toBe(true);
    run(s, 1, { place: { pieceId: 'conduit', tx: 18, ty: 12, facing: 'up' } });
    expect(s.events.placeFails[0]?.reason).toBe('tutorial');
    const pieces = s.foundry.pieces.length;
    run(s, 1, { pickUp: { tx: 12, ty: 1 } });
    expect(s.foundry.pieces.length).toBe(pieces);
    expect(s.events.pickUpFails[0]?.reason).toBe('tutorial');
    s.objectives[FROST] = true;
    expect(buildLocked(s)).toBe(false);
    run(s, 1, { place: { pieceId: 'conduit', tx: 18, ty: 12, facing: 'up' } });
    expect(s.events.places).toHaveLength(1);
  });

  it('never locks a non-guided start', () => {
    const s = createSim(3, { start: PLAYTEST_START });
    expect(buildLocked(s)).toBe(false);
  });

  it('still lets hoppers be filled while locked', () => {
    const s = tutorialAt(7);
    const h = s.foundry.pieces.find((p): p is HopperState => p.kind === 'hopper' && p.tx === 11);
    if (!h) throw new Error('no hopper');
    s.inventory.wood = 2;
    movePlayer(s, 11.5 * 32, 6.25 * 32);
    run(s, 1, { deposit: { id: h.id, itemId: 'wood', amount: 'all' } });
    expect(s.events.deposits).toHaveLength(1);
  });

  it('during a guided step allows only the next ghost, on its tile and facing', () => {
    const s = tutorialAt(LEY);
    s.research['entrance-2'] = 'restored';
    const first = nextGhost(s)?.ghost;
    expect(first).toEqual(GUIDED_BUILDS['ley-line'][0]);
    // Wrong facing, wrong tile, wrong piece: each refused with the ghost hint.
    run(s, 1, { place: { pieceId: 'conduit', tx: 2, ty: 10, facing: 'up' } });
    run(s, 1, { place: { pieceId: 'conduit', tx: 2, ty: 11, facing: 'right' } });
    run(s, 1, { place: { pieceId: 'grinder', tx: 2, ty: 10, facing: 'right' } });
    expect(s.foundry.pieces.some((p) => p.tx === 2)).toBe(false);
    run(s, 1, { place: { pieceId: 'conduit', tx: 18, ty: 12, facing: 'up' } });
    expect(s.events.placeFails[0]?.reason).toBe('ghost');
    build(s, GUIDED_BUILDS['ley-line'][0] as Ghost);
    expect(nextGhost(s)?.index).toBe(1);
  });

  it('gives a guided conduit its ghost side, whatever the drag said', () => {
    const s = tutorialAt(LEY);
    for (const g of GUIDED_BUILDS['ley-line'].slice(0, 15)) build(s, g);
    run(s, 1, { place: { pieceId: 'conduit', tx: 15, ty: 10, facing: 'up', inFrom: 'down' } });
    const c = s.foundry.pieces.find((p) => p.tx === 15 && p.ty === 10);
    expect(c?.kind === 'conduit' && c.inFrom).toBe('left');
  });

  it('during the frost rune step lets only the conduit leaving the assembler be picked up first', () => {
    const s = tutorialAt(FROST);
    run(s, 1, { pickUp: { tx: 12, ty: 1 } });
    expect(s.events.pickUpFails).toHaveLength(1);
    run(s, 1, { pickUp: { tx: 12, ty: 2 } });
    expect(s.events.pickUps[0]?.pieceId).toBe('conduit');
    expect(nextGhost(s)?.ghost).toMatchObject({ kind: 'place', piece: 'frost-rune', tx: 12, ty: 2 });
  });
});

describe('the right entrance (058.5)', () => {
  it("during the tutorial, the Warden core's diagram shows on the right cap only", () => {
    const s = tutorialAt(LEY - 1);
    expect(diagrams(s).filter((d) => d.entrance !== null).map((d) => d.entrance)).toEqual([2]);
    const free = createSim(3, { start: PLAYTEST_START });
    expect(diagrams(free).filter((d) => d.entrance !== null).map((d) => d.entrance)).toEqual([0, 2]);
  });
});

describe('the guided sub-line (058.2)', () => {
  it('names the next piece, counting a run of the same piece', () => {
    const s = tutorialAt(LEY);
    expect(guidedSubLine(s)).toEqual({ pieceId: 'conduit', kind: 'place', built: 0, of: 2 });
    build(s, GUIDED_BUILDS['ley-line'][0] as Ghost);
    expect(guidedSubLine(s)).toEqual({ pieceId: 'conduit', kind: 'place', built: 1, of: 2 });
    build(s, GUIDED_BUILDS['ley-line'][1] as Ghost);
    expect(guidedSubLine(s)).toEqual({ pieceId: 'grinder', kind: 'place', built: 0, of: 1 });
    expect(GUIDED_TEXT.place('conduit', 1, 2)).toBe('Place conduits 1/2');
    expect(GUIDED_TEXT.place('grinder', 0, 1)).toBe('Place a grinder');
    expect(GUIDED_TEXT.place('underground entrance', 0, 1)).toBe('Place an underground entrance');
  });
});

describe("the pylon's menu (058)", () => {
  it('reads "Send inventory to stash"', () => {
    expect(PYLON_MENU_TEXT.deposit(3)).toBe('Send inventory to stash (3)');
  });
});
