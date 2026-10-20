import { expect, test, type Page } from '@playwright/test';
import { TILE_SIZE, VIEW_HEIGHT } from '../../src/data/config';
import { HUD_LAYOUT } from '../../src/data/hudLayout';
import { HEALTH_BLOCK_HEIGHT } from '../../src/data/hudPanels';
import { OVERWORLD } from '../../src/data/overworld';
import { FIXTURES } from '../../src/data/claims';
import { inventoryLayout } from '../../src/render/inventoryLayout';
import { boot, watchErrors } from './helpers';
import { screenPoint, state } from './foundryPage';

// The HUD pass (031): the inventory panel's keys and what it reports, the pickup feed,
// the "+ part" popups kept apart, and the bottom-left HP bar clear of the 025 HUD and
// the build bar, its low state, damage chunk and healing glow. Screenshots are in
// hudInventoryShots.spec.ts.

type Box = { x: number; y: number; w: number; h: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());
const inventoryOpen = async (page: Page) => (await ui(page))?.inventory.open;
/** The grid's slots of a kind (047), each its count and at-risk part. */
const slotsOf = async (page: Page, itemId: string) => (await ui(page))?.inventory.slots.filter((sl) => sl.itemId === itemId).map((sl) => ({ count: sl.count, atRisk: sl.atRisk }));

/** The shrine pylon's tile, from the overworld data. */
const PYLON = OVERWORLD.shrine.pylon;
/** Open flagstones inside the shrine's safe zone, a few tiles down and right of its pylon (030's shots stand here). */
const SAFE_SPOT = { x: (PYLON.tx + 2.5) * TILE_SIZE, y: (PYLON.ty + 3.5) * TILE_SIZE };
/** The HP block's top at rest (bottom-left, margin px up): raised in build mode, it sits above this. */
// The block's resting top: the frame and 037's XP row under it, margin px off the bottom.
const RESTING_TOP = VIEW_HEIGHT - HUD_LAYOUT.margin - HEALTH_BLOCK_HEIGHT;
const BENCH = FIXTURES.find((f) => f.kind === 'bench');

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
  await expect.poll(() => slotsOf(page, 'wood')).toEqual([{ count: 3, atRisk: 3 }]);
  expect(await slotsOf(page, 'arrow')).toEqual([{ count: s.inventory.arrow, atRisk: 0 }]);
  // The wood's slot marks its at-risk count, its count and mark apart (045.11: the 031 panel drew them over each other).
  const wood = (await ui(page))?.inventory.slots.find((sl) => sl.itemId === 'wood');
  if (!wood?.warnBox) throw new Error('no at-risk mark on the wood');
  expect(overlaps(wood.countBox, wood.warnBox)).toBe(false);
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
  // What went home isn't carried: no slots at all.
  await expect.poll(async () => (await ui(page))?.inventory.slots).toEqual([]);
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
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
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
  });
  // The foundry is on screen once the door's fade is over: no meadow nodes are drawn.
  await expect.poll(async () => Object.keys((await ui(page))?.nodes ?? { x: 1 }).length).toBe(0);
  // The popups are short: slow every tween so both can be seen together.
  await page.evaluate(() => window.__GAME__?.tweenSpeed(0.05));
  const s = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    // Both machines go down and run in one batch, so both steps finish before the next draw.
    g.step(1, { place: { pieceId: 'cutter', tx: 11, ty: 4, facing: 'up' } });
    let s = g.step(1, { place: { pieceId: 'knapper', tx: 12, ty: 4, facing: 'up' } });
    for (let t = 0; t < 600 && !(s.machineMade.shaft && s.machineMade.arrowhead); t++) s = g.step(1);
    return s;
  });
  expect([s.machineMade.shaft, s.machineMade.arrowhead]).toEqual([2, 2]);
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
  expect(view.health.box.x).toBe(HUD_LAYOUT.margin);
  expect(view.health.box.y + view.health.box.h).toBe(VIEW_HEIGHT - HUD_LAYOUT.margin);
  expect(overlaps(view.health.box, view.hud.hotbar)).toBe(false);
  expect(overlaps(view.health.box, view.hud.tubeSlot)).toBe(false);
  expect(view.health.text).toBe('100 / 100');

  await page.evaluate(() => {
    window.__helpers?.toFoundry();
    window.__GAME__?.step(1, { toggleBuild: true });
  });
  await expect.poll(async () => (await ui(page))?.buildBar?.shown).toBe(true);
  await expect.poll(async () => (await ui(page))?.health.box.y).toBeLessThan(RESTING_TOP);
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

  // The HUD's motion runs on tween time: held still, the chunk's hold can't run out between two polls, however slow
  // the frames come on a loaded machine. Then the clock runs fast (a loaded machine's frames each carry little time)
  // and the chunk drains away.
  await page.evaluate(() => {
    window.__GAME__?.tweenSpeed(0);
    window.__GAME__?.setPlayerHealth(60);
  });
  await expect.poll(async () => (await ui(page))?.health.chunk, { timeout: 15_000 }).toBe(40);
  expect((await ui(page))?.health.text).toBe('60 / 100');
  await page.evaluate(() => window.__GAME__?.tweenSpeed(20));
  await expect.poll(async () => (await ui(page))?.health.chunk, { timeout: 15_000 }).toBe(0);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));

  await page.evaluate(() => window.__GAME__?.setPlayerHealth(20));
  await expect.poll(async () => (await ui(page))?.health.low).toBe(true);
  expect((await ui(page))?.health.text).toBe('20 / 100');
  await page.evaluate(() => window.__GAME__?.setPlayerHealth(25));
  await expect.poll(async () => (await ui(page))?.health.low).toBe(false);

  // In the claimed shrine's safe zone (030), the bar glows while the player heals.
  const healing = await page.evaluate((zone) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.claim('shrine');
    h.walkTo(zone.x, zone.y);
    return g.step(10).player.healing;
  }, SAFE_SPOT);
  expect(healing).toBe('pylon');
  await expect.poll(async () => (await ui(page))?.health.healing).toBe(true);
  expect(errors).toEqual([]);
});

