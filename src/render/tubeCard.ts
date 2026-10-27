import { HUD_LAYOUT } from '../data/hudLayout';
import { MOUSE_INPUTS } from '../data/settings';
import type { HudActive } from '../sim/volley';
import { tubeSlotBox, type ScreenBox } from './bottomHud';
import { keyLabel } from './keyHint';

// 070: the big ammo card's fist label. With the tube attuned but its intake dry, left click punches; when right click
// would fire a carried round (the carried bar's selected kind is carried), the card says so instead of "Melee". Pure,
// from what the sim says, so tests/render checks it.

/** What the label reads from the sim: the tube, its attunement, whether right click has a carried round to use, and build mode (where it doesn't). */
export interface TubeCardFacts {
  hasTube: boolean;
  attuned: boolean;
  carriedReady: boolean;
  building: boolean;
}

/** The fist's label, or null when the card shows rounds (a volley's or a carried round's counts). `useBinding` is the use action's bound input. */
export function tubeCardLabel(active: HudActive, facts: TubeCardFacts, useBinding: string): string | null {
  if (active.kind !== 'melee') return null;
  const S = HUD_LAYOUT.tubeSlot;
  if (!facts.hasTube || !facts.attuned || !facts.carriedReady || facts.building) return S.melee;
  const key = MOUSE_INPUTS.includes(useBinding) ? S.mouseKey : keyLabel(useBinding);
  return S.tubeEmpty.replace('{key}', key);
}

/**
 * The one-unit card widened for a label `labelW` px wide: the label and its clearance each side of the well's ring,
 * centred where the one-unit card sits; never narrower than one unit.
 */
export function wideCardBox(labelW: number, building: boolean): ScreenBox {
  const S = HUD_LAYOUT.tubeSlot;
  const one = tubeSlotBox(1, building);
  const w = Math.max(one.w, Math.ceil(labelW) + 2 * (S.wellInset + S.labelPad));
  return { x: Math.round(one.x + (one.w - w) / 2), y: one.y, w, h: one.h };
}
