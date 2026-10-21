import { describe, expect, it } from 'vitest';
import { straightAmmo } from '../../src/data/ammo';
import { TALENT_START } from '../../src/data/talents';
import { createArrow, type ArrowState } from '../../src/sim/arrows';
import { burning, leavePool } from '../../src/sim/keystones';
import { roundEmission } from '../../src/sim/emissions';
import type { HitEvent } from '../../src/sim/events';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { arena, HUSK, placeHusk, PLAYER_AT, run, runUntil } from './fight';

// 054 (E.3): an arrow that passes through a bomb's Pool with Blastfletch (037) catches fire for the rest of its
// flight — render's burning tip, ember trail and hit flash. It shows the talent's effect and adds nothing (054.2).

const ARROW = straightAmmo('arrow');
/** An enemy hit marked burning, by enemy id (any id when omitted). */
const burnt = (h: HitEvent, id?: number): boolean => h.target === 'enemy' && h.burning === true && (id === undefined || h.id === id);

function still(s: SimState, x: number, y: number) {
  const e = placeHusk(s, x, y);
  e.mode = 'windup';
  e.modeTicks = -10_000;
  return e;
}

function flying(s: SimState, x: number, ammoId = 'arrow'): ArrowState {
  const a = createArrow(s.nextArrowId++, ammoId, s.roomId, x, PLAYER_AT.y, 1, 0);
  s.arrows.push(a);
  return a;
}

function blastfletch(poolDy = 0): SimState {
  const s = arena();
  s.talents = [TALENT_START, 'k1'];
  leavePool(s, { roomId: s.roomId, x: PLAYER_AT.x + 40, y: PLAYER_AT.y + poolDy, radius: 48 }, roundEmission('bomb'));
  return s;
}

describe('a burning arrow (054)', () => {
  it('catches fire in the Pool and burns for the rest of its flight, its hits marked, past its Burst', () => {
    const s = blastfletch();
    still(s, PLAYER_AT.x + 160, PLAYER_AT.y);
    const far = still(s, PLAYER_AT.x + 220, PLAYER_AT.y);
    const a = flying(s, PLAYER_AT.x + 10);
    expect(burning(a)).toBe(false);
    runUntil(s, () => a.pooled, 10);
    expect(burning(a)).toBe(true);
    expect(summarize(s).arrows.find((x) => x.id === a.id)?.burning).toBe(true);
    runUntil(s, () => s.events.poolBursts.length > 0, 30);
    expect(s.events.hits.filter((h) => burnt(h))).not.toHaveLength(0);
    // Its Burst spends the charge, but it burns on.
    expect(a.pooled).toBe(false);
    expect(burning(a)).toBe(true);
    let marked = false;
    runUntil(s, () => {
      marked ||= s.events.hits.some((h) => burnt(h, far.id));
      return far.health < HUSK.maxHealth;
    }, 30);
    expect(marked).toBe(true);
    // 054.2: nothing extra, its plain damage past the Burst.
    expect(far.health).toBeCloseTo(HUSK.maxHealth - ARROW.damage, 9);
  });

  it('never burns outside a Pool, without the keystone, or as a ley bolt', () => {
    const outside = blastfletch(200);
    const a = flying(outside, PLAYER_AT.x + 10);
    run(outside, 10);
    expect(burning(a)).toBe(false);
    const plain = arena();
    const e = still(plain, PLAYER_AT.x + 100, PLAYER_AT.y);
    const b = flying(plain, PLAYER_AT.x + 10);
    runUntil(plain, () => e.health < HUSK.maxHealth, 30);
    expect(burning(b)).toBe(false);
    expect(plain.events.hits.some((h) => burnt(h))).toBe(false);
    const bolt = blastfletch();
    const c = flying(bolt, PLAYER_AT.x + 10, 'ley-bolt');
    run(bolt, 5);
    expect(burning(c)).toBe(false);
  });
});
