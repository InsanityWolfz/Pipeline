import { expect, test } from '@playwright/test';
import { boot, watchErrors } from './helpers';
import { clickRow, flowIs } from './flowPage';

// The Forgewright (060) in the real game: past the Bulwark, up a ramp and in at the Anvil Hall's door, it wakes plated.
// Its boss bar shows the blue shield and its heat gauge filling; its bellows stand whole at its sides; hits on its body
// ring off its plating; and its whole fight draws with no missing frame.

test('in at the Anvil Hall’s door, the Forgewright wakes plated: a blue boss bar, its heat filling, its bellows whole', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  await boot(page, '?start=hollows');
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (const e of g.getState().enemies) if (e.enemyId !== 'forgewright' && e.enemyId !== 'conductor') g.setEnemyHealth(e.id, 0);
    g.step(200);
  });
  // The first kill's end card, if it shows here, closes on Keep playing.
  if ((await page.evaluate(() => window.__GAME__?.flow().state)) === 'endCard') {
    await clickRow(page, 'keepPlaying');
    await flowIs(page, 'play');
  }
  const woke = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.setPlayerHealth(100);
    h.enterArena('anvil-hall');
    g.setPlayerHealth(100);
    const s = g.step(30);
    return { inside: s.arenas.find((a) => a.id === 'anvil-hall')?.inside, boss: s.bosses.find((b) => b.enemyId === 'forgewright') };
  });
  expect(woke.inside).toBe(true);
  expect(woke.boss).toMatchObject({ engaged: true, plated: true });
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().bossBar))?.name).toBe('Forgewright');
  const bar = await page.evaluate(() => window.__GAME__?.ui().bossBar);
  expect(bar).toMatchObject({ shielded: true });
  expect(bar?.heat).toBeGreaterThan(0);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().emberworks))?.forge.bellows).toEqual(['whole', 'whole']);
  // A hit on its body rings off the plating.
  const blocked = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const boss = g.getState().bosses.find((b) => b.enemyId === 'forgewright');
    const f = g.getState().enemies.find((e) => e.id === boss?.id);
    if (!f) throw new Error('no Forgewright');
    let blocks = 0;
    for (let t = 0; t < 30; t++) {
      g.setPlayerHealth(100);
      blocks += g.step(1, { use: true, aimX: f.x, aimY: f.y - 24 }).events.blocked.length;
    }
    return { blocks, health: g.getState().bosses.find((b) => b.enemyId === 'forgewright')?.health };
  });
  expect(blocked.health).toBe(4000);
  expect(errors).toEqual([]);
});
