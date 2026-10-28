import { describe, expect, it } from 'vitest';
import { BOSS_LOOK } from '../../src/data/arenaAssets';
import { INTRO_LOOK } from '../../src/data/art/bossIntro';
import { BOSS_INTRO } from '../../src/data/bossIntro';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { TEXT_STYLES } from '../../src/data/fonts';
import { INTRO_SHAKE } from '../../src/data/juice';
import { bossBarBottom } from '../../src/render/bossLook';
import { awakeShare, barFill, cardBox, cardCurve, capped, introBeat, introFrame, introShake, introSquash, panWeight } from '../../src/render/bossIntro';
import { tubeSlotBox } from '../../src/render/bottomHud';

// 080: the intro as drawn, by intro ticks (`modeTicks`, 1 on the first): the beats, the card, the bar, the pan, the
// shake's gate and the card's layout.

const FULL = BOSS_INTRO.fullTicks;
const SHORT = BOSS_INTRO.shortTicks;
/** A pan longer than any arena's (the Crown Spire's is about 290 px), px. */
const WORST_PAN = 320;

describe('080: the intro beats', () => {
  it('walks stir → rise → beat → ready on the full intro\'s ticks, filling it exactly', () => {
    expect(INTRO_LOOK.full.end).toBe(FULL);
    expect(INTRO_LOOK.short.end).toBe(SHORT);
    const at = (tick: number) => introBeat(tick + 1, false).beat;
    expect([at(0), at(17), at(18), at(71), at(72), at(83), at(84), at(164)]).toEqual(['stir', 'stir', 'rise', 'rise', 'beat', 'beat', 'ready', 'ready']);
  });

  it('runs the short intro rise 0–30, beat 30–40, ready 40–60, with no stir', () => {
    const at = (tick: number) => introBeat(tick + 1, true).beat;
    expect([at(0), at(29), at(30), at(39), at(40), at(59)]).toEqual(['rise', 'rise', 'beat', 'beat', 'ready', 'ready']);
  });

  it('picks the rise\'s three poses by progress (the short one its last half), and ready\'s two on a slow breathe', () => {
    const rise = (tick: number, short: boolean) => {
      const b = introBeat(tick + 1, short);
      return introFrame(b.beat, b.at, b.length, short);
    };
    expect([rise(18, false), rise(36, false), rise(54, false), rise(71, false)]).toEqual([0, 1, 2, 2]);
    expect(rise(0, true)).toBeGreaterThanOrEqual(1);
    expect(rise(29, true)).toBe(2);
    const ready = [84, 84 + INTRO_LOOK.breatheTicks, 84 + 2 * INTRO_LOOK.breatheTicks].map((t) => {
      const b = introBeat(t + 1, false);
      return introFrame(b.beat, b.at, b.length, false);
    });
    expect(ready).toEqual([0, 1, 0]);
    // Slow: a breath frame lasts at least half a second.
    expect(INTRO_LOOK.breatheTicks).toBeGreaterThanOrEqual(30);
  });

  it('snaps each rise pose in with a short stretch that settles', () => {
    const b = introBeat(19, false);
    expect(introSquash(b.beat, b.at, b.length, false)).toBe(INTRO_LOOK.riseStretch);
    const later = introBeat(19 + INTRO_LOOK.riseSettleTicks, false);
    expect(introSquash(later.beat, later.at, later.length, false)).toBe(0);
    const ready = introBeat(100, false);
    expect(introSquash(ready.beat, ready.at, ready.length, false)).toBe(0);
  });
});

