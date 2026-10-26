import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../../src/data/config';
import { INTAKE } from '../../src/data/foundry';
import { HOLLOWS } from '../../src/data/hollows';
import { nodeDef } from '../../src/data/nodes';
import { OBJECTIVES } from '../../src/data/objectives';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { TUTORIAL_START } from '../../src/data/player';
import { FOUNDRY_ROOM, SHRINE_SITE } from '../../src/data/rooms';
import { claim } from '../../src/sim/claims';
import { objectiveTargets, targetPoints, waypoint } from '../../src/sim/objectiveTarget';
import { currentObjective } from '../../src/sim/objectives';
import { createSim, type SimState } from '../../src/sim/state';
import { SEED } from './fight';
import { put } from './foundryKit';
import { layArrowLine } from './guidedKit';

// 051 (B.1, B.2, 051.2): every goal names a target, and the waypoint arrow goes to the nearest of its points in the
// player's room, or to the door that leads to them.

const at = (text: string): number => {
  const i = OBJECTIVES.findIndex((o) => o.text === text);
  if (i < 0) throw new Error(`no goal '${text}'`);
  return i;
};

/** A new game with every goal before `text` done. */
function upTo(text: string): SimState {
  const s = createSim(SEED, { start: TUTORIAL_START });
  const goal = at(text);
  s.objectives = OBJECTIVES.map((o, i) => i < goal && !o.cutIn);
  return s;
}

const base = (t: { tx: number; ty: number }) => ({ x: (t.tx + 0.5) * TILE_SIZE, y: (t.ty + 1) * TILE_SIZE });

describe('every goal names a target (051)', () => {
  it('each objective has one, but the talent cut-in (done anywhere)', () => {
    for (const o of OBJECTIVES) expect(o.target !== undefined, o.text).toBe(!o.cutIn);
  });

  it('the first goal points at the tube on its stone, and nothing once it is taken', () => {
    const s = upTo('Pick up the tube (E)');
    expect(currentObjective(s)).toBe(0);
    expect(waypoint(s)).toMatchObject({ via: 'target', ...base(OVERWORLD.startStone), target: { kind: 'tubeStone' } });
    s.hasTube = true;
    expect(objectiveTargets(s)).toEqual([]);
  });

  it('the gathering goal points at the nearest harvestable node of a raw not yet gathered (051.2)', () => {
    const s = upTo('Gather wood, stone and fiber (E)');
    s.gathered = ['wood', 'fiber'];
    const wp = waypoint(s);
    expect(wp?.target.ref).toBe('rubble');
    const stones = s.nodes.filter((n) => nodeDef(n.nodeId).itemId === 'stone');
    const nearest = [...stones].sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y))[0];
    expect(wp?.x).toBe(nearest?.x);
    // A used-up node drops out while another remains.
    if (nearest) nearest.uses = 0;
    expect(waypoint(s)?.x).not.toBe(nearest?.x);
  });

  it('clearing the field points at a living Husk of its pack', () => {
    const s = upTo('Clear the ruin field');
    const wp = waypoint(s);
    expect(wp?.target.kind).toBe('pack');
    expect(s.enemies.some((e) => e.group === 'field' && e.x === wp?.x && e.y === wp?.y)).toBe(true);
  });

  it('the Warden goal points at the Warden in its shrine (067)', () => {
    const s = upTo('Defeat the Pylon Warden at the shrine');
    const warden = s.enemies.find((e) => e.enemyId === 'pylon-warden');
    expect(warden).toBeDefined();
    expect(waypoint(s)).toMatchObject({ x: warden?.x, y: warden?.y, target: { kind: 'boss' } });
  });

  it('the shrine goal points at its pylon; the travel goal (067) at the same pylon once claimed', () => {
    const s = upTo("Claim the shrine's pylon (E)");
    expect(waypoint(s)).toMatchObject(base(OVERWORLD.shrine.pylon));
    claim(s, SHRINE_SITE);
    expect(objectiveTargets(s)).toEqual([]);
    s.objectives[at("Claim the shrine's pylon (E)")] = true;
    expect(currentObjective(s)).toBe(at('Travel to the foundry (E at the pylon)'));
    expect(waypoint(s)).toMatchObject(base(OVERWORLD.shrine.pylon));
  });
});

describe('through the foundry door (051)', () => {
  it('outside, a goal in the foundry points at its stairs; inside, at the target itself', () => {
    const s = upTo('Identify your armor at the bench (E)');
    s.roomId = OVERWORLD_ROOM;
    expect(waypoint(s)).toMatchObject({ via: 'door', ...base(OVERWORLD.entrance.door), target: { kind: 'bench', roomId: FOUNDRY_ROOM } });
    s.roomId = FOUNDRY_ROOM;
    // 052: the bench stands just inside the door, at (22, 9).
    expect(waypoint(s)).toMatchObject({ via: 'target', target: { kind: 'bench', ...base({ tx: 22, ty: 9 }) } });
  });

  it('inside, a goal outside points at the foundry door; a room goal points at its door and is nothing inside', () => {
    const s = upTo("Claim the shrine's pylon (E)");
    s.roomId = FOUNDRY_ROOM;
    expect(waypoint(s)).toMatchObject({ via: 'door', ...base({ tx: 23, ty: 8 }) });
    // 067: no goal names the foundry as a room before it ("Enter the foundry" went); the Smelter's goal does after.
    const e = upTo('Build a Smelter into a line');
    e.roomId = OVERWORLD_ROOM;
    expect(waypoint(e)).toMatchObject({ via: 'door', ...base(OVERWORLD.entrance.door) });
    e.roomId = FOUNDRY_ROOM;
    expect(waypoint(e)).toBeNull();
  });

  it('leaving the foundry points at the door inside and at nothing outside', () => {
    const s = upTo('Leave the foundry');
    s.roomId = FOUNDRY_ROOM;
    expect(waypoint(s)?.via).toBe('door');
    s.roomId = OVERWORLD_ROOM;
    expect(waypoint(s)).toBeNull();
  });

  it('the sandbox has no waypoint', () => {
    const s = upTo("Claim the shrine's pylon (E)");
    s.sandbox = { god: false, pens: [], bottomless: false } as unknown as NonNullable<SimState['sandbox']>;
    expect(waypoint(s)).toBeNull();
  });
});

