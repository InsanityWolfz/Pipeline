import { expect, test, type Page } from '@playwright/test';
import { OBJECTIVES } from '../../src/data/objectives';
import { OVERWORLD } from '../../src/data/overworld';
import { FOUNDRY_STEPS } from '../fixtures/foundrySteps';
import { boot, watchErrors } from './helpers';

// The HUD pass (031): the inventory panel's keys and what it reports, the pickup feed,
// the "+ part" popups kept apart, and the bottom-left HP bar clear of the 025 HUD and
// the build bar, its low state, damage chunk and healing glow. Screenshots are in
// hudInventoryShots.spec.ts.

type Box = { x: number; y: number; w: number; h: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());
const inventoryOpen = async (page: Page) => (await ui(page))?.inventory.open;
const rowsOf = async (page: Page, group: string) => (await ui(page))?.inventory.groups.find((g) => g.id === group)?.rows;

/** The shrine pylon's tile, from the overworld data, and the cutter step's index in the goal chain. */
const PYLON = OVERWORLD.shrine.pylon;
const CUTTER_STEP = OBJECTIVES.findIndex((o) => o.text === FOUNDRY_STEPS[2]);

test('I and Tab toggle the inventory, Esc closes it, Tab keeps focus; it swaps with the crafting menu and stays shut while paused', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  await page.evaluate(() => window.__GAME__?.step(1));
  expect(await inventoryOpen(page)).toBe(false);

  await page.keyboard.press('i');
  await expect.poll(() => inventoryOpen(page)).toBe(true);
  await page.keyboard.press('i');
  await expect.poll(() => inventoryOpen(page)).toBe(false);

  // Tab: the game takes the key, so the browser never moves focus.
  await page.evaluate(() => {
    const w = window as unknown as { focusBefore: Element | null; tabPrevented: boolean | null };
    w.focusBefore = document.activeElement;
    w.tabPrevented = null;
    window.addEventListener('keydown', (e) => {
      // Read after every listener has run, Phaser's capture included.
      if (e.key === 'Tab') setTimeout(() => (w.tabPrevented = e.defaultPrevented));
    });
  });
  await page.keyboard.press('Tab');
  await expect.poll(() => inventoryOpen(page)).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as unknown as { tabPrevented: boolean | null }).tabPrevented)).toBe(true);
  expect(await page.evaluate(() => document.activeElement === (window as unknown as { focusBefore: Element | null }).focusBefore)).toBe(true);
  await page.keyboard.press('Tab');
  await expect.poll(() => inventoryOpen(page)).toBe(false);

  // Esc closes it, and doesn't go on to open the pause menu.
  await page.keyboard.press('i');
  await expect.poll(() => inventoryOpen(page)).toBe(true);
  // The menu pointer shows over it.
  await expect.poll(async () => (await ui(page))?.cursor?.kind).toBe('pointer');
  await page.keyboard.press('Escape');
  await expect.poll(() => inventoryOpen(page)).toBe(false);
  expect((await ui(page))?.paused).toBe(false);

  // Opening it closes the crafting menu; opening the crafting menu closes it.
  await page.keyboard.press('c');
  await expect.poll(async () => (await ui(page))?.craftOpen).toBe(true);
  await page.keyboard.press('i');
  await expect.poll(() => inventoryOpen(page)).toBe(true);
  expect((await ui(page))?.craftOpen).toBe(false);
  await page.keyboard.press('c');
  await expect.poll(async () => (await ui(page))?.craftOpen).toBe(true);
  expect(await inventoryOpen(page)).toBe(false);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await ui(page))?.craftOpen).toBe(false);

  // Paused: I does nothing, and nothing opens once the pause menu closes.
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await ui(page))?.paused).toBe(true);
  await page.keyboard.press('i');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await ui(page))?.paused).toBe(false);
  expect(await inventoryOpen(page)).toBe(false);
  expect(errors).toEqual([]);
});

