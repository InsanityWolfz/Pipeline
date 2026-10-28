import { expect, test } from '@playwright/test';
import { VIEW_HEIGHT } from '../../src/data/config';
import { OVERWORLD } from '../../src/data/overworld';
import { boot, watchErrors } from './helpers';

// 073: an enemy starts an attack only while it is on screen. In the field, a Sniper just off screen below the player
// (240 px, a clear line, its cooldown ready and its 320 px sight on them) holds its shot; the player steps toward it
// until it is on screen, and it winds up and fires. Every check reads the sim's state.

/** The meadow's open ground (the sim tests' PLAYER_AT): open for 300 px below, clear to feet and shots. */
const FIELD = { x: (OVERWORLD.field.tx + 0.5) * 32, y: (OVERWORLD.field.ty + 0.5) * 32 };
const BELOW = 240;
const HALF_H = VIEW_HEIGHT / 2;

test('a Sniper just off screen holds its shot until the player brings it on screen', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = watchErrors(page);
  await boot(page, '?start=field');
  const id = await page.evaluate(
    ([at, below]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      for (const e of g.getState().enemies) g.setEnemyHealth(e.id, 0);
      g.step(1);
      h.walkTo(at.x, at.y);
      g.setPlayerHealth(100);
      const p = g.getState().player;
      const s = g.spawnEnemy('sniper', p.x, p.y + below);
      return s.enemies[s.enemies.length - 1]?.id ?? -1;
    },
    [FIELD, BELOW] as const,
  );
  // Off screen through more than a whole cooldown: awake, its cooldown ready, it never winds up and fires no bolt.
  const held = await page.evaluate(
    ([eid, half]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      let heldTicks = 0;
      let offStarts = 0;
      let bolts = 0;
      for (let t = 0; t < 300; t++) {
        const s = g.step(1);
        g.setPlayerHealth(100);
        const e = s.enemies.find((x) => x.id === eid);
        if (!e) break;
        const off = Math.abs(e.y - s.player.y) > half;
        if (off && e.mode === 'windup') offStarts += 1;
        if (off && e.mode !== 'idle' && e.mode !== 'return') heldTicks += 1;
        bolts += s.events.snipes.length;
      }
      return { heldTicks, offStarts, bolts };
    },
    [id, HALF_H] as const,
  );
  expect(held.heldTicks).toBeGreaterThan(240);
  expect(held).toMatchObject({ offStarts: 0, bolts: 0 });
  // The player steps down toward it until it's on screen: it winds up, then fires.
  const fired = await page.evaluate(
    ([eid, half]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const sniper = () => g.getState().enemies.find((x) => x.id === eid);
      for (let t = 0; t < 240; t++) {
        const e = sniper();
        if (!e || Math.abs(e.y - g.getState().player.y) <= half) break;
        g.step(1, { moveY: 1 });
        g.setPlayerHealth(100);
      }
      let toWindup = -1;
      for (let t = 1; t <= 30 && toWindup < 0; t++) {
        g.step(1);
        g.setPlayerHealth(100);
        if (sniper()?.mode === 'windup') toWindup = t;
      }
      let snipes = 0;
      for (let t = 0; t < 120 && snipes === 0; t++) {
        snipes += g.step(1).events.snipes.length;
        g.setPlayerHealth(100);
      }
      return { toWindup, snipes };
    },
    [id, HALF_H] as const,
  );
  expect(fired.toWindup).toBeGreaterThan(0);
  expect(fired.snipes).toBe(1);
  expect(errors).toEqual([]);
});
