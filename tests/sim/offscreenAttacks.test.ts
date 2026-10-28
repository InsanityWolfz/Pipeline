import { describe, expect, it } from 'vitest';
import { FORUM_ARENA } from '../../src/data/arenas';
import { VIEW_HEIGHT } from '../../src/data/config';
import { enemyDef } from '../../src/data/enemies';
import { OVERWORLD_ROOM } from '../../src/data/overworld';
import { SANDBOX_ROOM } from '../../src/data/rooms';
import { mayStart } from '../../src/sim/aiCommon';
import { tileCentre } from '../../src/sim/tiles';
import { arena, movePlayer, PLAYER_AT, run } from './fight';
import { stage, watchHeld } from './offscreen';

// 073: an enemy starts an attack only while it is on screen (the aggro box round the player, in the player's room),
// unless it is inside a boss arena with the player (073.5). Held, it does what it does while its cooldown runs, its
// cooldown still ready, so it starts on the first tick it is back on screen (073.2). The leash grace stays.

const HALF_H = VIEW_HEIGHT / 2;

/**
 * The long-reach seven, each staged below the player just off screen and inside its reach, and how far the player
 * steps down to bring it on screen. `stays`: it holds where it is (not moving onto the screen by itself), so it leashes
 * after its grace.
 */
const LONG = [
  { id: 'charger', dy: 195, step: 40, stays: true },
  { id: 'bellows-hound', dy: 210, step: 50, stays: true },
  { id: 'kiln-tender', dy: 220, step: 60, stays: true },
  { id: 'storm-sentinel', dy: 240, step: 60, stays: true },
  { id: 'thunderhawk', dy: 220, step: 60, stays: false },
  { id: 'sniper', dy: 240, step: 80, stays: false },
] as const;

/** The tender's hurt packmate beside it, held still, so its beam has a target in reach. */
function withPatient(s: ReturnType<typeof arena>, id: string, dy: number): void {
  if (id !== 'kiln-tender') return;
  const m = stage(s, 'husk', 40, dy);
  m.frozen = 100_000;
  m.health = 1;
}

describe('the on-screen rule (073)', () => {
  it('lets an enemy start on screen in the player’s room, never off screen or in another room', () => {
    const s = arena();
    expect(mayStart(s, { x: PLAYER_AT.x, y: PLAYER_AT.y + HALF_H, roomId: OVERWORLD_ROOM })).toBe(true);
    expect(mayStart(s, { x: PLAYER_AT.x, y: PLAYER_AT.y + HALF_H + 1, roomId: OVERWORLD_ROOM })).toBe(false);
    expect(mayStart(s, { x: PLAYER_AT.x + 320, y: PLAYER_AT.y, roomId: OVERWORLD_ROOM })).toBe(true);
    expect(mayStart(s, { x: PLAYER_AT.x, y: PLAYER_AT.y, roomId: SANDBOX_ROOM })).toBe(false);
  });

  it('lets anything inside a boss arena start from anywhere in it while the player is inside too (073.5)', () => {
    const s = arena();
    const { inside } = FORUM_ARENA;
    const top = tileCentre({ tx: inside.x0 + 1, ty: inside.y0 + 1 });
    const bottom = tileCentre({ tx: inside.x1 - 1, ty: inside.y1 - 1 });
    expect(bottom.y - top.y).toBeGreaterThan(HALF_H);
    movePlayer(s, top.x, top.y);
    expect(mayStart(s, { ...bottom, roomId: OVERWORLD_ROOM })).toBe(true);
    // Outside the arena's walls it's the screen's rule, the player inside or not.
    const below = tileCentre({ tx: inside.x0 + 1, ty: inside.y1 + 3 });
    expect(mayStart(s, { ...below, roomId: OVERWORLD_ROOM })).toBe(false);
    // The player outside the arena: the enemy inside it follows the screen's rule.
    movePlayer(s, below.x, below.y);
    expect(mayStart(s, { ...top, roomId: OVERWORLD_ROOM })).toBe(false);
  });
});

