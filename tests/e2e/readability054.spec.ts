import { expect, test, type Page } from '@playwright/test';
import { BULWARK } from '../../src/data/bulwark';
import { XP_CURVE } from '../../src/data/leveling';
import { boot, cameraSettled, quietScreen } from './helpers';
import { bootSandbox, openPanel, setRound } from './sandboxPage';
import { frames, intoForum, sandbox, spawn, stepUntil } from './hollowsSandbox';

// 054: combat readability, as drawn. A burrowed Burrower's bar reads immune (blue, with its shield) and goes back as it
// surfaces; the Bulwark's back wave shades its area; an arrow through a Pool burns; a star shot's Shards are drawn in flight.

const barOf = (page: Page, id: number) => page.evaluate((eid) => window.__GAME__?.ui().enemyBars.find((b) => b.id === eid) ?? null, id);

test('a burrowed Burrower’s bar reads immune, and goes back once it surfaces', async ({ page }) => {
  test.setTimeout(120_000);
  await sandbox(page);
  const id = await spawn(page, 'burrower', 120, 40);
  await frames(page);
  expect(await barOf(page, id)).toMatchObject({ shown: false, immune: false });
  await stepUntil(page, id, 'chase', 5);
  expect(await page.evaluate((eid) => window.__GAME__?.getState().enemies.find((e) => e.id === eid)?.immune, id)).toBe(true);
  await expect.poll(() => barOf(page, id)).toMatchObject({ shown: true, immune: true });
  await stepUntil(page, id, 'recover', 1);
  await frames(page);
  await expect.poll(() => barOf(page, id)).toMatchObject({ immune: false });
});

test('the Bulwark’s back wave shades its area while it builds', async ({ page }) => {
  test.setTimeout(120_000);
  await intoForum(page);
  const building = await page.evaluate((every) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let t = 0; t < every * 3; t++) {
      const s = g.step(1);
      g.setPlayerHealth(100);
      if ((s.bosses[0]?.waveTicks ?? 0) > 4) return true;
    }
    return false;
  }, BULWARK.wave.everyTicks);
  expect(building).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().hollowsEnemies.waveShades)).toBe(1);
});

/** ?playtest at the wake stone with Blastfletch (through the Arrows lane, as 037's shots take it), settled. */
export async function withBlastfletch(page: Page): Promise<void> {
  await boot(page, '?playtest');
  const xp = XP_CURVE.slice(0, 4).reduce((n, x) => n + x, 0);
  await page.evaluate((amount) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.step(1);
    g.gainXp(amount);
    for (const id of ['a1', 'a2', 'a3', 'k1']) g.step(1, { takeTalent: id });
  }, xp);
  await cameraSettled(page, 20_000);
}

/** Throws a bomb 192 px right and looses arrows through its Pool; true once one has caught fire, the sim held there. */
export async function burningArrow(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    window.__helpers?.hold('bomb');
    const p = g.step(0).player;
    g.step(1, { use: true, aimX: p.x + 192, aimY: p.y });
    window.__helpers?.hold('arrow');
    for (let t = 0; t < 120; t++) {
      const s = g.step(1, { use: true, aimX: p.x + 300, aimY: p.y });
      // Held once a burning arrow has flown on past the Pool's middle, its flame and embers behind it.
      const a = s.arrows.find((r) => r.burning);
      if (a && a.x > p.x + 208) return true;
    }
    return false;
  });
}

test('an arrow through a Pool burns, and its hit flashes', async ({ page }) => {
  test.setTimeout(120_000);
  await withBlastfletch(page);
  expect(await burningArrow(page)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().tagged.burning)).toBeGreaterThan(0);
  const hit = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const a = g.getState().arrows.find((r) => r.burning);
    if (!a) return false;
    g.spawnEnemy('husk', a.x + 16, a.y);
    g.tweenSpeed(0.1);
    for (let t = 0; t < 30; t++) if (g.step(1).events.hits.some((h) => h.target === 'enemy' && h.burning)) return true;
    return false;
  });
  expect(hit).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().talentFx.burningFlashes)).toBeGreaterThan(0);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
});

/** `?sandbox` with Split bolts in every entrance, a Husk 150 px right and two more round it; fires and holds the sim `after` ticks past the burst. */
export async function starShot(page: Page, after: number): Promise<number> {
  await bootSandbox(page);
  await openPanel(page);
  await setRound(page, 0, 'ley-bolt+split');
  await setRound(page, 1, 'ley-bolt+split');
  await setRound(page, 2, 'ley-bolt+split');
  await page.keyboard.press('Backquote');
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().sandbox?.open)).toBe(false);
  await quietScreen(page);
  return page.evaluate((ticks) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const p = g.step(1).player;
    g.spawnEnemy('husk', p.x + 150, p.y);
    g.spawnEnemy('husk', p.x + 200, p.y - 50);
    g.spawnEnemy('husk', p.x + 190, p.y + 60);
    let s = g.step(1, { fire: true, aimX: p.x + 150, aimY: p.y - 4 });
    for (let t = 0; t < 60 && s.events.splits.length === 0; t++) s = g.step(1);
    if (s.events.splits.length === 0) return 0;
    if (ticks > 0) s = g.step(ticks);
    return s.arrows.filter((a) => a.ammoId === 'shard').length;
  }, after);
}

test('a star shot’s Shards are drawn in flight', async ({ page }) => {
  test.setTimeout(120_000);
  expect(await starShot(page, 3)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().tagged.shards)).toBeGreaterThan(0);
});
