import { expect, type Page } from '@playwright/test';
import { pauseRows } from '../../src/render/craftMenuLayout';
import { clickRow, clickView, flowIs } from './flowPage';

// 071's e2e helpers: a Sniper spawned off screen through the dev hook, the sim stepped until it's a threat, and
// Settings' Off-screen warnings toggled from the pause menu.

/** A Sniper `dx`, `dy` px from the player, its cooldown ready; returns its id. */
export async function sniperAt(page: Page, dx: number, dy: number): Promise<number> {
  return page.evaluate(
    ([x, y]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.getState().player;
      const s = g.spawnEnemy('sniper', p.x + x, p.y + y);
      return s.enemies[s.enemies.length - 1]?.id ?? -1;
    },
    [dx, dy] as const,
  );
}

/** Turns Settings' Off-screen warnings off (or back on) from the pause menu, as a player would, and resumes play. */
export async function toggleWarnings(page: Page): Promise<void> {
  const [resume, settings] = pauseRows();
  if (!resume || !settings) throw new Error('no pause rows');
  await page.keyboard.press('Escape');
  await flowIs(page, 'paused');
  await clickView(page, settings.x + 40, settings.y + 10);
  await flowIs(page, 'settings');
  await clickRow(page, 'offscreenWarnings');
  await page.keyboard.press('Escape');
  await flowIs(page, 'paused');
  await clickView(page, resume.x + 40, resume.y + 10);
  await flowIs(page, 'play');
}

/** Steps a tick at a time, the player kept topped up, until the sim lists `id` as an off-screen threat. */
export async function stepUntilThreat(page: Page, id: number): Promise<void> {
  const ok = await page.evaluate((eid) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let i = 0; i < 600; i++) {
      if (g.getState().threats.some((t) => t.id === eid)) return true;
      g.step(1);
      g.setPlayerHealth(100);
    }
    return false;
  }, id);
  expect(ok, 'a threat').toBe(true);
}
