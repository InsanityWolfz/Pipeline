import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../../src/data/config';
import { INTAKE } from '../../src/data/foundry';
import { HOLLOWS, REGION_1_X } from '../../src/data/hollows';
import { nodeDef } from '../../src/data/nodes';
import { OBJECTIVES } from '../../src/data/objectives';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { TUTORIAL_START } from '../../src/data/player';
import { FOUNDRY_ROOM, SHRINE_SITE } from '../../src/data/rooms';
import { claim } from '../../src/sim/claims';
import { fixtureDef } from '../../src/sim/fixtures';
import { hopperRaw, objectiveTargets, targetPoints, waypoint } from '../../src/sim/objectiveTarget';
import { currentObjective } from '../../src/sim/objectives';
import type { HopperState } from '../../src/sim/pieces';
import { placeExampleLine } from '../../src/sim/exampleLine';
import { createSim, type SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer, SEED } from './fight';

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
  s.objectives = OBJECTIVES.map((_, i) => i < goal);
  return s;
}

const base = (t: { tx: number; ty: number }) => ({ x: (t.tx + 0.5) * TILE_SIZE, y: (t.ty + 1) * TILE_SIZE });

describe('every goal names a target (051)', () => {
  it('each objective has one', () => {
    for (const o of OBJECTIVES) expect(o.target, o.text).toBeDefined();
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
    const s = upTo('Clear the ruin field of Husks');
    const wp = waypoint(s);
    expect(wp?.target.kind).toBe('pack');
    expect(s.enemies.some((e) => e.group === 'field' && e.x === wp?.x && e.y === wp?.y)).toBe(true);
  });

  it('the shrine goal points at its pylon; a site pylon goal at the nearest awake unclaimed one, discovered first', () => {
    const s = upTo("Claim the shrine's pylon");
    expect(waypoint(s)).toMatchObject(base(OVERWORLD.shrine.pylon));
    claim(s, SHRINE_SITE);
    const i = at('Claim a second pylon');
    const X = REGION_1_X;
    movePlayer(s, tileCentre({ tx: 12 + X, ty: 22 }).x, tileCentre({ tx: 12 + X, ty: 22 }).y);
    // Nothing found yet: the nearest awake one (the Old Grove's pylon at 8, 22).
    const nearest = (pts: { x: number; y: number }[]) => [...pts].sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y))[0];
    expect(nearest(targetPoints(s, { kind: 'sitePylon' }, i))).toMatchObject(base({ tx: 8 + X, ty: 22 }));
    // Found ones come first, however far.
    s.discovered.push('quarry');
    expect(targetPoints(s, { kind: 'sitePylon' }, i).map((p) => ({ x: p.x, y: p.y }))).toEqual([base({ tx: 21 + X, ty: 20 })]);
  });
});

describe('through the foundry door (051)', () => {
  it('outside, a goal in the foundry points at its stairs; inside, at the target itself', () => {
    const s = upTo('Identify your armor at the bench (E)');
    s.roomId = OVERWORLD_ROOM;
    expect(waypoint(s)).toMatchObject({ via: 'door', ...base(OVERWORLD.entrance.door), target: { kind: 'bench', roomId: FOUNDRY_ROOM } });
    s.roomId = FOUNDRY_ROOM;
    expect(waypoint(s)).toMatchObject({ via: 'target', target: { kind: 'bench' } });
  });

  it('inside, a goal outside points at the foundry door; "Enter the foundry" points at the stairs and is nothing inside', () => {
    const s = upTo("Claim the shrine's pylon");
    s.roomId = FOUNDRY_ROOM;
    expect(waypoint(s)).toMatchObject({ via: 'door', ...base({ tx: 23, ty: 8 }) });
    const e = upTo('Enter the foundry');
    expect(waypoint(e)).toMatchObject({ via: 'door', ...base(OVERWORLD.entrance.door) });
    e.roomId = FOUNDRY_ROOM;
    expect(waypoint(e)).toBeNull();
  });

  it('heading back out points at the door inside and at nothing outside', () => {
    const s = upTo('Head back out — the foundry keeps running');
    s.roomId = FOUNDRY_ROOM;
    expect(waypoint(s)?.via).toBe('door');
    s.roomId = OVERWORLD_ROOM;
    expect(waypoint(s)).toBeNull();
  });

  it('the sandbox has no waypoint', () => {
    const s = upTo("Claim the shrine's pylon");
    s.sandbox = { god: false, pens: [], bottomless: false } as unknown as NonNullable<SimState['sandbox']>;
    expect(waypoint(s)).toBeNull();
  });
});

