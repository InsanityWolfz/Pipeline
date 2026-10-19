import { describe, expect, it } from 'vitest';
import { defOf } from '../../src/sim/champions';
import { straightAmmo } from '../../src/data/ammo';
import { enemyDef, type BulwarkDef } from '../../src/data/enemies';
import { HOLLOWS } from '../../src/data/hollows';
import { HOLLOWS_START } from '../../src/data/playtest';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import { createSim, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { die, movePlayer, run, runUntil } from './fight';

// The Bulwark (034): a slow-turning shielded wall in the Sunken Forum. It lobs bombs
// marked by two red circles, pounds the ground round itself up close, leashes home when
// the player leaves, resets on a KO before its first kill, and is gone for good after it.

const DEF = enemyDef('bulwark') as BulwarkDef;
const { lob, pound } = DEF;
const START = tileCentre(HOLLOWS.arena.start);
const SEED = 11;

/** The hollows start with only the Bulwark left, and the player in the forum `dy` px below its start point (out of pound range). */
function forum(dy = 160, seed = SEED): { s: SimState; b: EnemyState } {
  const s = createSim(seed, { start: HOLLOWS_START });
  const b = s.enemies.find((e) => e.enemyId === 'bulwark');
  if (!b) throw new Error('no Bulwark');
  s.enemies = [b];
  movePlayer(s, START.x, START.y + dy);
  return { s, b };
}

/** Keeps the player topped up and still invulnerable to nothing, so a long fight never KOs them. */
const topUp = (s: SimState): void => {
  s.player.health = 100;
};

describe('the Bulwark', () => {
  it('is a boss with the spec starting values in data', () => {
    expect(DEF).toMatchObject({ kind: 'bulwark', boss: true, maxHealth: 900, walkSpeed: 18, shield: { arcDegrees: 180, turnDegPerSec: 40 } });
    expect(lob).toMatchObject({ cooldownTicks: 240, windupTicks: 30, count: 3, scatter: 80, radius: 40, fuseTicks: 90, damage: 25 });
    expect(pound).toMatchObject({ triggerRange: 72, windupTicks: 60, radius: 112, damage: 35, knockback: 40, recoverTicks: 60, cooldownTicks: 300 });
    expect(DEF.drops.always).toEqual([
      { itemId: 'bulwark-core', min: 1, max: 1 },
      { itemId: 'ley-iron', min: 4, max: 6 },
      { itemId: 'aqueduct-valve', min: 1, max: 2 },
    ]);
  });

  it('stands at its start in the forum, and aggros only when the player enters the arena', () => {
    const { s, b } = forum();
    expect({ x: b.x, y: b.y }).toEqual(START);
    movePlayer(s, START.x, (HOLLOWS.arena.bounds.y0 - 2) * 32);
    run(s, 30);
    expect(b.mode).toBe('idle');
    movePlayer(s, START.x, START.y + 160);
    run(s, 1);
    expect(b.mode).toBe('chase');
    expect(summarize(s).bosses).toEqual([expect.objectContaining({ id: b.id, enemyId: 'bulwark', health: 900, mode: 'chase', engaged: true })]);
  });

  it('lobs `count` bombs after its wind-up: one at the feet at the throw, the rest within `scatter` of it', () => {
    const { s, b } = forum();
    run(s, 1);
    runUntil(s, () => b.mode === 'lob', lob.cooldownTicks + 5, {});
    const windup = s.tick;
    runUntil(s, () => s.enemyBombs.length > 0, lob.windupTicks + 2);
    expect(s.tick - windup).toBe(lob.windupTicks);
    expect(s.enemyBombs).toHaveLength(lob.count);
    const [first, ...rest] = s.enemyBombs;
    expect({ x: first?.x, y: first?.y }).toEqual({ x: s.player.x, y: s.player.y });
    for (const bomb of rest) expect(Math.hypot(bomb.x - (first?.x ?? 0), bomb.y - (first?.y ?? 0))).toBeLessThanOrEqual(lob.scatter);
    expect(s.events.lobs).toEqual([{ id: b.id, count: lob.count }]);
    expect(summarize(s).enemyBombs[0]).toMatchObject({ radius: lob.radius, fuse: 0, fuseTicks: lob.fuseTicks, progress: 0 });
  });

  it('bursts each bomb as its growing circle meets the ring: damage and knockback inside, none outside', () => {
    const { s } = forum();
    runUntil(s, () => s.enemyBombs.length > 0, lob.cooldownTicks + lob.windupTicks + 5);
    const at = s.enemyBombs[0];
    if (!at) throw new Error('no bomb');
    s.enemyBombs = [at];
    run(s, lob.fuseTicks - 1);
    expect(summarize(s).enemyBombs[0]?.progress).toBeCloseTo((lob.fuseTicks - 1) / lob.fuseTicks, 2);
    expect(s.player.health).toBe(100);
    run(s, 1);
    expect(s.enemyBombs).toEqual([]);
    expect(s.player.health).toBe(100 - lob.damage);
    expect(s.player.knockTicks).toBeGreaterThan(0);
    expect(s.events.enemyBursts).toEqual([{ x: at.x, y: at.y, radius: lob.radius }]);

    const out = forum();
    runUntil(out.s, () => out.s.enemyBombs.length > 0, lob.cooldownTicks + lob.windupTicks + 5);
    const far = out.s.enemyBombs[0];
    if (!far) throw new Error('no bomb');
    out.s.enemyBombs = [far];
    movePlayer(out.s, far.x + lob.radius + 10, far.y);
    run(out.s, lob.fuseTicks);
    expect(out.s.player.health).toBe(100);
  });

  it('is dodged by a roll whose i-frames cover the burst, and never hurts enemies', () => {
    const { s } = forum();
    runUntil(s, () => s.enemyBombs.length > 0, lob.cooldownTicks + lob.windupTicks + 5);
    const at = s.enemyBombs[0];
    if (!at) throw new Error('no bomb');
    s.enemyBombs = [at];
    const husk = createEnemy(s.nextEnemyId++, 'husk', { x: at.x + 5, y: at.y }, s.roomId);
    husk.frozen = 10_000;
    s.enemies.push(husk);
    run(s, lob.fuseTicks - 3);
    run(s, 1, { dodge: true, moveX: 1 });
    run(s, 2);
    expect(s.events.enemyBursts).toHaveLength(1);
    expect(s.player.health).toBe(100);
    expect(husk.health).toBe(defOf(husk).maxHealth); // its own full health (041: ring 3 here)
  });

  it('pounds up close: plants its shield, winds up, damages inside the radius, and holds its facing through the recovery', () => {
    const { s, b } = forum(60);
    run(s, 1);
    expect(b.mode).toBe('windup');
    const angle = b.angle;
    movePlayer(s, START.x + 30, START.y + 40);
    run(s, pound.windupTicks - 1);
    expect(b.angle).toBe(angle);
    expect(s.player.health).toBe(100);
    run(s, 1);
    expect(b.mode).toBe('swipe');
    expect(s.player.health).toBe(100 - pound.damage);
    expect(s.events.pounds).toEqual([{ id: b.id, x: b.x, y: b.y, radius: pound.radius }]);
    runUntil(s, () => b.mode === 'recover', 20);
    movePlayer(s, START.x - 90, START.y);
    for (let t = 0; t < pound.recoverTicks - 1; t++) {
      run(s, 1);
      expect(b.angle).toBe(angle);
      expect(b.mode).toBe('recover');
    }
  });

  it('misses a player outside the pound circle', () => {
    const { s, b } = forum(60);
    run(s, 1);
    expect(b.mode).toBe('windup');
    movePlayer(s, START.x, START.y + pound.radius + 12);
    run(s, pound.windupTicks);
    expect(s.player.health).toBe(100);
  });

  it('lobs and pounds only at a player inside its arena: shot from outside, it chases but holds its bombs', () => {
    const { s, b } = forum();
    movePlayer(s, START.x, (HOLLOWS.arena.bounds.y0 - 2) * 32);
    b.mode = 'chase';
    let lobs = 0;
    run(s, DEF.leashTicks - 10, () => {
      lobs += s.events.lobs.length + s.events.pounds.length;
      return {};
    });
    expect(lobs).toBe(0);
    expect(b.lobCooldown).toBe(0);
    // Back in, the overdue lob comes at once.
    movePlayer(s, START.x, START.y + 160);
    run(s, 1);
    expect(b.mode).toBe('lob');
  });

  it('lets the player run: 300 ticks outside the arena and it walks home and heals', () => {
    const { s, b } = forum();
    run(s, 1);
    b.health = 500;
    movePlayer(s, START.x, (HOLLOWS.arena.bounds.y0 - 3) * 32);
    run(s, DEF.leashTicks - 1);
    expect(b.mode).not.toBe('return');
    run(s, 1);
    expect(b.mode).toBe('return');
    runUntil(s, () => b.mode === 'idle', 2000);
    expect(b.health).toBe(DEF.maxHealth);
    expect(Math.hypot(b.x - START.x, b.y - START.y)).toBeLessThanOrEqual(DEF.homeTolerance);
  });

  it('never steps out of the arena', () => {
    const { s, b } = forum();
    run(s, 1);
    movePlayer(s, START.x, (HOLLOWS.arena.bounds.y0 - 1) * 32);
    run(s, 280, () => {
      topUp(s);
      return {};
    });
    const a = HOLLOWS.arena.inside;
    expect(b.y).toBeLessThanOrEqual((a.y1 + 1) * 32);
    expect(b.y).toBeGreaterThanOrEqual(a.y0 * 32);
  });

  it('resets like unclaimed land on a KO before its first kill', () => {
    const { s, b } = forum();
    run(s, 1);
    b.health = 100;
    die(s);
    const again = s.enemies.find((e) => e.enemyId === 'bulwark');
    expect(again?.health).toBe(DEF.maxHealth);
    expect({ x: again?.x, y: again?.y }).toEqual(START);
    expect(s.bossDefeats).toEqual([]);
  });

  it('records its first kill as a boss defeat for good: the event, its drops, the wing unsealed, and no respawn on a KO', () => {
    const { s, b } = forum();
    run(s, 1);
    b.health = 0;
    run(s, 1);
    expect(s.events.bossDefeats).toEqual([{ boss: 'bulwark' }]);
    expect(s.bossDefeats).toEqual(['bulwark']);
    const by = (id: string) => s.groundItems.filter((g) => g.itemId === id).length;
    expect(by('bulwark-core')).toBe(1);
    expect(by('ley-iron')).toBeGreaterThanOrEqual(4);
    expect(by('ley-iron')).toBeLessThanOrEqual(6);
    expect(by('aqueduct-valve')).toBeGreaterThanOrEqual(1);
    expect(by('aqueduct-valve')).toBeLessThanOrEqual(2);
    expect(s.research['sealed-wing']).toBe('restored');
    die(s);
    run(s, 1);
    expect(s.enemies.some((e) => e.enemyId === 'bulwark')).toBe(false);
    expect(summarize(s).bossDefeats).toEqual(['bulwark']);
  });

  it('is deterministic: the same fight on the same seed plays out the same', () => {
    const fight = (): string => {
      const { s } = forum(90);
      run(s, 600, (x) => {
        topUp(x);
        return { moveX: x.tick % 120 < 60 ? 1 : -1 };
      });
      return JSON.stringify({ enemies: s.enemies, bombs: s.enemyBombs, player: s.player, rng: s.rng });
    };
    expect(fight()).toBe(fight());
  });
});

describe('the Bulwark against a player circling to its back (034 tuning)', () => {
  /**
   * The playtest's yardstick, reproducible: carried single arrows, no healing, the player circling about 110 px out
   * toward its back (it turns 40°/s), firing only while behind it, running straight out when the pound winds up.
   */
  function circleFight(maxTicks: number): { won: boolean; ticks: number; damageTaken: number; arrows: number; ko: boolean } {
    const { s, b } = forum(96, 1);
    s.inventory = { arrow: 999 };
    s.tube.ammoId = 'arrow';
    const sign = (v: number): -1 | 0 | 1 => (Math.abs(v) < 3 ? 0 : v > 0 ? 1 : -1);
    let damageTaken = 0;
    for (let t = 1; t <= maxTicks; t++) {
      const p = s.player;
      const bearing = Math.atan2(p.y - b.y, p.x - b.x);
      const back = b.angle + Math.PI;
      const d = Math.atan2(Math.sin(back - bearing), Math.cos(back - bearing));
      const along = bearing + Math.sign(d || 1) * Math.min(0.7, Math.abs(d));
      const dist = Math.hypot(p.x - b.x, p.y - b.y);
      const flee = b.mode === 'windup' && dist < DEF.pound.radius + 18;
      const goal = flee ? { x: p.x + (p.x - b.x), y: p.y + (p.y - b.y) } : { x: b.x + Math.cos(along) * 110, y: b.y + Math.sin(along) * 110 };
      const behind = Math.abs(d) < (70 * Math.PI) / 180;
      run(s, 1, { moveX: sign(goal.x - p.x), moveY: sign(goal.y - p.y), fire: behind && dist < 250, aimX: b.x, aimY: b.y - 20 });
      damageTaken += s.events.hits.filter((h) => h.target === 'player').reduce((n, h) => n + h.damage, 0);
      if (s.bossDefeats.length > 0) return { won: true, ticks: t, damageTaken, arrows: 999 - (s.inventory.arrow ?? 0), ko: false };
      if (s.player.dying > 0) return { won: false, ticks: t, damageTaken, arrows: 999 - (s.inventory.arrow ?? 0), ko: true };
    }
    return { won: false, ticks: maxTicks, damageTaken, arrows: 0, ko: false };
  }

  it('falls to single arrows from behind at its full 900 HP inside 30 s, and the player lives', () => {
    const r = circleFight(1800);
    // Recorded for the HP question in the plan's notes (seed 1): 1,515 ticks (about 25 s), 91 arrows, no damage
    // taken. One arrow at a time, so three entrances' arrows land well under the spec's 30–45 s target.
    expect(r).toMatchObject({ won: true, ko: false });
    expect(r.ticks).toBeLessThan(1800);
    expect(r.arrows).toBeGreaterThanOrEqual(DEF.maxHealth / straightAmmo('arrow').damage);
    expect(r.damageTaken).toBeLessThan(DEF.lob.damage * 2);
  });
});
