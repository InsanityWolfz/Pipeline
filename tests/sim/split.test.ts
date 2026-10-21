import { describe, expect, it } from 'vitest';
import { straightAmmo } from '../../src/data/ammo';
import { SPLIT } from '../../src/data/tags';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { arena, FIELD_WALL, fireAt, hold, HUSK, movePlayer, placeHusk, PLAYER_AT, run, runUntil, FIELD_ROW } from './fight';

// The Split (029): a Split round that hits an enemy bursts at the hit point into
// SPLIT.shards shards, 360 / shards degrees apart, the first along its flight.

const BOLT = straightAmmo('ley-bolt');

function starred(): SimState {
  const s = arena();
  s.inventory = { 'ley-bolt+split': 10 };
  hold(s, 'ley-bolt');
  return s;
}

const shards = (s: SimState) => s.arrows.filter((a) => a.ammoId === SPLIT.projectile);
const degrees = (dx: number, dy: number): number => Math.round((Math.atan2(dy, dx) * 180) / Math.PI);

describe('a Split ley bolt', () => {
  it('bursts into 5 shards 72° apart on a hit, the first along its flight', () => {
    const s = starred();
    const e = placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    run(s, 1, fireAt(PLAYER_AT.x + 1000, PLAYER_AT.y));
    runUntil(s, () => s.events.splits.length > 0, 60);
    const bolt = s.events.splits[0];
    expect(s.events.splits).toHaveLength(1);
    expect(e.health).toBe(HUSK.maxHealth - BOLT.damage);
    const out = shards(s);
    expect(out).toHaveLength(5);
    expect(out.map((a) => degrees(a.dx, a.dy))).toEqual([0, 72, 144, -144, -72]);
    for (const a of out) {
      expect({ x: a.x, y: a.y }).toEqual({ x: bolt?.x, y: bolt?.y });
      expect(a).toMatchObject({ damage: SPLIT.damage, damageType: 'physical', speed: SPLIT.speed, range: SPLIT.range, pierce: false, split: false, hitIds: [e.id] });
    }
    // The spent bolt is gone; only its shards fly on.
    expect(s.arrows.every((a) => a.ammoId === SPLIT.projectile)).toBe(true);
    expect(summarize(s).arrows.map((a) => a.ammoId)).toEqual(Array(5).fill('shard'));
  });

  it("never hits the struck enemy with its shards, and a shard hits one beyond it and stops", () => {
    const s = starred();
    const struck = placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    const beyond = placeHusk(s, PLAYER_AT.x + 130, PLAYER_AT.y);
    run(s, 1, fireAt(PLAYER_AT.x + 1000, PLAYER_AT.y));
    runUntil(s, () => s.events.splits.length > 0, 60);
    runUntil(s, () => shards(s).length === 0, 30);
    expect(struck.health).toBe(HUSK.maxHealth - BOLT.damage);
    expect(beyond.health).toBe(HUSK.maxHealth - SPLIT.damage);
  });

  it('flies its shards 64 px at 360 px/s', () => {
    const s = starred();
    placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    run(s, 1, fireAt(PLAYER_AT.x + 1000, PLAYER_AT.y));
    runUntil(s, () => s.events.splits.length > 0, 60);
    const ticks = runUntil(s, () => shards(s).length === 0, 30);
    expect(ticks).toBe(Math.ceil(SPLIT.range / (SPLIT.speed / 60)));
  });

  it("doesn't split when it hits a wall or runs out of range", () => {
    const s = starred();
    // The ruin field's west wall (017); fire at it from 3 tiles away.
    movePlayer(s, (FIELD_WALL.west + 3.5) * 32, FIELD_ROW(14));
    run(s, 1, fireAt(0, FIELD_ROW(14)));
    let bursts = 0;
    runUntil(
      s,
      () => {
        bursts += s.events.splits.length;
        return s.arrows.length === 0;
      },
      60,
    );
    const open = starred();
    run(open, 1, fireAt(PLAYER_AT.x + 1000, PLAYER_AT.y + 300));
    runUntil(
      open,
      () => {
        bursts += open.events.splits.length;
        return open.arrows.length === 0;
      },
      90,
    );
    expect(bursts).toBe(0);
  });
});
