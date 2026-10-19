import { describe, expect, it } from 'vitest';
import { ammoDef, lobAmmo, straightAmmo } from '../../src/data/ammo';
import { TICK_RATE } from '../../src/data/config';
import { FIRING_WALK_MULTIPLIER, HEALING, MAX_HEALTH } from '../../src/data/player';
import { OVERWORLD } from '../../src/data/overworld';
import { COLD, HOMING, STAR } from '../../src/data/tags';
import { MUZZLE_OFFSET } from '../../src/data/tube';
import { TALENT_START } from '../../src/data/talents';
import { chillEnemy } from '../../src/sim/cold';
import type { ArrowState } from '../../src/sim/arrows';
import { playerStats } from '../../src/sim/stats';
import type { SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { firingWalkScale } from '../../src/sim/tube';
import { arena, fireAt, HUSK, movePlayer, placeHusk, PLAYER_AT, run, runUntil } from './fight';

// Each minor talent (037) reaches playerStats, the one place stats are computed (036), or
// the 029 value it changes: damage and fire rate per ammo, freeze hits and length, blast
// radius, lob time, homing turn, star shards, the firing walk, and the survival stats.

/** A sim with these talents taken (the start included), as if their points were spent. */
const taking = (s: SimState, ...ids: string[]): SimState => {
  s.talents = [TALENT_START, ...ids];
  return s;
};

const FAR = { x: PLAYER_AT.x + 1000, y: PLAYER_AT.y };

/** The first round fired at FAR with `ammo` carried and selected. */
function firstShot(s: SimState, item: string, slot: string): ArrowState {
  s.inventory = { [item]: 5 };
  run(s, 1, { selectAmmo: slot });
  run(s, 1, fireAt(FAR.x, FAR.y));
  const a = s.arrows[0];
  if (!a) throw new Error('no shot');
  return a;
}

describe('playerStats with no talents', () => {
  it('is 029’s numbers', () => {
    const st = playerStats(arena());
    expect(st.firingWalk).toBe(FIRING_WALK_MULTIPLIER);
    expect(st.ammo).toEqual({
      damage: { arrow: 1, bomb: 1, 'ley-bolt': 1 },
      fireRate: { arrow: 0, bomb: 0, 'ley-bolt': 0 },
      freezeHits: COLD.stacksToFreeze,
      freezeTicks: COLD.freezeTicks,
      bossFreezeTicks: COLD.bossFreezeTicks,
      blastRadius: lobAmmo('bomb').burstRadius,
      lobTime: 1,
      homingTurn: HOMING.turnDegrees,
      starShards: STAR.shards,
    });
  });
});

describe('the lanes’ damage', () => {
  it('Fletcher’s Eye: arrows (frost arrows too) hit 10% harder', () => {
    expect(firstShot(taking(arena(), 'a1'), 'arrow', 'arrow').damage).toBeCloseTo(11, 9);
    expect(firstShot(taking(arena(), 'a1'), 'arrow+frost', 'arrow').damage).toBeCloseTo(11, 9);
    expect(firstShot(taking(arena(), 'a1'), 'ley-bolt', 'ley-bolt').damage).toBe(straightAmmo('ley-bolt').damage);
  });

  it('Hard Bore adds 6% to all ammo, added to a lane’s bonus', () => {
    expect(firstShot(taking(arena(), 'a1', 't3'), 'arrow', 'arrow').damage).toBeCloseTo(11.6, 9);
    expect(firstShot(taking(arena(), 'l1'), 'ley-bolt', 'ley-bolt').damage).toBeCloseTo(15.4, 9);
    expect(playerStats(taking(arena(), 't3')).ammo.damage).toEqual({ arrow: 1.06, bomb: 1.06, 'ley-bolt': 1.06 });
  });

  it('Black Powder: a bomb bursts for 10% more', () => {
    const s = taking(arena(), 'b1');
    s.inventory = { bomb: 3 };
    const e = placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    e.mode = 'windup';
    e.modeTicks = -10_000;
    run(s, 1, { selectAmmo: 'bomb' });
    run(s, 1, fireAt(e.x, e.y));
    runUntil(s, () => s.events.bursts.length > 0, 60);
    expect(e.health).toBeCloseTo(HUSK.maxHealth - 16.5, 9);
  });
});

describe('fire rate', () => {
  it('Quick Nock: a carried arrow’s interval is 15 / 1.1, rounded (14); with Oiled Breech 15 / 1.18 (13)', () => {
    const cooldown = (s: SimState) => {
      firstShot(s, 'arrow', 'arrow');
      return s.tube.fireCooldown;
    };
    expect(cooldown(arena())).toBe(ammoDef('arrow').fireTicks);
    expect(cooldown(taking(arena(), 'a2'))).toBe(14);
    expect(cooldown(taking(arena(), 'a2', 't1'))).toBe(13);
    // Oiled Breech alone reaches every ammo: a ley bolt's 20 ticks become 19, a bomb's 40 become 37.
    expect(cooldown(taking(arena(), 't1'))).toBe(14);
    const s = taking(arena(), 't1');
    s.inventory = { bomb: 2 };
    run(s, 1, { selectAmmo: 'bomb' });
    run(s, 1, fireAt(PLAYER_AT.x + 100, PLAYER_AT.y));
    expect(s.tube.fireCooldown).toBe(37);
  });

  it('paces each fed entrance by the same stat', () => {
    const s = taking(arena(), 'a2');
    s.link.attuned = true;
    const e = s.link.entrances[1];
    if (!e) throw new Error('no entrance');
    Object.assign(e, { open: true, ammoId: 'arrow', count: 10 });
    run(s, 1, fireAt(FAR.x, FAR.y));
    expect(s.events.entranceFires).toHaveLength(1);
    expect(e.cooldown).toBe(14);
  });
});

describe('the ammo behaviours (029)', () => {
  it('Rimecraft: frost freezes after 3 hits, not 4, for 0.5 s longer (a boss’s shorter freeze too)', () => {
    const s = taking(arena(), 'a3');
    const st = playerStats(s).ammo;
    expect([st.freezeHits, st.freezeTicks, st.bossFreezeTicks]).toEqual([COLD.stacksToFreeze - 1, COLD.freezeTicks + 30, COLD.bossFreezeTicks + 30]);
    const e = placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    chillEnemy(s, e);
    chillEnemy(s, e);
    expect(e.frozen).toBe(0);
    chillEnemy(s, e);
    expect(e.frozen).toBe(COLD.freezeTicks + 30);
    // Without it, the third hit only chills.
    const plain = arena();
    const h = placeHusk(plain, PLAYER_AT.x + 100, PLAYER_AT.y);
    for (let i = 0; i < 3; i++) chillEnemy(plain, h);
    expect(h.frozen).toBe(0);
  });

  it('Wide Casing: the blast reaches 55 px, not 48', () => {
    const s = taking(arena(), 'b2');
    expect(playerStats(s).ammo.blastRadius).toBe(55);
    s.inventory = { bomb: 2 };
    const near = placeHusk(s, PLAYER_AT.x + 100 + 52, PLAYER_AT.y);
    near.mode = 'windup';
    near.modeTicks = -10_000;
    run(s, 1, { selectAmmo: 'bomb' });
    run(s, 1, fireAt(PLAYER_AT.x + 100, PLAYER_AT.y));
    runUntil(s, () => s.events.bursts.length > 0, 60);
    expect(s.events.bursts[0]?.radius).toBe(55);
    expect(near.health).toBeLessThan(HUSK.maxHealth);
  });

  it('Short Fuse: a bomb lands a quarter sooner', () => {
    const flight = (s: SimState) => {
      s.inventory = { bomb: 2 };
      run(s, 1, { selectAmmo: 'bomb' });
      run(s, 1, fireAt(PLAYER_AT.x + 150, PLAYER_AT.y));
      return s.bombs[0]?.flightTicks ?? 0;
    };
    const distance = 150 - MUZZLE_OFFSET;
    expect(flight(arena())).toBe(Math.ceil(distance / (lobAmmo('bomb').speed / TICK_RATE)));
    expect(flight(taking(arena(), 'b3'))).toBe(Math.ceil((distance / (lobAmmo('bomb').speed / TICK_RATE)) * 0.75));
  });

  it('Seeker’s Lens: a homing bolt turns 30% sharper a tick', () => {
    const s = taking(arena(), 'l2');
    expect(playerStats(s).ammo.homingTurn).toBeCloseTo(HOMING.turnDegrees * 1.3, 9);
    s.inventory = { 'ley-bolt+homing': 5 };
    placeHusk(s, PLAYER_AT.x + 150, PLAYER_AT.y);
    run(s, 1, { selectAmmo: 'ley-bolt' });
    run(s, 1, fireAt(PLAYER_AT.x + 150, PLAYER_AT.y - 50));
    const bolt = s.arrows[0];
    if (!bolt) throw new Error('no bolt');
    const before = Math.atan2(bolt.dy, bolt.dx);
    run(s, 1);
    expect(((Math.atan2(bolt.dy, bolt.dx) - before) * 180) / Math.PI).toBeCloseTo(HOMING.turnDegrees * 1.3, 6);
  });

  it('Splinter: a star bolt bursts into 7 shards', () => {
    const s = taking(arena(), 'l3');
    s.inventory = { 'ley-bolt+star': 5 };
    placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    run(s, 1, { selectAmmo: 'ley-bolt' });
    run(s, 1, fireAt(FAR.x, FAR.y));
    runUntil(s, () => s.events.starBursts.length > 0, 60);
    expect(s.arrows.filter((a) => a.ammoId === STAR.projectile)).toHaveLength(7);
  });

  it('Steady Grip: the walk while firing is ×0.8, not ×0.7', () => {
    const s = taking(arena(), 't2');
    s.tube.firing = true;
    expect(firingWalkScale(s)).toBeCloseTo(0.8, 9);
    const plain = arena();
    plain.tube.firing = true;
    expect(firingWalkScale(plain)).toBe(FIRING_WALK_MULTIPLIER);
  });
});

describe('the Survival lane', () => {
  it('Tough Hide, Braced and Fleet reach max health, armor and move speed (Fleet past the gear’s cap)', () => {
    const st = playerStats(taking(arena(), 's1', 's3', 's4'));
    expect(st.maxHealth).toBe(MAX_HEALTH + 15);
    expect(st.armor).toBe(3);
    expect(st.moveBonus).toBeCloseTo(0.05, 9);
    expect(st.walkScale).toBeCloseTo(1.05, 9);
  });

  it('Mending is 0.5 HP/s of field regen (1 HP in 120 ticks), never added to a spring’s rate', () => {
    const s = taking(arena(), 's2');
    expect(playerStats(s).regen).toBe(0.5);
    s.player.health = 50;
    run(s, 120);
    expect(s.player.health).toBe(51);
    const spring = OVERWORLD.springs[0];
    if (!spring) throw new Error('no spring');
    const t = taking(arena(), 's2');
    const c = tileCentre(spring);
    movePlayer(t, c.x, c.y);
    t.player.health = 50;
    run(t, 60);
    expect(t.player.health).toBe(50 + HEALING.spring);
  });
});
