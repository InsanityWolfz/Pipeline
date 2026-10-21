import { expect, type Page } from '@playwright/test';
import { XP_CURVE } from '../../src/data/leveling';
import { boot, cameraSettled, quietScreen } from './helpers';
import { bootSandbox, openPanel, setRound } from './sandboxPage';

// 054's setups for its e2e and review shots: Blastfletch taken and an arrow burning past its Pool, and a star shot
// fired from the sandbox, the sim held just after its burst.

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

/** Throws a bomb 192 px right and looses arrows through its Pool; true once one has caught fire, the sim held there (its flight then stepped `after` ticks, a frame drawn after each so its trail draws). */
export async function burningArrow(page: Page, after = 0): Promise<boolean> {
  const caught = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    window.__helpers?.hold('bomb');
    const p = g.step(0).player;
    g.step(1, { use: true, aimX: p.x + 192, aimY: p.y });
    window.__helpers?.hold('arrow');
    for (let t = 0; t < 120; t++) {
      const s = g.step(1, { use: true, aimX: p.x + 300, aimY: p.y });
      if (s.arrows.some((r) => r.burning)) return true;
    }
    return false;
  });
  for (let i = 0; i < after; i++) {
    await page.evaluate(async () => {
      window.__GAME__?.step(1);
      for (let k = 0; k < 2; k++) await new Promise((r) => requestAnimationFrame(r));
    });
  }
  return caught;
}

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
