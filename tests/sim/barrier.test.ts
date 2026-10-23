import { describe, expect, it } from 'vitest';
import { HOLLOWS } from '../../src/data/hollows';
import { HOLLOWS_START, PLAYTEST_START } from '../../src/data/playtest';
import { SHRINE_SITE } from '../../src/data/rooms';
import { claim } from '../../src/sim/claims';
import { createEnemy } from '../../src/sim/enemies';
import { createSim } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { arena, die, fireAt, hold, movePlayer, run, runUntil } from './fight';

// Stonefall Hollows' ley barrier (034): it seals the Hollows (053.2: on the whole circle round Region 1) against
// the player, enemies and every projectile until the shrine's pylon is claimed, then is down for good. Tested where
// the road west to the Cistern Terrace crosses it, walking west along the crossing's row.

const ROW = HOLLOWS.crossing.ty;
/** The barrier's westward face on that row: its tile nearest Region 1. */
const GATE_X = Math.max(...HOLLOWS.gate.filter((t) => t.ty === ROW && t.tx < HOLLOWS.crossing.tx + 3).map((t) => t.tx));
/** Just outside the barrier, on the road, and just inside it. */
const OUTSIDE = tileCentre({ tx: GATE_X + 4, ty: ROW });
const INSIDE = tileCentre({ tx: GATE_X - 4, ty: ROW });

describe('the Hollows barrier', () => {
  it('is shut on every start, even with the tutorial gates open, until the shrine is claimed', () => {
    expect(createSim(1).gates.hollows).toBe(false);
    expect(createSim(1, { start: PLAYTEST_START }).gates.hollows).toBe(false);
    expect(summarize(createSim(1)).gates).toEqual({ foundry: true, shrine: true, hollows: false, emberworks: false });
  });

  it('blocks the player walking west into it', () => {
    const s = arena(undefined, OUTSIDE);
    run(s, 120, { moveX: -1 });
    expect(s.player.x).toBeGreaterThan((GATE_X + 1) * 32);
  });

  it('blocks enemies walking east out of it', () => {
    const s = arena(undefined, OUTSIDE);
    const e = createEnemy(s.nextEnemyId++, 'husk', INSIDE, s.roomId);
    s.enemies.push(e);
    run(s, 180);
    expect(e.x).toBeLessThan(GATE_X * 32);
  });

  it('stops arrows and bombs at its tiles', () => {
    const s = arena(undefined, OUTSIDE);
    run(s, 1, fireAt(0, OUTSIDE.y));
    let lastX = OUTSIDE.x;
    runUntil(s, () => {
      lastX = s.arrows[0]?.x ?? lastX;
      return s.arrows.length === 0;
    }, 60);
    expect(lastX).toBeGreaterThanOrEqual(GATE_X * 32);
    const b = arena(undefined, OUTSIDE);
    b.inventory = { bomb: 1 };
    hold(b, 'bomb');
    run(b, 1, fireAt(OUTSIDE.x - 150, OUTSIDE.y));
    runUntil(b, () => b.events.bursts.length > 0, 120);
    expect(b.events.bursts[0]?.x).toBeGreaterThanOrEqual(GATE_X * 32);
  });

  it('drops the tick the shrine is claimed, with its gate event, and lets everything through', () => {
    const s = arena(undefined, OUTSIDE);
    claim(s, SHRINE_SITE);
    run(s, 1);
    expect(s.gates.hollows).toBe(true);
    expect(s.events.gates).toEqual([{ gate: 'hollows' }]);
    run(s, 120, { moveX: -1 });
    expect(s.player.x).toBeLessThan((GATE_X - 1) * 32);
  });

  it('never comes back: a KO keeps it down, as claims are permanent', () => {
    const s = arena();
    claim(s, SHRINE_SITE);
    run(s, 1);
    die(s);
    run(s, 1);
    expect(s.gates.hollows).toBe(true);
    expect(s.events.gates).toEqual([]);
  });

  it('starts down on `?start=hollows`, with the player just inside the barrier and no gate event', () => {
    const s = createSim(1, { start: HOLLOWS_START });
    expect(s.gates.hollows).toBe(true);
    expect(s.claims).toEqual([SHRINE_SITE]);
    expect({ x: s.player.x, y: s.player.y }).toEqual(tileCentre(HOLLOWS.start));
    run(s, 1);
    expect(s.events.gates).toEqual([]);
    expect(summarize(s).area).toMatchObject({ ring: 3, region: 2 });
    movePlayer(s, OUTSIDE.x, OUTSIDE.y);
    run(s, 90, { moveX: -1 });
    expect(s.player.x).toBeLessThan(GATE_X * 32);
  });
});
