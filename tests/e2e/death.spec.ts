import { expect, test } from '@playwright/test';
import { boot, watchErrors } from './helpers';

// Death (011): gather wood, stand in the Husk pack until KO'd, and wake in the
// foundry without the unbanked wood but with the banked arrows.

/** The meadow's first tree (node index). */
const TREE = 0;

test('a death keeps the banked arrows and loses the unbanked wood', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page);
  const result = await page.evaluate((tree) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(0);
    h.harvest(tree, 2);
    const wood = g.getState().inventory.wood ?? 0;
    // Over to the pack by path (018: the tree stands in a grove), into it, and stand there until the death plays out.
    const first = g.getState().enemies.find((e) => e.group === 'field');
    if (first) h.walkTo(first.x, first.y + 96);
    let s = g.getState();
    let died = false;
    for (let t = 0; t < 4000 && !s.events.ko; t++) {
      const p = s.player;
      const husk = s.enemies.filter((e) => e.room === s.room)[0];
      const toward = (from: number, to: number): -1 | 0 | 1 => (Math.abs(to - from) < 2 ? 0 : to > from ? 1 : -1);
      const close = husk ? Math.hypot(husk.x - p.x, husk.y - p.y) < 20 : true;
      s = g.step(1, { moveX: husk && !close ? toward(p.x, husk.x) : 0, moveY: husk && !close ? toward(p.y, husk.y) : 0 });
      died ||= s.player.dying > 0;
    }
    return { wood, died, ko: s.events.ko, room: s.room, inventory: s.inventory, lost: s.events.lost, health: s.player.health };
  }, TREE);
  expect(result.wood).toBeGreaterThan(0);
  expect(result.died).toBe(true);
  expect(result.ko).toBe(true);
  expect(result.room).toBe('foundry');
  expect(result.health).toBe(100);
  expect(result.inventory.wood ?? 0).toBe(0);
  expect(result.inventory.arrow).toBe(30);
  expect(result.lost.wood).toBe(result.wood);
  expect(errors).toEqual([]);
});
