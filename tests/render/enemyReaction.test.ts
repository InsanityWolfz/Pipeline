import { describe, expect, it } from 'vitest';
import { ENEMY_MOTION as M } from '../../src/data/art/enemyMotion';
import { enemyDef } from '../../src/data/enemies';
import { attacking, flinchSquash, reactionOf, staggerIndex, staggers, staggerSquash } from '../../src/render/enemyReaction';

// 076: hits make enemies flinch or stagger, as pose animation only (the flash, numbers and hit-stop are unchanged).

const HUSK = enemyDef('husk').maxHealth;
const still = { attacking: false, reactable: true, boss: false, flash: 0, staggerMs: null };

describe('flinch or stagger (076)', () => {
  it('a small hit flinches; 40% in one frame, or a punch, staggers; a boss never staggers', () => {
    // A ring 1 Husk has 40 HP: one 14-damage arrow flinches it, two in one frame stagger it.
    expect(HUSK).toBe(40);
    expect(staggers([{ damage: 14 }], HUSK, false)).toBe(false);
    expect(staggers([{ damage: 14 }, { damage: 14 }], HUSK, false)).toBe(true);
    expect(staggers([{ damage: 16 }], HUSK, false)).toBe(true);
    expect(staggers([{ damage: 2, melee: true }], HUSK, false)).toBe(true);
    // A burn's beat isn't a blow.
    expect(staggers([{ damage: 30, burn: true }], HUSK, false)).toBe(false);
    expect(staggers([{ damage: 999, melee: true }], 200, true)).toBe(false);
    expect(reactionOf({ ...still, flash: 6 })).toBe('flinch');
    expect(reactionOf({ ...still, flash: 6, staggerMs: 10 })).toBe('stagger');
    expect(reactionOf({ ...still, boss: true, flash: 6, staggerMs: 10 })).toBe('flinch');
    expect(reactionOf(still)).toBeNull();
  });

  it('shows no reaction during a wind-up or an attack, and only over idle, walking and recovery', () => {
    for (const mode of ['windup', 'swipe', 'lob', 'throw', 'stomp-windup', 'stomp', 'spray-windup', 'spray', 'flood-windup', 'flood'] as const) expect(attacking(mode), mode).toBe(true);
    for (const mode of ['idle', 'chase', 'return', 'recover', 'stomp-recover'] as const) expect(attacking(mode), mode).toBe(false);
    expect(reactionOf({ ...still, attacking: true, flash: 6, staggerMs: 10 })).toBeNull();
    // A sim stagger state (a Charger's wall daze, the Forgewright's vent) keeps its own pose.
    expect(reactionOf({ ...still, reactable: false, flash: 6, staggerMs: 10 })).toBeNull();
  });

  it('staggers for 300 ms, reel then recover, easing its squash out', () => {
    expect(reactionOf({ ...still, staggerMs: M.stagger.ms - 1 })).toBe('stagger');
    expect(reactionOf({ ...still, staggerMs: M.stagger.ms })).toBeNull();
    expect(staggerIndex(0)).toBe(0);
    expect(staggerIndex(M.stagger.reelMs - 1)).toBe(0);
    expect(staggerIndex(M.stagger.reelMs)).toBe(1);
    expect(staggerSquash(0)).toBeCloseTo(M.stagger.squash, 5);
    expect(staggerSquash(M.stagger.ms / 2)).toBeLessThan(staggerSquash(0));
    expect(staggerSquash(M.stagger.ms)).toBe(0);
  });

  it('snaps the flinch on its first frame and settles with a small overshoot', () => {
    expect(flinchSquash(0)).toBeCloseTo(M.flinch.squash, 5);
    const ring = Array.from({ length: 7 }, (_, i) => flinchSquash(i));
    expect(Math.min(...ring)).toBeLessThan(0);
    expect(Math.min(...ring)).toBeGreaterThan(-M.flinch.squash / 2);
    expect(Math.abs(flinchSquash(6))).toBeLessThan(0.02);
  });
});
