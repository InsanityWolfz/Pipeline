import { MADE_POPUP } from '../data/assets';
import { itemDef } from '../data/items';
import type { ScreenBox } from './bottomHud';

// The "+ part" popups over machines (027), kept apart (031), pure: one that would
// overlap a live popup starts `stackGap` above it, and two for the same machine and
// item within `mergeMs` become one with a count.

/** A popup's box, world or view px. */
export type PopupBox = ScreenBox;

const overlaps = (a: PopupBox, b: PopupBox) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** The top `box` should start at: its own, or `gap` px above every live popup it would overlap, until it overlaps none. */
export function stackedTop(box: PopupBox, live: readonly PopupBox[], gap: number): number {
  let y = box.y;
  for (let tries = 0; tries <= live.length; tries++) {
    const hit = live.filter((l) => overlaps({ ...box, y }, l));
    if (hit.length === 0) break;
    y = Math.min(...hit.map((l) => l.y)) - gap - box.h;
  }
  return y;
}

/** The live popup a new one for `pieceId` making `itemId` at `nowMs` merges into, if one started within `mergeMs`. */
export function mergeInto<T extends { pieceId: number; itemId: string; bornMs: number }>(
  live: readonly T[],
  pieceId: number,
  itemId: string,
  nowMs: number,
  windowMs: number = MADE_POPUP.mergeMs,
): T | undefined {
  return live.find((p) => p.pieceId === pieceId && p.itemId === itemId && nowMs - p.bornMs <= windowMs);
}

/** "+ shaft", or "+ shaft ×2" once merged. */
export function madeText(itemId: string, count: number): string {
  const text = `${MADE_POPUP.prefix}${itemDef(itemId).name.toLowerCase()}`;
  return count > 1 ? `${text}${MADE_POPUP.countPrefix}${count}` : text;
}
