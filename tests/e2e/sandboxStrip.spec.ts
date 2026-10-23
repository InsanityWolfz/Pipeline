import { expect, test, type Page } from '@playwright/test';
import { DEFAULT_BINDINGS } from '../../src/data/settings';
import { keyListLines } from '../../src/render/sandboxStrip';
import { pauseRows } from '../../src/render/craftMenuLayout';
import { VIEW_WIDTH } from '../../src/data/config';
import { clickRow, clickView, flowIs } from './flowPage';
import { boot, cameraSettled } from './helpers';
import { bootSandbox, clickPanel, clickTab, controlsShown, hidePanel, openPanel, panelsOut } from './sandboxPage';

// 056, 057: in the sandbox the controls are click-open pop-outs: a "Loadout" tab on the left edge and a "Spawn" tab on
// the right, always shown, and nothing else until one is clicked. A click slides its panel out (the loadout's rows and
// the key list on the left, the spawn rows on the right) and a second closes it. Their rows still work, they never
// pause, firing leaves them open, Esc closes them before it pauses, the key list follows a rebind, their key opens and
// closes both (057.3), and the normal game shows none of it. With REVIEW_SHOTS=1 it also captures docs/review/056 and
// docs/review/057.

const SHOTS = 'docs/review/056';
const SHOTS_057 = 'docs/review/057';
const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui().sandbox ?? null);

/** Rebinds Roll to Shift as a player would: Esc, Settings, Key bindings, Roll, Shift, then Esc back out to play. */
async function rebindRollToShift(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  // 057.2: with a panel out, the first Esc closes it; the next pauses.
  if ((await page.evaluate(() => window.__GAME__?.flow().state)) === 'play') await page.keyboard.press('Escape');
  await flowIs(page, 'paused');
  const settings = pauseRows()[1];
  if (!settings) throw new Error('no settings row');
  await clickView(page, settings.x + 40, settings.y + 10);
  await flowIs(page, 'settings');
  await clickRow(page, 'keys');
  await clickRow(page, 'dodge');
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().flow.bindings?.waiting)).toBe('dodge');
  await page.keyboard.press('Shift');
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().flow.bindings?.waiting)).toBeNull();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await flowIs(page, 'paused');
  await page.keyboard.press('Escape');
  await flowIs(page, 'play');
}

test('?sandbox shows only the two tabs; a click pops each panel out and a second closes it', async ({ page }) => {
  test.setTimeout(120_000);
  await bootSandbox(page);
  // 057.1: on load, only the tabs: no rows, no key list, no panel boxes.
  await expect.poll(async () => (await ui(page))?.tabs.length).toBe(2);
  const start = await ui(page);
  expect(start?.open).toBe(false);
  expect(start?.rows).toEqual([]);
  expect(start?.keys).toEqual([]);
  const [left, right] = start?.tabs ?? [];
  expect(left).toMatchObject({ id: 'loadout', x: 0, open: false });
  expect((right?.x ?? 0) + (right?.w ?? 0)).toBe(VIEW_WIDTH);
  expect(right).toMatchObject({ id: 'spawn', open: false });
  expect(start?.boxes).toEqual(start?.tabs.map(({ x, y, w, h }) => ({ x, y, w, h })));
  // The Loadout tab: its panel slides out with 056's rows and the key list under them; the Spawn panel stays shut.
  await clickTab(page, 'loadout');
  await expect.poll(() => panelsOut(page)).toEqual({ loadout: true, spawn: false, sliding: false });
  const loadout = await ui(page);
  // 060: the boss resets moved under the spawn column's Clear.
  expect(loadout?.rows.map((r) => r.id)).toEqual(expect.arrayContaining(['entrance-0', 'god']));
  expect(loadout?.keys).toEqual(keyListLines(DEFAULT_BINDINGS));
  // 057.4: the tab rides on the panel's outer edge.
  const lt = loadout?.tabs.find((t) => t.id === 'loadout');
  const panel = loadout?.boxes.find((b) => b.x < (lt?.x ?? 0));
  expect((panel?.x ?? 0) + (panel?.w ?? 0)).toBe(lt?.x);
  // The Spawn tab: its panel too.
  await clickTab(page, 'spawn');
  await expect.poll(() => panelsOut(page)).toEqual({ loadout: true, spawn: true, sliding: false });
  expect((await ui(page))?.rows.map((r) => r.id)).toEqual(expect.arrayContaining(['spawn', 'clear', 'reset-bulwark', 'reset-forgewright']));
  // A row works with it open, and nothing pauses.
  await clickPanel(page, 'god');
  await expect.poll(() => page.evaluate(() => window.__GAME__?.getState().god)).toBe(true);
  expect(await page.evaluate(() => window.__GAME__?.flow().state)).toBe('play');
  // 057.2: firing into the world leaves them open.
  // The live loop takes the press (the hook's steps don't read the mouse); held, the volley flies.
  await page.evaluate(() => window.__GAME__?.resume());
  const canvas = await page.locator('canvas').boundingBox();
  const k = (canvas?.width ?? VIEW_WIDTH) / VIEW_WIDTH;
  await page.mouse.move((canvas?.x ?? 0) + (VIEW_WIDTH / 2) * k, (canvas?.y ?? 0) + 260 * k);
  await page.mouse.down();
  await expect.poll(() => page.evaluate(() => window.__GAME__?.getState().arrows.length ?? 0)).toBeGreaterThan(0);
  await page.mouse.up();
  expect(await panelsOut(page)).toEqual({ loadout: true, spawn: true, sliding: false });
  // A second click on a tab closes its panel only.
  await clickTab(page, 'loadout');
  await expect.poll(() => panelsOut(page)).toEqual({ loadout: false, spawn: true, sliding: false });
  expect((await ui(page))?.keys).toEqual([]);
  // 057.2: Esc closes the open panel first, then pauses (the tabs step aside under the pause menu, 056.10).
  await page.keyboard.press('Escape');
  await expect.poll(() => panelsOut(page)).toEqual({ loadout: false, spawn: false, sliding: false });
  expect(await page.evaluate(() => window.__GAME__?.flow().state)).toBe('play');
  await page.keyboard.press('Escape');
  await flowIs(page, 'paused');
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().sandboxDrawn)).toBe(false);
  await page.keyboard.press('Escape');
  await flowIs(page, 'play');
  await expect.poll(async () => (await ui(page))?.tabs.length).toBe(2);
  // 057.3: the key opens both, and closes both.
  await page.keyboard.press('Backquote');
  await expect.poll(() => panelsOut(page)).toEqual({ loadout: true, spawn: true, sliding: false });
  await hidePanel(page);
  // 056.5: a big panel steps tabs and panels aside; closing it brings them back as they were.
  await clickTab(page, 'spawn');
  await expect.poll(() => panelsOut(page)).toEqual({ loadout: false, spawn: true, sliding: false });
  await page.keyboard.press('i');
  await expect.poll(async () => (await ui(page))?.tabs.length).toBe(0);
  expect(await controlsShown(page)).toBe(false);
  await page.keyboard.press('i');
  await expect.poll(() => panelsOut(page)).toEqual({ loadout: false, spawn: true, sliding: false });
  // With a big panel open, the key brings them back, both open, and closes it.
  await page.keyboard.press('i');
  await expect.poll(async () => (await ui(page))?.tabs.length).toBe(0);
  await page.keyboard.press('Backquote');
  await expect.poll(() => panelsOut(page)).toEqual({ loadout: true, spawn: true, sliding: false });
  expect(await page.evaluate(() => window.__GAME__?.ui().inventory.open)).toBe(false);
});

