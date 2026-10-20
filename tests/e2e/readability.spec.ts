import { expect, test, type Page } from '@playwright/test';
import { CACHE_BURST } from '../../src/data/landmarks';
import { atLeyVein, openCache } from './readabilityPage';
import { boot, watchErrors } from './helpers';
import { intoForum } from './hollowsSandbox';
import { enterFoundry } from './foundryPage';
import { DEFAULT_BINDINGS, SETTINGS_VERSION } from '../../src/data/settings';
import { STORAGE_KEYS } from '../../src/data/save';

// The readability fixes (045): a Ruined Cache's loot bursts out as named icons, then flies
// to the player; an E prompt shows over a ley crystal vein and over the Bulwark's sealed door
// in reach; the build strip shows in build mode only, with the bound keys.

const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

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

test('a ley crystal vein in reach shows the E prompt, as other nodes do', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = watchErrors(page);
  await boot(page, '?start=field');
  await page.evaluate(() => window.__GAME__?.completeObjectives(2));
  const vein = await atLeyVein(page);
  // Past the gathering goal (whose own prompt shows E over the nearest node), the in-reach prompt is the only E.
  await expect.poll(async () => (await ui(page))?.interactPrompt).toEqual({ kind: 'node', key: 'E', x: vein.x, y: vein.y });
  expect((await ui(page))?.prompt?.key ?? null).not.toBe('E');
  // Walking off, the in-reach prompt goes.
  await page.evaluate(() => window.__GAME__?.step(40, { moveX: -1 }));
  await expect.poll(async () => (await ui(page))?.interactPrompt).toBeNull();
  expect(errors).toEqual([]);
});

test("the Bulwark's sealed door shows the E prompt in reach, and the seal hums until it drops", async ({ page }) => {
  test.setTimeout(150_000);
  const errors = watchErrors(page);
  await intoForum(page);
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let t = 0; t < 60; t++) {
      g.step(1, { moveY: -1 });
      g.setPlayerHealth(100);
    }
  });
  await expect.poll(async () => (await ui(page))?.interactPrompt?.kind).toBe('arena-seal');
  await expect.poll(async () => (await ui(page))?.sealSound.humming).toBe(true);
  await page.evaluate(() => window.__GAME__?.step(1, { interact: true }));
  await expect.poll(async () => (await ui(page))?.interactPrompt?.kind ?? null).not.toBe('arena-seal');
  await expect.poll(async () => (await ui(page))?.sealSound.humming).toBe(false);
  await expect.poll(async () => (await ui(page))?.sealSound.drops).toBe(1);
  expect(errors).toEqual([]);
});

test('the build strip shows only in build mode, with the bound keys, clear of the HP block and under the tube slot', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = watchErrors(page);
  // 042: the player rebound rotate to Q and build to V.
  await page.addInitScript(
    ([key, v, bindings]) => localStorage.setItem(key, JSON.stringify({ version: v, master: 0.7, music: 1, effects: 1, muted: true, flashes: true, bindings })),
    [STORAGE_KEYS.settings, SETTINGS_VERSION, { ...DEFAULT_BINDINGS, rotate: 'Q', build: 'V' }] as const,
  );
  await boot(page, '?start=field');
  await enterFoundry(page);
  expect((await ui(page))?.buildBar?.strip.shown).toBe(false);
  await page.keyboard.press('v');
  await page.evaluate(() => window.__GAME__?.step(1));
  await expect.poll(async () => (await ui(page))?.buildBar?.strip.shown).toBe(true);
  const u = await ui(page);
  expect(u?.buildBar?.strip.entries).toEqual([
    { key: 'Click', does: 'place' },
    { key: 'Q', does: 'rotate' },
    { key: 'G', does: 'flip' },
    { key: 'Right-click', does: 'pick up' },
    { key: 'Drag', does: 'line' },
    { key: 'V', does: 'exit' },
  ]);
  const strip = u?.buildBar?.strip.box;
  const hp = u?.health.box;
  const slot = u?.hud?.tubeSlot;
  if (!strip || !hp || !slot) throw new Error('nothing drawn');
  // Just above the bar's labels, clear of the HP block, under the tube slot.
  const labelsTop = Math.min(...(u?.buildBar?.groups.map((g) => g.y) ?? [0]));
  expect(strip.y + strip.h).toBeLessThanOrEqual(labelsTop);
  expect(hp.x + hp.w <= strip.x || hp.y + hp.h <= strip.y || strip.y + strip.h <= hp.y).toBe(true);
  expect(slot.y + slot.h).toBeLessThanOrEqual(strip.y);
  await page.keyboard.press('v');
  await page.evaluate(() => window.__GAME__?.step(1));
  await expect.poll(async () => (await ui(page))?.buildBar?.strip.shown).toBe(false);
  expect(errors).toEqual([]);
});
