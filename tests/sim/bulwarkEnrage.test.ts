import { describe, expect, it } from 'vitest';
import { TICK_RATE } from '../../src/data/config';
import { HOLLOWS } from '../../src/data/hollows';
import type { EnemyState } from '../../src/sim/enemies';
import { angleDiff } from '../../src/sim/shield';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { movePlayer, run, runUntil } from './fight';
import { DEF, forum, offFacing, START } from './forum';

// The Bulwark's enrage (041.4): the first time its health drops below 30% in a fight, it
// roars for 60 ticks starting no attack, then turns faster (110°/s since 041.7's tuning;
// the spec's 70) and lobs every 160 ticks until it dies or resets. A wind-up already
// running finishes first.

const { enrage } = DEF;
const BELOW = Math.floor(DEF.maxHealth * enrage.below) - 1;

/** Holds the player `dist` px in front of it, `deg` off its facing, every tick. */
const hold =
  (b: EnemyState, deg: number, dist: number) =>
  (s: SimState) => {
    const p = offFacing(b, deg, dist);
    movePlayer(s, p.x, p.y);
    return {};
  };

/** The forum with the Bulwark awake, its adds (041.6) already spent so they keep out of these tests. */
function awake(): { s: SimState; b: EnemyState } {
  const f = forum(160);
  run(f.s, 1);
  f.b.addsRisen = true;
  return f;
}

/** Ticks between its next two lob wind-ups, it held at its start and the player 150 px north of it, out of pound range. */
function lobGap(s: SimState, b: EnemyState): number {
  const starts: number[] = [];
  let was = b.mode;
  for (let t = 0; t < 1200 && starts.length < 2; t++) {
    b.x = START.x;
    b.y = START.y;
    movePlayer(s, START.x, START.y - 150);
    run(s, 1);
    if (b.mode === 'lob' && was !== 'lob') starts.push(s.tick);
    was = b.mode;
  }
  return (starts[1] ?? 0) - (starts[0] ?? 0);
}

describe('the enrage', () => {
  it('starts below 30%: enraged, the event, then a 60-tick roar starting no attack', () => {
    const { s, b } = awake();
    expect(summarize(s).bosses[0]?.enraged).toBe(false);
    b.health = BELOW;
    b.lobCooldown = 0;
    // The player right in front of it, in pound range: due to lob and to pound.
    const close = hold(b, 0, 50);
    run(s, 1, close);
    expect(b.mode).toBe('roar');
    expect(b.enraged).toBe(true);
    expect(s.events.enrages).toEqual([{ id: b.id }]);
    expect(summarize(s).bosses[0]).toMatchObject({ enraged: true, mode: 'roar' });
    let attacks = 0;
    for (let t = 1; t < enrage.roarTicks; t++) {
      run(s, 1, close);
      attacks += s.events.lobs.length + s.events.pounds.length + (b.mode === 'roar' ? 0 : 1);
    }
    expect(attacks).toBe(0);
    run(s, 1, close);
    expect(['windup', 'lob']).toContain(b.mode);
  });

  it('lets a wind-up already running finish first, then roars', () => {
    const { s, b } = awake();
    const near = offFacing(b, 0, 50);
    movePlayer(s, near.x, near.y);
    runUntil(s, () => b.mode === 'windup', 400);
    b.health = BELOW;
    const seen: string[] = [];
    for (let t = 0; t < DEF.pound.windupTicks + DEF.pound.swipeTicks + DEF.pound.recoverTicks + 2 && b.mode !== 'roar'; t++) {
      run(s, 1);
      if (seen[seen.length - 1] !== b.mode) seen.push(b.mode);
    }
    expect(seen).toEqual(['windup', 'swipe', 'recover', 'roar']);
  });

  it('then turns at the enrage’s rate (from 40°/s)', () => {
    const turn = (enraged: boolean): number => {
      const { s, b } = awake();
      if (enraged) {
        b.health = BELOW;
        run(s, enrage.roarTicks + 1, hold(b, 0, 150));
        expect(b.mode).not.toBe('roar');
      }
      b.lobCooldown = 100_000;
      const side = hold(b, 120, 150);
      run(s, 1, side);
      const before = b.angle;
      run(s, 1, side);
      return (Math.abs(angleDiff(before, b.angle)) * 180 * TICK_RATE) / Math.PI;
    };
    expect(turn(false)).toBeCloseTo(DEF.shield.turnDegPerSec, 6);
    expect(turn(true)).toBeCloseTo(enrage.turnDegPerSec, 6);
  });

  it('then lobs every 160 ticks (from 240), the same count', () => {
    const before = awake();
    expect(lobGap(before.s, before.b)).toBe(DEF.lob.cooldownTicks);
    const { s, b } = awake();
    b.health = BELOW;
    run(s, enrage.roarTicks + 1, hold(b, 0, 150));
    expect(lobGap(s, b)).toBe(enrage.lobCooldownTicks);
    expect(s.enemyBombs.length % DEF.lob.count).toBe(0);
  });

  it('stays enraged until it resets: healed above 30% it stays; a leash reset clears it', () => {
    const { s, b } = awake();
    b.health = BELOW;
    run(s, enrage.roarTicks + 5, hold(b, 0, 150));
    b.health = DEF.maxHealth;
    run(s, 30, hold(b, 0, 150));
    expect(b.enraged).toBe(true);
    expect(s.events.enrages).toEqual([]);
    movePlayer(s, b.x, (HOLLOWS.arena.bounds.y0 - 3) * 32);
    runUntil(s, () => b.mode === 'idle', DEF.leashTicks + 3000);
    expect(b.enraged).toBe(false);
    expect(summarize(s).bosses[0]).toMatchObject({ enraged: false, behind: 0, stompCooldown: 0, health: DEF.maxHealth });
  });

  it('lobs bombs a roll doesn’t save from (041.12); before the enrage a roll through the burst still does', () => {
    const rolled = (enraged: boolean): { health: number; rollProof: boolean } => {
      const { s, b } = awake();
      if (enraged) {
        b.enraged = true;
        b.health = BELOW;
      }
      b.lobCooldown = 0;
      run(s, 1, hold(b, 0, 150));
      runUntil(s, () => s.enemyBombs.length > 0, DEF.lob.windupTicks + 5);
      const bomb = s.enemyBombs[0];
      if (!bomb) throw new Error('no bomb');
      s.enemyBombs = [bomb];
      b.lobCooldown = 100_000;
      movePlayer(s, bomb.x, bomb.y);
      run(s, bomb.fuseTicks - bomb.fuse - 3, (x) => {
        movePlayer(x, bomb.x, bomb.y);
        return {};
      });
      run(s, 1, { dodge: true, moveX: 1 });
      run(s, 2);
      expect(s.enemyBombs).toEqual([]);
      return { health: s.player.health, rollProof: bomb.rollProof };
    };
    expect(rolled(false)).toEqual({ health: 100, rollProof: false });
    expect(rolled(true)).toEqual({ health: 100 - DEF.lob.damage, rollProof: true });
  });
});
