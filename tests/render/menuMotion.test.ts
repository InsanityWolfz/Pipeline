import { describe, expect, it } from 'vitest';
import { MENU_MOTION } from '../../src/data/hudLook';
import { fadeAt, OpenMotion } from '../../src/render/menuCurves';

// 081: the menus' motion as curves over tween time: the open fades in and rises 4 px by 120 ms, reduced motion lands
// at once, hovers and tabs fade in 80 ms, and stepping reuses one state object.

describe('the open (081)', () => {
  it('fades from 0 to 1 and rises 4 px into place, settled at 120 ms', () => {
    const m = new OpenMotion();
    const first = m.start(false);
    expect(first.alpha).toBe(0);
    expect(first.rise).toBe(MENU_MOTION.rise);
    expect(m.running).toBe(true);
    let alpha = 0;
    let rise: number = MENU_MOTION.rise;
    for (let ms = 8; ms <= MENU_MOTION.openMs; ms += 8) {
      const look = m.at(ms);
      expect(look.alpha).toBeGreaterThanOrEqual(alpha);
      expect(look.rise).toBeLessThanOrEqual(rise);
      alpha = look.alpha;
      rise = look.rise;
    }
    expect(m.at(MENU_MOTION.openMs)).toEqual({ alpha: 1, rise: 0 });
    expect(m.running).toBe(false);
    // Past the end it stays settled.
    expect(m.at(500)).toEqual({ alpha: 1, rise: 0 });
  });

  it('eases out: most of the way in on its first frames', () => {
    const m = new OpenMotion();
    m.start(false);
    expect(m.at(16).alpha).toBeGreaterThan(0.3);
    expect(m.at(60).alpha).toBeGreaterThan(0.8);
  });

  it('lands at its end at once with reduced motion', () => {
    const m = new OpenMotion();
    expect(m.start(true)).toEqual({ alpha: 1, rise: 0 });
    expect(m.running).toBe(false);
  });

  it('reuses its one look object when stepped', () => {
    const m = new OpenMotion();
    const look = m.start(false);
    for (let ms = 0; ms <= 200; ms += 16) expect(m.at(ms)).toBe(look);
    expect(m.settle()).toBe(look);
  });
});

describe('hover and tab fades (081)', () => {
  it('fade in over 80 ms and out the same way', () => {
    for (const d of [MENU_MOTION.hoverMs, MENU_MOTION.tabMs]) {
      expect(d).toBe(80);
      expect(fadeAt(0, d)).toBe(0);
      expect(fadeAt(d / 2, d)).toBeGreaterThan(0.5);
      expect(fadeAt(d, d)).toBe(1);
      expect(1 - fadeAt(d, d)).toBe(0);
    }
  });
});
