import { expect, test } from '@playwright/test';
import { END_CARD } from '../../src/data/endCard';
import { boot } from './helpers';
import { clickRow, flowIs } from './flowPage';

// 042: the end of the demo: the Bulwark's first kill shows the card 180 ticks later and pauses the world; Keep
// playing resumes free play; a refight shows no card.

test('the Bulwark’s first kill shows the end card after 180 ticks; Keep playing resumes; a refight shows none', async ({ page }) => {
  await boot(page, '?start=hollows');
  const id = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.step(0);
    const b = g.getState().enemies.find((e) => e.enemyId === 'bulwark');
    if (!b) throw new Error('no Bulwark');
    g.setEnemyHealth(b.id, 0);
    g.step(1);
    return b.id;
  });
  expect(await page.evaluate(() => window.__GAME__?.getState().bossDefeats)).toContain('bulwark');
  await page.evaluate((n) => window.__GAME__?.step(n), END_CARD.delayTicks - 2);
  expect(await page.evaluate(() => window.__GAME__?.flow().state)).toBe('play');
  await page.evaluate(() => window.__GAME__?.step(2));
  await flowIs(page, 'endCard');
  const card = await page.evaluate(() => window.__GAME__?.ui().flow.endCard);
  expect(card?.lines).toEqual([END_CARD.title, END_CARD.nextTitle, ...END_CARD.next, END_CARD.thanks, END_CARD.prompt]);
  expect(card?.rows.map((r) => r.label)).toEqual(['Leave feedback', 'Keep playing']);
  await clickRow(page, 'keepPlaying');
  await flowIs(page, 'play');
  // A refight (a Bulwark again, killed again) isn't a first kill: no card.
  await page.evaluate((old) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const p = g.getState().player;
    g.spawnEnemy('bulwark', p.x + 200, p.y);
    const b = g.getState().enemies.find((e) => e.enemyId === 'bulwark' && e.id !== old);
    if (b) g.setEnemyHealth(b.id, 0);
    g.step(400);
  }, id);
  expect(await page.evaluate(() => window.__GAME__?.flow().state)).toBe('play');
});
