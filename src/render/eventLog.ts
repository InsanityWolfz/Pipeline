import type { SimEvents } from '../sim/events';

/** Adds one tick's events to those kept for the next draw: lists grow, flags stick, and a KO keeps its lost list. */
export function mergeEvents(into: SimEvents, from: SimEvents): void {
  for (const key of Object.keys(from) as (keyof SimEvents)[]) {
    const add = from[key];
    const kept = into[key];
    if (Array.isArray(add) && Array.isArray(kept)) (kept as unknown[]).push(...(add as unknown[]));
  }
  into.tubeTaken ||= from.tubeTaken;
  if (from.ko) into.lost = { ...from.lost };
  into.ko ||= from.ko;
}