describe('the hoppers target (051)', () => {
  it("points at each hopper in the foundry, with no raw icon (067: the refill goal that marked them is gone)", () => {
    const s = upTo('Wait for the tube to fill with arrows');
    s.roomId = FOUNDRY_ROOM;
    s.start = { ...s.start, guided: false };
    for (const tx of [11, 12, 13]) put(s, 'hopper', tx, 5, 'up');
    const points = targetPoints(s, { kind: 'hoppers' }, at('Wait for the tube to fill with arrows'));
    expect(points.map((p) => ({ x: p.x, y: p.y }))).toEqual([11, 12, 13].map((tx) => base({ tx, ty: 5 })));
    expect(points.map((p) => p.itemId)).toEqual([undefined, undefined, undefined]);
  });
});

describe('the intake goals (051)', () => {
  it('restoring the right entrance points at the right cap only (058.5); the fill goal at the intake', () => {
    const s = upTo('Restore the right intake entrance (E with the warden core)');
    s.roomId = FOUNDRY_ROOM;
    expect(objectiveTargets(s).map((p) => ({ x: p.x, y: p.y }))).toEqual([base(INTAKE.entrances[2] ?? { tx: 0, ty: 0 })]);
    const f = at('Wait for the tube to fill with arrows');
    const [, centre, east] = s.link.entrances;
    if (!centre || !east) throw new Error('no entrances');
    east.open = true;
    centre.ammoId = 'arrow';
    centre.count = 5;
    expect(targetPoints(s, { kind: 'intake' }, f).map((p) => p.x)).toEqual([base(INTAKE.entrances[2] ?? { tx: 0, ty: 0 }).x]);
  });

  it('the arrow line goal (067) points at its first ghost, in front of the wood port', () => {
    const s = upTo('Build an arrow line into the middle entrance (B)');
    s.roomId = FOUNDRY_ROOM;
    expect(waypoint(s)).toMatchObject({ via: 'target', ...base({ tx: 2, ty: 4 }), target: { kind: 'ghost' } });
  });

  it('a guided goal points at its next ghost', () => {
    const s = upTo('Put ley bolts into the second entrance (B)');
    s.roomId = FOUNDRY_ROOM;
    expect(waypoint(s)).toMatchObject({ via: 'target', ...base({ tx: 2, ty: 10 }), target: { kind: 'ghost' } });
  });

  it('the Bulwark goal points at the boss, or its arena once it is gone', () => {
    const s = upTo('Defeat the Bulwark');
    const boss = s.enemies.find((e) => e.enemyId === 'bulwark');
    expect(waypoint(s)).toMatchObject({ x: boss?.x, y: boss?.y });
    s.enemies = s.enemies.filter((e) => e.enemyId !== 'bulwark');
    expect(waypoint(s)?.target.kind).toBe('boss');
  });
});

describe('the other targets (051.4, 051.5)', () => {
  it("the bomb goal's Husk resin points at the overworld's Husks, the Hive's seeps only once none is left", () => {
    const s = upTo('Craft bombs (C)');
    s.inventory = {};
    const i = at('Craft bombs (C)');
    const resin = () => targetPoints(s, { kind: 'collect' }, i).filter((p) => p.ref === 'husk' || p.ref === 'resin-seep');
    const husks = s.enemies.filter((e) => e.enemyId === 'husk' && e.roomId === OVERWORLD_ROOM && e.health > 0);
    expect(husks.length).toBeGreaterThan(0);
    expect(resin().map((p) => p.ref)).toEqual(husks.map(() => 'husk'));
    expect(resin().map((p) => ({ x: p.x, y: p.y }))).toEqual(husks.map((e) => ({ x: e.x, y: e.y })));
    for (const e of husks) e.health = 0;
    const seeps = resin();
    expect(seeps.length).toBeGreaterThan(0);
    expect(seeps.every((p) => p.ref === 'resin-seep')).toBe(true);
  });

  it("reaching the Hollows points where the Cistern Terrace's road crosses the barrier (053: it rings Region 1)", () => {
    const s = upTo('Reach Stonefall Hollows');
    expect(waypoint(s)).toMatchObject({ via: 'target', ...base(HOLLOWS.crossing), target: { kind: 'barrier' } });
  });

  it('the frost rune goal points at the foundry outside, and at the conduit to remove inside', () => {
    const s = upTo('Build a frost rune into your arrow line');
    s.roomId = OVERWORLD_ROOM;
    expect(waypoint(s)).toMatchObject({ via: 'door', ...base(OVERWORLD.entrance.door) });
    s.roomId = FOUNDRY_ROOM;
    layArrowLine(s);
    expect(waypoint(s)).toMatchObject({ via: 'target', ...base({ tx: 12, ty: 2 }), target: { kind: 'ghost' } });
  });
});