describe('the long-reach enemies hold their attack off screen (073)', () => {
  it.each(LONG)('$id: just off screen in reach it starts nothing, its cooldown ready; stepped on screen, it starts next tick', ({ id, dy, step }) => {
    const s = arena();
    withPatient(s, id, dy);
    const e = stage(s, id, 0, dy);
    expect(watchHeld(s, e, 1)).toBe(0);
    expect(e.mode).not.toBe('windup');
    expect(e.cooldown).toBe(0);
    movePlayer(s, PLAYER_AT.x, PLAYER_AT.y + step);
    run(s, 1);
    expect(e.mode).toBe('windup');
  });

  it.each(LONG.filter((k) => k.stays))('$id: held off screen it starts nothing over its cooldown, and heads home after its grace', ({ id, dy }) => {
    const s = arena();
    withPatient(s, id, dy);
    const e = stage(s, id, 0, dy);
    const def = enemyDef(id);
    const grace = 'leashGraceTicks' in def ? def.leashGraceTicks : 0;
    expect(watchHeld(s, e, grace - 1)).toBe(0);
    expect(e.mode).toBe('chase');
    run(s, 1);
    expect(['return', 'idle']).toContain(e.mode);
    expect(watchHeld(s, e, 300)).toBe(0);
  });

  it.each(LONG.filter((k) => !k.stays))('$id: whatever it does while held, it never starts off screen', ({ id, dy }) => {
    const s = arena();
    const e = stage(s, id, 0, dy);
    watchHeld(s, e, 600);
  });

  it('the Sniper within its 320 px sight stays engaged off screen, holding its shot (073.6)', () => {
    const s = arena();
    const e = stage(s, 'sniper', 0, 240);
    // Pinned off screen (as if it kept its distance there): it never leashes and never fires.
    for (let t = 0; t < 400; t++) {
      e.x = PLAYER_AT.x;
      e.y = PLAYER_AT.y + 240;
      expect(watchHeld(s, e, 1)).toBe(0);
    }
    expect(['return', 'idle']).not.toContain(e.mode);
    expect(e.cooldown).toBe(0);
    expect(s.events.snipes.length + s.orbs.length).toBe(0);
  });

  it('the Burrower past its tunnelling time keeps tunnelling off screen, and locks once it comes on screen', () => {
    const s = arena();
    const e = stage(s, 'burrower', 0, 200);
    const def = enemyDef('burrower');
    if (def.kind !== 'burrower') throw new Error('not a burrower');
    e.underground = true;
    e.modeTicks = def.burrow.maxTunnelTicks;
    const y0 = e.y;
    expect(watchHeld(s, e, 1)).toBe(0);
    expect(e.y).toBeLessThan(y0);
    // It tunnels on toward the player and locks on the tick after it comes into view.
    let ticks = 0;
    while (e.mode !== 'windup' && ticks < 120) {
      expect(watchHeld(s, e, 1)).toBeLessThanOrEqual(1);
      ticks++;
    }
    expect(e.mode).toBe('windup');
    expect(Math.abs(e.y - s.player.y)).toBeLessThanOrEqual(HALF_H);
    expect(Math.abs(e.y - s.player.y)).toBeGreaterThan(HALF_H - (def.burrow.speed / 60) * 2);
  });

  it('the leash grace stays: a Charger pushed off screen mid-chase keeps chasing, starts nothing, and heads home at 60 ticks', () => {
    const s = arena();
    const e = stage(s, 'charger', 0, 120);
    e.cooldown = 30;
    run(s, 5);
    expect(e.mode).toBe('chase');
    // The player steps off: the Charger, now off screen within its reach, chases on through the grace.
    movePlayer(s, PLAYER_AT.x, PLAYER_AT.y - 90);
    const def = enemyDef('charger');
    const grace = 'leashGraceTicks' in def ? def.leashGraceTicks : 0;
    expect(grace).toBe(60);
    const from = e.y;
    for (let t = 1; t < grace; t++) {
      expect(watchHeld(s, e, 1)).toBe(0);
      expect(e.mode).toBe('chase');
    }
    expect(e.y).toBeLessThan(from);
    run(s, 1);
    expect(['return', 'idle']).toContain(e.mode);
  });
});
