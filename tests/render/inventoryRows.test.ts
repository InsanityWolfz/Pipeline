import { describe, expect, it } from 'vitest';
import { containerSlots, gearLine, inventorySlots } from '../../src/render/inventoryRows';
import { createResearch } from '../../src/sim/research';
import { NOTHING_WORN } from '../../src/sim/gear';
import { TALENT_START } from '../../src/data/talents';
import { bodyPiece, piece } from '../fixtures/gear';
import { cellAt, inventoryLayout } from '../../src/render/inventoryLayout';
import { hotbarBox, tubeSlotBox } from '../../src/render/bottomHud';
import { VIEW_WIDTH } from '../../src/data/config';
import { INVENTORY_GRID } from '../../src/data/hudPanels';

// What the grid inventory shows (047): a slot per stack in the bag's order, each marked with what a death would take
// (031), the schematics in one slot (033); a hopper's or crate's own stacks; and where it all goes on screen.

const base = { inventory: {}, bag: [], banked: {}, gear: [], equipped: { ...NOTHING_WORN }, research: createResearch(), talents: [TALENT_START] };

type Box = { x: number; y: number; w: number; h: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inside = (a: Box, b: Box) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;

describe('the grid slots', () => {
  it('a slot per stack, in the bag\'s order, the at-risk part on the last stacks', () => {
    const slots = inventorySlots({ ...base, inventory: { wood: 63, arrow: 4 }, bag: ['arrow', 'wood'], banked: { wood: 60, arrow: 4 } });
    expect(slots.map((s) => [s.itemId, s.count, s.atRisk, s.name])).toEqual([
      ['arrow', 4, 0, 'Arrow'],
      ['wood', 50, 0, 'Wood'],
      ['wood', 13, 3, 'Wood'],
    ]);
  });

  it('folds the schematics into one slot that never moves: "Unknown schematic" while every one is unbanked (033)', () => {
    const slots = inventorySlots({ ...base, inventory: { 'schematic-machine-speed': 1, 'schematic-merger': 1, 'ancient-gear': 2 } });
    expect(slots.map((s) => [s.name, s.count, s.movable])).toEqual([
      ['Ancient gear', 2, true],
      ['Unknown schematic', 2, false],
    ]);
    const research = { ...createResearch(), 'machine-speed': 'revealed' as const };
    expect(inventorySlots({ ...base, research, inventory: { 'schematic-machine-speed': 1 } })[0]?.name).toBe('Schematic: Machine speed');
  });

  it('a hopper\'s or crate\'s screen shows only its own stacks', () => {
    expect(containerSlots({ wood: 70 }).map((s) => [s.itemId, s.count])).toEqual([['wood', 50], ['wood', 20]]);
    expect(containerSlots({})).toEqual([]);
  });

  it('the gear line counts the worn pieces with their armor and the spares (031, 036), which a death never takes', () => {
    const gear = [bodyPiece(1, 'light', 2), bodyPiece(2, 'heavy', 5), piece(4, 'helm', { baseArmor: 1 })];
    expect(gearLine({ ...base, gear, equipped: { helm: 4, body: 2, boots: null, trinket: null } })).toMatch(/^2 worn · armor \d+ · 1 spare piece \(kept\)$/);
    expect(gearLine(base)).toBe('');
  });
});

describe('the grid layout', () => {
  for (const container of [false, true]) {
    it(`centres the panel under its title card, above the bottom HUD (${container ? 'a hopper\'s screen' : 'the plain inventory'})`, () => {
      const L = inventoryLayout(container);
      expect(Math.abs(L.panel.x + L.panel.w / 2 - VIEW_WIDTH / 2)).toBeLessThanOrEqual(1);
      expect(L.title.y + L.title.h + INVENTORY_GRID.title.gap).toBe(L.panel.y);
      expect(L.title.y).toBeGreaterThanOrEqual(0);
      expect(L.panel.y + L.panel.h).toBeLessThan(tubeSlotBox(3).y);
      // The carried bar stays in view, to drop stacks on.
      expect(overlaps(L.panel, hotbarBox())).toBe(false);
      expect(L.cells).toHaveLength(40);
      const parts = [L.sort, L.scroll, ...L.cells, ...(L.container?.cells ?? [])];
      for (const p of parts) expect(inside(p, L.panel), JSON.stringify(p)).toBe(true);
      for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) expect(overlaps(parts[i] as Box, parts[j] as Box)).toBe(false);
      for (const f of L.footer) expect(f.y + INVENTORY_GRID.footer.lineHeight).toBeLessThanOrEqual(L.panel.y + L.panel.h);
      expect(L.container === null).toBe(!container);
    });
  }

  it('finds the cell under a point', () => {
    const { cells } = inventoryLayout();
    const c = cells[9];
    if (!c) throw new Error('no cell');
    expect(cellAt(cells, c.x + 2, c.y + 2)).toBe(9);
    expect(cellAt(cells, 0, 0)).toBe(-1);
  });
});
