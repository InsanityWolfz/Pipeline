import { describe, expect, it } from 'vitest';
import { FEATHERPLATE, LAST_EMBER, ROLLBREAKER, WARDSTONE } from '../../src/data/relics';
import { MAX_HEALTH, ROLL_DISTANCE, ROLL_TICKS } from '../../src/data/player';
import { SLOT_BASE } from '../../src/data/gear';
import { bank } from '../../src/sim/banking';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import { playerStats, walkScale } from '../../src/sim/stats';
import { summarize } from '../../src/sim/summary';
import type { SimState } from '../../src/sim/state';
import { arena, HALL, HUSK, placeHusk, PLAYER_AT, run, runUntil, runUntilKo, SWIPE_LANDS } from './fight';
import { piece, wear } from '../fixtures/gear';

// The four relics (036): each one rule, read from its data entry.

const relic = (id: number, def: { id: string; slot: 'helm' | 'body' | 'boots' | 'trinket'; weight: 'light' | 'heavy' | null }, baseArmor = 0) =>
  piece(id, def.slot, { rarity: 'relic', relic: def.id, ...(def.weight ? { weight: def.weight } : {}), baseArmor, name: def.id });

/** Rolls right from where the player stands, through the whole roll. */
function rollRight(s: SimState): void {
  run(s, 1, { moveX: 1, dodge: true });
  run(s, ROLL_TICKS);
}

describe('Rollbreaker Greaves', () => {
  it('rolling through a Husk mid wind-up cancels it and holds it in recovery for staggerTicks, once per roll', () => {
    const s = wear(arena(), relic(0, ROLLBREAKER));
    const husk = placeHusk(s, PLAYER_AT.x + 20, PLAYER_AT.y);
    run(s, 2);
    expect(husk.mode).toBe('windup');
    let staggers = 0;
    run(s, 1, { moveX: 1, dodge: true });
    staggers += s.events.staggers.length;
    for (let i = 0; i < ROLL_TICKS; i++) {
      run(s, 1);
      staggers += s.events.staggers.length;
    }
    expect(staggers).toBe(1);
    expect(husk.mode).toBe('recover');
    expect(husk.staggered).toBeGreaterThan(ROLLBREAKER.staggerTicks - ROLL_TICKS - 2);
    // Its swing never lands, and it holds in recovery until the stagger runs out, then chases again.
    const ticks = runUntil(s, () => husk.staggered === 0, ROLLBREAKER.staggerTicks);
    expect(s.player.health).toBe(MAX_HEALTH);
    expect(husk.mode).toBe('chase');
    expect(ticks).toBeLessThan(ROLLBREAKER.staggerTicks);
    expect(summarize(s).enemies.find((e) => e.id === husk.id)?.staggered).toBe(0);
  });

  it('a second roll through it staggers it again', () => {
    const s = wear(arena(), relic(0, ROLLBREAKER));
    const husk = placeHusk(s, PLAYER_AT.x + 20, PLAYER_AT.y);
    rollRight(s);
    expect(husk.staggered).toBeGreaterThan(0);
    run(s, ROLLBREAKER.staggerTicks + 30);
    s.player.x = husk.x - 30;
    rollRight(s);
    expect(husk.staggered).toBeGreaterThan(0);
  });

  it('leaves an enemy already recovering be, so its punish window is never cut short', () => {
    const s = wear(arena(), relic(0, ROLLBREAKER));
    const husk = placeHusk(s, PLAYER_AT.x + 20, PLAYER_AT.y);
    husk.mode = 'recover';
    husk.modeTicks = 1;
    husk.cooldown = 200;
    rollRight(s);
    expect(husk.staggered).toBe(0);
  });

  it('without the greaves nothing staggers; bosses ignore it', () => {
    const bare = arena();
    const husk = placeHusk(bare, PLAYER_AT.x + 20, PLAYER_AT.y);
    rollRight(bare);
    expect(husk.staggered).toBe(0);
    const s = wear(arena(), relic(0, ROLLBREAKER));
    const warden: EnemyState = createEnemy(s.nextEnemyId++, 'pylon-warden', { x: PLAYER_AT.x + 30, y: PLAYER_AT.y }, HALL);
    s.enemies.push(warden);
    rollRight(s);
    expect(warden.staggered).toBe(0);
    expect(s.events.staggers).toEqual([]);
  });
});

