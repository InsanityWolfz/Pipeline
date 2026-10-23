import { describe, expect, it } from 'vitest';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { researchListLayout, restorePanelLayout } from '../../src/render/researchLayout';
import { researchRows, restorePanelModel } from '../../src/render/researchRows';
import { keyLook, shownItem, shownKey, UNKNOWN_SCHEMATIC_KEY } from '../../src/render/itemShown';
import { createResearch } from '../../src/sim/research';

// What the restore panel and the research list show (033), and where; and how an
// unknown schematic shows everywhere until banked.

const fresh = () => ({ research: createResearch(), inventory: {} as Record<string, number> });

describe('the restore panel', () => {
  it("shows a node's name, effect, cost against what's carried, and Restore while it can be restored", () => {
    const sim = { ...fresh(), inventory: { 'warden-core': 1 } };
    expect(restorePanelModel(sim, 'entrance-2')).toEqual({
      node: 'entrance-2',
      name: 'Second entrance',
      effect: 'Opens one more intake entrance.',
      cost: [{ itemId: 'warden-core', icon: 'item-warden-core', have: 1, need: 1 }],
      action: 'Restore',
      enabled: true,
    });
  });

  it('disables Restore without the cost, and names the node that comes first while requires are unmet', () => {
    expect(restorePanelModel(fresh(), 'entrance-2')).toMatchObject({ action: 'Restore', enabled: false, cost: [{ have: 0, need: 1 }] });
    const sim = { ...fresh(), inventory: { 'schematic-reservoir-2': 1, 'aqueduct-valve': 4, 'bulwark-core': 1 } };
    sim.research['reservoir-2'] = 'revealed';
    expect(restorePanelModel(sim, 'reservoir-2')).toMatchObject({ action: 'Restore Reservoir I first', enabled: false });
    sim.research['reservoir-1'] = 'restored';
    expect(restorePanelModel(sim, 'reservoir-2')).toMatchObject({ action: 'Restore', enabled: true });
  });

  it('the sealed wing says so and offers no Restore', () => {
    expect(restorePanelModel(fresh(), 'sealed-wing')).toMatchObject({ name: 'Sealed wing', effect: "Sealed. The Bulwark's first kill unseals it.", cost: [], action: 'Sealed', enabled: false });
  });

  it('sits inside the view, its Restore row under its cost row', () => {
    const L = restorePanelLayout();
    expect(L.panel.x).toBeGreaterThanOrEqual(0);
    expect(L.panel.x + L.panel.w).toBeLessThanOrEqual(VIEW_WIDTH);
    expect(L.panel.y + L.panel.h).toBeLessThanOrEqual(VIEW_HEIGHT);
    expect(L.restore.y).toBeGreaterThanOrEqual(L.cost.y + L.cost.h);
    expect(L.restore.y + L.restore.h).toBeLessThanOrEqual(L.panel.y + L.panel.h);
  });
});

describe('the research list', () => {
  it('lists every node by group, "Lost schematic" while hidden, its state, cost for revealed nodes, and where', () => {
    const sim = { ...fresh(), inventory: { 'warden-core': 1, 'ancient-gear': 1 } };
    sim.research['machine-speed'] = 'restored';
    const groups = researchRows(sim);
    expect(groups.map((g) => [g.label, g.rows.map((r) => r.id)])).toEqual([
      ['Intake', ['entrance-2', 'entrance-3', 'entrance-4', 'reservoir-1', 'reservoir-2']],
      ['Walls', ['machine-speed']],
      ['Sealed wing', ['sealed-wing']],
    ]);
    const row = (id: string) => groups.flatMap((g) => g.rows).find((r) => r.id === id);
    expect(row('entrance-2')).toMatchObject({ name: 'Second entrance', state: 'ready', where: 'on an intake cap' });
    expect(row('entrance-3')).toMatchObject({ state: 'revealed', cost: [{ itemId: 'bulwark-core', have: 0, need: 1 }] });
    expect(row('entrance-4')).toMatchObject({ name: 'Fourth entrance', state: 'revealed', cost: [{ itemId: 'forgewright-core', have: 0, need: 1 }], where: 'on an intake cap' });
    expect(row('reservoir-1')).toMatchObject({ state: 'revealed', cost: [{ itemId: 'ancient-gear', have: 1, need: 4 }], where: 'on the intake pipe' });
    expect(row('reservoir-2')).toMatchObject({ name: 'Lost schematic', state: 'hidden', cost: [] });
    expect(row('machine-speed')).toMatchObject({ name: 'Machine speed', state: 'restored', cost: [], where: 'north wall, west' });
    expect(row('sealed-wing')).toMatchObject({ state: 'revealed', where: 'the sealed door' });
  });

  it('a node whose cost is carried but whose requires are not restored says what it needs', () => {
    const sim = { ...fresh(), inventory: { 'bulwark-core': 1 } };
    const row = (id: string) => researchRows(sim).flatMap((g) => g.rows).find((r) => r.id === id);
    expect(row('entrance-3')).toMatchObject({ state: 'revealed', needs: 'Second entrance' });
    expect(row('reservoir-1')).toMatchObject({ state: 'revealed', needs: null });
    sim.research['entrance-2'] = 'restored';
    expect(row('entrance-3')).toMatchObject({ state: 'ready', needs: null });
  });

  it('fits the view under its title card, every row inside the panel', () => {
    const L = researchListLayout();
    expect(L.title.y).toBeGreaterThanOrEqual(0);
    expect(L.panel.y + L.panel.h).toBeLessThanOrEqual(VIEW_HEIGHT);
    expect(L.panel.x + L.panel.w).toBeLessThanOrEqual(VIEW_WIDTH);
    for (const g of L.groups) for (const y of g.rows) expect(y).toBeLessThan(L.footer.y);
  });
});

describe('unknown schematics', () => {
  it('show as "Unknown schematic" with one icon until their node is revealed, then by name', () => {
    const sim = fresh();
    expect(shownKey(sim, 'schematic-machine-speed')).toBe(UNKNOWN_SCHEMATIC_KEY);
    expect(shownKey(sim, 'schematic-reservoir-2')).toBe(UNKNOWN_SCHEMATIC_KEY);
    expect(keyLook(UNKNOWN_SCHEMATIC_KEY)).toEqual({ name: 'Unknown schematic', icon: 'item-schematic-unknown' });
    sim.research['machine-speed'] = 'revealed';
    expect(shownItem(sim, 'schematic-machine-speed')).toEqual({ name: 'Schematic: Machine speed', icon: 'item-schematic' });
    expect(shownItem(sim, 'wood')).toEqual({ name: 'Wood', icon: 'item-wood' });
  });
});
