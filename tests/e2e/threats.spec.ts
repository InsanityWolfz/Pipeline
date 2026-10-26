import { expect, test, type Page } from '@playwright/test';
import { THREAT_ARROW } from '../../src/data/threats';
import { watchErrors } from './helpers';
import { bootSandbox } from './sandboxPage';

// 071: an enemy off screen winding up on the player shows a pulsing red arrow at the screen's edge on the line from the
// player to it, which fades once the attack lands. Every check reads the sim's state and the test hook's ui().

/** A Sniper `dx`, `dy` px from the player, its cooldown ready; returns its id. */
async function sniperAt(page: Page, dx: number, dy: number): Promise<number> {
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

/** Steps a tick at a time, the player kept topped up, until the sim lists `id` as an off-screen threat. */
async function stepUntilThreat(page: Page, id: number): Promise<void> {
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

test('a sandbox Sniper winding up off screen shows a red arrow at the edge toward it, gone once it fires', async ({ page }) => {
  const errors = watchErrors(page);
  await bootSandbox(page);
  await page.evaluate(() => window.__GAME__?.step(0));
  const id = await sniperAt(page, 180, -240);
  await stepUntilThreat(page, id);
  const state = await page.evaluate(() => window.__GAME__?.getState());
  const sniper = state?.enemies.find((e) => e.id === id);
  if (!state || !sniper) throw new Error('no sniper');
  expect(sniper.mode).toBe('windup');
  // Drawn at the view's edge, on the line from the player to it.
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().threats.length)).toBe(1);
  const ui = await page.evaluate(() => window.__GAME__?.ui());
  const arrow = ui?.threats[0];
  const cam = ui?.camera;
  if (!arrow || !cam) throw new Error('no arrow');
  expect(arrow.ids).toEqual([id]);
  expect(arrow.alpha).toBeGreaterThan(0);
  expect(arrow.angle).toBeCloseTo(Math.atan2(sniper.y - state.player.y, sniper.x - state.player.x), 1);
  expect(arrow.y).toBeCloseTo(cam.y - 180 + THREAT_ARROW.edgeInset, 0);
  // It fires: the arrow fades and goes.
  await page.evaluate((eid) => {
    const g = window.__GAME__;
    for (let i = 0; i < 200 && g?.getState().enemies.find((e) => e.id === eid)?.mode === 'windup'; i++) g.step(1);
  }, id);
  expect(await page.evaluate(() => window.__GAME__?.getState().threats)).toEqual([]);
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().threats.length)).toBe(0);
  expect(errors).toEqual([]);
});