test('3 wood picked up after entering the foundry are 3 at risk, in the panel and the feed', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=field&attuned');
  const s = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.toFoundry();
    const p = g.getState().player;
    for (let i = 0; i < 3; i++) g.drop('wood', p.x, p.y);
    h.collect();
    return g.getState();
  });
  expect(s.room).toBe('foundry');
  expect(s.inventory.wood).toBe(3);
  expect(s.atRisk).toEqual({ wood: 3 });
  // The arrows carried in were banked at the door: all safe.
  expect(s.atRisk.arrow).toBeUndefined();

  await page.keyboard.press('i');
  await expect.poll(() => rowsOf(page, 'raw')).toEqual([{ itemId: 'wood', count: 3, atRisk: 3, home: 0 }]);
  expect(await rowsOf(page, 'ammo')).toEqual([{ itemId: 'arrow', count: s.inventory.arrow, atRisk: 0, home: 0 }]);
  expect((await ui(page))?.inventory.groups.map((g) => g.id)).toEqual(['raw', 'parts', 'ammo', 'gear', 'cores']);
  // One feed line for the three.
  await expect.poll(async () => (await ui(page))?.pickupFeed).toEqual([{ itemId: 'wood', count: 3 }]);
  expect(errors).toEqual([]);
});

test('a deposit at the claimed shrine pylon leaves nothing carried and nothing at risk', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page);
  const s = await page.evaluate(([tx, ty]) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.claim('shrine');
    h.walkTo((tx + 0.5) * 32, (ty + 1.5) * 32);
    const p = g.getState().player;
    for (const id of ['wood', 'stone', 'shaft']) g.drop(id, p.x, p.y);
    h.collect();
    const before = g.getState();
    return { before, after: g.step(1, { pylon: 'deposit' }) };
  }, [PYLON.tx, PYLON.ty] as const);
  expect(Object.keys(s.before.atRisk).sort()).toEqual(['shaft', 'stone', 'wood']);
  expect(Object.values(s.after.inventory).every((n) => n === 0)).toBe(true);
  expect(s.after.atRisk).toEqual({});
  expect(s.after.stash).toMatchObject({ wood: 1, stone: 1, shaft: 1 });

  await page.keyboard.press('i');
  await expect.poll(async () => (await ui(page))?.inventory.open).toBe(true);
  // What went home isn't carried: no rows at all.
  await expect.poll(async () => (await ui(page))?.inventory.groups.flatMap((g) => g.rows)).toEqual([]);
  expect(errors).toEqual([]);
});

test('a burst of 7 wood pickups is one feed line of 7', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  const s = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    const p = g.step(1).player;
    for (let i = 0; i < 7; i++) g.drop('wood', p.x + (i % 3) * 4, p.y);
    h.collect();
    return g.getState();
  });
  expect(s.inventory.wood).toBe(7);
  await expect.poll(async () => (await ui(page))?.pickupFeed).toEqual([{ itemId: 'wood', count: 7 }]);
  expect(errors).toEqual([]);
});

test('two "+ part" popups at once never overlap', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await page.evaluate((cutterStep) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.completeObjectives(cutterStep);
    h.toFoundry();
    g.step(1, { toggleBuild: true });
    g.step(1, { place: { pieceId: 'hopper', tx: 11, ty: 5, facing: 'up' } });
    g.step(1, { place: { pieceId: 'hopper', tx: 12, ty: 5, facing: 'up' } });
    for (const [tx, item] of [[11, 'wood'], [12, 'stone']] as const) {
      h.walkTo((tx + 0.5) * 32, 6.25 * 32);
      const hopper = g.getState().foundry.pieces.find((p) => p.kind === 'hopper' && p.tx === tx && p.ty === 5);
      if (!hopper) throw new Error('no hopper');
      g.step(1, { deposit: { id: hopper.id, itemId: item, amount: 'all' } });
    }
    h.walkTo(15.5 * 32, 6.5 * 32);
  }, CUTTER_STEP);
  // The foundry is on screen once the door's fade is over: no meadow nodes are drawn.
  await expect.poll(async () => Object.keys((await ui(page))?.nodes ?? { x: 1 }).length).toBe(0);
  // The popups are short: slow every tween so both can be seen together.
  await page.evaluate(() => window.__GAME__?.tweenSpeed(0.05));
  const s = await page.evaluate((cutterStep) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    // Both machines go down and run in one batch, so both steps finish before the next draw.
    g.step(1, { place: { pieceId: 'cutter', tx: 11, ty: 4, facing: 'up' } });
    let s = g.step(1, { place: { pieceId: 'knapper', tx: 12, ty: 4, facing: 'up' } });
    for (let t = 0; t < 600 && (s.objective.index ?? 0) <= cutterStep + 1; t++) s = g.step(1);
    return s;
  }, CUTTER_STEP);
  expect(s.objective.index).toBe(CUTTER_STEP + 2);
  await expect.poll(async () => (await ui(page))?.madePopups.map((p) => p.text).sort()).toEqual(['+ arrowhead', '+ shaft']);
  const [a, b] = (await ui(page))?.madePopups ?? [];
  if (!a || !b) throw new Error('no popups');
  expect(a.w).toBeGreaterThan(0);
  expect(b.w).toBeGreaterThan(0);
  expect(overlaps(a, b)).toBe(false);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  expect(errors).toEqual([]);
});

