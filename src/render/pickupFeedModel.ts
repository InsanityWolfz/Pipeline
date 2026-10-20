import { PICKUP_FEED } from '../data/hudPanels';

// The pickup feed (031), pure: a line per item picked up, newest on top. A pickup of
// an item with a live line adds to it, restarts its timer and brings it to the top;
// at most `maxLines` show, the oldest leaving first; each holds `holdMs` after its last
// pickup, then fades over `fadeMs`.

export interface FeedLine {
  itemId: string;
  count: number;
  /** Ms since its last pickup. */
  ageMs: number;
}

type Tuning = Pick<typeof PICKUP_FEED, 'holdMs' | 'fadeMs' | 'maxLines'>;

/** The feed after picking up `n` of an item. */
export function addPickup(lines: readonly FeedLine[], itemId: string, n = 1, tuning: Tuning = PICKUP_FEED): FeedLine[] {
  const live = lines.find((l) => l.itemId === itemId);
  const line: FeedLine = { itemId, count: (live?.count ?? 0) + n, ageMs: 0 };
  return [line, ...lines.filter((l) => l !== live)].slice(0, tuning.maxLines);
}

/** The feed `dtMs` later: lines past their hold and fade are gone. */
export function ageFeed(lines: readonly FeedLine[], dtMs: number, tuning: Tuning = PICKUP_FEED): FeedLine[] {
  return lines.map((l) => ({ ...l, ageMs: l.ageMs + dtMs })).filter((l) => l.ageMs < tuning.holdMs + tuning.fadeMs);
}

/** A line's alpha: 1 through its hold, then down to 0 over the fade. */
export function lineAlpha(line: FeedLine, tuning: Tuning = PICKUP_FEED): number {
  if (line.ageMs <= tuning.holdMs) return 1;
  return Math.max(0, 1 - (line.ageMs - tuning.holdMs) / tuning.fadeMs);
}
