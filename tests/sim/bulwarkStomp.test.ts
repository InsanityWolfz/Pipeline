import { describe, expect, it } from 'vitest';
import { inArc } from '../../src/sim/aiCommon';
import type { EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { movePlayer, run, runUntil } from './fight';
import { DEF, forum, offFacing } from './forum';

// The Bulwark's rear stomp (041.5): a player who stays behind it too long, within reach,
// is stomped. Its counter fills 1 a tick behind it and drains 2 a tick otherwise; full (2 s
// since 041.7's tuning; the spec's 3 s) it winds up 40 ticks without turning, a red
// half-disc over its back, then stomps.

const { stomp } = DEF;

/** Holds the player `dist` px behind the Bulwark (180° off its facing) every tick. */
const stayBehind =
  (b: EnemyState, dist = 100) =>
  (s: SimState) => {
    const p = offFacing(b, 180, dist);
    movePlayer(s, p.x, p.y);
    return {};
  };

/** The forum, the Bulwark awake, its lobs held off and its adds spent (041.6), the player in front of it. */
function awake(): { s: SimState; b: EnemyState } {
  const f = forum(160);
  run(f.s, 1);
  f.b.lobCooldown = 100_000;
  f.b.addsRisen = true;
  return f;
}

describe('the rear stomp', () => {
  it('starts its 40-tick wind-up after `behindTicks` behind it within 160 px, with the counter and cooldown in getState()', () => {
    const { s, b } = awake();
    let ticks = 0;
    for (; ticks < 400 && b.mode !== 'stomp-windup'; ticks++) run(s, 1, stayBehind(b));
    expect(ticks).toBe(stomp.behindTicks);
    expect(summarize(s).bosses[0]).toMatchObject({ mode: 'stomp-windup', behind: stomp.behindTicks, stompCooldown: stomp.cooldownTicks });
  });

  it('never counts a player behind it but beyond its range', () => {
    const { s, b } = awake();
    run(s, 400, stayBehind(b, stomp.range + 20));
    expect(b.behind).toBe(0);
    expect(s.events.stomps).toEqual([]);
  });
});

describe('the rear stomp landing', () => {
  /** Behind it until the wind-up starts, then the player placed `deg` off its facing at `dist` px and left there. */
  function windupThen(deg: number, dist: number): { s: SimState; b: EnemyState; angle: number } {
    const { s, b } = awake();
    for (let t = 0; t < 400 && b.mode !== 'stomp-windup'; t++) run(s, 1, stayBehind(b));
    expect(b.mode).toBe('stomp-windup');
    const p = offFacing(b, deg, dist);
    movePlayer(s, p.x, p.y);
    return { s, b, angle: b.angle };
  }

  it('lands on the wind-up’s 40th tick: 30 damage and knockback away from it inside the half-disc; the counter resets', () => {
    const { s, b, angle } = windupThen(180, 60);
    for (let t = 1; t < stomp.windupTicks; t++) {
      run(s, 1);
      expect(b.mode).toBe('stomp-windup');
      expect(b.angle).toBe(angle);
    }
    expect(s.player.health).toBe(100);
    run(s, 1);
    expect(b.mode).toBe('stomp');
    expect(s.player.health).toBe(100 - stomp.damage);
    expect(s.player.knockTicks).toBeGreaterThan(0);
    const away = (s.player.knockX * (s.player.x - b.x) + s.player.knockY * (s.player.y - b.y)) / Math.hypot(s.player.x - b.x, s.player.y - b.y);
    expect(away).toBeGreaterThan(0);
    expect(b.behind).toBe(0);
    expect(s.events.stomps).toEqual([{ id: b.id, x: b.x, y: b.y, radius: stomp.radius, dirX: b.swipeDirX, dirY: b.swipeDirY }]);
  });

  it('recovers 40 ticks without turning, the player off to its side', () => {
    const { s, b, angle } = windupThen(180, 60);
    run(s, stomp.windupTicks);
    const side = offFacing(b, 90, 120);
    movePlayer(s, side.x, side.y);
    for (let t = 0; t < stomp.swipeTicks + stomp.recoverTicks - 1; t++) {
      run(s, 1);
      expect(['stomp', 'stomp-recover']).toContain(b.mode);
      expect(b.angle).toBe(angle);
    }
    run(s, 1);
    expect(b.mode).toBe('chase');
  });

  it('misses a player outside the half-disc, and one in front of it', () => {
    for (const [deg, dist] of [
      [180, stomp.radius + 8],
      [0, 60],
      [60, 60],
    ] as const) {
      const { s } = windupThen(deg, dist);
      run(s, stomp.windupTicks);
      expect(s.player.health, `${deg}° ${dist} px`).toBe(100);
      expect(s.events.stomps).toHaveLength(1);
    }
  });

  it('is dodged by a roll whose i-frames cover the stomp, the player still inside the half-disc', () => {
    const { s, b } = windupThen(180, 40);
    run(s, stomp.windupTicks - 3);
    const side = offFacing(b, 90, 1);
    run(s, 1, { dodge: true, moveX: Math.sign(side.x - b.x) as -1 | 0 | 1 });
    run(s, 2);
    expect(b.mode).toBe('stomp');
    expect(inArc(s.player.x - b.x, s.player.y - b.y, b.swipeDirX, b.swipeDirY, stomp.radius, stomp.arcDegrees)).toBe(true);
    expect(s.player.health).toBe(100);
  });
});

describe('the behind counter', () => {
  it('drains 2 a tick when the player steps out of its rear arc, never below 0', () => {
    const { s, b } = awake();
    run(s, 100, stayBehind(b));
    expect(b.behind).toBe(100);
    const inFront = (x: SimState) => {
      const p = offFacing(b, 0, 120);
      movePlayer(x, p.x, p.y);
      return {};
    };
    run(s, 10, inFront);
    expect(b.behind).toBe(80);
    run(s, 60, inFront);
    expect(b.behind).toBe(0);
  });

  it('never fills to the stomp for a player who steps out before it’s due', () => {
    const { s, b } = awake();
    let windups = 0;
    const inside = stomp.behindTicks - 10;
    for (let cycle = 0; cycle < 6; cycle++) {
      run(s, inside, (x) => {
        windups += b.mode === 'stomp-windup' ? 1 : 0;
        return stayBehind(b)(x);
      });
      run(s, Math.ceil(inside / stomp.behindDecay), (x) => {
        const p = offFacing(b, 0, 120);
        movePlayer(x, p.x, p.y);
        return {};
      });
    }
    expect(windups).toBe(0);
    expect(s.events.stomps).toEqual([]);
  });
});

describe('the stomp cooldown', () => {
  it('is 360 ticks from the wind-up’s start, and the enrage doesn’t change it', () => {
    for (const enraged of [false, true]) {
      const { s, b, ticks } = toWindupBehind(enraged);
      expect(ticks).toBe(stomp.behindTicks);
      const first = s.tick;
      runUntil(s, () => b.mode === 'stomp', stomp.windupTicks + 1, {});
      for (let t = 0; t < 1000 && !(b.mode === 'stomp-windup' && s.tick > first); t++) run(s, 1, stayBehind(b));
      expect(s.tick - first, `enraged ${enraged}`).toBe(stomp.cooldownTicks);
    }
  });
});

/** Awake (enraged if asked, its roar done), the player held behind it until the wind-up starts. */
function toWindupBehind(enraged: boolean): { s: SimState; b: EnemyState; ticks: number } {
  const { s, b } = awake();
  if (enraged) {
    b.enraged = true;
    b.health = DEF.maxHealth * 0.2;
  }
  let ticks = 0;
  for (; ticks < 600 && b.mode !== 'stomp-windup'; ticks++) run(s, 1, stayBehind(b));
  return { s, b, ticks };
}