test('the HP block stays clear of the hotbar row and tube slot in play, and of the build bar with every piece unlocked', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await page.evaluate(() => window.__GAME__?.step(1));
  await expect.poll(async () => (await ui(page))?.hud?.hotbar.shown).toBe(true);
  let view = await ui(page);
  if (!view?.hud) throw new Error('no HUD');
  expect(view.health.box.x).toBe(6);
  expect(view.health.box.y + view.health.box.h).toBe(360 - 6);
  expect(overlaps(view.health.box, view.hud.hotbar)).toBe(false);
  expect(overlaps(view.health.box, view.hud.tubeSlot)).toBe(false);
  expect(view.health.text).toBe('100 / 100');

  await page.evaluate(() => {
    window.__helpers?.toFoundry();
    window.__GAME__?.step(1, { toggleBuild: true });
  });
  await expect.poll(async () => (await ui(page))?.buildBar?.shown).toBe(true);
  await expect.poll(async () => (await ui(page))?.health.box.y).toBeLessThan(300);
  view = await ui(page);
  if (!view?.hud || !view.buildBar) throw new Error('no build bar');
  const bar = view.buildBar;
  const s = await page.evaluate(() => window.__GAME__?.getState());
  expect(bar.cells.map((c) => c.pieceId)).toEqual(s?.unlocked);
  expect(bar.cells.length).toBeGreaterThanOrEqual(16);
  for (const box of [...bar.cells, ...bar.groups, view.hud.tubeSlot]) expect(overlaps(view.health.box, box), JSON.stringify(box)).toBe(false);
  // It sits above the label row.
  expect(view.health.box.y + view.health.box.h).toBeLessThanOrEqual(Math.min(...bar.groups.map((g) => g.y)));
  expect(errors).toEqual([]);
});

test('below 25% the bar is low; a drop leaves a white chunk that drains away; healing glows', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page);
  await page.evaluate(() => window.__GAME__?.step(1));
  await expect.poll(async () => (await ui(page))?.health.text).toBe('100 / 100');
  expect((await ui(page))?.health.low).toBe(false);
  expect((await ui(page))?.health.chunk).toBe(0);

  // The HUD's motion runs on tween time: slowed, the hold and drain can't slip between two polls.
  await page.evaluate(() => {
    window.__GAME__?.tweenSpeed(0.1);
    window.__GAME__?.setPlayerHealth(60);
  });
  await expect.poll(async () => (await ui(page))?.health.chunk).toBe(40);
  expect((await ui(page))?.health.text).toBe('60 / 100');
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  await expect.poll(async () => (await ui(page))?.health.chunk).toBe(0);

  await page.evaluate(() => window.__GAME__?.setPlayerHealth(20));
  await expect.poll(async () => (await ui(page))?.health.low).toBe(true);
  expect((await ui(page))?.health.text).toBe('20 / 100');
  await page.evaluate(() => window.__GAME__?.setPlayerHealth(25));
  await expect.poll(async () => (await ui(page))?.health.low).toBe(false);

  // In the claimed shrine's safe zone (030), the bar glows while the player heals.
  const healing = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.claim('shrine');
    h.walkTo(68.5 * 32, 11.5 * 32);
    return g.step(10).player.healing;
  });
  expect(healing).toBe('pylon');
  await expect.poll(async () => (await ui(page))?.health.healing).toBe(true);
  expect(errors).toEqual([]);
});
