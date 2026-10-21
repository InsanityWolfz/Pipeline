import { expect, test, type Page } from '@playwright/test';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { CRAFT_MENU_LAYOUT } from '../../src/data/hudLayout';
import { itemDef } from '../../src/data/items';
import { BUILD_BAR, PIECE_CATEGORIES, pieceDef } from '../../src/data/pieces';
import { CRAFT_TABS, craftRecipeDef } from '../../src/data/craftTabs';
import { RECIPES } from '../../src/data/recipes';
import type { BuildBarState } from '../../src/render/BuildView';
import type { CraftMenuState } from '../../src/render/CraftMenuView';
import { boot, cameraSettled, watchErrors, quietScreen } from './helpers';
import { enterFoundry } from './foundryPage';
import { openCraftTab } from './craftPage';

// Labels in the crafting menu and categories in the build bar (026): every recipe item
// named under its icon, missing inputs flagged, a tab per ammo family (047); the build bar
// in labelled groups with dividers, showing only unlocked pieces (a group with none
// unlocked is left out), the wheel stepping in the new order. With REVIEW_SHOTS=1, the review screenshots in docs/review/026.

const SHOTS = 'docs/review/026';
const TREE = 0;
/** The camera eases a long way after a harvest or the foundry stairs; under load that takes a while. */
const SETTLE_MS = 20_000;

type Box = { x: number; y: number; w: number; h: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inside = (a: Box, b: Box) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;

/** A row shown on these starts: on the Arrows tab (open first), a plain recipe not waiting on an item (038: the landmine chain, once ley-iron is); tagged rounds wait for the shrine. */
const shownFirst = (r: { recipeId: string; tab: string }): boolean => r.tab === 'arrow' && RECIPES[r.recipeId] !== undefined && RECIPES[r.recipeId]?.shownAfter === undefined;

/** Opens the crafting menu with C and returns it once its first tab's rows are drawn. */
async function openCraftMenu(page: Page): Promise<CraftMenuState> {
  await page.keyboard.press('c');
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().craftMenu))?.rows.every((r) => r.shown === shownFirst(r))).toBe(true);
  const menu = await page.evaluate(() => window.__GAME__?.ui().craftMenu);
  if (!menu) throw new Error('no craft menu');
  return menu;
}

/** Enters build mode and returns the bar once it's drawn. */
async function openBuildBar(page: Page): Promise<BuildBarState> {
  await page.evaluate(() => window.__GAME__?.step(1, { toggleBuild: true }));
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().buildBar))?.shown).toBe(true);
  const bar = await page.evaluate(() => window.__GAME__?.ui().buildBar);
  if (!bar) throw new Error('no build bar');
  return bar;
}

/** The build bar's selection, once the next frame has drawn it. */
const selected = async (page: Page) => (await page.evaluate(() => window.__GAME__?.ui().buildBar))?.selected;

/** One wheel notch down over the canvas, which steps the build bar one piece along. */
async function wheel(page: Page, expected: string): Promise<void> {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
  await page.mouse.wheel(0, 100);
  await expect.poll(() => selected(page)).toBe(expected);
}

/** The bar shows exactly `shown` in bar order, and a label (with a divider between) for each group it has a piece of. */
function expectGroups(bar: BuildBarState, shown: readonly string[]): void {
  expect(bar.cells.map((c) => c.pieceId)).toEqual([...shown]);
  const labels = PIECE_CATEGORIES.filter((c) => shown.some((id) => pieceDef(id).category === c.id)).map((c) => c.label);
  expect(bar.groups.map((g) => g.label)).toEqual(labels);
  expect(bar.dividers).toHaveLength(labels.length - 1);
  // Centred within 1 px and inside the view.
  const first = bar.cells[0];
  const last = bar.cells[bar.cells.length - 1];
  if (!first || !last) throw new Error('empty bar');
  expect(Math.abs((first.x + last.x + last.w) / 2 - VIEW_WIDTH / 2)).toBeLessThanOrEqual(1);
  const view = { x: 0, y: 0, w: VIEW_WIDTH, h: VIEW_HEIGHT };
  for (const c of bar.cells) expect(inside(c, view)).toBe(true);
  // Each label is drawn over its own group, clear of the cells and of the other labels.
  for (const [i, g] of bar.groups.entries()) {
    expect(g.w).toBeGreaterThan(0);
    expect(inside(g, view)).toBe(true);
    const cells = bar.cells.filter((c) => pieceDef(c.pieceId).category === g.category);
    expect(cells.length).toBeGreaterThan(0);
    const left = Math.min(...cells.map((c) => c.x));
    const right = Math.max(...cells.map((c) => c.x + c.w));
    expect(g.x).toBeGreaterThanOrEqual(left);
    expect(g.x + g.w).toBeLessThanOrEqual(right);
    for (const c of bar.cells) expect(overlaps(g, c)).toBe(false);
    for (const other of bar.groups.slice(i + 1)) expect(overlaps(g, other)).toBe(false);
  }
}

