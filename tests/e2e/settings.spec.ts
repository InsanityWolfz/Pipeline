import { expect, test, type Page } from '@playwright/test';
import { STORAGE_KEYS } from '../../src/data/save';
import { pauseRows } from '../../src/render/craftMenuLayout';
import { boot, watchErrors } from './helpers';
import { bootTitle, clickRow, clickView, flowIs, reloadTitle } from './flowPage';

// 042: the pause menu (Resume, Settings, Quit to title), Settings (volumes, mute, flashes, key bindings) kept across
// reloads, and Quit to title's confirm.

const row = (page: Page, id: string) =>
  page.evaluate((rowId) => {
    const f = window.__GAME__?.ui().flow;
    return [...(f?.settings?.rows ?? []), ...(f?.bindings?.rows ?? [])].find((r) => r.id === rowId) ?? null;
  }, id);

test('the pause menu: Resume, Settings (back to the pause menu), and Quit to title after a confirm', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=field');
  await page.keyboard.press('Escape');
  await flowIs(page, 'paused');
  const [resume, settings, quit] = pauseRows();
  if (!resume || !settings || !quit) throw new Error('no rows');
  await clickView(page, settings.x + 40, settings.y + 10);
  await flowIs(page, 'settings');
  expect((await page.evaluate(() => window.__GAME__?.ui().flow.settings?.rows.map((r) => r.label))) ?? []).toEqual([
    'Master volume',
    'Music volume',
    'Effects volume',
    'Mute',
    'Flashes',
    'Key bindings',
    'Export save',
    'Import save',
    'Back',
  ]);
  await page.keyboard.press('Escape');
  await flowIs(page, 'paused');
  await clickView(page, resume.x + 40, resume.y + 10);
  await flowIs(page, 'play');
  await page.keyboard.press('Escape');
  await flowIs(page, 'paused');
  await clickView(page, quit.x + 40, quit.y + 10);
  await flowIs(page, 'confirm');
  expect(await page.evaluate(() => window.__GAME__?.ui().flow.card?.lines)).toEqual(["Quit to the title? Anything you've picked up since you last entered the foundry will be lost."]);
  await clickRow(page, 'no');
  await flowIs(page, 'paused');
  await clickView(page, quit.x + 40, quit.y + 10);
  await clickRow(page, 'yes');
  await flowIs(page, 'title');
  expect(await page.evaluate(() => window.__GAME__?.getState())).toBeNull();
  expect(errors).toEqual([]);
});

test('settings persist across a reload: music 30%, flashes off, roll on Shift (and Shift rolls); a used key swaps', async ({ page }) => {
  // 064: two boots and a new game on the bigger world run past the default 30 s on CI.
  test.setTimeout(60_000);
  await bootTitle(page);
  await clickRow(page, 'settings');
  await flowIs(page, 'settings');
  for (let i = 0; i < 7; i++) await clickRow(page, 'music', 'down');
  await expect.poll(() => row(page, 'music').then((r) => r?.value)).toBe('30%');
  await clickRow(page, 'flashes');
  await expect.poll(() => row(page, 'flashes').then((r) => r?.value)).toBe('Off');
  await clickRow(page, 'keys');
  await clickRow(page, 'dodge');
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().flow.bindings?.waiting)).toBe('dodge');
  await page.keyboard.press('Shift');
  await expect.poll(() => row(page, 'dodge').then((r) => r?.value)).toBe('Shift');
  // G is flip's: binding it to Interact swaps, so Flip takes E.
  await clickRow(page, 'interact');
  await page.keyboard.press('g');
  await expect.poll(() => row(page, 'interact').then((r) => r?.value)).toBe('G');
  expect((await row(page, 'flip'))?.value).toBe('E');
  // A fixed key (Esc) cancels the wait and changes nothing.
  await clickRow(page, 'menu');
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().flow.bindings?.waiting)).toBeNull();
  expect((await row(page, 'menu'))?.value).toBe('C');
  await reloadTitle(page);
  const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}'), STORAGE_KEYS.settings);
  expect(stored).toMatchObject({ version: 1, music: 0.3, flashes: false, bindings: { dodge: 'SHIFT', interact: 'G', flip: 'E' } });
  await clickRow(page, 'settings');
  await flowIs(page, 'settings');
  expect((await row(page, 'music'))?.value).toBe('30%');
  expect((await row(page, 'flashes'))?.value).toBe('Off');
  // In a game, Shift rolls.
  await boot(page, '?start=field');
  await page.keyboard.down('d');
  await page.keyboard.press('Shift');
  await expect.poll(() => page.evaluate(() => window.__GAME__?.getState().player.rolling), { timeout: 3000 }).toBe(true);
  await page.keyboard.up('d');
});