describe('080: the name card', () => {
  it('fades in scaling 0.9 → 1 by tick 96, holds to 141, and is gone (in 0.1 s) before the pan-out could bring a boss up under it', () => {
    expect(cardCurve(84, false).alpha).toBe(0);
    expect(cardCurve(85, false)).toEqual({ alpha: 0, scale: 0.9 });
    const mid = cardCurve(91, false);
    expect(mid.alpha).toBeGreaterThan(0);
    expect(mid.scale).toBeGreaterThan(0.95);
    expect(cardCurve(97, false)).toEqual({ alpha: 1, scale: 1 });
    expect(cardCurve(142, false)).toEqual({ alpha: 1, scale: 1 });
    expect(cardCurve(148, false).alpha).toBe(0);
    expect(cardCurve(FULL, false).alpha).toBe(0);
    // Fully readable for 0.75 s (45 ticks; 080.26).
    const readable = Array.from({ length: FULL }, (_, i) => cardCurve(i + 1, false).alpha).filter((a) => a === 1).length;
    expect(readable).toBeGreaterThanOrEqual(45);
  });

  it('never shows in a short intro', () => {
    for (let t = 1; t <= SHORT; t++) expect(cardCurve(t, true).alpha).toBe(0);
  });

  it('sits under the bar, clear of the bottom HUD and of each boss held in the middle of the view', () => {
    const lines = TEXT_STYLES.title.lineHeight + INTRO_LOOK.card.ruleGap * 2 + 1 + TEXT_STYLES.display.lineHeight;
    for (const heat of [false, true]) {
      const box = cardBox(120, 80, lines, bossBarBottom(heat));
      expect(box.y).toBeGreaterThanOrEqual(bossBarBottom(heat) + INTRO_LOOK.card.gap);
      expect(box.w).toBeGreaterThanOrEqual(INTRO_LOOK.card.minWidth);
      expect(box.x + box.w / 2).toBeCloseTo(VIEW_WIDTH / 2, 0);
      expect(box.y + box.h).toBeLessThan(tubeSlotBox(3).y);
      // Each boss's body centred by the pan: its sprite's top below the card, through the pans too, while the card shows
      // at all (080.26: the Conductor's 290 px pan-out would bring him up under a card still fading out).
      for (const height of [BOSS_LOOK.height, ...Object.values(BOSS_LOOK.heights)]) {
        for (let t = 1; t <= FULL; t++) {
          if (cardCurve(t, false).alpha <= 0) continue;
          const top = VIEW_HEIGHT / 2 - height / 2 - (1 - panWeight(t, false)) * WORST_PAN;
          expect(box.y + box.h, `${height} px tall at tick ${t}`).toBeLessThanOrEqual(top);
        }
      }
    }
  });
});

describe('080: the bar, the pan and the shake', () => {
  it('fills the boss bar over ticks 84–132 (the short intro over all of it)', () => {
    expect(barFill(84, false)).toBe(0);
    expect(barFill(109, false)).toBeCloseTo(0.5, 1);
    expect(barFill(133, false)).toBe(1);
    expect(barFill(1, true)).toBe(0);
    expect(barFill(SHORT + 1, true)).toBe(1);
  });

  it('pans in over 0–24, holds to 145 and out to 165 (smoothstep), never in a short intro', () => {
    expect(panWeight(1, false)).toBe(0);
    expect(panWeight(13, false)).toBeCloseTo(0.5, 1);
    expect(panWeight(25, false)).toBe(1);
    expect(panWeight(146, false)).toBe(1);
    expect(panWeight(FULL, false)).toBeLessThan(0.05);
    for (let t = 1; t <= SHORT; t++) expect(panWeight(t, true)).toBe(0);
    // The steepest frame of a 320 px pan (the Conductor's) at one tick a frame stays under the cap.
    let most = 0;
    for (let t = 1; t < FULL; t++) most = Math.max(most, Math.abs(panWeight(t + 1, false) - panWeight(t, false)) * 320);
    expect(most).toBeLessThanOrEqual(INTRO_LOOK.pan.capPx);
    expect(capped(0, 100, INTRO_LOOK.pan.capPx)).toBe(INTRO_LOOK.pan.capPx);
    expect(capped(0, -5, INTRO_LOOK.pan.capPx)).toBe(-5);
  });

  it('shakes once on the beat: 300 ms at 0.006 (short 200 ms at 0.004); none with Flashes off or reduced motion', () => {
    expect(INTRO_SHAKE.full).toEqual({ ms: 300, intensity: 0.006 });
    expect(INTRO_SHAKE.short).toEqual({ ms: 200, intensity: 0.004 });
    expect(introShake(false, true, false)).toEqual(INTRO_SHAKE.full);
    expect(introShake(true, true, false)).toEqual(INTRO_SHAKE.short);
    expect(introShake(false, false, false)).toBeNull();
    expect(introShake(false, true, true)).toBeNull();
    // About ±3.8 px across and ±2.2 px down at 640×360.
    expect(INTRO_SHAKE.full.intensity * VIEW_WIDTH).toBeCloseTo(3.84, 1);
    expect(INTRO_SHAKE.full.intensity * VIEW_HEIGHT).toBeCloseTo(2.16, 1);
  });
});

describe('080: how awake a boss looks (its glows and the Conductor\'s dome)', () => {
  it('none while dormant or stirring, growing through the rise, full from the beat on and in its fight', () => {
    expect(awakeShare('idle', 0, false)).toBe(0);
    expect(awakeShare('intro', 1, false)).toBe(0);
    expect(awakeShare('intro', 18, false)).toBe(0);
    expect(awakeShare('intro', 19, false)).toBe(0);
    expect(awakeShare('intro', 46, false)).toBeCloseTo(0.5, 1);
    expect(awakeShare('intro', 73, false)).toBe(1);
    expect(awakeShare('intro', FULL, false)).toBe(1);
    expect(awakeShare('intro', 1, true)).toBe(0);
    expect(awakeShare('intro', 31, true)).toBe(1);
    expect(awakeShare('chase', 0, false)).toBe(1);
  });
});