test('the crafting menu names every recipe item under its icon, on a tab per ammo family (047)', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=field&attuned');
  // One wood: the shaft row has its input, every other input is short.
  await page.evaluate((tree) => {
    window.__GAME__?.step(0);
    window.__helpers?.harvest(tree, 1);
  }, TREE);
  const wood = (await page.evaluate(() => window.__GAME__?.getState().inventory.wood)) ?? 0;
  expect(wood).toBeGreaterThanOrEqual(1);
  const menu = await openCraftMenu(page);

  expect(menu.rows.map((r) => r.recipeId)).toEqual(CRAFT_TABS.flatMap((t) => t.recipes));
  // 047: a tab per family; Landmines hidden with no ley-iron carried (038), every other tab shown.
  expect(menu.tabs.map((t) => [t.label, t.shown])).toEqual([['Arrows', true], ['Bombs', true], ['Ley', true], ['Landmines', false]]);
  for (const tab of ['arrow', 'bomb', 'ley-bolt']) {
    await openCraftTab(page, tab);
    const open = await page.evaluate(() => window.__GAME__?.ui().craftMenu);
    const shown = open?.rows.filter((r) => r.shown) ?? [];
    // Only the open tab's plain recipes: tagged rounds wait for the shrine's claim.
    expect(shown.map((r) => r.recipeId)).toEqual((CRAFT_TABS.find((t) => t.ammoId === tab)?.recipes ?? []).filter((id) => RECIPES[id]));
    for (const row of shown) {
      const recipe = craftRecipeDef(row.recipeId);
      const items = [...Object.keys(recipe.inputs), recipe.output.itemId];
      // A label for each item, its name from the data, under the icon, inside the row.
      expect(row.labels.map((l) => l.itemId), row.recipeId).toEqual(items);
      expect(row.labels.map((l) => l.text), row.recipeId).toEqual(items.map((id) => itemDef(id).name));
      const texts = [...row.labels, ...row.counts];
      for (const [i, t] of texts.entries()) {
        expect(t.w, `${row.recipeId} ${t.text}`).toBeGreaterThan(0);
        expect(inside(t, row), `${row.recipeId} ${t.text} inside its row`).toBe(true);
        for (const other of texts.slice(i + 1)) expect(overlaps(t, other), `${row.recipeId}: ${t.text} / ${other.text}`).toBe(false);
      }
      for (const l of row.labels.slice(0, -1)) expect(l.y - row.y).toBe(CRAFT_MENU_LAYOUT.labelY);
      // Short of an input: its name shows as missing.
      for (const l of row.labels.slice(0, -1)) {
        const need = recipe.inputs[l.itemId] ?? 0;
        const have = l.itemId === 'wood' ? wood : 0;
        expect(l.missing, `${row.recipeId} ${l.itemId}`).toBe(have < need);
      }
      // ...and so does its have/need count; the output's made and owned counts never do.
      const inputs = Object.keys(recipe.inputs);
      expect(row.counts.map((c) => c.missing), row.recipeId).toEqual([...row.labels.slice(0, inputs.length).map((l) => l.missing), false, false]);
    }
    // No row overlaps the next, nor any tab.
    for (const [i, row] of shown.entries()) {
      const next = shown[i + 1];
      if (next) expect(overlaps(row, next)).toBe(false);
      for (const t of open?.tabs ?? []) expect(overlaps(row, t)).toBe(false);
    }
  }
  expect(errors).toEqual([]);
});

