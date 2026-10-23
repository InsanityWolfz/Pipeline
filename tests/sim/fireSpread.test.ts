import { describe, expect, it } from 'vitest';
import { TICK_RATE } from '../../src/data/config';
import { FIRE } from '../../src/data/tags';
import { TALENT_START } from '../../src/data/talents';
import { damageEnemy } from '../../src/sim/enemies';
import { igniteEnemy } from '../../src/sim/fire';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { arena, fireAt, hold, placeHusk, PLAYER_AT, run, runUntil } from './fight';
import { FIRE_HIT, still } from './fireKit';
import { hall } from './hall';

// Fire (060), its spread and talents: a burning enemy that dies passes its burn to every living enemy within
// FIRE.spreadRadius, chaining as they die in turn; the Bombs lane's two Fire nodes lengthen the burn and widen the spread.

describe('spread on death', () => {
  it('a burning enemy that dies passes its burn, at its damage a second and for the full time, to every living enemy within 64 px', () => {
    const s = arena();
    const dying = still(s, PLAYER_AT.x + 200, PLAYER_AT.y, 30);
    const near = still(s, PLAYER_AT.x + 200 + 60, PLAYER_AT.y);
    const diagonal = still(s, PLAYER_AT.x + 200 - 40, PLAYER_AT.y + 40);
    const far = still(s, PLAYER_AT.x + 200, PLAYER_AT.y + 70);
    damageEnemy(s, dying, 20, 0, 0, FIRE_HIT);
    run(s, TICK_RATE);
    expect(dying.health).toBe(5);
    expect(near.burnTicks).toBe(0);
    run(s, TICK_RATE);
    expect(s.events.deaths.map((d) => d.id)).toEqual([dying.id]);
    expect([near.burnTicks, near.burnDps]).toEqual([FIRE.burnTicks, 5]);
    expect([diagonal.burnTicks, diagonal.burnDps]).toEqual([FIRE.burnTicks, 5]);
    expect(far.burnTicks).toBe(0);
    expect(s.events.spreads).toEqual([{ from: dying.id, to: [near.id, diagonal.id], x: dying.x, y: dying.y }]);
  });

  it('a catch keeps a stronger burn the enemy already has', () => {
    const s = arena();
    const dying = still(s, PLAYER_AT.x + 200, PLAYER_AT.y, 1);
    const near = still(s, PLAYER_AT.x + 240, PLAYER_AT.y);
    damageEnemy(s, near, 80, 0, 0, FIRE_HIT);
    run(s, 30);
    damageEnemy(s, dying, 20, 0, 0, FIRE_HIT);
    run(s, 1);
    expect([near.burnTicks, near.burnDps]).toEqual([FIRE.burnTicks, 20]);
  });

  it('chains: one that caught it and dies passes it on in turn', () => {
    const s = arena();
    const first = still(s, PLAYER_AT.x + 200, PLAYER_AT.y, 1);
    const second = still(s, PLAYER_AT.x + 250, PLAYER_AT.y, 6);
    const third = still(s, PLAYER_AT.x + 300, PLAYER_AT.y);
    damageEnemy(s, first, 20, 0, 0, FIRE_HIT);
    run(s, 1);
    expect(s.events.deaths.map((d) => d.id)).toEqual([first.id]);
    expect(second.burnDps).toBe(5);
    // The catch never reaches the third, 100 px from the first.
    expect(third.burnTicks).toBe(0);
    runUntil(s, () => s.events.deaths.some((d) => d.id === second.id), TICK_RATE * 2 + 1);
    expect([third.burnTicks, third.burnDps]).toEqual([FIRE.burnTicks, 5]);
  });

  it('a killing fire hit sets the enemy burning as it dies, so its burn spreads', () => {
    const s = arena();
    const dying = still(s, PLAYER_AT.x + 200, PLAYER_AT.y, 10);
    const near = still(s, PLAYER_AT.x + 230, PLAYER_AT.y);
    damageEnemy(s, dying, 20, 0, 0, FIRE_HIT);
    run(s, 1);
    expect(near.burnDps).toBe(5);
  });

  it('spreads only to its own room, and never to the dead', () => {
    const s = arena();
    const dying = still(s, PLAYER_AT.x + 200, PLAYER_AT.y, 1);
    const other = placeHusk(s, PLAYER_AT.x + 220, PLAYER_AT.y, 'foundry');
    damageEnemy(s, dying, 20, 0, 0, FIRE_HIT);
    run(s, 1);
    expect(other.burnTicks).toBe(0);
  });

  it('never catches on the Forgewright while it is plated (its body passes no Fire, 060.26); vented, it catches', () => {
    const go = (vent: number) => {
      const { s, f } = hall();
      run(s, 1);
      f.vent = vent;
      const dying = placeHusk(s, f.x + 40, f.y, f.roomId);
      dying.health = 1;
      damageEnemy(s, dying, 20, 0, 0, FIRE_HIT);
      run(s, 1);
      expect(s.events.deaths.map((d) => d.id), `vent ${vent}`).toContain(dying.id);
      return f.burnTicks > 0;
    };
    expect(go(0)).toBe(false);
    expect(go(100)).toBe(true);
  });

  it('igniteEnemy is the one rule a catch and a hit share', () => {
    const s = arena();
    const e = still(s, PLAYER_AT.x + 200, PLAYER_AT.y);
    igniteEnemy(s, e, 7);
    expect([e.burnTicks, e.burnDps]).toEqual([FIRE.burnTicks, 7]);
    igniteEnemy(s, e, 3);
    expect(e.burnDps).toBe(7);
  });

  it('is deterministic, and the summary shows a burn', () => {
    const go = () => {
      const s = arena();
      s.inventory = { 'bomb+fire': 20 };
      for (let i = 0; i < 6; i++) still(s, PLAYER_AT.x + 80 + i * 20, PLAYER_AT.y + (i % 2) * 16, 40);
      hold(s, 'bomb');
      run(s, 300, fireAt(PLAYER_AT.x + 120, PLAYER_AT.y));
      return JSON.stringify(summarize(s).enemies);
    };
    expect(go()).toBe(go());
    const s = arena();
    const e = still(s, PLAYER_AT.x + 200, PLAYER_AT.y);
    damageEnemy(s, e, 20, 0, 0, FIRE_HIT);
    expect(summarize(s).enemies[0]).toMatchObject({ burn: FIRE.burnTicks });
  });
});

