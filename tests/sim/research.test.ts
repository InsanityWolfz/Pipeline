import { describe, expect, it } from 'vitest';
import { RESEARCH_NODES } from '../../src/data/research';
import { createResearch, diagramInReach, diagrams, nodeReady, restoreFail } from '../../src/sim/research';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { die, movePlayer, run } from './fight';
import { foundry, put, stepOutside } from './foundryKit';
import type { CrateState } from '../../src/sim/pieces';

// Research nodes' states and the restore rule (033): start reveals, the restore spends
// exactly its cost, and every refusal; restored nodes survive a KO.

/** Feet on the floor tile below a wall tile. */
function below(s: SimState, tx: number, ty: number): void {
  const at = tileCentre({ tx, ty: ty + 1 });
  movePlayer(s, at.x, at.y);
}

describe('node states', () => {
  it('start revealed or hidden by their reveal, and getState reports each', () => {
    expect(createResearch()).toEqual({
      'entrance-2': 'revealed',
      'entrance-3': 'revealed',
      'entrance-4': 'revealed',
      'reservoir-1': 'revealed',
      'reservoir-2': 'hidden',
      'machine-speed': 'hidden',
      // 063: the Blueprint table, from the start.
      'blueprint-table': 'revealed',
      'sealed-wing': 'revealed',
    });
    const s = foundry();
    s.inventory['warden-core'] = 1;
    const r = summarize(s).research;
    expect(r.nodes.map((n) => n.id)).toEqual(RESEARCH_NODES.map((n) => n.id));
    expect(r.nodes.find((n) => n.id === 'entrance-2')).toEqual({ id: 'entrance-2', state: 'revealed', ready: true });
    expect(r.nodes.find((n) => n.id === 'entrance-3')).toEqual({ id: 'entrance-3', state: 'revealed', ready: false });
    expect(r.nodes.find((n) => n.id === 'sealed-wing')?.ready).toBe(false);
    expect([r.entranceCap, r.machineSpeed]).toEqual([30, 1]);
  });

  it('draws the diagrams of revealed nodes: every cap (060: three), the pipe, the sealed wing; walls once revealed', () => {
    const s = foundry();
    expect(diagrams(s).map((d) => [d.node, d.entrance])).toEqual([
      ['entrance-2', 0],
      ['entrance-2', 2],
      ['entrance-2', 3],
      ['reservoir-1', null],
      ['blueprint-table', null],
      ['sealed-wing', null],
    ]);
    s.research['machine-speed'] = 'revealed';
    expect(diagrams(s).map((d) => d.node)).toContain('machine-speed');
    s.research['machine-speed'] = 'restored';
    expect(diagrams(s).map((d) => d.node)).not.toContain('machine-speed');
  });
});

