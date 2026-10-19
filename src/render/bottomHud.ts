import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { HUD_LAYOUT, tubeSlotWidth } from '../data/hudLayout';
import { SLOT_AMMOS } from '../data/tube';

// Where the bottom HUD's pieces sit (025), pure so tests can check the centring:
// the hotbar row centred `margin` px above the bottom edge, and the tube slot
// centred `gap` px above the row, one unit per round it shows.

export interface ScreenBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** `n` cells `w` x `h`, `step` px apart, centred along the bottom with their bottoms `bottom` px above its edge (the hotbar and the build bar). */
export function bottomRow(n: number, cell: { w: number; h: number; step: number }, bottom: number): ScreenBox[] {
  const width = n * cell.step - (cell.step - cell.w);
  const left = Math.round((VIEW_WIDTH - width) / 2);
  const y = VIEW_HEIGHT - bottom - cell.h;
  return Array.from({ length: n }, (_, i) => ({ x: left + i * cell.step, y, w: cell.w, h: cell.h }));
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

/** The tube slot showing `units` units (a round each, or the fist): centred, `gap` px above the hotbar row. */
export function tubeSlotBox(units: number): ScreenBox {
  const { tubeSlot, gap } = HUD_LAYOUT;
  const w = tubeSlotWidth(units);
  const y = hotbarBox().y - gap - tubeSlot.h;
  return { x: Math.round((VIEW_WIDTH - w) / 2), y, w, h: tubeSlot.h };
}

/** The top-left of each unit inside the tube slot. */
export function tubeSlotUnits(units: number): { x: number; y: number }[] {
  const box = tubeSlotBox(units);
  const step = HUD_LAYOUT.tubeSlot.w + HUD_LAYOUT.gap;
  return Array.from({ length: Math.max(1, units) }, (_, i) => ({ x: box.x + i * step, y: box.y }));
}
