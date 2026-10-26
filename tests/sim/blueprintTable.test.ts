import { describe, expect, it } from 'vitest';
import { BLUEPRINT_TABLE } from '../../src/data/blueprints';
import { RESEARCH_GROUPS, researchNode } from '../../src/data/research';
import { boxOf } from '../../src/sim/area';
import { blueprintsUnlocked } from '../../src/sim/blueprints';
import { diagrams, restore } from '../../src/sim/research';
import { createSandboxSim } from '../../src/sim/sandbox';
import { movePlayer, run } from './fight';
import { foundry, put } from './foundryKit';

// The Blueprint table (063): a wall diagram on the foundry's north wall, restored with E for 4 ancient gears and 2
// aqueduct valves under 033's rules, shown from the start with no requires; restoring it unlocks saving and placing.

describe('the Blueprint table (063)', () => {
  it('costs 4 ancient gears and 2 aqueduct valves, from the start, with no requires', () => {
    const n = researchNode(BLUEPRINT_TABLE);
    expect(n).toMatchObject({ name: 'Blueprint table', cost: { 'ancient-gear': 4, 'aqueduct-valve': 2 }, requires: [], reveal: 'start', effect: { kind: 'blueprints' } });
    expect(n.anchor).toEqual({ kind: 'wall', tx: 18, ty: 0, where: 'north wall, east' });
    expect(RESEARCH_GROUPS.find((g) => g.id === 'walls')?.anchors).toContain(n.anchor.kind);
  });

  it('shows its diagram on the wall from the start and restores at it with E, spending its cost', () => {
    const s = foundry();
    expect(diagrams(s).map((d) => d.node)).toContain(BLUEPRINT_TABLE);
    s.inventory = { 'ancient-gear': 5, 'aqueduct-valve': 2 };
    movePlayer(s, 18.5 * 32, 1.5 * 32);
    expect(blueprintsUnlocked(s)).toBe(false);
    expect(restore(s, BLUEPRINT_TABLE)).toBe(true);
    expect(s.inventory).toMatchObject({ 'ancient-gear': 1, 'aqueduct-valve': 0 });
    expect(blueprintsUnlocked(s)).toBe(true);
  });

  it('unlocks saving: before it a save is refused, after it a save goes in', () => {
    const s = foundry();
    put(s, 'conduit', 3, 3, 'right');
    const area = { box: boxOf({ tx: 3, ty: 3 }, { tx: 3, ty: 3 }), action: 'save' as const };
    run(s, 1, { area });
    expect(s.blueprints).toEqual([]);
    expect(s.events.blueprintSaveFails).toEqual([{ reason: 'locked' }]);
    s.research[BLUEPRINT_TABLE] = 'restored';
    run(s, 1, { area });
    expect(s.blueprints).toHaveLength(1);
  });

  it('starts restored in the sandbox', () => {
    expect(blueprintsUnlocked(createSandboxSim(4))).toBe(true);
  });
});
