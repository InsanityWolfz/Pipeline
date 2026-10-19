import { describe, expect, it } from 'vitest';
import { PICKUP_FEED } from '../../src/data/inventoryPanel';
import { addPickup, ageFeed, lineAlpha, type FeedLine } from '../../src/render/pickupFeedModel';

// The pickup feed (031), pure: repeats merge into one line, newest on top, at most
// maxLines, each holding holdMs after its last repeat then fading over fadeMs.

const shown = (lines: readonly FeedLine[]) => lines.map((l) => [l.itemId, l.count]);

describe('the pickup feed', () => {
  it('a burst of 7 wood is one line of 7', () => {
    let lines: FeedLine[] = [];
    for (let i = 0; i < 7; i++) lines = addPickup(lines, 'wood');
    expect(shown(lines)).toEqual([['wood', 7]]);
  });

  it('a repeat adds to its line, restarts its timer and brings it to the top', () => {
    let lines = addPickup([], 'wood');
    lines = ageFeed(lines, 1000);
    lines = addPickup(lines, 'stone');
    lines = addPickup(lines, 'wood', 2);
    expect(shown(lines)).toEqual([['wood', 3], ['stone', 1]]);
    expect(lines[0]?.ageMs).toBe(0);
    // Past stone's hold and fade, wood (restarted) still shows.
    lines = ageFeed(lines, PICKUP_FEED.holdMs + PICKUP_FEED.fadeMs - 1);
    expect(shown(lines)).toEqual([['wood', 3], ['stone', 1]]);
    lines = ageFeed(lines, 1);
    expect(shown(lines)).toEqual([['wood', 3]]);
  });

  it('shows at most maxLines, newest on top; the oldest leaves first', () => {
    let lines: FeedLine[] = [];
    const ids = ['wood', 'stone', 'fiber', 'ley-crystal', 'husk-resin', 'shaft'];
    for (const id of ids) lines = addPickup(lines, id);
    expect(lines).toHaveLength(PICKUP_FEED.maxLines);
    expect(lines.map((l) => l.itemId)).toEqual([...ids].reverse().slice(0, PICKUP_FEED.maxLines));
  });

  it('holds at full alpha, then fades out', () => {
    const line: FeedLine = { itemId: 'wood', count: 1, ageMs: 0 };
    expect(lineAlpha(line)).toBe(1);
    expect(lineAlpha({ ...line, ageMs: PICKUP_FEED.holdMs })).toBe(1);
    expect(lineAlpha({ ...line, ageMs: PICKUP_FEED.holdMs + PICKUP_FEED.fadeMs / 2 })).toBeCloseTo(0.5);
    expect(lineAlpha({ ...line, ageMs: PICKUP_FEED.holdMs + PICKUP_FEED.fadeMs })).toBe(0);
  });

  it('a repeat while its line fades brings it back to full', () => {
    let lines = addPickup([], 'wood');
    lines = ageFeed(lines, PICKUP_FEED.holdMs + PICKUP_FEED.fadeMs / 2);
    lines = addPickup(lines, 'wood');
    expect(shown(lines)).toEqual([['wood', 2]]);
    expect(lineAlpha(lines[0] as FeedLine)).toBe(1);
  });
});
