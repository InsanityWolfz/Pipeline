import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { STORAGE_KEYS } from '../../src/data/save';
import { bootTitle, clickRow, flowIs, newGameToFoundry, reloadTitle } from './flowPage';

// 042: Settings → Export save downloads the save (and every note); Import save checks a file like a stored save,
// asks, replaces the slot (the old one to the backup key) and merges the notes; Export damaged save gives the raw text.

test('export a save, import it into a fresh browser, and Continue matches', async ({ page, browser }) => {
  await bootTitle(page);
  await newGameToFoundry(page);
  const saved = await page.evaluate(() => window.__GAME__?.getState());
  await reloadTitle(page);
  // A note to send with it.
  await page.keyboard.press('f');
  await flowIs(page, 'feedback');
  await page.keyboard.type('a note for Shaun');
  await page.keyboard.press('Control+Enter');
  await flowIs(page, 'title');
  await clickRow(page, 'settings');
  await flowIs(page, 'settings');
  const [download] = await Promise.all([page.waitForEvent('download'), clickRow(page, 'export')]);
  expect(download.suggestedFilename()).toMatch(/^pipeline-save-\d{4}-\d\d-\d\d\.json$/);
  const path = await download.path();
  const file = JSON.parse(readFileSync(path, 'utf8')) as { format: string; save: { format: string }; feedback: { text: string }[] };
  expect(file.format).toBe('pipeline-export');
  expect(file.save.format).toBe('pipeline-save');
  expect(file.feedback.map((n) => n.text)).toEqual(['a note for Shaun']);

  const fresh = await browser.newContext();
  const other = await fresh.newPage();
  await bootTitle(other);
  expect(await other.evaluate(() => window.__GAME__?.flow().hasSave)).toBe(false);
  await clickRow(other, 'settings');
  await flowIs(other, 'settings');
  const [chooser] = await Promise.all([other.waitForEvent('filechooser'), clickRow(other, 'import')]);
  await chooser.setFiles(path);
  await flowIs(other, 'confirm');
  expect(await other.evaluate(() => window.__GAME__?.ui().flow.card?.lines)).toEqual(['Replace your saved game with this one?']);
  await clickRow(other, 'yes');
  await flowIs(other, 'settings');
  // Its notes merged in.
  expect(await other.evaluate(() => window.__GAME__?.flow().notes)).toBe(1);
  await clickRow(other, 'back');
  await flowIs(other, 'title');
  const line = await other.evaluate(() => window.__GAME__?.ui().flow.title?.rows.find((r) => r.id === 'continue'));
  expect(line?.usable).toBe(true);
  await clickRow(other, 'continue');
  await flowIs(other, 'play');
  await other.waitForFunction(() => window.__GAME__?.ui().ready === true);
  const restored = await other.evaluate(() => window.__GAME__?.step(0));
  expect(restored?.room).toBe('foundry');
  expect(restored?.inventory).toEqual(saved?.inventory);
  expect(restored?.foundry).toEqual(saved?.foundry);
  await fresh.close();
});

test('a bad file is refused with why, changing nothing; a damaged save exports as its raw text', async ({ page }, info) => {
  await page.addInitScript((k) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem(k, 'garbage {');
      sessionStorage.setItem('seeded', '1');
    }
  }, STORAGE_KEYS.save);
  await bootTitle(page);
  await clickRow(page, 'settings');
  await flowIs(page, 'settings');
  const [download] = await Promise.all([page.waitForEvent('download'), clickRow(page, 'damaged')]);
  expect(readFileSync(await download.path(), 'utf8')).toBe('garbage {');
  const bad = info.outputPath('bad.json');
  writeFileSync(bad, '{"hello": 1}');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), clickRow(page, 'import')]);
  await chooser.setFiles(bad);
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().flow.notice)).toBe('Not a Pipeline save.');
  expect(await page.evaluate(() => window.__GAME__?.flow().state)).toBe('settings');
  expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEYS.save)).toBe('garbage {');
});
