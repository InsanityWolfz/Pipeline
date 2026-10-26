import { expect, test } from '@playwright/test';
import { SHRINE_ARENA } from '../../src/data/arenas';
import { HOME_SHIFT } from '../../src/data/home';
import { boot, watchErrors } from './helpers';
import { enterArena } from './arenaHelpers';

// 059: rocks block only what they show (a player walks behind the meadow's boulders, through the top of their tiles),
// and the shrine's Wisps and Husks stay at their posts while the player waits outside its door, waking once E puts
// the player in.

const W = SHRINE_ARENA;

test("walks behind the meadow's boulders through the top of their tiles, and is stopped at their foot", async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  // The meadow's rocks (017): row 33 holds three boulders side by side (home tiles 69–71), open ground above.
  const row = 33 + HOME_SHIFT.dy;
  const x0 = 67 + HOME_SHIFT.dx;
  const r = await page.evaluate(
    ({ row, x0 }) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      for (const e of g.getState().enemies) if (e.enemyId !== 'forgewright' && e.enemyId !== 'conductor') g.setEnemyHealth(e.id, 0);
      g.step(1);
      h.walkTo((x0 + 0.5) * 32, (row - 0.5) * 32);
      // Down into the boulders' row on the open tile left of them, then east along the top of their tiles.
      let s = g.step(14, { moveY: 1 });
      const y = s.player.y;
      s = g.step(150, { moveX: 1 });
      const along = { x: s.player.x, y: s.player.y };
      // Back over a boulder and down: its footprint stops the feet inside its tile.
      h.walkTo((x0 + 3 + 0.5) * 32, (row - 0.5) * 32);
      s = g.step(60, { moveY: 1 });
      return { y, along, stopped: s.player.y };
    },
    { row, x0 },
  );
  expect(r.y).toBeGreaterThan(row * 32);
  expect(r.along.x).toBeGreaterThan((x0 + 6) * 32);
  // Still in the boulders' row, above their footprints.
  expect(r.along.y).toBeGreaterThan(row * 32);
  expect(r.along.y).toBeLessThan((row + 1) * 32 - 10);
  expect(r.stopped).toBeGreaterThan(row * 32);
  expect(r.stopped).toBeLessThan((row + 1) * 32 - 4);
  expect(errors).toEqual([]);
});

test("the shrine's guards wait at their posts while the player is outside its door, and wake once E puts the player in", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  const out = await page.evaluate((door) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(0);
    // Declared setup: the wanderers cleared, so only the shrine's own are tested.
    for (const e of g.getState().enemies) if (e.group.startsWith('pop-')) g.setEnemyHealth(e.id, 0);
    g.step(1);
    h.walkTo((41.5 + h.ox) * 32, g.getState().player.y);
    h.walkTo((door.tx + 0.5) * 32, (door.ty + 0.5) * 32);
    let s = g.getState();
    for (let t = 0; t < 300; t++) {
      s = g.step(1);
      g.setPlayerHealth(100);
    }
    return s.enemies.filter((e) => e.group === 'shrine').map((e) => ({ id: e.enemyId, mode: e.mode, off: Math.hypot(e.x - e.home.x, e.y - e.home.y) }));
  }, W.door.leaveTo);
  expect(out.length).toBe(6);
  for (const e of out) expect(e, e.id).toMatchObject({ mode: 'idle', off: 0 });

  await enterArena(page, W);
  const awake = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    let s = g.getState();
    for (let t = 0; t < 60; t++) {
      s = g.step(1);
      g.setPlayerHealth(100);
    }
    return s.enemies.filter((e) => e.group === 'shrine' && e.mode !== 'idle').length;
  });
  expect(awake).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
