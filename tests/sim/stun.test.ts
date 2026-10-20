import { describe, expect, it } from 'vitest';
import { CHARGER } from '../../src/data/hollowsEnemies';
import { ROLLBREAKER } from '../../src/data/relics';
import { createEnemy } from '../../src/sim/enemies';
import { applyStun } from '../../src/sim/stun';
import { summarize } from '../../src/sim/summary';
import { arena, HALL, placeHusk, PLAYER_AT, run } from './fight';

// Stun (039, round 3): one status, applied by Rollbreaker (its own 40 ticks) and the
// Charger's wall daze (its own 60, 039.6). It can't move or act, a wind-up is cancelled,
// and never a Boss or Burrowed enemy. The relic and the wall keep their tests in
// relics.test.ts and charger.test.ts; this file checks the status they share.

describe('Stun', () => {
  it('holds an enemy for its ticks, a wind-up cancelled, then it chases; with a stuns event and getState’s stunned', () => {
    const s = arena();
    const husk = placeHusk(s, PLAYER_AT.x + 20, PLAYER_AT.y);
    run(s, 2);
    expect(husk.mode).toBe('windup');
    expect(applyStun(s, husk, ROLLBREAKER.stunTicks)).toBe(true);
    expect(s.events.stuns).toEqual([{ id: husk.id, x: husk.x, y: husk.y }]);
    expect(husk).toMatchObject({ mode: 'recover', stunned: ROLLBREAKER.stunTicks });
    expect(summarize(s).enemies.find((e) => e.id === husk.id)?.stunned).toBe(ROLLBREAKER.stunTicks);
    run(s, ROLLBREAKER.stunTicks - 1);
    expect(husk.mode).toBe('recover');
    run(s, 1);
    expect(husk).toMatchObject({ mode: 'chase', stunned: 0 });
  });

  it('never a Boss, nor an enemy underground', () => {
    const s = arena();
    const warden = createEnemy(s.nextEnemyId++, 'pylon-warden', { x: PLAYER_AT.x + 40, y: PLAYER_AT.y }, HALL);
    const burrower = createEnemy(s.nextEnemyId++, 'burrower', { x: PLAYER_AT.x + 80, y: PLAYER_AT.y }, HALL);
    burrower.underground = true;
    s.enemies.push(warden, burrower);
    expect(applyStun(s, warden, 40)).toBe(false);
    expect(applyStun(s, burrower, 40)).toBe(false);
    expect([warden.stunned, burrower.stunned]).toEqual([0, 0]);
    expect(s.events.stuns).toEqual([]);
  });

  it('the Charger’s wall daze is the same status for its own 60 ticks, in its stun pose; a shorter Stun never cuts it short', () => {
    const s = arena();
    const c = createEnemy(s.nextEnemyId++, 'charger', { x: PLAYER_AT.x + 40, y: PLAYER_AT.y }, HALL);
    s.enemies.push(c);
    applyStun(s, c, CHARGER.charge.stunTicks, 'stun');
    expect(c).toMatchObject({ mode: 'stun', modeTicks: 1, stunned: CHARGER.charge.stunTicks, dazed: true });
    // A roll's Stun on top holds for what the daze has left: all but its last tick, which is a thinking one (pre-039 timing).
    applyStun(s, c, ROLLBREAKER.stunTicks);
    expect(c).toMatchObject({ mode: 'stun', stunned: CHARGER.charge.stunTicks - 1, dazed: false });
  });
});
