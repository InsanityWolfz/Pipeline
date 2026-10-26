import { BLUEPRINT_LIST } from '../data/blueprintAssets';
import { toolsLabelBox } from './blueprintLayout';
import type { ScreenRect } from './foundryLayout';

// The blueprint list's layout (063), view px, pure so tests can check it and e2e can click it: a tablet just over the
// Tools group, right-aligned with it, holding a title line and a row per blueprint with its delete mark.

export interface BlueprintListLayout {
  panel: ScreenRect;
  title: { x: number; y: number };
  rows: (ScreenRect & { slot: number; del: ScreenRect })[];
}

/** The list for `n` blueprints (an empty list keeps one row's room for its line). */
export function blueprintListLayout(n: number): BlueprintListLayout {
  const L = BLUEPRINT_LIST;
  const label = toolsLabelBox();
  const shown = Math.max(1, n);
  const h = 2 * L.pad + L.title.h + shown * L.rowH + (shown - 1) * L.rowGap;
  const w = L.rowW + 2 * L.pad;
  const x = label.x + label.w - w;
  const y = label.y - L.gap - h;
  const top = y + L.pad + L.title.h;
  const rows = Array.from({ length: n }, (_, slot) => {
    const ry = top + slot * (L.rowH + L.rowGap);
    const rx = x + L.pad;
    const del = { x: rx + L.rowW - L.del.right - L.del.size, y: ry + L.del.y, w: L.del.size, h: L.del.size };
    return { slot, x: rx, y: ry, w: L.rowW, h: L.rowH, del };
  });
  return { panel: { x, y, w, h }, title: { x: x + L.pad + L.icon.x, y: y + L.pad + L.title.y }, rows };
}
