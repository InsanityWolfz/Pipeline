import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { BUILD_BAR_LAYOUT, HUD_LAYOUT, tubeSlotWidth } from '../data/hudLayout';
import { SLOT_AMMOS } from '../data/tube';

// Where the bottom HUD's pieces sit (025), pure so tests can check the centring:
// the hotbar row centred `margin` px above the bottom edge, and the tube slot
// centred `gap` px above the row, one unit per round it shows. While building the
// build bar takes the row's place, with its group labels above it (026).

export interface ScreenBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Cell = { w: number; h: number; step: number };

/**
 * Groups of cells (026: the build bar's categories), `sizes[g]` cells in group g: cells
 * `w` x `h`, `step` px apart within a group, `gap` px between one group's last cell and
 * the next's first, the whole centred along the bottom with the cells' bottoms `bottom`
 * px above its edge.
 */
export function groupedBottomRow(sizes: readonly number[], cell: Cell, gap: number, bottom: number): ScreenBox[][] {
  const groupWidth = (n: number): number => (n > 0 ? n * cell.step - (cell.step - cell.w) : 0);
  const width = sizes.reduce((sum, n) => sum + groupWidth(n), 0) + Math.max(0, sizes.length - 1) * gap;
  const y = VIEW_HEIGHT - bottom - cell.h;
  let x = Math.round((VIEW_WIDTH - width) / 2);
  return sizes.map((n) => {
    const left = x;
    x += groupWidth(n) + gap;
    return Array.from({ length: n }, (_, i) => ({ x: left + i * cell.step, y, w: cell.w, h: cell.h }));
  });
}

/** `n` cells `w` x `h`, `step` px apart, centred along the bottom with their bottoms `bottom` px above its edge (the hotbar). */
export function bottomRow(n: number, cell: Cell, bottom: number): ScreenBox[] {
  return groupedBottomRow([n], cell, 0, bottom)[0] ?? [];
}

/** The top of the build bar's group labels (026), view px. */
export function buildBarLabelTop(): number {
  const L = BUILD_BAR_LAYOUT;
  return VIEW_HEIGHT - L.bottom - L.cellHeight - L.label.gap - L.label.h;
}

/** The hotbar's cells, one per ammo in key order, centred along the bottom. */
export function hotbarCells(): (ScreenBox & { ammoId: string })[] {
  const row = bottomRow(SLOT_AMMOS.length, HUD_LAYOUT.cell, HUD_LAYOUT.margin);
  return SLOT_AMMOS.flatMap((ammoId, i) => {
    const box = row[i];
    return box ? [{ ammoId, ...box }] : [];
  });
}

/** The whole hotbar row. */
export function hotbarBox(): ScreenBox {
  const cells = hotbarCells();
  const first = cells[0];
  const last = cells[cells.length - 1];
  if (!first || !last) return { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT, w: 0, h: 0 };
  return { x: first.x, y: first.y, w: last.x + last.w - first.x, h: first.h };
}

/**
 * The tube slot showing `units` units (a round each, or the fist): centred, `gap` px above
 * the hotbar row, or while building above the build bar's group labels (026).
 */
export function tubeSlotBox(units: number, building = false): ScreenBox {
  const { tubeSlot, gap } = HUD_LAYOUT;
  const w = tubeSlotWidth(units);
  const y = (building ? buildBarLabelTop() : hotbarBox().y) - gap - tubeSlot.h;
  return { x: Math.round((VIEW_WIDTH - w) / 2), y, w, h: tubeSlot.h };
}

/** The top-left of each unit inside the tube slot. */
export function tubeSlotUnits(units: number, building = false): { x: number; y: number }[] {
  const box = tubeSlotBox(units, building);
  const step = HUD_LAYOUT.tubeSlot.w + HUD_LAYOUT.gap;
  return Array.from({ length: Math.max(1, units) }, (_, i) => ({ x: box.x + i * step, y: box.y }));
}