describe('restoring', () => {
  it('at a wall panel spends exactly the cost and restores for good', () => {
    const s = foundry();
    s.research['machine-speed'] = 'revealed';
    Object.assign(s.inventory, { 'schematic-machine-speed': 1, 'ancient-gear': 5, 'warden-core': 1 });
    below(s, 6, 0);
    expect(diagramInReach(s)?.node).toBe('machine-speed');
    expect(nodeReady(s, 'machine-speed')).toBe(true);
    run(s, 1, { restore: 'machine-speed' });
    expect(s.inventory).toMatchObject({ 'schematic-machine-speed': 0, 'ancient-gear': 2, 'warden-core': 1 });
    expect(s.research['machine-speed']).toBe('restored');
    expect(s.events.restores).toEqual([{ node: 'machine-speed' }]);
    expect(s.events.intakeOpens).toEqual([]);
    expect(restoreFail(s, 'machine-speed')).toBe('restored');
    run(s, 1, { restore: 'machine-speed' });
    expect(s.inventory['ancient-gear']).toBe(2);
  });

  it('refuses without the cost, hidden, sealed, out of reach, outside the foundry or before attuning, spending nothing', () => {
    const s = foundry();
    s.research['machine-speed'] = 'revealed';
    below(s, 6, 0);
    expect(restoreFail(s, 'machine-speed')).toBe('cost');
    s.inventory['schematic-machine-speed'] = 1;
    expect(restoreFail(s, 'machine-speed')).toBe('cost');
    s.inventory['ancient-gear'] = 3;
    expect(restoreFail(s, 'machine-speed')).toBeNull();
    expect(restoreFail(s, 'reservoir-2')).toBe('hidden');
    below(s, 9, 1);
    expect(diagramInReach(s)?.node).toBe('sealed-wing');
    expect(restoreFail(s, 'sealed-wing')).toBe('sealed');
    expect(restoreFail(s, 'machine-speed')).toBe('reach');
    run(s, 1, { restore: 'machine-speed' });
    expect(s.inventory).toMatchObject({ 'schematic-machine-speed': 1, 'ancient-gear': 3 });
    below(s, 6, 0);
    s.link.attuned = false;
    expect(restoreFail(s, 'machine-speed')).toBe('not-attuned');
    s.link.attuned = true;
    stepOutside(s);
    expect(restoreFail(s, 'machine-speed')).toBe('not-foundry');
    run(s, 1, { restore: 'machine-speed' });
    expect(s.research['machine-speed']).toBe('revealed');
  });

  it('the nearest diagram in reach is the one E uses: a cap from beside it, the pipe from under the middle', () => {
    const s = foundry();
    below(s, 11, 0);
    expect(diagramInReach(s)).toMatchObject({ node: 'entrance-2', entrance: 0 });
    below(s, 12, 0);
    expect(diagramInReach(s)?.node).toBe('reservoir-1');
    below(s, 13, 0);
    expect(diagramInReach(s)).toMatchObject({ node: 'entrance-2', entrance: 2 });
    below(s, 3, 10);
    expect(diagramInReach(s)).toBeUndefined();
  });

  it('restored nodes survive a KO, like claims', () => {
    const s = foundry();
    s.research['machine-speed'] = 'restored';
    s.research['reservoir-1'] = 'restored';
    stepOutside(s);
    die(s);
    expect([s.research['machine-speed'], s.research['reservoir-1'], s.research['entrance-2']]).toEqual(['restored', 'restored', 'revealed']);
  });

  it('with a crate and a diagram both in reach, one E does only one thing: the diagram is the panel\'s, the crate keeps its contents', () => {
    const s = foundry();
    below(s, 11, 0);
    const crate = put<CrateState>(s, 'crate', 12, 1);
    crate.contents = { wood: 3 };
    expect(diagramInReach(s)?.node).toBe('entrance-2');
    run(s, 1, { interact: true });
    expect([crate.contents, s.inventory.wood ?? 0, s.events.withdraws]).toEqual([{ wood: 3 }, 0, []]);
    // 047: E never empties a crate (it opens its screen in render); its stacks come out by the screen's clicks.
    const t = foundry();
    below(t, 6, 6);
    const other = put<CrateState>(t, 'crate', 7, 7);
    other.contents = { wood: 2 };
    run(t, 1, { interact: true });
    expect(t.inventory.wood ?? 0).toBe(0);
    run(t, 1, { withdraw: { id: other.id, amount: 'all', itemId: 'wood' } });
    expect(t.inventory.wood).toBe(2);
  });

  it('a schematic a restore spent is no longer reported banked', () => {
    const s = foundry();
    s.research['machine-speed'] = 'revealed';
    Object.assign(s.inventory, { 'schematic-machine-speed': 1, 'ancient-gear': 3 });
    s.banked = { ...s.inventory };
    expect(summarize(s).research.schematics.banked).toEqual(['schematic-machine-speed']);
    below(s, 6, 0);
    run(s, 1, { restore: 'machine-speed' });
    expect(summarize(s).research.schematics).toEqual({ carried: [], banked: [] });
  });

  it('is deterministic: the same inputs restore the same way', () => {
    const play = () => {
      const s = foundry();
      Object.assign(s.inventory, { 'warden-core': 1, 'ancient-gear': 4 });
      below(s, 13, 0);
      run(s, 1, { restore: 'entrance-2' });
      below(s, 12, 0);
      run(s, 1, { restore: 'reservoir-1' });
      run(s, 20);
      return summarize(s);
    };
    const a = play();
    expect(a.research.nodes.filter((n) => n.state === 'restored').map((n) => n.id)).toEqual(['entrance-2', 'reservoir-1']);
    expect(play()).toEqual(a);
  });
});
