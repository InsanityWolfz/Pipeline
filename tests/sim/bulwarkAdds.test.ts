import { describe, expect, it } from 'vitest';
import { ADDS_GROUP } from '../../src/data/bulwark';
import { HOLLOWS } from '../../src/data/hollows';
import { stepAltars } from '../../src/sim/altar';
import { createEnemy, targetable, type EnemyState } from '../../src/sim/enemies';
import { NO_COMMAND } from '../../src/sim/input';
import { capCount } from '../../src/sim/population';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { die, fireAt, movePlayer, run, runUntil } from './fight';
import { DEF, forum, START } from './forum';

// The Bulwark's adds (041.6): the first time in a fight its health drops below half, a
// Shardback and a Charger rise at the forum's two add tiles over 60 ticks, normal ring 3
// enemies once up. Once per fight: a reset sinks living adds and re-arms them.

const { adds } = DEF;
const HALF = Math.floor(DEF.maxHealth * adds.below) - 1;
const TILES = HOLLOWS.arena.addTiles.map(tileCentre);
const addsOf = (s: SimState): EnemyState[] => s.enemies.filter((e) => e.group === ADDS_GROUP);

/** The forum with the Bulwark awake and dropped below half; returns once its adds are up from the ground. */
function risen(): { s: SimState; b: EnemyState } {
  const f = forum(160);
  run(f.s, 1);
  f.b.health = HALF;
  run(f.s, 1);
  return f;
}

