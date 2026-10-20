import { expect, test } from '@playwright/test';
import { STORAGE_KEYS } from '../../src/data/save';
import { watchErrors } from './helpers';
import { bootTitle, clickRow, flowIs, newGameToFoundry, reloadTitle } from './flowPage';

// 042: the game saves on entering the foundry; Continue wakes there with what was banked; New game asks first;
// a corrupt or newer save never crashes the game and is never overwritten.

const continueRow = (page: import('@playwright/test').Page) => page.evaluate(() => window.__GAME__?.ui().flow.title?.rows.find((r) => r.id === 'continue'));

test('entering the foundry saves; reload, Continue wakes there with the same factory and claims', async ({ page }) => {
  const errors = watchErrors(page);
  await bootTitle(page);
  await newGameToFoundry(page);
  await expect.poll(() => page.evaluate(() => window.__GAME__?.flow().saves)).toBe(1);
  const before = await page.evaluate(() => window.__GAME__?.getState());
  expect(before?.room).toBe('foundry');
  await reloadTitle(page);
  const row = await continueRow(page);
  expect(row?.usable).toBe(true);
  expect(row?.sub).toMatch(/^Level 1 · 0 pylons · saved \d+ [A-Z][a-z]{2}, \d\d:\d\d$/);
  await clickRow(page, 'continue');
  await flowIs(page, 'play');
  await page.waitForFunction(() => window.__GAME__?.ui().ready === true);
  const after = await page.evaluate(() => window.__GAME__?.step(0));
  expect(after?.room).toBe('foundry');
  expect(after?.claims).toEqual(before?.claims);
  expect(after?.foundry).toEqual(before?.foundry);
  expect(after?.inventory).toEqual(before?.inventory);
  expect(errors).toEqual([]);
});

test('only what was banked at the last foundry entry comes back', async ({ page }) => {
  await bootTitle(page);
  await newGameToFoundry(page);
  const banked = await page.evaluate(() => window.__GAME__?.getState().inventory);
  // Pick more up after entering (it isn't banked until the next entry), then close the game.
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    const p = g.getState().player;
    g.drop('wood', p.x + 20, p.y);
    g.drop('stone', p.x + 24, p.y);
    h.collect();
  });
  const carried = await page.evaluate(() => window.__GAME__?.getState().inventory);
  expect(carried).not.toEqual(banked);
  await reloadTitle(page);
  await clickRow(page, 'continue');
  await flowIs(page, 'play');
  await page.waitForFunction(() => window.__GAME__?.ui().ready === true);
  expect(await page.evaluate(() => window.__GAME__?.step(0).inventory)).toEqual(banked);
});

test('New game with a save asks first: Cancel keeps it, confirming moves it to the backup and starts', async ({ page }) => {
  await bootTitle(page);
  await newGameToFoundry(page);
  await reloadTitle(page);
  await clickRow(page, 'newGame');
  await flowIs(page, 'confirm');
  expect(await page.evaluate(() => window.__GAME__?.ui().flow.card?.lines)).toEqual(['Start a new game? Your saved game will be replaced.']);
  await clickRow(page, 'no');
  await flowIs(page, 'title');
  expect(await page.evaluate(() => window.__GAME__?.flow().hasSave)).toBe(true);
  await clickRow(page, 'newGame');
  await clickRow(page, 'yes');
  await flowIs(page, 'play');
  const keys = await page.evaluate((k) => ({ save: localStorage.getItem(k.save), backup: localStorage.getItem(k.backup) }), STORAGE_KEYS);
  expect(keys.save).toBeNull();
  expect(keys.backup).toContain('pipeline-save');
});

test('a corrupt save greys Continue out and nothing throws; a newer one is never overwritten', async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript((k) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem(k, 'garbage {');
      sessionStorage.setItem('seeded', '1');
    }
  }, STORAGE_KEYS.save);
  await bootTitle(page);
  expect(await continueRow(page)).toMatchObject({ usable: false, sub: "Your save couldn't be read." });
  expect(await page.evaluate(() => window.__GAME__?.flow().saveStatus)).toBe('corrupt');
  const newer = JSON.stringify({ format: 'pipeline-save', version: 999, build: 'x', savedAt: '2030-01-01T00:00:00Z', meta: { endCardSeen: false }, state: {} });
  await page.evaluate(([k, v]) => localStorage.setItem(k ?? '', v ?? ''), [STORAGE_KEYS.save, newer]);
  await reloadTitle(page);
  expect(await continueRow(page)).toMatchObject({ usable: false, sub: 'This save is from a newer version of the game.' });
  // Cancelling New game keeps it.
  await clickRow(page, 'newGame');
  await clickRow(page, 'no');
  expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEYS.save)).toBe(newer);
  expect(errors).toEqual([]);
});

test('a newer save written while a game runs (another tab) is never overwritten by a foundry entry', async ({ page }) => {
  await bootTitle(page);
  const newer = JSON.stringify({ format: 'pipeline-save', version: 999, build: 'x', savedAt: '2030-01-01T00:00:00Z', meta: { endCardSeen: false }, state: {} });
  await clickRow(page, 'newGame');
  await flowIs(page, 'play');
  await page.evaluate(([k, v]) => localStorage.setItem(k ?? '', v ?? ''), [STORAGE_KEYS.save, newer]);
  await page.waitForFunction(() => window.__GAME__?.ui().ready === true);
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(0);
    for (const e of g.getState().enemies) if (e.group === 'field') g.setEnemyHealth(e.id, 0);
    g.step(3);
    h.toFoundry();
  });
  expect(await page.evaluate(() => window.__GAME__?.getState().room)).toBe('foundry');
  expect(await page.evaluate(() => window.__GAME__?.flow().saves)).toBe(0);
  expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEYS.save)).toBe(newer);
});
