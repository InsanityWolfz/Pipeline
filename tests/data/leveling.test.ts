import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies';
import { BOSS_REFIGHT_XP, CHAMPION_XP, CLAIM_XP, LANDMARK_XP, LEVEL_CAP, RING_XP, XP_CURVE } from '../../src/data/leveling';
import { HOLLOWS_ENEMIES } from '../../src/data/hollowsEnemies';
import { gainXp } from '../../src/sim/leveling';
import { createEvents } from '../../src/sim/events';

// 037's starting values, all flagged for playtest.

describe('leveling data', () => {
  it('has the spec’s curve, cap and multipliers', () => {
    expect(XP_CURVE).toEqual([40, 70, 100, 130, 160, 200, 240, 280, 330, 380, 440, 500, 570, 650]);
    expect(LEVEL_CAP).toBe(15);
    expect(XP_CURVE).toHaveLength(LEVEL_CAP - 1);
    expect(RING_XP).toEqual([1, 1, 2, 3]);
    expect([CHAMPION_XP, CLAIM_XP, LANDMARK_XP, BOSS_REFIGHT_XP]).toEqual([3, 50, 25, 0.5]);
  });

  it('gives every enemy whole positive XP: the spec’s values', () => {
    for (const def of Object.values(ENEMIES)) expect(Number.isInteger(def.xp) && def.xp > 0, def.id).toBe(true);
    expect(ENEMIES.husk?.xp).toBe(5);
    expect(ENEMIES.wisp?.xp).toBe(6);
    expect(ENEMIES['pylon-warden']?.xp).toBe(150);
    expect(ENEMIES.bulwark?.xp).toBe(300);
    for (const def of Object.values(HOLLOWS_ENEMIES)) expect(def.xp, def.id).toBe(6);
    // A Region 2 enemy in ring 3: 18.
    expect((ENEMIES.charger?.xp ?? 0) * (RING_XP[3] ?? 0)).toBe(18);
  });

  it('takes a player from level 1 to level 7 with 900 XP (the spec’s pacing figure for the shrine region)', () => {
    const s = { level: 1, xp: 0, talentPoints: 0, events: createEvents() };
    gainXp(s, 900, 'kill');
    expect(s.level).toBe(7);
  });
});
