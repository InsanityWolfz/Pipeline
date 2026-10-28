import { describe, expect, it } from 'vitest';
import { VIEW_HEIGHT } from '../../src/data/config';
import { enemyDef, type EnemyDef } from '../../src/data/enemies';
import { MAX_HEALTH } from '../../src/data/player';
import { inAggroBox } from '../../src/sim/aiCommon';
import { linkTrios } from '../../src/sim/miteAi';
import type { EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { arena, movePlayer, PLAYER_AT, run, runUntil } from './fight';
import { stage } from './offscreen';

// 073: the short-reach kinds start only within reach of the player's feet, all of it on screen; each one's start is
// wired through the rule. A wind-up started on screen completes off screen (073.4), and shots in flight keep flying.

const HALF_H = VIEW_HEIGHT / 2;

/** The distance at which each short-reach kind starts its attack, from its data. */
function startRange(def: EnemyDef): number {
  switch (def.kind) {
    case 'melee':
      return def.swipe.triggerRange;
    case 'caster':
      return def.cast.aggroRange;
    case 'slammer':
      return def.slam.triggerRange;
    case 'shardback':
      return def.bash.triggerRange;
    case 'mote':
      return def.swell.triggerRange;
    case 'golem':
      return def.slam.triggerRange;
    case 'mite':
      return def.zap.triggerRange;
    case 'ram':
      return def.gust.range;
    default:
      throw new Error(`${def.id} is not a short-reach kind`);
  }
}

const SHORT = ['husk', 'slag-whelp', 'wisp', 'pylon-warden', 'shardback', 'cinder-mote', 'slag-golem', 'static-mite', 'gale-ram'] as const;

/** Where each short-reach kind is staged on screen, below the player: inside its start range (the Wisp outside its back-off). */
const ON_SCREEN: Record<(typeof SHORT)[number], number> = {
  husk: 20,
  'slag-whelp': 15,
  wisp: 120,
  'pylon-warden': 40,
  shardback: 20,
  'cinder-mote': 30,
  'slag-golem': 40,
  'static-mite': 10,
  'gale-ram': 60,
};

describe('the short-reach enemies (073)', () => {
  it.each(SHORT)('%s starts only within a reach inside the screen’s half-height', (id) => {
    expect(startRange(enemyDef(id))).toBeLessThan(HALF_H);
  });

  it.each(SHORT)('%s, on screen in reach with its cooldown ready, starts on the next tick', (id) => {
    const s = arena();
    const e = stage(s, id, 0, ON_SCREEN[id]);
    if (id === 'static-mite') linkTrios([e]);
    run(s, 1);
    expect(e.mode).toBe('windup');
  });
});

describe('a wind-up started on screen completes off screen (073.4)', () => {
  it('a Sniper whose target steps off screen mid-tracking still fires', () => {
    const s = arena();
    const e = stage(s, 'sniper', 0, 150);
    run(s, 1);
    expect(e.mode).toBe('windup');
    // The player steps up: 250 px off, past the screen's half-height, still a clear line within its sight.
    movePlayer(s, PLAYER_AT.x, PLAYER_AT.y - 100);
    expect(inAggroBox(e, s.player)).toBe(false);
    const def = enemyDef('sniper');
    if (def.kind !== 'sniper') throw new Error('not a sniper');
    runUntil(s, (x) => x.events.snipes.length > 0, def.snipe.windupTicks + 2);
    expect(s.orbs.length).toBe(1);
  });

  it.each([
    ['charger', 'charges'],
    ['bellows-hound', 'dashes'],
    ['thunderhawk', 'dives'],
  ] as const)('a %s whose target steps off screen mid-wind-up still sets off down its lane', (id, event) => {
    const s = arena();
    const e = stage(s, id, 0, 150);
    run(s, 1);
    expect(e.mode).toBe('windup');
    movePlayer(s, PLAYER_AT.x, PLAYER_AT.y - 100);
    expect(inAggroBox(e, s.player)).toBe(false);
    runUntil(s, (x) => x.events[event].length > 0, 90);
    expect(e.mode).toBe('swipe');
  });

  it('a storm sentinel that leaves the screen mid-call still strikes', () => {
    const s = arena();
    const e = stage(s, 'storm-sentinel', 0, 170);
    run(s, 1);
    expect(e.mode).toBe('windup');
    expect(s.strikes.length).toBe(1);
    // It's carried off screen while its circle waits on the player's feet.
    e.x = PLAYER_AT.x;
    e.y = PLAYER_AT.y + 260;
    expect(inAggroBox(e, s.player)).toBe(false);
    runUntil(s, (x) => x.player.health < MAX_HEALTH, 120);
    expect(s.strikes.length).toBe(0);
  });
});

describe('shots in flight keep flying when their shooter goes off screen (073)', () => {
  /** Runs until the shooter's shot is out, carries the shooter off screen, then until the shot hits. */
  function flyOn(s: SimState, e: EnemyState, limit: number): void {
    runUntil(s, (x) => x.orbs.length > 0, limit);
    e.x = PLAYER_AT.x;
    e.y = PLAYER_AT.y + 400;
    expect(inAggroBox(e, s.player)).toBe(false);
    runUntil(s, (x) => x.player.health < MAX_HEALTH, 300);
  }

  it('a Wisp’s orb', () => {
    const s = arena();
    const e = stage(s, 'wisp', 0, 120);
    flyOn(s, e, 120);
  });

  it('a Sniper’s bolt', () => {
    const s = arena();
    const e = stage(s, 'sniper', 0, 150);
    flyOn(s, e, 200);
  });

  it('a bellows hound’s burning trail keeps burning with the hound off screen', () => {
    const s = arena();
    const e = stage(s, 'bellows-hound', 0, 150);
    runUntil(s, () => e.mode === 'recover', 120);
    const pool = s.floodPools.find((p) => p.ownerId === e.id);
    if (!pool) throw new Error('no trail');
    e.x = PLAYER_AT.x;
    e.y = PLAYER_AT.y + 400;
    e.frozen = 100_000;
    movePlayer(s, (pool.x0 + pool.x1) / 2, (pool.y0 + pool.y1) / 2);
    expect(inAggroBox(e, s.player)).toBe(false);
    s.player.health = MAX_HEALTH;
    runUntil(s, (x) => x.player.health < MAX_HEALTH, 130);
  });
});
