import { describe, expect, it } from 'vitest';
import { MIN_DAMAGE_SHARE, MOVE_BONUS_CAP, ROLL_COOLDOWN_MIN, SLOT_BASE } from '../../src/data/gear';
import { FIRING_WALK_MULTIPLIER, HEALING, INVULN_TICKS, MAX_HEALTH, ROLL_COOLDOWN_TICKS, ROLL_DISTANCE, ROLL_TICKS } from '../../src/data/player';
import { OVERWORLD } from '../../src/data/overworld';
import { afterArmor, playerStats, walkScale } from '../../src/sim/stats';
import type { Command } from '../../src/sim/input';
import type { SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { arena, fireAt, HUSK, movePlayer, placeHusk, PLAYER_AT, run, runUntilKo, SWIPE_LANDS } from './fight';
import { bodyPiece, piece, standAtBench, wear } from '../fixtures/gear';

// Every gear effect goes through playerStats (036): armor, max health, field regen, move speed, roll.

const AHEAD = { x: PLAYER_AT.x + 400, y: PLAYER_AT.y };

/** Distance walked right over `ticks`, after a run-up that reaches top speed. */
function walked(s: SimState, ticks: number, fire = false): number {
  const c: Partial<Command> = { moveX: 1, ...(fire ? fireAt(AHEAD.x, AHEAD.y) : {}) };
  run(s, 10, c);
  const x = s.player.x;
  run(s, ticks, c);
  return s.player.x - x;
}

/** Distance one roll right covers, and the cooldown left on the tick after it ends (its first tick already counted down). */
function rolled(s: SimState): { distance: number; cooldown: number } {
  const x = s.player.x;
  run(s, 1, { moveX: 1, dodge: true });
  run(s, ROLL_TICKS - 1);
  const distance = s.player.x - x;
  run(s, 1);
  return { distance, cooldown: s.player.cooldown };
}

describe('playerStats', () => {
  it('with nothing worn is the bare numbers (037: the firing walk too; 039: the ammo’s own numbers come from resolveStat)', () => {
    expect(playerStats(arena())).toEqual({
      armor: 0,
      maxHealth: MAX_HEALTH,
      regen: HEALING.fieldRegen,
      moveBonus: 0,
      walkScale: 1,
      rollCooldown: ROLL_COOLDOWN_TICKS,
      rollDistance: ROLL_DISTANCE,
      firingWalk: FIRING_WALK_MULTIPLIER,
    });
  });

  it('sums armor, max health, regen, move speed and roll from every worn piece', () => {
    const s = wear(
      arena(),
      piece(0, 'helm', { baseArmor: 2, affixes: [{ kind: 'max-health', value: 12 }, { kind: 'regen', value: 0.3 }] }),
      piece(1, 'body', { baseArmor: 6, affixes: [{ kind: 'armor', value: 2 }, { kind: 'move-speed', value: 0.04 }] }),
      piece(2, 'boots', { baseArmor: 1, affixes: [{ kind: 'roll-cooldown', value: 4 }, { kind: 'roll-distance', value: 12 }, { kind: 'move-speed', value: 0.05 }] }),
      piece(3, 'trinket', { affixes: [{ kind: 'max-health', value: 8 }, { kind: 'regen', value: 0.5 }] }),
    );
    const st = playerStats(s);
    expect(st.armor).toBe(11);
    expect(st.maxHealth).toBe(MAX_HEALTH + 20);
    expect(st.regen).toBeCloseTo(0.8, 9);
    expect(st.moveBonus).toBeCloseTo(0.09, 9);
    expect(st.walkScale).toBeCloseTo(1.09, 9);
    expect(st.rollCooldown).toBe(ROLL_COOLDOWN_TICKS - 4);
    expect(st.rollDistance).toBe(ROLL_DISTANCE + 12);
    // A spare that isn't worn counts for nothing.
    s.gear.push(piece(9, 'helm', { baseArmor: 2, affixes: [{ kind: 'armor', value: 3 }] }));
    expect(playerStats(s).armor).toBe(11);
  });

  it('caps the move bonus at +15% and floors the roll cooldown at 15 ticks', () => {
    const fast = (id: number, slot: 'helm' | 'body' | 'boots' | 'trinket') =>
      piece(id, slot, { affixes: [{ kind: 'move-speed', value: 0.06 }, { kind: 'roll-cooldown', value: 6 }] });
    const s = wear(arena(), fast(0, 'helm'), fast(1, 'body'), fast(2, 'boots'), fast(3, 'trinket'));
    expect(playerStats(s).moveBonus).toBe(MOVE_BONUS_CAP);
    expect(playerStats(s).walkScale).toBeCloseTo(1 + MOVE_BONUS_CAP, 9);
    expect(playerStats(s).rollCooldown).toBe(ROLL_COOLDOWN_MIN);
  });
});

describe('armor', () => {
  it('takes total armor off a hit, never below 25% of it rounded up', () => {
    expect(MIN_DAMAGE_SHARE).toBe(0.25);
    expect(afterArmor(wear(arena(), bodyPiece(0, 'light', 6)), 20)).toBe(14);
    expect(afterArmor(wear(arena(), bodyPiece(0, 'heavy', 12)), 20)).toBe(8);
    // A heavy body plus four armor affixes still takes 5 from a Husk's 20.
    const armored = (id: number, slot: 'helm' | 'body' | 'boots' | 'trinket', baseArmor: number) =>
      piece(id, slot, { baseArmor, weight: 'heavy', affixes: [{ kind: 'armor', value: 3 }] });
    const tank = wear(arena(), armored(0, 'body', SLOT_BASE.body.heavy.max), armored(1, 'helm', 2), armored(2, 'boots', 2), armored(3, 'trinket', 0));
    expect(playerStats(tank).armor).toBe(29);
    expect(afterArmor(tank, 20)).toBe(5);
    // A Wisp's 12 rounds its floor up; a hit of 0 stays 0.
    expect(afterArmor(tank, 12)).toBe(3);
    expect(afterArmor(tank, 0)).toBe(0);
    expect(afterArmor(arena(), 20)).toBe(20);
  });

  it('a Husk swipe on a light body lands for 14', () => {
    const s = wear(arena(), bodyPiece(0, 'light', 6));
    placeHusk(s, PLAYER_AT.x + 20, PLAYER_AT.y);
    run(s, SWIPE_LANDS);
    expect(s.player.health).toBe(MAX_HEALTH - (HUSK.swipe.damage - 6));
  });
});

describe('max health', () => {
  const vigor = (id: number, value: number) => piece(id, 'helm', { affixes: [{ kind: 'max-health', value }] });

  it('equipping doesn’t heal, a lower max clamps health, and taking it off keeps health within the max', () => {
    const s = standAtBench(arena());
    s.gear = [vigor(0, 20), vigor(1, 8)];
    s.nextGearId = 2;
    run(s, 1, { equip: { id: 0 } });
    expect(playerStats(s).maxHealth).toBe(120);
    expect(s.player.health).toBe(100);
    s.player.health = 118;
    run(s, 1, { equip: { id: 1 } });
    expect(playerStats(s).maxHealth).toBe(108);
    expect(s.player.health).toBe(108);
    run(s, 1, { equip: { slot: 'helm', id: null } });
    expect(s.player.health).toBe(MAX_HEALTH);
  });

  it('the foundry heals up to the full max, and a KO wakes at it', () => {
    const s = standAtBench(arena());
    wear(s, vigor(0, 20));
    s.player.health = 90;
    run(s, 60);
    expect(s.player.health).toBe(120);
    const k = wear(arena(), vigor(0, 20));
    k.player.health = 0;
    runUntilKo(k);
    expect(k.player.health).toBe(120);
  });
});

describe('field regen', () => {
  const mend = (value: number) => piece(0, 'trinket', { affixes: [{ kind: 'regen', value }] });

  it('heals anywhere, building up fractions: 0.5 HP/s is 1 HP in 120 ticks, 0.3 HP/s 1 HP in 200', () => {
    const s = wear(arena(), mend(0.5));
    s.player.health = 50;
    run(s, 119);
    expect(s.player.health).toBe(50);
    expect(s.player.healing).toBe('regen');
    run(s, 1);
    expect(s.player.health).toBe(51);
    const t = wear(arena(), mend(0.3));
    t.player.health = 50;
    run(t, 199);
    expect(t.player.health).toBe(50);
    run(t, 1);
    expect(t.player.health).toBe(51);
    run(t, 600);
    expect(t.player.health).toBe(54);
  });

  it('stops while dying', () => {
    const s = wear(arena(), mend(0.8));
    s.player.health = 0;
    run(s, 1);
    expect(s.player.dying).toBeGreaterThan(0);
    run(s, 30);
    expect(s.player.health).toBe(0);
    expect(s.player.healing).toBeNull();
  });

  it('doesn’t add to a spring’s rate: the highest wins (030)', () => {
    const spring = OVERWORLD.springs[0];
    if (!spring) throw new Error('no spring');
    const s = wear(arena(), mend(0.8));
    const c = tileCentre(spring);
    movePlayer(s, c.x, c.y);
    s.player.health = 50;
    run(s, 60);
    expect(s.player.health).toBe(50 + HEALING.spring);
    expect(s.player.healing).toBe('spring');
  });

  it('doesn’t pause after a hit', () => {
    const s = wear(arena(), mend(0.5));
    s.player.health = 50;
    placeHusk(s, PLAYER_AT.x + 20, PLAYER_AT.y);
    run(s, SWIPE_LANDS);
    expect(s.player.health).toBe(30);
    s.enemies = [];
    run(s, 120);
    expect(s.player.health).toBe(31);
  });
});

describe('move speed and the roll', () => {
  it('heavy armor and gear speed stack with firing by multiplying', () => {
    const plain = walked(arena(), 30);
    const heavy = () => wear(arena(), bodyPiece(0, 'heavy', 11, { kind: 'move-speed', value: 0.06 }));
    expect(walkScale(heavy())).toBeCloseTo(SLOT_BASE.body.heavy.walkScale * 1.06, 9);
    expect(walked(heavy(), 30)).toBeCloseTo(plain * SLOT_BASE.body.heavy.walkScale * 1.06, 0);
    expect(walked(heavy(), 30, true)).toBeCloseTo(plain * SLOT_BASE.body.heavy.walkScale * 1.06 * FIRING_WALK_MULTIPLIER, 0);
    const light = wear(arena(), bodyPiece(0, 'light', 6, { kind: 'move-speed', value: 0.05 }));
    expect(walked(light, 30)).toBeCloseTo(plain * 1.05, 0);
  });

  it('roll distance and cooldown change; the roll’s length and i-frames don’t', () => {
    const bare = rolled(arena());
    expect(bare.distance).toBeCloseTo(ROLL_DISTANCE, 5);
    // Heavy armor slows the walk, never the roll (010).
    expect(rolled(wear(arena(), bodyPiece(0, 'heavy', 12))).distance).toBeCloseTo(ROLL_DISTANCE, 5);
    expect(bare.cooldown).toBe(ROLL_COOLDOWN_TICKS - 1);
    const nimble = () =>
      wear(arena(), piece(0, 'boots', { affixes: [{ kind: 'roll-distance', value: 16 }, { kind: 'roll-cooldown', value: 6 }] }), piece(1, 'body', { affixes: [{ kind: 'move-speed', value: 0.06 }] }));
    const r = rolled(nimble());
    expect(r.distance).toBeCloseTo(ROLL_DISTANCE + 16, 5);
    expect(r.cooldown).toBe(bare.cooldown - 6);
    // The same ROLL_TICKS of roll, the first INVULN_TICKS of them invulnerable; rolls ignore move speed.
    const s = nimble();
    run(s, 1, { moveX: 1, dodge: true });
    let ticks = 1;
    let invulnerable = 1;
    while (s.player.rollTick > 0 && ticks < 100) {
      run(s, 1);
      if (s.player.rollTick > 0) {
        ticks += 1;
        if (s.player.rollTick <= INVULN_TICKS) invulnerable += 1;
      }
    }
    expect(ticks).toBe(ROLL_TICKS);
    expect(invulnerable).toBe(INVULN_TICKS);
  });
});
