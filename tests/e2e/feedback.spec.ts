import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { END_CARD } from '../../src/data/endCard';
import { boot } from './helpers';
import { bootTitle, clickRow, flowIs } from './flowPage';

// 042: F opens a feedback note at any time (in play, on the title, on the end card); typing never reaches the game's
// keys; a saved note keeps the flow state and a game-state snapshot, and goes in the export.

const note = (page: Page) => page.evaluate(() => window.__GAME__?.ui().flow.note);
const lastNote = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('pipeline.feedback') ?? '[]').at(-1));

test('F in play: typing reaches the note, not the game; the note keeps a snapshot of getState()', async ({ page }) => {
  await boot(page, '?start=field');
  const before = await page.evaluate(() => window.__GAME__?.sound());
  await page.keyboard.press('f');
  await flowIs(page, 'feedback');
  const snapshot = await page.evaluate(() => window.__GAME__?.getState());
  // Keys that would move, mute, open the craft menu or build, typed into the note.
  await page.keyboard.type('wasd m c b i: the Bulwark felt fair');
  await page.keyboard.press('Enter');
  await page.keyboard.type('second line');
  expect((await note(page))?.text).toBe('wasd m c b i: the Bulwark felt fair\nsecond line');
  expect(await page.evaluate(() => window.__GAME__?.sound())).toEqual(before);
  await page.keyboard.press('Control+Enter');
  await flowIs(page, 'play');
  expect(await page.evaluate(() => window.__GAME__?.ui().craftOpen)).toBe(false);
  expect(await page.evaluate(() => window.__GAME__?.flow().notes)).toBe(1);
  const saved = await lastNote(page);
  expect(saved).toMatchObject({ state: 'play', text: 'wasd m c b i: the Bulwark felt fair\nsecond line', build: 'dev' });
  expect(saved.snapshot.tick).toBe(snapshot?.tick);
  expect(saved.snapshot.player).toEqual(snapshot?.player);
  expect(await page.evaluate(() => window.__GAME__?.ui().flow.notice)).toBe('Note saved. It goes with your save when you export it (Settings → Export save).');
});

test('F on the title (no snapshot), Cancel keeps nothing, and the notes go in the export', async ({ page }) => {
  await bootTitle(page);
  await page.keyboard.press('f');
  await flowIs(page, 'feedback');
  await page.keyboard.type('nothing to keep');
  await clickRow(page, 'cancelNote');
  await flowIs(page, 'title');
  expect(await page.evaluate(() => window.__GAME__?.flow().notes)).toBe(0);
  await page.keyboard.press('f');
  await flowIs(page, 'feedback');
  await page.keyboard.type('the title looks lovely');
  await clickRow(page, 'saveNote');
  await flowIs(page, 'title');
  expect(await lastNote(page)).toMatchObject({ state: 'title', text: 'the title looks lovely', snapshot: null });
  await clickRow(page, 'settings');
  await flowIs(page, 'settings');
  expect((await page.evaluate(() => window.__GAME__?.ui().flow.settings?.rows.find((r) => r.id === 'export')))?.sub).toBe('1 feedback note stored');
  const [download] = await Promise.all([page.waitForEvent('download'), clickRow(page, 'export')]);
  const file = JSON.parse(readFileSync(await download.path(), 'utf8')) as { save: unknown; feedback: { text: string }[] };
  expect(file.save).toBeNull();
  expect(file.feedback.map((n) => n.text)).toEqual(['the title looks lovely']);
});

test('Leave feedback on the end card opens the note over it, and closing it returns to the card', async ({ page }) => {
  await boot(page, '?start=hollows');
  await page.evaluate(
    ([n, boss]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.step(0);
      // 060: the Forgewright's first kill ends the demo.
      const b = g.getState().enemies.find((e) => e.enemyId === boss);
      if (b) g.setEnemyHealth(b.id, 0);
      g.step(n + 1);
    },
    [END_CARD.delayTicks, END_CARD.boss] as const,
  );
  await flowIs(page, 'endCard');
  await page.keyboard.press('f');
  await flowIs(page, 'feedback');
  await page.keyboard.press('Escape');
  await flowIs(page, 'endCard');
  await clickRow(page, 'leaveFeedback');
  await flowIs(page, 'feedback');
  await page.keyboard.type('beat it first try');
  await clickRow(page, 'saveNote');
  await flowIs(page, 'endCard');
  expect(await lastNote(page)).toMatchObject({ state: 'endCard', text: 'beat it first try' });
});
