import { expect, test, type Page } from '@playwright/test';
import { DEFAULT_BINDINGS } from '../../src/data/settings';
import { keyListLines } from '../../src/render/sandboxStrip';
import { pauseRows } from '../../src/render/craftMenuLayout';
import { clickRow, clickView, flowIs } from './flowPage';
import { boot, cameraSettled } from './helpers';
import { bootSandbox, clickPanel, controlsShown, hidePanel } from './sandboxPage';

// 056: in the sandbox the controls are always on screen: the loadout's rows and the key list in a strip down the
// left, the spawn column on the right, from the moment it loads, with no key press. Their rows still work, they never
// pause, the key list follows a rebind, their key hides and shows both (056.1), and the normal game shows none of it.
// With REVIEW_SHOTS=1 it also captures docs/review/056.

const SHOTS = 'docs/review/056';
const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui().sandbox ?? null);

/** Rebinds Roll to Shift as a player would: Esc, Settings, Key bindings, Roll, Shift, then Esc back out to play. */
async function rebindRollToShift(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
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

test('?sandbox shows both columns and the key list on load, and a row still works without pausing', async ({ page }) => {
  test.setTimeout(120_000);
  await bootSandbox(page);
  // No key pressed: the controls are up from the start.
  await expect.poll(() => controlsShown(page)).toBe(true);
  const shown = await ui(page);
  const ids = shown?.rows.map((r) => r.id) ?? [];
  expect(ids).toEqual(expect.arrayContaining(['entrance-0', 'god', 'reset-bulwark', 'enemy', 'spawn', 'clear']));
  expect(shown?.keys).toEqual(keyListLines(DEFAULT_BINDINGS));
  expect(shown?.boxes).toHaveLength(2);
  const [left, right] = shown?.boxes ?? [];
  expect(left?.x).toBeLessThan(100);
  expect((right?.x ?? 0) + (right?.w ?? 0)).toBeGreaterThan(540);
  await clickPanel(page, 'god');
  await expect.poll(() => page.evaluate(() => window.__GAME__?.getState().god)).toBe(true);
  expect(await page.evaluate(() => window.__GAME__?.flow().state)).toBe('play');
  // Esc pauses with the strips up (they step aside under the pause menu, 056.10); Esc again resumes back to them.
  await page.keyboard.press('Escape');
  await flowIs(page, 'paused');
  await expect.poll(() => controlsShown(page)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().sandboxDrawn)).toBe(false);
  await page.keyboard.press('Escape');
  await flowIs(page, 'play');
  await expect.poll(() => controlsShown(page)).toBe(true);
  expect(await page.evaluate(() => window.__GAME__?.ui().sandboxDrawn)).toBe(true);
  // 056.1: the key hides both strips and shows them again.
  await hidePanel(page);
  expect((await ui(page))?.rows).toEqual([]);
  await page.keyboard.press('Backquote');
  await expect.poll(() => controlsShown(page)).toBe(true);
  // 056.5: a big panel steps them aside; closing it brings them back.
  await page.keyboard.press('i');
  await expect.poll(() => controlsShown(page)).toBe(false);
  await page.keyboard.press('i');
  await expect.poll(() => controlsShown(page)).toBe(true);
  // With a big panel open, the key brings them back and closes it.
  await page.keyboard.press('i');
  await expect.poll(() => controlsShown(page)).toBe(false);
  await page.keyboard.press('Backquote');
  await expect.poll(() => controlsShown(page)).toBe(true);
  expect(await page.evaluate(() => window.__GAME__?.ui().inventory.open)).toBe(false);
});

test('the key list follows a rebind at once', async ({ page }) => {
  test.setTimeout(120_000);
  await bootSandbox(page);
  await expect.poll(() => controlsShown(page)).toBe(true);
  await rebindRollToShift(page);
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

test.describe('review screenshots (056)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/056');

  test('the strip on load, and the key list after a rebind', async ({ page }) => {
    test.setTimeout(180_000);
    await bootSandbox(page);
    await expect.poll(() => controlsShown(page)).toBe(true);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/01-strip-on-load.png` });
    await rebindRollToShift(page);
    await expect.poll(async () => (await ui(page))?.keys.find((k) => k.label === 'Roll')?.keys).toBe('Shift');
    await page.screenshot({ path: `${SHOTS}/02-after-rebind.png` });
  });
});