test('on a fresh start the build bar shows only the Logistics group, and the wheel cycles it', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  await enterFoundry(page);
  const bar = await openBuildBar(page);
  // Before any hand-crafting only logistics is unlocked: locked machines, and their groups' labels, are hidden.
  expectGroups(bar, ['conduit', 'splitter', 'underground-entrance', 'underground-exit', 'hopper', 'crate']);
  expect(bar.selected).toBe('conduit');
  for (const id of ['splitter', 'underground-entrance', 'underground-exit', 'hopper', 'crate', 'conduit']) await wheel(page, id);
  expect(errors).toEqual([]);
});

test('with everything unlocked, the bar shows every labelled group (038: five, with Mines) and the wheel steps through them in bar order', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    // 046: the splitter is there from the start; 052: no piece waits on research any more.
    if (g.step(0).room !== 'foundry') h.toFoundry();
  });
  const bar = await openBuildBar(page);
  expectGroups(bar, BUILD_BAR);
  for (const id of [...BUILD_BAR.slice(1), BUILD_BAR[0] ?? '']) await wheel(page, id);
  // The tube slot sits above the group labels while building.
  const hud = await page.evaluate(() => window.__GAME__?.ui().hud);
  const top = Math.min(...bar.groups.map((g) => g.y));
  expect((hud?.tubeSlot.y ?? 0) + (hud?.tubeSlot.h ?? 0)).toBeLessThanOrEqual(top);
  expect(errors).toEqual([]);
});

test.describe('review screenshots (026)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/026');

  test('the crafting menu and the build bar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await boot(page, '?start=field&attuned');
    await page.evaluate((tree) => {
      window.__GAME__?.step(0);
      window.__helpers?.harvest(tree, 1);
    }, TREE);
    await cameraSettled(page, SETTLE_MS);
    const menu = await openCraftMenu(page);
    // The pointer parked on the panel, under the tabs (it lights no row).
    const tab = menu.tabs[menu.tabs.length - 1];
    const canvas = await page.locator('canvas').boundingBox();
    if (!tab || !canvas) throw new Error('no tab');
    const zoom = canvas.width / VIEW_WIDTH;
    await page.mouse.move(canvas.x + (tab.x + 10) * zoom, canvas.y + (tab.y + tab.h + 12) * zoom);
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().cursor))?.kind).toBe('pointer');
    await quietScreen(page);
    await page.screenshot({ path: `${SHOTS}/01-crafting-menu.png` });
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().craftOpen))).toBe(false);
    await enterFoundry(page);
    await openBuildBar(page);
    await cameraSettled(page, SETTLE_MS);
    await page.mouse.move(0, 0);
    await quietScreen(page);
    await page.screenshot({ path: `${SHOTS}/02-build-bar-locked.png` });
  });

  test('the build bar with everything unlocked, and its tip', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await boot(page, '?playtest');
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (g && g.step(0).room !== 'foundry') window.__helpers?.toFoundry();
    });
    const bar = await openBuildBar(page);
    await cameraSettled(page, SETTLE_MS);
    await page.mouse.move(0, 0);
    await quietScreen(page);
    await page.screenshot({ path: `${SHOTS}/03-build-bar.png` });
    const cell = bar.cells.find((c) => c.pieceId === 'assembler');
    const box = await page.locator('canvas').boundingBox();
    if (!cell || !box) throw new Error('no assembler cell');
    const zoom = box.width / VIEW_WIDTH;
    await page.mouse.move(box.x + (cell.x + cell.w / 2) * zoom, box.y + (cell.y + cell.h / 2) * zoom);
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().buildTip))).toBe('assembler');
    await quietScreen(page);
    await page.screenshot({ path: `${SHOTS}/04-build-bar-tip.png` });
  });
});
