import { describe, expect, it } from 'vitest';
import { UNIDENTIFIED_ARMOR } from '../../src/data/gear';
import { TUTORIAL_START } from '../../src/data/player';
import { FOUNDRY_ROOM, SHRINE_SITE } from '../../src/data/rooms';
import { atRiskCounts, itemRisks } from '../../src/sim/banking';
import { claim } from '../../src/sim/claims';
import { createSim, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { atEntrance, die, run, runUntil, SEED } from './fight';

// 067.16 (Shaun, 2026-10-26: "Just make it so you don't lose things on death before you get to the foundry"): until
// the tube attunes on the first foundry entry after the shrine's claim, a KO loses nothing carried. From then on the
// banking rules (011, 031) hold as before. The rest of a KO (where they wake, unclaimed land and the Warden) is unchanged.

const tutorial = (): SimState => createSim(SEED, { start: TUTORIAL_START });
const CARRIED = { wood: 6, stone: 4, arrow: 12, bomb: 3, 'ley-bolt': 5, [UNIDENTIFIED_ARMOR]: 1 };

describe('a KO before the foundry keeps everything carried (067.16)', () => {
  it('keeps raws, hand-crafted ammo and gear, and reports no loss', () => {
    const s = tutorial();
    s.inventory = { ...CARRIED };
    die(s);
    expect(s.inventory).toEqual(CARRIED);
    expect(s.events.lost).toEqual({});
    expect(s.banked).toEqual(CARRIED);
    // Still wakes where it did: the start room, the foundry being shut.
    expect(s.roomId).toBe(TUTORIAL_START.room);
  });

  it('shows nothing at risk before the foundry', () => {
    const s = tutorial();
    s.inventory = { ...CARRIED };
    expect(atRiskCounts(s)).toEqual({});
    expect(itemRisks(s).bomb).toEqual({ held: 3, safe: 3, atRisk: 0 });
    expect(summarize(s).atRisk).toEqual({});
  });

  it('still brings the Warden and unclaimed land back', () => {
    const s = tutorial();
    s.enemies = s.enemies.filter((e) => e.enemyId !== 'pylon-warden');
    s.inventory = { ...CARRIED };
    die(s);
    expect(s.enemies.some((e) => e.enemyId === 'pylon-warden')).toBe(true);
  });

  it('keeps everything after the claim until the first entry, which attunes the tube', () => {
    const s = tutorial();
    claim(s, SHRINE_SITE);
    s.inventory = { ...CARRIED };
    die(s);
    expect(s.inventory).toEqual(CARRIED);
    expect(s.events.lost).toEqual({});
    // Waking in the foundry is the first entry: the tube attunes, and from here the old rules hold.
    run(s, 1);
    expect(s.roomId).toBe(FOUNDRY_ROOM);
    expect(s.link.attuned).toBe(true);
  });

  it('from the first foundry entry on, a KO loses what was not banked, as before', () => {
    const s = tutorial();
    claim(s, SHRINE_SITE);
    s.inventory = { arrow: 10 };
    atEntrance(s);
    runUntil(s, (x) => x.roomId === FOUNDRY_ROOM && x.link.attuned, 60, { moveY: -1 });
    atEntrance(s);
    s.inventory = { arrow: 14, bomb: 2 };
    expect(atRiskCounts(s)).toEqual({ arrow: 4, bomb: 2 });
    die(s);
    expect(s.inventory).toEqual({ arrow: 10 });
    expect(s.events.lost).toEqual({ arrow: 4, bomb: 2 });
  });
});
