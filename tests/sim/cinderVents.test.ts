import { describe, expect, it } from 'vitest';
import { nodeDef } from '../../src/data/nodes';
import { HOLLOWS_START } from '../../src/data/playtest';
import { createNodes, ventState, type NodeState } from '../../src/sim/nodes';
import { createSim, type SimState } from '../../src/sim/state';
import { WORLD } from '../../src/sim/world';
import { movePlayer, run } from './fight';

// The Cinder Vents (060): each cinder-vent node cycles closed (720 ticks), a glowing telegraph (90), then open (360),
// from its own point in the cycle, drawn from the seeded RNG. E gathers cinderite only while it's open (018's uses,
// regrowth and remains otherwise). An open vent never hurts anyone.

const DEF = nodeDef('cinder-vent');
const CYCLE = DEF.cycle ?? { closedTicks: 0, warnTicks: 0, openTicks: 0 };
const PERIOD = CYCLE.closedTicks + CYCLE.warnTicks + CYCLE.openTicks;

function atVent(): { s: SimState; v: NodeState } {
  const s = createSim(3, { start: HOLLOWS_START });
  s.bossDefeats.push('bulwark');
  s.enemies = [];
  run(s, 1);
  const v = s.nodes.find((n) => n.nodeId === 'cinder-vent');
  if (!v) throw new Error('no vent');
  movePlayer(s, v.x, v.y + 20);
  return { s, v };
}

/** Sets a vent `ticks` into its cycle. */
const setPhase = (v: NodeState, ticks: number): void => {
  v.phase = ticks;
};

describe('a cinder vent’s cycle', () => {
  it('is closed, then a telegraph, then open, in data', () => {
    expect(CYCLE).toEqual({ closedTicks: 720, warnTicks: 90, openTicks: 360 });
    const v = { nodeId: 'cinder-vent', phase: 0 };
    const states = [0, 719, 720, 809, 810, PERIOD - 1].map((p) => ventState({ ...v, phase: p }));
    expect(states).toEqual(['closed', 'closed', 'warning', 'warning', 'open', 'open']);
    expect(ventState({ nodeId: 'tree', phase: 0 })).toBeNull();
  });

  it('runs on round and round with the ticks', () => {
    const { s, v } = atVent();
    setPhase(v, PERIOD - 2);
    run(s, 1);
    expect(v.phase).toBe(PERIOD - 1);
    run(s, 1);
    expect(v.phase).toBe(0);
    expect(ventState(v)).toBe('closed');
  });

  it('starts each vent at its own point, from the seeded RNG: the same seed the same, another seed not', () => {
    const rooms = Object.values(WORLD);
    const phases = (seed: number) => createNodes(rooms, seed).filter((n) => n.nodeId === 'cinder-vent').map((n) => n.phase);
    const a = phases(3);
    expect(a.length).toBeGreaterThanOrEqual(5);
    expect(new Set(a).size).toBe(a.length);
    for (const p of a) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(PERIOD);
    }
    expect(phases(3)).toEqual(a);
    expect(phases(4)).not.toEqual(a);
    // Other nodes have no cycle.
    for (const n of createNodes(rooms, 3)) if (n.nodeId !== 'cinder-vent') expect(n.phase).toBe(0);
  });
});

describe('gathering at a vent', () => {
  it('does nothing while it’s closed or warning', () => {
    for (const p of [0, CYCLE.closedTicks + 1]) {
      const { s, v } = atVent();
      setPhase(v, p);
      run(s, 1, { interact: true });
      expect(s.harvest).toBeNull();
      run(s, DEF.harvestTicks + 2);
      expect(v.uses).toBe(DEF.uses);
      expect(s.groundItems).toEqual([]);
    }
  });

  it('gives cinderite while it’s open, using it up like any node', () => {
    const { s, v } = atVent();
    setPhase(v, CYCLE.closedTicks + CYCLE.warnTicks);
    run(s, 1, { interact: true });
    expect(s.harvest).toEqual({ nodeId: v.id, progress: 1 });
    run(s, DEF.harvestTicks);
    expect(v.uses).toBe(DEF.uses - 1);
    expect(s.groundItems.some((g) => g.itemId === 'cinderite')).toBe(true);
  });

  it('loses a harvest in progress when it closes', () => {
    const { s, v } = atVent();
    setPhase(v, PERIOD - 5);
    run(s, 1, { interact: true });
    expect(s.harvest).not.toBeNull();
    run(s, DEF.harvestTicks);
    expect(s.harvest).toBeNull();
    expect(v.uses).toBe(DEF.uses);
  });

  it('never hurts anyone, open or not', () => {
    const { s, v } = atVent();
    const health = s.player.health;
    setPhase(v, 0);
    run(s, PERIOD);
    expect(s.player.health).toBe(health);
  });
});
