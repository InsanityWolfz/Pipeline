import { describe, expect, it } from 'vitest';
import { nodeDef, STORM_ROD } from '../../src/data/nodes';
import { HOLLOWS_START } from '../../src/data/playtest';
import { createNodes, harvestable, ventState, type NodeState } from '../../src/sim/nodes';
import { createSim, type SimState } from '../../src/sim/state';
import { WORLD } from '../../src/sim/world';
import { movePlayer, run } from './fight';

// The Rod Field (064): each storm-rod node cycles idle (900 ticks), a flashing warning (90), a lightning strike, then
// charged (240), from its own seeded point on its own salted stream. E gathers stormglass only while it's charged (018's
// uses, regrowth and remains otherwise). A strike never hurts anyone (060's vents' rule).

const DEF = nodeDef('storm-rod');
const CYCLE = DEF.cycle ?? { closedTicks: 0, warnTicks: 0, openTicks: 0 };
const PERIOD = CYCLE.closedTicks + CYCLE.warnTicks + CYCLE.openTicks;
const STRIKE = CYCLE.closedTicks + CYCLE.warnTicks;

function atRod(): { s: SimState; v: NodeState } {
  const s = createSim(3, { start: HOLLOWS_START });
  s.bossDefeats.push('bulwark', 'forgewright');
  s.enemies = [];
  run(s, 1);
  const v = s.nodes.find((n) => n.nodeId === 'storm-rod');
  if (!v) throw new Error('no rod');
  movePlayer(s, v.x, v.y + 20);
  return { s, v };
}

describe('a storm rod’s cycle', () => {
  it('is idle, then a warning, then struck and charged, in data, giving stormglass', () => {
    expect(STORM_ROD).toMatchObject({ idleTicks: 900, warnTicks: 90, chargedTicks: 240 });
    expect(CYCLE).toMatchObject({ closedTicks: 900, warnTicks: 90, openTicks: 240, strikes: true });
    expect(DEF.itemId).toBe('stormglass');
    const states = [0, 899, 900, 989, 990, PERIOD - 1].map((phase) => ventState({ nodeId: 'storm-rod', phase }));
    expect(states).toEqual(['closed', 'closed', 'warning', 'warning', 'open', 'open']);
  });

  it('is struck as it turns charged: a strike event at its base, once a cycle', () => {
    const { s, v } = atRod();
    v.phase = STRIKE - 2;
    run(s, 1);
    expect(s.events.rodStrikes).toEqual([]);
    run(s, 1);
    expect(v.phase).toBe(STRIKE);
    expect(s.events.rodStrikes).toEqual([{ id: v.id, x: v.x, y: v.y }]);
    let strikes = 0;
    for (let t = 0; t < PERIOD; t++) {
      run(s, 1);
      strikes += s.events.rodStrikes.filter((r) => r.id === v.id).length;
    }
    expect(strikes).toBe(1);
  });

  it('starts each rod at its own seeded point on its own stream: the vents’ points are as before, the same seed the same, another not', () => {
    const rooms = Object.values(WORLD);
    const rods = (seed: number) => createNodes(rooms, seed).filter((n) => n.nodeId === 'storm-rod').map((n) => n.phase);
    const a = rods(3);
    expect(a.length).toBe(6);
    expect(new Set(a).size).toBe(a.length);
    for (const p of a) expect(p >= 0 && p < PERIOD).toBe(true);
    expect(rods(3)).toEqual(a);
    expect(rods(4)).not.toEqual(a);
    // The vents' phases don't move when rods join (their own stream): the same as with the rods' landmarks left out.
    const vents = createNodes(rooms, 3).filter((n) => n.nodeId === 'cinder-vent').map((n) => n.phase);
    const without = createNodes(rooms.map((r) => ({ ...r, nodes: (r.nodes ?? []).filter((n) => n.nodeId !== 'storm-rod') })), 3).filter((n) => n.nodeId === 'cinder-vent').map((n) => n.phase);
    expect(vents).toEqual(without);
  });
});

describe('gathering stormglass', () => {
  it('does nothing while a rod is idle or warning', () => {
    for (const p of [0, CYCLE.closedTicks + 1]) {
      const { s, v } = atRod();
      v.phase = p;
      expect(harvestable(v)).toBe(false);
      run(s, 1, { interact: true });
      expect(s.harvest).toBeNull();
      run(s, DEF.harvestTicks + 2);
      expect(v.uses).toBe(DEF.uses);
      expect(s.groundItems).toEqual([]);
    }
  });

  it('gives stormglass while it’s charged, using it up like any node', () => {
    const { s, v } = atRod();
    v.phase = STRIKE;
    run(s, 1, { interact: true });
    expect(s.harvest).toEqual({ nodeId: v.id, progress: 1 });
    run(s, DEF.harvestTicks);
    expect(v.uses).toBe(DEF.uses - 1);
    expect(s.groundItems.some((g) => g.itemId === 'stormglass')).toBe(true);
  });

  it('loses a harvest in progress when the charge runs out', () => {
    const { s, v } = atRod();
    v.phase = PERIOD - 5;
    run(s, 1, { interact: true });
    expect(s.harvest).not.toBeNull();
    run(s, DEF.harvestTicks);
    expect(s.harvest).toBeNull();
    expect(v.uses).toBe(DEF.uses);
  });

  it('never hurts anyone: a strike beside the player does nothing to them', () => {
    const { s, v } = atRod();
    movePlayer(s, v.x, v.y + 12);
    const health = s.player.health;
    v.phase = STRIKE - 1;
    run(s, PERIOD);
    expect(s.player.health).toBe(health);
  });
});