test('the key list follows a rebind at once', async ({ page }) => {
  test.setTimeout(120_000);
  await bootSandbox(page);
  await clickTab(page, 'loadout');
  await expect.poll(() => panelsOut(page)).toEqual({ loadout: true, spawn: false, sliding: false });
  await rebindRollToShift(page);
  await clickTab(page, 'loadout');
  await expect.poll(async () => (await ui(page))?.keys.find((k) => k.label === 'Roll')?.keys).toBe('Shift');
});

test('the normal game shows none of it', async ({ page }) => {
  test.setTimeout(60_000);
  await boot(page);
  const drawn = () => page.evaluate(() => window.__GAME__?.ui().sandboxDrawn);
  // Read from the panel's own objects: ui().sandbox is null outside the sandbox whatever is drawn.
  expect(await drawn()).toBe(false);
  await page.keyboard.press('Backquote');
  await page.evaluate(() => window.__GAME__?.step(2));
  // A few drawn frames after the press, so the scene has had its chance to show anything.
  await page.evaluate(() => new Promise<void>((done) => { let n = 0; const f = () => (++n >= 5 ? done() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
  expect(await drawn()).toBe(false);
  expect(await ui(page)).toBeNull();
});

test.describe('review screenshots (056, 057)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/056 and docs/review/057');

  test('056: both panels out, and the key list after a rebind', async ({ page }) => {
    test.setTimeout(180_000);
    await bootSandbox(page);
    await openPanel(page);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/01-strip-on-load.png` });
    await rebindRollToShift(page);
    await openPanel(page);
    await expect.poll(async () => (await ui(page))?.keys.find((k) => k.label === 'Roll')?.keys).toBe('Shift');
    await page.screenshot({ path: `${SHOTS}/02-after-rebind.png` });
  });

  test('057: both tabs closed, the Loadout panel out, the Spawn panel out', async ({ page }) => {
    test.setTimeout(180_000);
    await bootSandbox(page);
    await expect.poll(async () => (await ui(page))?.tabs.length).toBe(2);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS_057}/01-tabs-closed.png` });
    await clickTab(page, 'loadout');
    await expect.poll(() => panelsOut(page)).toEqual({ loadout: true, spawn: false, sliding: false });
    await page.screenshot({ path: `${SHOTS_057}/02-loadout-open.png` });
    await clickTab(page, 'loadout');
    await clickTab(page, 'spawn');
    await expect.poll(() => panelsOut(page)).toEqual({ loadout: false, spawn: true, sliding: false });
    await page.screenshot({ path: `${SHOTS_057}/03-spawn-open.png` });
  });
});