describe("the refill goal's hoppers (051, B.2)", () => {
  it('marks each example-line hopper with the raw it takes, and drops a hopper once its raw is put back', () => {
    const s = upTo('Refill the hoppers with wood, stone and fiber (E)');
    s.roomId = FOUNDRY_ROOM;
    placeExampleLine(s);
    s.lineRanDry = true;
    const hoppers = s.foundry.pieces.filter((p): p is HopperState => p.kind === 'hopper');
    for (const h of hoppers) {
      h.count = 0;
      h.item = null;
    }
    expect(hoppers.map((h) => hopperRaw(s, h))).toEqual(['wood', 'stone', 'fiber']);
    expect(objectiveTargets(s).map((p) => p.itemId)).toEqual(['wood', 'stone', 'fiber']);
    s.refilled.push('stone');
    expect(objectiveTargets(s).map((p) => p.itemId)).toEqual(['wood', 'fiber']);
    // The next goal ("Fill the tube from your line") points at the hoppers too, with no icons.
    const fill = targetPoints(s, { kind: 'hoppers' }, at('Fill the tube from your line'));
    expect(fill).toHaveLength(3);
    expect(fill.map((p) => p.itemId)).toEqual([undefined, undefined, undefined]);
  });
});

describe('the intake goals (051)', () => {
  it('restoring an entrance points at the caps; feeding two at the open entrances still empty', () => {
    const s = upTo('Restore a second intake entrance (E at a cap with the warden core)');
    s.roomId = FOUNDRY_ROOM;
    const caps = [INTAKE.entrances[0], INTAKE.entrances[2]].map((t) => (t ? base(t) : null));
    expect(objectiveTargets(s).map((p) => ({ x: p.x, y: p.y }))).toEqual(caps);
    const f = at('Feed two entrances to fire a spread');
    const [, centre, east] = s.link.entrances;
    if (!centre || !east) throw new Error('no entrances');
    east.open = true;
    centre.ammoId = 'arrow';
    centre.count = 5;
    expect(targetPoints(s, { kind: 'intake' }, f).map((p) => p.x)).toEqual([base(INTAKE.entrances[2] ?? { tx: 0, ty: 0 }).x]);
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
    const s = upTo('Craft bombs and ley bolts (C)');
    s.inventory = {};
    const i = at('Craft bombs and ley bolts (C)');
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

  it("the supply port goal points at the foundry's ports (the shrine's claim brings them)", () => {
    const s = upTo('Run a supply port into your line');
    claim(s, SHRINE_SITE);
    s.roomId = FOUNDRY_ROOM;
    const ports = s.fixtures.filter((f) => fixtureDef(f.id).kind === 'port').map((f) => base(fixtureDef(f.id)));
    expect(ports.length).toBeGreaterThan(0);
    expect(objectiveTargets(s).map((p) => ({ x: p.x, y: p.y }))).toEqual(ports);
    expect(waypoint(s)?.target.kind).toBe('ports');
  });

  it("breaching the Hollows points at the middle of the barrier's gap", () => {
    const s = upTo('Breach Stonefall Hollows');
    const mid = HOLLOWS.gate[Math.floor(HOLLOWS.gate.length / 2)];
    if (!mid) throw new Error('no gate');
    expect(waypoint(s)).toMatchObject({ via: 'target', ...base(mid), target: { kind: 'barrier' } });
  });

  it('the frost rune goal points at the foundry: its stairs outside, nothing inside', () => {
    const s = upTo('Build a frost rune into your arrow line');
    s.roomId = OVERWORLD_ROOM;
    expect(waypoint(s)).toMatchObject({ via: 'door', ...base(OVERWORLD.entrance.door), target: { kind: 'room', roomId: FOUNDRY_ROOM } });
    s.roomId = FOUNDRY_ROOM;
    expect(waypoint(s)).toBeNull();
  });

  it('a site pylon goal skips dormant pylons: none until the shrine is claimed', () => {
    const s = upTo('Claim a second pylon');
    const i = at('Claim a second pylon');
    expect(targetPoints(s, { kind: 'sitePylon' }, i)).toEqual([]);
    claim(s, SHRINE_SITE);
    expect(targetPoints(s, { kind: 'sitePylon' }, i).length).toBeGreaterThan(0);
  });
});
