import { describe, expect, it } from 'vitest';
import { TIER_DAMAGE } from '../../src/data/tiers';
import { TALENT_START } from '../../src/data/talents';
import { createArrow } from '../../src/sim/arrows';
import { createEnemy } from '../../src/sim/enemies';
import { arena, fireAt, hold, PLAYER_AT, run, runUntil } from './fight';
import { still } from './fireKit';
import { hall } from './hall';

// Lightning's chain (064), its rules: arcs skip burrowed, rising (immune) and plated enemies; a Shield doesn't stop an
// arc (it comes from beside); each Shard chains; arc hits never arc again on their own, never Split, and never set off
// talents that trigger on a round's hit; the tier (062) reaches arcs through the hit's damage.

const fly = (s: ReturnType<typeof arena>, round: string, dx = 1, dy = 0) => s.arrows.push(createArrow(s.nextArrowId++, round, s.roomId, PLAYER_AT.x + 10, PLAYER_AT.y, dx, dy));

describe('what an arc skips, and what it passes', () => {
  it('skips a Burrower underground and an add still rising, arcing past them to the next', () => {
    const s = arena();
    const a = still(s, PLAYER_AT.x + 60, PLAYER_AT.y);
    const dug = still(s, PLAYER_AT.x + 60, PLAYER_AT.y + 30);
    dug.underground = true;
    const rising = still(s, PLAYER_AT.x + 60, PLAYER_AT.y - 30);
    rising.rising = 100;
    const next = still(s, PLAYER_AT.x + 60, PLAYER_AT.y + 70);
    fly(s, 'arrow+lightning');
    runUntil(s, () => s.events.arcs.length > 0, 30);
    expect(s.events.arcs.map((x) => x.to)).toEqual([next.id]);
    expect([dug.health, rising.health]).toEqual([10_000, 10_000]);
    expect(a.health).toBe(10_000 - 14);
  });

  it('skips a plated Forgewright', () => {
    const { s, f } = hall();
    const a = still(s, f.x - 50, f.y);
    const before = f.health;
    s.arrows.push(createArrow(s.nextArrowId++, 'arrow+lightning', s.roomId, a.x - 50, a.y - 12, 1, 0));
    runUntil(s, () => a.health < 10_000, 30);
    expect(s.events.arcs).toEqual([]);
    expect(f.health).toBe(before);
    expect(s.events.blocked.filter((b) => b.id === f.id)).toEqual([]);
  });

  it('passes a Shardback’s Shield: an arc from its front lands', () => {
    const s = arena();
    const a = still(s, PLAYER_AT.x + 60, PLAYER_AT.y);
    const shield = createEnemy(s.nextEnemyId++, 'shardback', { x: PLAYER_AT.x + 60, y: PLAYER_AT.y + 60 }, s.roomId);
    // Facing the first enemy, its shield square on to the arc.
    shield.angle = -Math.PI / 2;
    shield.mode = 'windup';
    shield.modeTicks = -10_000;
    s.enemies.push(shield);
    const full = shield.health;
    fly(s, 'arrow+lightning');
    runUntil(s, () => s.events.arcs.length > 0, 30);
    expect(s.events.arcs.map((x) => x.to)).toEqual([shield.id]);
    expect(shield.health).toBe(full - 7);
    expect(s.events.blocked).toEqual([]);
    expect(a.health).toBe(10_000 - 14);
  });
});

describe('what arcs come from', () => {
  it('each Shard of a Lightning Split ley bolt chains; the arcs never Split', () => {
    const s = arena();
    const a = still(s, PLAYER_AT.x + 60, PLAYER_AT.y);
    const ring = [0, 1, 2, 3].map((i) => still(s, PLAYER_AT.x + 60 + Math.cos((i * Math.PI) / 2 + 0.6) * 50, PLAYER_AT.y + Math.sin((i * Math.PI) / 2 + 0.6) * 50));
    fly(s, 'ley-bolt+lightning+split');
    // Every tick's events, until the bolt and its Shards are spent.
    const splits: unknown[] = [];
    const arcs: { from: number }[] = [];
    runUntil(
      s,
      () => {
        splits.push(...s.events.splits);
        arcs.push(...s.events.arcs);
        return s.arrows.length === 0 && splits.length > 0;
      },
      90,
    );
    // One Split, the bolt's: the arcs from its hit and from its Shards' hits never burst again.
    expect(splits).toHaveLength(1);
    // More arcs than the bolt's own chain can make (2), some starting from enemies its Shards hit.
    expect(arcs.length).toBeGreaterThan(2);
    expect(arcs.some((x) => x.from !== a.id)).toBe(true);
    expect(ring.filter((e) => e.health < 10_000).length).toBeGreaterThanOrEqual(3);
  });

  it('arc hits set off no keystone: an arc onto a Frozen enemy with Shatterpoint taken doesn’t shatter it', () => {
    const s = arena();
    s.talents = [TALENT_START, 'l1', 'l2', 'l3', 'k2'];
    const a = still(s, PLAYER_AT.x + 60, PLAYER_AT.y);
    const frozen = still(s, PLAYER_AT.x + 60, PLAYER_AT.y + 50);
    frozen.frozen = 200;
    fly(s, 'ley-bolt+lightning');
    runUntil(s, () => s.events.arcs.length > 0, 60);
    expect(s.events.arcs.map((x) => x.to)).toEqual([frozen.id]);
    expect(s.events.shatters).toEqual([]);
    expect(frozen.frozen).toBeGreaterThan(0);
    expect(a.health).toBeLessThan(10_000);
  });

  it('the tier reaches arcs through the hit: a Steel Lightning arrow’s arc is half its ×1.6 hit', () => {
    const s = arena();
    const a = still(s, PLAYER_AT.x + 60, PLAYER_AT.y);
    const b = still(s, PLAYER_AT.x + 60, PLAYER_AT.y + 50);
    s.inventory = { 'arrow+steel+lightning': 5 };
    hold(s, 'arrow+steel+lightning');
    run(s, 1, fireAt(a.x, a.y));
    runUntil(s, () => b.health < 10_000, 30);
    const direct = 10_000 - a.health;
    expect(direct).toBeCloseTo(14 * TIER_DAMAGE.steel, 6);
    expect(10_000 - b.health).toBeCloseTo(direct * 0.5, 6);
  });
});
