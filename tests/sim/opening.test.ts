import { describe, expect, it } from 'vitest';
import { OBJECTIVES } from '../../src/data/objectives';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { BOMB_RAWS, TUTORIAL_START } from '../../src/data/player';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { SEALED_DOOR_TEXT } from '../../src/data/hints';
import { claim } from '../../src/sim/claims';
import { craft } from '../../src/sim/crafting';
import { currentObjective } from '../../src/sim/objectives';
import { createSandboxSim } from '../../src/sim/sandbox';
import { createSim, type SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { WORLD } from '../../src/sim/world';
import { atEntrance, atPylon, die, movePlayer, run, runUntil, SEED } from './fight';

// 067: the opening before the foundry. Bombs and ley bolts by hand, the ruin field, the Pylon Warden and the shrine's
// claim all come first; the shrine's dome is open from the start, the foundry's stairs stay sealed until the claim
// ("Claim the shrine first"), and the overworld's packs come out once the ruin field is cleared.

const tutorial = (): SimState => createSim(SEED, { start: TUTORIAL_START });
const at = (text: string): number => OBJECTIVES.findIndex((o) => o.text === text);

/** The current goal, answering the talent cut-in (058) as the player would, with T, whenever it comes. */
function current(s: SimState): number | null {
  if (OBJECTIVES[currentObjective(s) ?? -1]?.cutIn) {
    s.talents.push('a1');
    s.talentPoints -= 1;
    run(s, 1);
  }
  return currentObjective(s);
}

/** Kills every living enemy of a group through its health, as a fight would, and runs the tick they die on. */
function kill(s: SimState, group: string): void {
  for (const e of s.enemies) if (e.group === group) e.health = 0;
  run(s, 1);
}

describe("the chain's first goals (067)", () => {
  const FIRST = [
    'Pick up the tube (E)',
    'Gather wood, stone and fiber (E)',
    'Craft arrows (C)',
    'Craft bombs (C)',
    'Craft ley bolts (C)',
    'Clear the ruin field',
    'Defeat the Pylon Warden at the shrine',
    "Claim the shrine's pylon (E)",
    'Travel to the foundry (E at the pylon)',
  ];

  it('run in the order and words of the spec, each with a waypoint target', () => {
    const chain = OBJECTIVES.filter((o) => !o.cutIn);
    expect(chain.slice(0, FIRST.length).map((o) => o.text)).toEqual(FIRST);
    for (const o of chain.slice(0, FIRST.length)) expect(o.target, o.text).toBeDefined();
    expect(OBJECTIVES[at('Craft bombs (C)')]).toMatchObject({ check: { kind: 'crafted', items: ['bomb'] }, subSteps: 'collect', target: { kind: 'collect' } });
    expect(OBJECTIVES[at('Craft ley bolts (C)')]).toMatchObject({ check: { kind: 'crafted', items: ['ley-bolt'] }, subSteps: 'collect' });
    expect(OBJECTIVES[at('Clear the ruin field')]).toMatchObject({ check: { kind: 'fieldCleared' }, target: { kind: 'pack', group: 'field' } });
    expect(OBJECTIVES[at('Defeat the Pylon Warden at the shrine')]).toMatchObject({ check: { kind: 'bossDefeated', boss: 'pylon-warden' }, target: { kind: 'boss', boss: 'pylon-warden' } });
    expect(OBJECTIVES[at('Travel to the foundry (E at the pylon)')]).toMatchObject({ check: { kind: 'inRoom', room: FOUNDRY_ROOM }, inOrder: true, target: { kind: 'pylon', site: 'shrine', claimed: true } });
  });

  it('has no "Enter the foundry", no refill goal and no fast-travel-only goal any more', () => {
    const texts = OBJECTIVES.map((o) => o.text);
    for (const old of ['Enter the foundry', 'Clear the ruin field of Husks', 'Craft bombs and ley bolts (C)', 'Refill the hoppers in the foundry with wood, stone and fiber (E)', 'Fast-travel to the foundry from the pylon (E)']) {
      expect(texts).not.toContain(old);
    }
  });

  it('each completes in a scripted run on the real start, in order', () => {
    const s = tutorial();
    const t = WORLD[OVERWORLD_ROOM]?.tubeStone;
    if (!t) throw new Error('no tube stone');
    const stone = tileCentre({ tx: t.tx, ty: t.ty + 1 });
    movePlayer(s, stone.x, stone.y);
    run(s, 1, { interact: true });
    expect(current(s)).toBe(1);
    s.gathered = ['wood', 'stone', 'fiber'];
    run(s, 1);
    expect(current(s)).toBe(2);
    s.inventory = { shaft: 1, arrowhead: 1, rope: 1 };
    craft(s, 'arrow');
    run(s, 1);
    expect(current(s)).toBe(3);
    // The bomb chain's rows show once its raws have been carried; then bombs, then ley bolts, by hand.
    s.inventory = { stone: 1, 'husk-resin': 1, 'ley-crystal': 2 };
    run(s, 1);
    expect(s.found).toEqual([...BOMB_RAWS]);
    for (const r of ['casing', 'fuse', 'ley-dust', 'bomb']) expect(craft(s, r), r).toBe(true);
    run(s, 1);
    expect(current(s)).toBe(4);
    expect(craft(s, 'ley-dust')).toBe(true);
    expect(craft(s, 'ley-bolt')).toBe(true);
    run(s, 1);
    expect(current(s)).toBe(5);
    kill(s, 'field');
    expect(current(s)).toBe(6);
    kill(s, 'shrine');
    expect(s.killedBosses).toContain('pylon-warden');
    expect(current(s)).toBe(7);
    claim(s, 'shrine');
    run(s, 1);
    expect(current(s)).toBe(8);
    expect(s.link.attuned).toBe(false);
  });

  it('the travel goal is done by walking down the stairs, or by fast travel from the pylon', () => {
    const TRAVEL = at('Travel to the foundry (E at the pylon)');
    const claimed = (): SimState => {
      const s = tutorial();
      s.hasTube = true;
      s.objectives = OBJECTIVES.map((o, i) => i < TRAVEL && !o.cutIn);
      claim(s, 'shrine');
      run(s, 1);
      return s;
    };
    const walked = claimed();
    atEntrance(walked);
    runUntil(walked, (x) => x.roomId === FOUNDRY_ROOM, 60, { moveY: -1 });
    run(walked, 1);
    expect(walked.objectives[TRAVEL]).toBe(true);
    const flew = claimed();
    atPylon(flew);
    run(flew, 1, { pylon: 'travel' });
    run(flew, 1);
    expect(flew.roomId).toBe(FOUNDRY_ROOM);
    expect(flew.objectives[TRAVEL]).toBe(true);
  });

  it('the talent cut-in still cuts in at the first point, and the chain picks up where it was', () => {
    const s = tutorial();
    s.objectives = OBJECTIVES.map((o, i) => i < 3 && !o.cutIn);
    expect(currentObjective(s)).toBe(3);
    s.talentPoints = 1;
    expect(OBJECTIVES[currentObjective(s) ?? 0]?.cutIn).toBe(true);
    s.talents.push('a1');
    s.talentPoints = 0;
    run(s, 1);
    expect(currentObjective(s)).toBe(3);
  });
});

describe("the shrine's dome (067)", () => {
  it('is open from the start: the gate stands open and E at the door goes in', () => {
    const s = tutorial();
    expect(s.gates.shrine).toBe(true);
    s.enemies = [];
    const door = OVERWORLD.shrine.door[1];
    if (!door) throw new Error('no door tile');
    movePlayer(s, tileCentre({ tx: door.tx, ty: door.ty + 1 }).x, tileCentre({ tx: door.tx, ty: door.ty + 1 }).y);
    run(s, 40, { moveY: -1 });
    run(s, 1, { interact: true });
    expect(s.player.y).toBeLessThan(tileCentre(door).y);
  });

  it('no longer waits on a full line', () => {
    const s = tutorial();
    const middle = s.link.entrances[1];
    if (!middle) throw new Error('no middle entrance');
    Object.assign(middle, { ammoId: 'arrow', count: 30 });
    run(s, 1);
    expect(s.firstLineFull).toBe(true);
    expect(s.events.gates).toEqual([]);
    expect(s.populated).toBe(false);
  });
});

describe("the foundry's stairs (067)", () => {
  it('stay sealed, the field cleared and the Warden dead, until the shrine is claimed; then open for good', () => {
    const s = tutorial();
    s.hasTube = true;
    kill(s, 'field');
    kill(s, 'shrine');
    expect(s.gates.foundry).toBe(false);
    atEntrance(s);
    run(s, 30, { moveY: -1 });
    expect(s.roomId).toBe(OVERWORLD_ROOM);
    claim(s, 'shrine');
    run(s, 1);
    expect(s.gates.foundry).toBe(true);
    expect(s.events.gates).toContainEqual({ gate: 'foundry' });
    runUntil(s, (x) => x.roomId === FOUNDRY_ROOM, 60, { moveY: -1 });
    expect(s.roomId).toBe(FOUNDRY_ROOM);
    die(s);
    expect(s.gates.foundry).toBe(true);
  });

  it('say "Claim the shrine first" to E, or to walking into them, until the claim', () => {
    expect(SEALED_DOOR_TEXT.foundry).toBe('Claim the shrine first');
    const s = tutorial();
    s.hasTube = true;
    atEntrance(s);
    run(s, 1);
    expect(s.events.sealedDoors).toEqual([]);
    run(s, 1, { interact: true });
    expect(s.events.sealedDoors).toEqual([{ gate: 'foundry' }]);
    // Walking up into them: once against the seal, every tick it's pushed.
    runUntil(s, (x) => x.events.sealedDoors.length > 0, 30, { moveY: -1 });
    expect(s.events.sealedDoors).toEqual([{ gate: 'foundry' }]);
    run(s, 1, { moveY: 1 });
    expect(s.events.sealedDoors).toEqual([]);
    // Far from the door, nothing.
    const away = tileCentre(OVERWORLD.field);
    movePlayer(s, away.x, away.y);
    run(s, 1, { interact: true });
    expect(s.events.sealedDoors).toEqual([]);
    claim(s, 'shrine');
    run(s, 1);
    atEntrance(s);
    run(s, 1, { interact: true });
    expect(s.events.sealedDoors).toEqual([]);
  });

  it('a KO before the claim still wakes the player by the stone', () => {
    const s = tutorial();
    kill(s, 'field');
    die(s);
    expect(s.roomId).toBe(OVERWORLD_ROOM);
    expect({ x: s.player.x, y: s.player.y }).toEqual(tileCentre(OVERWORLD.wake));
  });
});

describe('the packs come out once the ruin field is cleared (067)', () => {
  it("killing the field pack's last Husk clears the field and populates the land, for good", () => {
    const s = tutorial();
    const field = s.enemies.filter((e) => e.group === 'field');
    expect(field.length).toBeGreaterThan(1);
    const [first, ...rest] = field;
    if (first) first.health = 0;
    run(s, 1);
    expect([s.fieldCleared, s.populated]).toEqual([false, false]);
    for (const e of rest) e.health = 0;
    run(s, 1);
    expect([s.fieldCleared, s.populated]).toEqual([true, true]);
    die(s);
    expect(s.enemies.some((e) => e.group === 'field')).toBe(true);
    expect([s.fieldCleared, s.populated]).toEqual([true, true]);
  });

  it('never from enemies cleared by hand, or in the sandbox', () => {
    const s = tutorial();
    s.enemies = [];
    run(s, 2);
    expect([s.fieldCleared, s.populated]).toEqual([false, false]);
    const sb = createSandboxSim(SEED);
    for (const e of sb.enemies) e.health = 0;
    run(sb, 2);
    expect([sb.fieldCleared, sb.populated]).toEqual([false, false]);
  });
});
