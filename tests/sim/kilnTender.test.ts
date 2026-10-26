import { describe, expect, it } from 'vitest';
import { enemyDef } from '../../src/data/enemies';
import type { TenderDef } from '../../src/data/emberworksEnemies';
import { createEnemy, damageEnemy, type EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { repairing } from '../../src/sim/tenderAi';
import { arena, HALL, homeTile, movePlayer, PLAYER_AT, run, runUntil } from './fight';

// The kiln-tender (061): it keeps its distance from the player and has no attack. Every cooldown it picks its most
// hurt packmate in reach with a clear line (never itself or a boss), winds up a beam to it, then channels a heal of
// `heal` a second, never past max health. The channel breaks on a blocked line, the target's death, or any damage to
// the tender.

const DEF = enemyDef('kiln-tender') as TenderDef;
const { keep, beam } = DEF;

function place(s: SimState, id: string, dx: number, dy = 0, group = 'pack'): EnemyState {
  const e = createEnemy(s.nextEnemyId++, id, { x: PLAYER_AT.x + dx, y: PLAYER_AT.y + dy }, HALL, group);
  s.enemies.push(e);
  return e;
}

/** A packmate held still where it stands (frozen), hurt to `health`. */
function hurt(s: SimState, id: string, dx: number, dy: number, health: number, group = 'pack'): EnemyState {
  const e = place(s, id, dx, dy, group);
  e.frozen = 100_000;
  e.health = health;
  return e;
}

/** A distance from the player in the middle of the tender's band, where it holds still. */
const MID = (keep.min + keep.max) / 2;

describe('the kiln-tender', () => {
  it("has the spec's starting values", () => {
    expect(DEF).toMatchObject({ kind: 'tender', boss: false, maxHealth: 40, walkSpeed: 45, xp: 6 });
    expect(keep).toEqual({ min: 160, max: 240 });
    expect(beam).toMatchObject({ range: 200, swipeTicks: 180, heal: 6, windupTicks: 30, recoverTicks: 30, cooldownTicks: 240 });
  });

  it('keeps between its min and max from the player: backing off when closer, closing in when farther', () => {
    const near = arena();
    const a = place(near, 'kiln-tender', 100);
    run(near, 30);
    expect(a.x).toBeGreaterThan(PLAYER_AT.x + 100);
    runUntil(near, () => a.x - PLAYER_AT.x >= keep.min, 400);
    run(near, 20);
    expect(a.x - PLAYER_AT.x).toBeLessThanOrEqual(keep.min + 1);

    const far = arena();
    const b = place(far, 'kiln-tender', 300);
    run(far, 30);
    expect(b.x).toBeLessThan(PLAYER_AT.x + 300);
    runUntil(far, () => b.x - PLAYER_AT.x <= keep.max, 400);

    const mid = arena();
    const c = place(mid, 'kiln-tender', MID);
    run(mid, 30);
    expect(c.x).toBe(PLAYER_AT.x + MID);
  });

  it('has no attack of its own', () => {
    const s = arena();
    place(s, 'kiln-tender', MID);
    run(s, 600);
    expect(s.player.health).toBe(100);
  });

  it('picks the packmate with the lowest share of its health in reach, never itself, a full one, another pack or a boss', () => {
    const s = arena();
    const t = place(s, 'kiln-tender', MID);
    t.health = 1;
    hurt(s, 'slag-golem', MID + 40, 0, 119);
    const most = hurt(s, 'bellows-hound', MID - 40, 0, 20);
    hurt(s, 'husk', MID, 40, 1, 'other');
    hurt(s, 'forgewright', MID, -60, 10);
    run(s, 1);
    expect(t.mode).toBe('windup');
    expect(t.beamTarget).toBe(most.id);
    expect(s.events.beams).toEqual([{ id: t.id, target: most.id }]);
    expect(summarize(s).enemies.find((e) => e.id === t.id)?.beam).toEqual({ target: most.id, phase: 'windup' });
  });

  it('skips a packmate out of its range or behind a solid', () => {
    const s = arena();
    const t = place(s, 'kiln-tender', MID);
    hurt(s, 'slag-golem', MID + beam.range + 20, 0, 10);
    run(s, 5);
    expect(t.mode).not.toBe('windup');
    expect(t.beamTarget).toBe(-1);
  });

  it('heals its target `heal` a second through the channel, never past max health, its cooldown from the wind-up start', () => {
    const s = arena();
    const t = place(s, 'kiln-tender', MID);
    const g = hurt(s, 'slag-golem', MID + 40, 0, 60);
    run(s, 1);
    run(s, beam.windupTicks);
    expect(t.mode).toBe('swipe');
    expect(repairing(s, g.id)).toBe(true);
    const start = g.health;
    run(s, 60);
    expect(g.health).toBeCloseTo(start + beam.heal, 5);
    // Topped up near full: it stops at its max.
    g.health = 119.95;
    run(s, 10);
    expect(g.health).toBe(120);
    runUntil(s, () => t.mode === 'recover', beam.swipeTicks);
    expect(repairing(s, g.id)).toBe(false);
    // 240 from the wind-up's start: the next wind-up then, once it's hurt again.
    g.health = 60;
    runUntil(s, () => t.mode === 'windup', beam.cooldownTicks);
    // Its first wind-up began on tick 1.
    expect(s.tick - 1).toBe(beam.cooldownTicks);
  });

  it("its channel breaks on damage to the tender, the target's death, or a blocked line", () => {
    const hit = arena();
    const t = place(hit, 'kiln-tender', MID);
    const g = hurt(hit, 'slag-golem', MID + 40, 0, 60);
    run(hit, 1 + beam.windupTicks + 5);
    damageEnemy(hit, t, 1, 0, 0);
    run(hit, 1);
    expect(t.mode).toBe('recover');
    expect(hit.events.beamBreaks).toEqual([{ id: t.id, target: g.id, reason: 'hurt' }]);
    const healed = g.health;
    run(hit, 30);
    expect(g.health).toBe(healed);

    const dies = arena();
    const t2 = place(dies, 'kiln-tender', MID);
    const g2 = hurt(dies, 'slag-golem', MID + 40, 0, 60);
    run(dies, 1 + beam.windupTicks + 5);
    damageEnemy(dies, g2, 10_000, 0, 0);
    run(dies, 1);
    expect(t2.mode).toBe('recover');
    expect(dies.events.beamBreaks).toEqual([{ id: t2.id, target: g2.id, reason: 'died' }]);
  });

  it('breaks on a line a solid blocks', () => {
    // The meadow's rock cluster (charger.test.ts): the tender north of it, its packmate south.
    const s = arena();
    const rock = homeTile(70, 34);
    movePlayer(s, rock.x + MID, rock.y - 64);
    const t = createEnemy(s.nextEnemyId++, 'kiln-tender', { x: rock.x, y: rock.y - 64 }, HALL, 'pack');
    s.enemies.push(t);
    const g = createEnemy(s.nextEnemyId++, 'slag-golem', { x: rock.x + 60, y: rock.y - 64 }, HALL, 'pack');
    g.frozen = 100_000;
    g.health = 60;
    s.enemies.push(g);
    runUntil(s, () => t.mode === 'swipe', beam.windupTicks + 5);
    // The golem moved behind the rocks.
    g.x = rock.x;
    g.y = rock.y + 64;
    run(s, 1);
    expect(s.events.beamBreaks).toEqual([{ id: t.id, target: g.id, reason: 'blocked' }]);
  });
});