describe('Fire’s two talents (060: the Bombs lane’s Fire nodes)', () => {
  const taking = (s: SimState, ...ids: string[]): SimState => {
    s.talents = [TALENT_START, ...ids];
    return s;
  };

  it('+50% duration: a burn lasts 270 ticks and deals its damage a second for 4.5 s', () => {
    const s = taking(arena(), 'b4');
    const e = still(s, PLAYER_AT.x + 200, PLAYER_AT.y);
    damageEnemy(s, e, 20, 0, 0, FIRE_HIT);
    expect(e.burnTicks).toBe(270);
    run(s, 270);
    expect(e.burnTicks).toBe(0);
    expect(e.health).toBe(10_000 - 20 - 5 * 4.5);
  });

  it('a tile further: a burn spreads to 96 px', () => {
    const go = (...talents: string[]) => {
      const s = taking(arena(), ...talents);
      const dying = still(s, PLAYER_AT.x + 200, PLAYER_AT.y, 1);
      const at90 = still(s, PLAYER_AT.x + 290, PLAYER_AT.y);
      const at100 = still(s, PLAYER_AT.x + 200, PLAYER_AT.y + 100);
      damageEnemy(s, dying, 20, 0, 0, FIRE_HIT);
      run(s, 1);
      return [at90.burnTicks > 0, at100.burnTicks > 0];
    };
    expect(go()).toEqual([false, false]);
    expect(go('b5')).toEqual([true, false]);
  });

  it('touch nothing else: a Fire bomb’s Burst keeps its radius, and Chill and Freeze keep their times', () => {
    const bursts = (...talents: string[]) => {
      const s = taking(arena(), ...talents);
      s.inventory = { 'bomb+fire': 2 };
      still(s, PLAYER_AT.x + 100, PLAYER_AT.y);
      hold(s, 'bomb');
      run(s, 1, fireAt(PLAYER_AT.x + 100, PLAYER_AT.y));
      runUntil(s, () => s.events.bursts.length > 0, 60);
      return s.events.bursts[0]?.radius;
    };
    expect(bursts('b4', 'b5')).toBe(bursts());
    const s = taking(arena(), 'b4', 'b5');
    const e = still(s, PLAYER_AT.x + 200, PLAYER_AT.y);
    damageEnemy(s, e, 1, 0, 0, { ...FIRE_HIT, damageType: 'cold' });
    expect(e.chillTicks).toBe(120);
    for (let i = 0; i < 3; i++) damageEnemy(s, e, 1, 0, 0, { ...FIRE_HIT, damageType: 'cold' });
    expect(e.frozen).toBe(90);
  });
});
