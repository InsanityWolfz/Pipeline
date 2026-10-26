import { describe, expect, it } from 'vitest';
import { THREAT_WINDUPS } from '../../src/data/threats';
import { enemyDef } from '../../src/data/enemies';
import { createEnemy, type EnemyMode, type EnemyState } from '../../src/sim/enemies';
import { viewRect } from '../../src/sim/population';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { offscreenThreats, threatening } from '../../src/sim/threats';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { arena, HALL, PLAYER_AT, runUntil } from './fight';

// 071: which enemies get an off-screen threat marker. An enemy whose feet are outside the camera's view (viewRect, 017's
// "on screen") and that is winding up an attack on the player: the Sniper's sight, the storm sentinel's call, the
// Wisp's charge, the thunderhawk's dive, the bellows hound's and the Charger's lanes, and the Bulwark's lob.

/** An enemy `dx`, `dy` px from the player, in `mode` (aggroed, so it doesn't sit idle). */
function place(s: SimState, enemyId: string, dx: number, dy: number, mode: EnemyMode = 'windup', roomId = HALL): EnemyState {
  const e = createEnemy(s.nextEnemyId++, enemyId, { x: s.player.x + dx, y: s.player.y + dy }, roomId);
  e.mode = mode;
  e.modeTicks = 1;
  s.enemies.push(e);
  return e;
}

/** Off screen to the north: the view reaches 176 px above the player's feet centre. */
const OFF_NORTH = -240;

const ids = (s: SimState) => offscreenThreats(s).map((t) => t.id);

describe('off-screen threats', () => {
  it('lists the kinds the spec names, by the mode that is their wind-up on the player', () => {
    expect(THREAT_WINDUPS).toEqual({ sniper: ['windup'], sentinel: ['windup'], caster: ['windup'], hawk: ['windup'], hound: ['windup'], charger: ['windup'], bulwark: ['lob'] });
  });

  it('counts each listed wind-up off screen', () => {
    const s = arena();
    const winding = ['sniper', 'storm-sentinel', 'wisp', 'thunderhawk', 'bellows-hound', 'charger'].map((id, i) => place(s, id, -300 + i * 120, OFF_NORTH));
    const lob = place(s, 'bulwark', 0, -300, 'lob');
    expect(ids(s)).toEqual([...winding.map((e) => e.id), lob.id]);
  });

  it('skips an enemy on screen, one winding up nothing at the player, and one not winding up', () => {
    const s = arena();
    place(s, 'sniper', 120, 0);
    place(s, 'husk', 0, OFF_NORTH);
    place(s, 'kiln-tender', 40, OFF_NORTH);
    place(s, 'sniper', 80, OFF_NORTH, 'chase');
    place(s, 'sniper', 120, OFF_NORTH, 'peek');
    place(s, 'sniper', 160, OFF_NORTH, 'swipe');
    // The Bulwark's pound winds up in `windup`, its lob in `lob`; its bombs already thrown (`throw`) aren't a wind-up.
    place(s, 'bulwark', 200, OFF_NORTH, 'windup');
    place(s, 'bulwark', 240, OFF_NORTH, 'throw');
    expect(ids(s)).toEqual([]);
  });

  it('uses the camera view the sim knows (clamped to the room), by the feet', () => {
    const s = arena();
    const v = viewRect(s);
    const inside = place(s, 'sniper', 0, 0);
    inside.y = v.y0 + 1;
    const outside = place(s, 'sniper', 0, 0);
    outside.y = v.y0 - 1;
    const east = place(s, 'charger', 0, 0);
    east.x = v.x1 + 1;
    expect(ids(s)).toEqual([outside.id, east.id]);
  });

  it('skips enemies in another room, and every one while the player is down', () => {
    const s = arena();
    place(s, 'sniper', 0, OFF_NORTH, 'windup', FOUNDRY_ROOM);
    const here = place(s, 'sniper', 0, OFF_NORTH);
    expect(ids(s)).toEqual([here.id]);
    s.player.dying = 10;
    expect(ids(s)).toEqual([]);
  });

  it('takes a list to look through (render passes the room on screen), and gives each threat its point', () => {
    const s = arena();
    const a = place(s, 'sniper', 50, OFF_NORTH);
    const b = place(s, 'wisp', -50, OFF_NORTH);
    expect(offscreenThreats(s, [b])).toEqual([{ id: b.id, enemyId: 'wisp', x: b.x, y: b.y }]);
    expect(threatening(a, enemyDef('sniper'))).toBe(true);
    expect(threatening(b, enemyDef('wisp'))).toBe(true);
  });

  it("a live Sniper painting the player from off screen is a threat until it fires; the summary lists it", () => {
    const s = arena();
    const e = createEnemy(s.nextEnemyId++, 'sniper', { x: PLAYER_AT.x + 200, y: PLAYER_AT.y - 200 }, HALL);
    s.enemies.push(e);
    runUntil(s, () => e.mode === 'windup', 120);
    expect(e.y).toBeLessThan(viewRect(s).y0);
    expect(summarize(s).threats).toEqual([{ id: e.id, enemyId: 'sniper', x: Math.round(e.x * 100) / 100, y: Math.round(e.y * 100) / 100 }]);
    runUntil(s, () => e.mode !== 'windup', 200);
    expect(summarize(s).threats).toEqual([]);
  });
});