describe('the adds', () => {
  it('rise once below 50%: one Shardback and one Charger at the add tiles, ring 3, never champions, with the event', () => {
    const { s, b } = risen();
    const up = addsOf(s);
    expect(up.map((e) => e.enemyId)).toEqual(adds.enemies);
    expect(up.map((e) => ({ x: e.x, y: e.y }))).toEqual(TILES);
    for (const e of up) {
      expect(e).toMatchObject({ ring: 3, champion: null, rising: adds.riseTicks, roomId: b.roomId });
      expect(Math.hypot(e.x - s.player.x, e.y - s.player.y)).toBeGreaterThanOrEqual(adds.minDistance);
    }
    expect(up.map((e) => e.health)).toEqual([175, 125]);
    expect(b.addsRisen).toBe(true);
    expect(s.events.addsRise).toEqual([{ id: b.id, adds: up.map((e) => ({ id: e.id, enemyId: e.enemyId, x: e.x, y: e.y })) }]);
    const sum = summarize(s);
    expect(sum.enemies.filter((e) => e.group === ADDS_GROUP).map((e) => ({ ring: e.ring, rising: e.rising }))).toEqual([
      { ring: 3, rising: adds.riseTicks },
      { ring: 3, rising: adds.riseTicks },
    ]);
    expect(sum.bosses[0]?.addsRisen).toBe(true);
  });

  it('use the other tile when one is within 96 px of the player', () => {
    const f = forum(160);
    run(f.s, 1);
    movePlayer(f.s, TILES[0]?.x ?? 0, (TILES[0]?.y ?? 0) + 40);
    f.b.health = HALF;
    run(f.s, 1);
    expect(addsOf(f.s).map((e) => ({ x: e.x, y: e.y }))).toEqual([TILES[1], TILES[1]]);
  });

  it('can’t act, be hit or block while rising, then fight as usual', () => {
    const { s } = risen();
    const [shard, charger] = addsOf(s);
    if (!shard || !charger) throw new Error('no adds');
    expect(targetable(shard)).toBe(false);
    const at = { x: shard.x, y: shard.y };
    s.inventory = { arrow: 50 };
    s.tube.ammoId = 'arrow';
    movePlayer(s, shard.x + 80, shard.y);
    for (let t = 1; t < adds.riseTicks; t++) {
      run(s, 1, fireAt(shard.x, shard.y - 10));
      expect(s.events.blocked).toEqual([]);
      expect(shard.mode).toBe('idle');
    }
    expect({ x: shard.x, y: shard.y }).toEqual(at);
    expect([shard.health, charger.health]).toEqual([175, 125]);
    run(s, 1);
    expect(shard.rising).toBe(0);
    expect(targetable(shard)).toBe(true);
    expect(shard.mode).toBe('chase');
  });

  it('come once a fight: below half again, no more rise', () => {
    const { s, b } = risen();
    for (const e of addsOf(s)) e.health = 0;
    run(s, 1);
    b.health = DEF.maxHealth;
    run(s, 1);
    b.health = HALF;
    run(s, 5);
    expect(addsOf(s)).toEqual([]);
  });

  it('sink and re-arm on a leash reset: living adds are removed, and the next fight has its own', () => {
    const { s, b } = risen();
    movePlayer(s, START.x, (HOLLOWS.arena.bounds.y0 - 3) * 32);
    runUntil(s, () => b.mode === 'idle', DEF.leashTicks + 3000);
    expect(addsOf(s)).toEqual([]);
    expect(b.addsRisen).toBe(false);
    movePlayer(s, START.x, START.y + 160);
    run(s, 1);
    b.health = HALF;
    run(s, 1);
    expect(addsOf(s)).toHaveLength(2);
  });

  it('are gone after a KO before its first kill, the Bulwark back with its adds to come', () => {
    const { s } = risen();
    die(s);
    expect(addsOf(s)).toEqual([]);
    expect(s.enemies.find((e) => e.enemyId === 'bulwark')?.addsRisen).toBe(false);
  });

  it('come again with an altar summon, a new fight', () => {
    const { s, b } = risen();
    b.health = 0;
    run(s, 1);
    for (const e of addsOf(s)) e.health = 0;
    run(s, 1);
    s.inventory = { ...HOLLOWS.arena.offering };
    const altar = tileCentre(HOLLOWS.arena.altar);
    movePlayer(s, altar.x + 32, altar.y);
    stepAltars(s, { ...NO_COMMAND, summon: HOLLOWS.arena.altar.id });
    run(s, HOLLOWS.arena.summonTicks + 1);
    const again = s.enemies.find((e) => e.enemyId === 'bulwark');
    if (!again) throw new Error('no summoned Bulwark');
    expect(again.addsRisen).toBe(false);
    movePlayer(s, START.x, START.y + 160);
    run(s, 1);
    again.health = HALF;
    run(s, 1);
    expect(addsOf(s)).toHaveLength(2);
  });

  it('don’t count toward the spawn cap', () => {
    const { s } = risen();
    const husk = createEnemy(s.nextEnemyId++, 'husk', { x: s.player.x + 40, y: s.player.y }, s.roomId);
    s.enemies.push(husk);
    expect(capCount(s)).toBe(s.enemies.length - addsOf(s).length);
  });

  it('is deterministic with the stomp, the enrage and the adds', () => {
    const fight = (): string => {
      const { s, b } = forum(90, 3);
      run(s, 1);
      b.health = Math.floor(DEF.maxHealth * DEF.enrage.below) - 1;
      const seen = { enrages: 0, stomps: 0 };
      run(s, 1500, (x) => {
        seen.enrages += x.events.enrages.length;
        seen.stomps += x.events.stomps.length;
        x.player.health = 100;
        const behind = { x: b.x - Math.cos(b.angle) * 90, y: b.y - Math.sin(b.angle) * 90 };
        return x.tick % 400 < 250 ? { moveX: Math.sign(behind.x - x.player.x) as -1 | 0 | 1, moveY: Math.sign(behind.y - x.player.y) as -1 | 0 | 1 } : { moveX: x.tick % 120 < 60 ? 1 : -1 };
      });
      return JSON.stringify({ seen, enemies: s.enemies, bombs: s.enemyBombs, player: s.player, rng: s.rng });
    };
    const a = fight();
    expect(a).toContain(ADDS_GROUP);
    expect(a).toContain('"seen":{"enrages":1,');
    expect(a).not.toContain('"stomps":0}');
    expect(a).toBe(fight());
  });
});
