import { expect, test, type Page } from '@playwright/test';
import { REGION_1_X } from '../../src/data/hollows';
import { CACHE_BURST, LANDMARKS } from '../../src/data/landmarks';
import { boot, watchErrors } from './helpers';

// The readability fixes (045): a Ruined Cache's loot bursts out as named icons, then flies
// to the player; [later slices add the E prompts and the build strip].

const CACHE = { tx: 11 + REGION_1_X, ty: 38 };
const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

/** Walks to the Ruined Cache, its guards gone, and opens it with a held E. Returns the ids of the items it gave. */
export async function openCache(page: Page): Promise<number[]> {
  return page.evaluate(
    ([tx, ty, ticks]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      for (const e of g.getState().enemies.filter((x) => x.group === 'ruined-cache')) g.setEnemyHealth(e.id, 0);
      g.step(1);
      h.walkTo((12.5 + h.ox) * 32, 30.5 * 32);
      h.walkTo((tx + 0.5) * 32, (ty + 1.5) * 32);
      const before = new Set(g.step(1, { interact: true }).groundItems.map((i) => i.id));
      return g
        .step(ticks - 1)
        .groundItems.filter((i) => !before.has(i.id))
        .map((i) => i.id);
    },
    [CACHE.tx, CACHE.ty, LANDMARKS.cacheOpenTicks] as const,
  );
}

test('a cache bursts its items out as named icons, then each flies to the player and the feed lists them', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = watchErrors(page);
  await boot(page);
  const gave = await openCache(page);
  expect(gave.length).toBeGreaterThanOrEqual(3);
  // Partway through: the first item is out, flying or landed, with its name over it; nothing is picked up yet.
  await page.evaluate((n) => window.__GAME__?.step(n), CACHE_BURST.flightTicks);
  await expect.poll(async () => (await ui(page))?.groundItems.filter((g) => g.name !== null && g.visible).length).toBeGreaterThan(0);
  const named = (await ui(page))?.groundItems.filter((g) => g.name !== null) ?? [];
  for (const g of named) expect(g.name?.length).toBeGreaterThan(0);
  // Then they come to the player: nothing left on the ground, every one carried, the feed listing them.
  const picked = await page.evaluate((ids) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const out: number[] = [];
    let s = g.step(1);
    for (let t = 0; t < 400 && s.groundItems.some((i) => ids.includes(i.id)); t++) {
      out.push(...s.events.pickups.map((p) => p.id));
      s = g.step(1);
    }
    out.push(...s.events.pickups.map((p) => p.id));
    return { left: s.groundItems.filter((i) => ids.includes(i.id)).length, ids: out.filter((id) => ids.includes(id)) };
  }, gave);
  expect(picked.left).toBe(0);
  expect(picked.ids.sort()).toEqual([...gave].sort());
  await expect.poll(async () => (await ui(page))?.pickupFeed.reduce((n, l) => n + l.count, 0)).toBeGreaterThanOrEqual(gave.length);
  expect(errors).toEqual([]);
});