test('a press on the open panel never fires, and the player still moves with it open', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  await boot(page);
  // On the real-time clock (no step yet), so the mouse drives the tube as in play.
  await page.keyboard.press('i');
  await expect.poll(() => inventoryOpen(page)).toBe(true);
  const { panel } = inventoryLayout();
  const centre = await screenPoint(page, panel.x + panel.w / 2, panel.y + panel.h / 2);
  const before = await state(page);
  expect(before.inventory.arrow ?? 0).toBeGreaterThan(0);
  await page.mouse.move(centre.x, centre.y);
  // 047: right click uses carried arrows in the world; on the panel it never does.
  await page.mouse.down({ button: 'right' });
  // Held down while the world runs on: half a second of ticks.
  await expect.poll(async () => (await state(page)).tick, { timeout: 15_000 }).toBeGreaterThan(before.tick + 30);
  await page.mouse.up({ button: 'right' });
  const held = await state(page);
  expect(held.inventory.arrow).toBe(before.inventory.arrow);
  expect(held.arrows).toEqual([]);
  // The same press with the panel shut fires, so the check above means something.
  await page.keyboard.press('i');
  await expect.poll(() => inventoryOpen(page)).toBe(false);
  await page.mouse.down();
  await expect.poll(async () => (await state(page)).inventory.arrow ?? 0, { timeout: 15_000 }).toBeLessThan(before.inventory.arrow ?? 0);
  await page.mouse.up();

  // Under the hook: open, the player walks as usual (the panel doesn't pause the world).
  await page.keyboard.press('i');
  await expect.poll(() => inventoryOpen(page)).toBe(true);
  const walk = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const from = g.step(0).player.x;
    return { from, to: g.step(20, { moveX: 1 }).player.x };
  });
  expect(walk.to).toBeGreaterThan(walk.from + 20);
  expect(await inventoryOpen(page)).toBe(true);
  expect(errors).toEqual([]);
});

test("a KO closes the panel, and it won't open while the wake panel shows", async ({ page }) => {
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  await boot(page);
  await page.evaluate(() => window.__GAME__?.step(1));
  await page.keyboard.press('i');
  await expect.poll(() => inventoryOpen(page)).toBe(true);
  const ko = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.setPlayerHealth(0);
    let s = g.step(1);
    for (let t = 0; t < 600 && !s.events.ko; t++) s = g.step(1);
    return s.events.ko;
  });
  expect(ko).toBe(true);
  await expect.poll(() => inventoryOpen(page)).toBe(false);
  // The wake panel shows (the menu pointer with nothing else open): I does nothing, while C still opens its menu.
  await expect.poll(async () => (await ui(page))?.cursor?.kind, { timeout: 15_000 }).toBe('pointer');
  await page.keyboard.press('i');
  await page.keyboard.press('c');
  await expect.poll(async () => (await ui(page))?.craftOpen).toBe(true);
  expect(await inventoryOpen(page)).toBe(false);
  expect(errors).toEqual([]);
});

test('E on a hopper or the bench closes the panel, and opening the panel closes their menus', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.toFoundry();
    g.step(1, { toggleBuild: true });
    g.step(1, { place: { pieceId: 'hopper', tx: 11, ty: 5, facing: 'up' } });
    g.step(1, { toggleBuild: true });
    h.walkTo(11.5 * 32, 6.25 * 32);
  });
  await page.keyboard.press('i');
  await expect.poll(() => inventoryOpen(page)).toBe(true);
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.pickerOpen).toBe(true);
  expect(await inventoryOpen(page)).toBe(false);
  await page.keyboard.press('i');
  await expect.poll(() => inventoryOpen(page)).toBe(true);
  expect((await ui(page))?.pickerOpen).toBe(false);

  // The bench's menu (a site menu), standing on its right.
  if (!BENCH) throw new Error('no bench');
  await page.evaluate(([tx, ty]) => window.__helpers?.walkTo((tx + 1.3) * 32, (ty + 0.5) * 32), [BENCH.tx, BENCH.ty] as const);
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.siteOpen).toBe(true);
  expect(await inventoryOpen(page)).toBe(false);
  await page.keyboard.press('Tab');
  await expect.poll(() => inventoryOpen(page)).toBe(true);
  expect((await ui(page))?.siteOpen).toBe(false);
  expect(errors).toEqual([]);
});
