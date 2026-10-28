import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { wakeTrace, type WakeTrace } from './bossWake';
import { runIntro } from './introKit';

// 080: the fight from an intro's end is today's fight from its wake, tick for tick: the same mode changes on the same
// offsets and the same fingerprints, against bossWake.json, recorded on this branch (073 + 076) before the sim change.

const BASE = JSON.parse(readFileSync('tests/sim/bossWake.json', 'utf8')) as Record<string, WakeTrace>;

describe('080: after its intro, each boss fights as it did from its wake', () => {
  for (const boss of ['pylon-warden', 'bulwark', 'forgewright', 'conductor'] as const) {
    it(boss, () => {
      // The shrine's trace starts from the player inside; forum, hall and spire step the intro out themselves.
      const now = wakeTrace(boss, (s) => expect(runIntro(s)).toBe(165));
      expect(now).toEqual(BASE[boss]);
    }, 60_000);
  }
});
