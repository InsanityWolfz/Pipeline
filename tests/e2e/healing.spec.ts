import { expect, test } from '@playwright/test';
import { boot, watchErrors } from './helpers';

// Healing only in safe spots (030): a hurt player walks into the west Ley Spring,
// heals there with motes rising off them, and stops healing on stepping out.

test('a hurt player heals in the west spring and stops on stepping out', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page);
  const walk = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.setPlayerHealth(40);
    const spring = g.getState().springs.find((s) => s.id === 'west-spring');
    if (!spring) throw new Error('no west spring');
    // To open ground just east of the pool: the walk there heals nothing.
    h.walkTo((spring.tx + 3.5) * 32, (spring.ty + 0.5) * 32);
    const outside = g.getState();
    // West into the pool.
    let s = outside;
    for (let t = 0; t < 120 && !s.springs.find((x) => x.id === 'west-spring')?.inside; t++) s = g.step(1, { moveX: -1 });
    s = g.step(30);
    return { spring, outside, inPool: s };
  });
  expect(walk.outside.player.health).toBe(40);
  expect(walk.outside.player.healing).toBeNull();
  expect(walk.inPool.springs.find((s) => s.id === 'west-spring')?.inside).toBe(true);
  expect(walk.inPool.player.healing).toBe('spring');
  expect(walk.inPool.player.health).toBeGreaterThan(40);

  // Standing in the pool, the motes rise and the pool's light swells under the player.
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().healing))?.motes ?? 0).toBeGreaterThan(0);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().healing))?.poolGlow).toBe('west-spring');
  expect((await page.evaluate(() => window.__GAME__?.ui().healing))?.springs).toBe(3);

  const rising = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const before = g.getState().player.health;
    const after = g.step(60).player.health;
    return { before, after };
  });
  expect(rising.after - rising.before).toBe(10);

  const out = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    let s = g.getState();
    let stopped = false;
    for (let t = 0; t < 120 && s.springs.find((x) => x.id === 'west-spring')?.inside; t++) {
      s = g.step(1, { moveX: 1 });
      stopped ||= s.events.heals.some((e) => e.source === 'spring' && e.kind === 'stop');
    }
    s = g.step(1);
    const health = s.player.health;
    const later = g.step(120);
    return { stopped, healing: s.player.healing, health, later: later.player.health, inside: later.springs.some((x) => x.inside) };
  });
  expect(out.inside).toBe(false);
  expect(out.stopped).toBe(true);
  expect(out.healing).toBeNull();
  expect(out.later).toBe(out.health);
  expect(errors).toEqual([]);
});

test('the foundry fills a hurt player back to full', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  await boot(page);
  const r = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.setPlayerHealth(10);
    h.toFoundry();
    const arrived = g.getState();
    let s = arrived;
    for (let t = 0; t < 200 && s.player.health < 100; t++) s = g.step(1);
    return { arrivedHealing: arrived.player.healing, health: s.player.health, after: g.step(1).player.healing };
  });
  expect(r.arrivedHealing).toBe('foundry');
  expect(r.health).toBe(100);
  expect(r.after).toBeNull();
  expect(errors).toEqual([]);
});
