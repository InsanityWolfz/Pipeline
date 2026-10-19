import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { HUD_LAYOUT } from '../data/hudLayout';
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

/** The hotbar's cells, one per ammo in key order, centred along the bottom. */
export function hotbarCells(): (ScreenBox & { ammoId: string })[] {
  const { cell, margin } = HUD_LAYOUT;
  const width = SLOT_AMMOS.length * cell.step - (cell.step - cell.w);
  const left = Math.round((VIEW_WIDTH - width) / 2);
  const y = VIEW_HEIGHT - margin - cell.h;
  return SLOT_AMMOS.map((ammoId, i) => ({ ammoId, x: left + i * cell.step, y, w: cell.w, h: cell.h }));
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
  const n = Math.max(1, units);
  const w = n * tubeSlot.w + (n - 1) * gap;
  const y = hotbarBox().y - gap - tubeSlot.h;
  return { x: Math.round((VIEW_WIDTH - w) / 2), y, w, h: tubeSlot.h };
}

/** The top-left of each unit inside the tube slot. */
export function tubeSlotUnits(units: number): { x: number; y: number }[] {
  const box = tubeSlotBox(units);
  const step = HUD_LAYOUT.tubeSlot.w + HUD_LAYOUT.gap;
  return Array.from({ length: Math.max(1, units) }, (_, i) => ({ x: box.x + i * step, y: box.y }));
}
