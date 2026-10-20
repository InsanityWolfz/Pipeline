import { describe, expect, it } from 'vitest';
import { ADDS_GROUP } from '../../src/data/bulwark';
import { HOLLOWS } from '../../src/data/hollows';
import type { EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { movePlayer, run, runUntil } from './fight';
import { DEF, forum, offFacing, START } from './forum';

// 041.16 (Shaun's answer): standing behind the Bulwark always costs something (a back wave
// off it every few seconds), its telegraphs shorten while enraged (never under the minimum),
// and its adds keep coming, a pair every 20 s after the first.

const { wave, enrage, adds } = DEF;

/** The forum with the Bulwark awake, its lobs, stomp and adds held off, the player in front of it. */
function awake(): { s: SimState; b: EnemyState } {
  const f = forum(160);
  run(f.s, 1);
  Object.assign(f.b, { lobCooldown: 100_000, stompCooldown: 100_000, addsRisen: true, addsCooldown: 100_000 });
  return f;
}

/** Holds the player `dist` px off the Bulwark at `deg` off its facing, every tick. */
const hold =
  (b: EnemyState, deg: number, dist: number) =>
  (s: SimState) => {
    const p = offFacing(b, deg, dist);
    movePlayer(s, p.x, p.y);
    return {};
  };

describe('the back wave', () => {
  it('builds off its back every `everyTicks` it fights, locked as it starts, and breaks on a player inside it', () => {
    const { s, b } = awake();
    const behind = hold(b, 180, 110);
    const started = runUntil(s, () => s.events.waveStarts.length > 0, wave.everyTicks + 2, {});
    expect(started).toBe(wave.everyTicks - 1);
    expect(summarize(s).bosses[0]).toMatchObject({ waveTicks: 1, waveCooldown: wave.everyTicks });
    const dir = { x: b.waveDirX, y: b.waveDirY };
    expect(dir.x).toBeCloseTo(-Math.cos(b.angle), 9);
    expect(dir.y).toBeCloseTo(-Math.sin(b.angle), 9);
    run(s, wave.windupTicks - 2, behind);
    run(s, 1);
    expect(s.player.health).toBe(100);
    // The wave keeps the line it started on as the Bulwark turns.
    expect({ x: b.waveDirX, y: b.waveDirY }).toEqual(dir);
    const at = { x: b.x + dir.x * 110, y: b.y + dir.y * 110 };
    movePlayer(s, at.x, at.y);
    run(s, 1);
    expect(s.events.backWaves).toEqual([expect.objectContaining({ id: b.id, radius: wave.radius, dirX: dir.x, dirY: dir.y })]);
    expect(s.player.health).toBe(100 - wave.damage);
    expect(b.waveTicks).toBe(0);
  });

  it('misses a player in front of it or past its reach; a roll through it doesn’t save (it’s roll-proof, as the pound)', () => {
    const miss = (deg: number, dist: number, roll: boolean): number => {
      const { s, b } = awake();
      runUntil(s, () => b.waveTicks > 0, wave.everyTicks + 2, {});
      const at = offFacing(b, deg, dist);
      movePlayer(s, at.x, at.y);
      run(s, wave.windupTicks - (roll ? 3 : 0));
      if (roll) {
        run(s, 1, { dodge: true, moveX: 1 });
        run(s, 2);
      }
      return s.player.health;
    };
    expect(miss(0, 80, false)).toBe(100);
    expect(miss(180, wave.radius + 12, false)).toBe(100);
    expect(wave.rollProof).toBe(true);
    expect(miss(180, 90, true)).toBe(100 - wave.damage);
  });

  it('runs beside its other attacks: a pound winds up while a wave builds', () => {
    const { s, b } = awake();
    b.waveCooldown = 1;
    movePlayer(s, b.x, b.y + 60);
    run(s, 2);
    expect(b.waveTicks).toBeGreaterThan(0);
    expect(b.mode).toBe('windup');
  });
});

describe('enraged telegraphs (041.16)', () => {
  /** Awake and enraged, its roar done. */
  function enraged(): { s: SimState; b: EnemyState } {
    const f = awake();
    Object.assign(f.b, { enraged: true, health: DEF.maxHealth * 0.2 });
    return f;
  }

  it('the pound, the stomp and the back wave wind up shorter, never under the minimum', () => {
    const pound = enraged();
    movePlayer(pound.s, pound.b.x, pound.b.y + 60);
    run(pound.s, 1);
    expect(pound.b.mode).toBe('windup');
    expect(runUntil(pound.s, () => pound.b.mode === 'swipe', 100)).toBe(enrage.windups.pound);
    const stomp = enraged();
    stomp.b.stompCooldown = 0;
    stomp.b.behind = DEF.stomp.behindTicks;
    run(stomp.s, 1, hold(stomp.b, 180, 120));
    expect(stomp.b.mode).toBe('stomp-windup');
    expect(runUntil(stomp.s, () => stomp.b.mode === 'stomp', 100, {})).toBe(enrage.windups.stomp);
    const w = enraged();
    w.b.waveCooldown = 1;
    run(w.s, 1);
    expect(runUntil(w.s, () => w.s.events.backWaves.length > 0, 100)).toBe(enrage.windups.wave);
  });

  it('its lob winds up and its bombs fuse to the enrage’s numbers', () => {
    const { s, b } = enraged();
    b.lobCooldown = 0;
    movePlayer(s, START.x, START.y - 150);
    run(s, 1);
    expect(b.mode).toBe('lob');
    expect(runUntil(s, () => s.enemyBombs.length > 0, 100)).toBe(enrage.windups.lob);
    expect(s.enemyBombs.every((x) => x.fuseTicks === enrage.windups.fuse)).toBe(true);
  });
});

describe('adds that keep coming (041.16)', () => {
  it('a new pair every `everyTicks` it fights after the first, never champions; a reset clears the count', () => {
    const f = forum(160);
    run(f.s, 1);
    Object.assign(f.b, { lobCooldown: 100_000, stompCooldown: 100_000, waveCooldown: 100_000, health: DEF.maxHealth * adds.below - 1 });
    const pairs: number[] = [];
    for (let t = 1; t <= adds.everyTicks * 2 + 2; t++) {
      run(f.s, 1, (x) => {
        x.player.health = 100;
        return {};
      });
      if (f.s.events.addsRise.length > 0) pairs.push(t);
    }
    expect(pairs).toEqual([1, 1 + adds.everyTicks, 1 + 2 * adds.everyTicks]);
    const all = f.s.enemies.filter((e) => e.group === ADDS_GROUP);
    expect(all.length).toBeLessThanOrEqual(6);
    expect(all.every((e) => e.champion === null)).toBe(true);
    movePlayer(f.s, START.x, (HOLLOWS.arena.bounds.y0 - 3) * 32);
    runUntil(f.s, () => f.b.mode === 'idle', DEF.leashTicks + 3000);
    expect(f.s.enemies.filter((e) => e.group === ADDS_GROUP)).toEqual([]);
    expect(f.b).toMatchObject({ addsRisen: false, addsCooldown: 0 });
  });
});