describe('Wardstone Circlet', () => {
  it('after wardTicks without a hit it blocks the next hit whole, then starts over', () => {
    const s = wear(arena(), relic(0, WARDSTONE));
    run(s, WARDSTONE.wardTicks - 1);
    expect(summarize(s).relics).toMatchObject({ wardTicks: WARDSTONE.wardTicks - 1, wardReady: false });
    run(s, 1);
    expect(summarize(s).relics.wardReady).toBe(true);
    placeHusk(s, PLAYER_AT.x + 20, PLAYER_AT.y);
    let blocks = 0;
    for (let i = 0; i < SWIPE_LANDS; i++) {
      run(s, 1);
      blocks += s.events.wardBlocks.length;
    }
    expect(blocks).toBe(1);
    expect(s.player.health).toBe(MAX_HEALTH);
    expect(summarize(s).relics.wardReady).toBe(false);
    // The Husk's next swing lands in full: the ward has 6 s to build again.
    runUntil(s, (x) => x.player.health < MAX_HEALTH, HUSK.swipe.cooldownTicks + SWIPE_LANDS);
    expect(s.player.health).toBe(MAX_HEALTH - HUSK.swipe.damage);
  });

  it('a hit that lands while it builds starts it over', () => {
    const s = wear(arena(), relic(0, WARDSTONE));
    run(s, 200);
    placeHusk(s, PLAYER_AT.x + 20, PLAYER_AT.y);
    run(s, SWIPE_LANDS);
    expect(s.player.health).toBe(MAX_HEALTH - HUSK.swipe.damage);
    expect(s.player.wardTicks).toBe(0);
  });

  it('counts only while worn', () => {
    const s = arena();
    run(s, WARDSTONE.wardTicks + 5);
    expect(summarize(s).relics).toMatchObject({ wardTicks: 0, wardReady: false });
  });
});

describe('Featherplate', () => {
  it('heavy base armor without the walk slow, and a roll 25% shorter', () => {
    const s = wear(arena(), relic(0, FEATHERPLATE, SLOT_BASE.body.heavy.min));
    expect(playerStats(s).armor).toBe(SLOT_BASE.body.heavy.min);
    expect(walkScale(s)).toBe(1);
    expect(playerStats(s).rollDistance).toBeCloseTo(ROLL_DISTANCE * FEATHERPLATE.rollScale, 9);
    const x = s.player.x;
    run(s, 1, { moveX: 1, dodge: true });
    run(s, ROLL_TICKS - 1);
    expect(s.player.x - x).toBeCloseTo(ROLL_DISTANCE * 0.75, 5);
  });
});

describe('Last Ember', () => {
  /** Hurt, wearing the ember, a Husk about to swing. */
  const lowWithHusk = (): SimState => {
    const s = wear(arena(), relic(0, LAST_EMBER));
    s.player.health = 10;
    placeHusk(s, PLAYER_AT.x + 20, PLAYER_AT.y);
    return s;
  };

  it('once a trip, a hit that would kill leaves the player on 1 HP with saveInvulnTicks of invulnerability', () => {
    const s = lowWithHusk();
    run(s, SWIPE_LANDS);
    expect(s.player.health).toBe(1);
    expect(s.player.hurtTicks).toBe(LAST_EMBER.saveInvulnTicks);
    expect(s.events.emberSaves).toHaveLength(1);
    expect(summarize(s).relics.emberSpent).toBe(true);
    // A second killing hit kills.
    runUntilKo(s, 400);
    expect(s.events.ko).toBe(true);
  });

  it('recharges when the player banks, and on waking from a KO', () => {
    const s = lowWithHusk();
    run(s, SWIPE_LANDS);
    expect(s.player.emberSpent).toBe(true);
    bank(s);
    expect(s.player.emberSpent).toBe(false);
    s.player.emberSpent = true;
    s.player.health = 0;
    runUntilKo(s);
    expect(s.player.emberSpent).toBe(false);
  });

  it('does nothing unworn, and a hit that doesn’t kill is just a hit', () => {
    const bare = arena();
    bare.player.health = 10;
    placeHusk(bare, PLAYER_AT.x + 20, PLAYER_AT.y);
    run(bare, SWIPE_LANDS);
    expect(bare.player.health).toBe(0);
    const s = wear(arena(), relic(0, LAST_EMBER));
    s.player.health = 50;
    placeHusk(s, PLAYER_AT.x + 20, PLAYER_AT.y);
    run(s, SWIPE_LANDS);
    expect(s.player.health).toBe(30);
    expect(s.player.emberSpent).toBe(false);
  });
});
