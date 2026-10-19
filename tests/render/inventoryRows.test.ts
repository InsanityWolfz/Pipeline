import { describe, expect, it } from 'vitest';
import { inventoryGroups, SCHEMATIC_ROW } from '../../src/render/inventoryRows';
import { createResearch } from '../../src/sim/research';
import { NOTHING_WORN } from '../../src/sim/gear';
import { bodyPiece, piece } from '../fixtures/gear';
import { inventoryLayout } from '../../src/render/inventoryLayout';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { INVENTORY_PANEL, reservedRows } from '../../src/data/hudPanels';

// What the inventory panel lists (031): the groups in order, a row per carried item
// with its at-risk count (from the banking helper) and what's home in the stash, and
// Gear's worn piece and spare pieces. And where it all goes on screen.

const base = { inventory: {}, banked: {}, stash: {}, gear: [], equipped: { ...NOTHING_WORN }, research: createResearch() };

describe('the inventory rows', () => {
  it('always lists the five groups in order, empty ones with no rows', () => {
    const groups = inventoryGroups(base);
    expect(groups.map((g) => g.id)).toEqual(['raw', 'parts', 'ammo', 'gear', 'cores']);
    expect(groups.every((g) => g.rows.length === 0)).toBe(true);
  });

  it('a row per carried item above 0, with the at-risk part and the stash count', () => {
    const groups = inventoryGroups({
      ...base,
      inventory: { wood: 13, stone: 0, arrow: 4, 'warden-core': 1, shaft: 2 },
      banked: { wood: 10, arrow: 4 },
      stash: { wood: 5, fiber: 9 },
    });
    const raw = groups.find((g) => g.id === 'raw');
    // Fiber is only at home: no row. Stone is held at 0: no row.
    expect(raw?.rows).toEqual([{ itemId: 'wood', count: 13, atRisk: 3, home: 5 }]);
    expect(groups.find((g) => g.id === 'ammo')?.rows).toEqual([{ itemId: 'arrow', count: 4, atRisk: 0, home: 0 }]);
    expect(groups.find((g) => g.id === 'parts')?.rows).toEqual([{ itemId: 'shaft', count: 2, atRisk: 2, home: 0 }]);
    expect(groups.find((g) => g.id === 'cores')?.rows).toEqual([{ itemId: 'warden-core', count: 1, atRisk: 1, home: 0 }]);
  });

  it('rows follow ITEMS order within a group', () => {
    const groups = inventoryGroups({ ...base, inventory: { 'rimestone': 1, fiber: 1, wood: 1 } });
    expect(groups.find((g) => g.id === 'raw')?.rows.map((r) => r.itemId)).toEqual(['wood', 'fiber', 'rimestone']);
  });

  it('Gear lists the carried unidentified gear, then the worn pieces, then the spares, identified pieces always safe', () => {
    const gear = [bodyPiece(1, 'light', 2), bodyPiece(2, 'heavy', 5), bodyPiece(3, 'light', 1), piece(4, 'helm', { baseArmor: 1 }), piece(5, 'boots')];
    const rows = inventoryGroups({ ...base, inventory: { 'unidentified-armor': 2 }, banked: { 'unidentified-armor': 1 }, gear, equipped: { helm: 4, body: 2, boots: null, trinket: null } }).find((g) => g.id === 'gear');
    expect(rows?.rows).toEqual([
      { itemId: 'unidentified-armor', count: 2, atRisk: 1, home: 0 },
      { itemId: 'worn', count: 2, atRisk: 0, home: 0 },
      { itemId: 'spare', count: 3, atRisk: 0, home: 0 },
    ]);
    const bare = inventoryGroups({ ...base, gear: gear.slice(0, 1) }).find((g) => g.id === 'gear');
    expect(bare?.rows).toEqual([{ itemId: 'spare', count: 1, atRisk: 0, home: 0 }]);
  });
});

describe('schematics on the panel (033)', () => {
  const parts = (sim: Parameters<typeof inventoryGroups>[0]) => inventoryGroups(sim).find((g) => g.id === 'parts')?.rows ?? [];

  it('share one Parts row: "Unknown schematic" while every one carried is unbanked, so they never tell apart', () => {
    const rows = parts({ ...base, inventory: { 'schematic-splitter': 1, 'schematic-merger': 1, 'ancient-gear': 2 } });
    expect(rows).toEqual([
      { itemId: 'ancient-gear', count: 2, atRisk: 2, home: 0 },
      { itemId: SCHEMATIC_ROW, count: 2, atRisk: 2, home: 0, label: { name: 'Unknown schematic', icon: 'item-schematic-unknown' } },
    ]);
  });

  it('take the real name once banked (its node revealed)', () => {
    const research = { ...createResearch(), splitter: 'revealed' as const };
    const rows = parts({ ...base, research, inventory: { 'schematic-splitter': 1 }, banked: { 'schematic-splitter': 1 } });
    expect(rows).toEqual([{ itemId: SCHEMATIC_ROW, count: 1, atRisk: 0, home: 0, label: { name: 'Schematic: Splitter', icon: 'item-schematic' } }]);
    const mixed = parts({ ...base, research, inventory: { 'schematic-splitter': 1, 'schematic-merger': 1 } });
    expect(mixed[0]?.label?.name).toBe('Schematics');
  });
});

describe('the inventory layout', () => {
  it('centres the panel with its title card above, inside the view', () => {
    const L = inventoryLayout();
    expect(Math.abs(L.panel.x + L.panel.w / 2 - VIEW_WIDTH / 2)).toBeLessThanOrEqual(1);
    expect(L.title.y + L.title.h + INVENTORY_PANEL.title.gap).toBe(L.panel.y);
    expect(L.title.y).toBeGreaterThanOrEqual(0);
    expect(L.panel.y + L.panel.h).toBeLessThanOrEqual(VIEW_HEIGHT);
    expect(L.footer.y).toBeLessThan(L.panel.y + L.panel.h);
  });

  it('gives every group a header and room for all its rows, in three columns that do not overlap (039)', () => {
    const L = inventoryLayout();
    expect(L.groups.map((g) => g.id)).toEqual(['raw', 'parts', 'ammo', 'gear', 'cores']);
    for (const g of L.groups) {
      expect(g.rowsY).toBeGreaterThan(g.y);
      const bottom = g.rowsY + reservedRows(g.id) * INVENTORY_PANEL.rowHeight;
      expect(bottom).toBeLessThanOrEqual(L.footer.y);
      expect(g.x + INVENTORY_PANEL.columnWidth).toBeLessThanOrEqual(L.panel.x + L.panel.w);
    }
    const xs = new Set(L.groups.map((g) => g.x));
    expect(xs.size).toBe(3);
  });
});
