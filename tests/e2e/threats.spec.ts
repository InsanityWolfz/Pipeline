import { expect, test } from '@playwright/test';
import { STORAGE_KEYS } from '../../src/data/save';
import { HOLLOWS_LOOK } from '../../src/data/hollowsAssets';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { ARROW_CLEAR } from '../../src/render/threatPlace';
import { watchErrors } from './helpers';
import { intoForum } from './hollowsSandbox';
import { bootSandbox } from './sandboxPage';
import { sniperAt, stepUntilThreat, toggleWarnings } from './threatsPage';

// 071: an enemy off screen winding up on the player shows a pulsing red arrow at the screen's edge on the line from the
// player to it, which fades once the attack lands. Every check reads the sim's state and the test hook's ui().

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
  expect(arrow.y).toBeCloseTo(cam.y - VIEW_HEIGHT / 2 + ARROW_CLEAR, 0);
  // It fires: the arrow fades and goes.
  await page.evaluate((eid) => {
    const g = window.__GAME__;
    for (let i = 0; i < 200 && g?.getState().enemies.find((e) => e.id === eid)?.mode === 'windup'; i++) g.step(1);
  }, id);
  expect(await page.evaluate(() => window.__GAME__?.getState().threats)).toEqual([]);
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().threats.length)).toBe(0);
  expect(errors).toEqual([]);
});

test('with Off-screen warnings off (kept in the stored settings), the same Sniper shows no arrow', async ({ page }) => {
  const errors = watchErrors(page);
  await bootSandbox(page);
  await toggleWarnings(page);
  const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}'), STORAGE_KEYS.settings);
  expect(stored).toMatchObject({ offscreenWarnings: false });
  await page.evaluate(() => window.__GAME__?.step(0));
  const id = await sniperAt(page, 180, -240);
  await stepUntilThreat(page, id);
  // The sim still lists it; once a frame has drawn that tick, render shows nothing for it.
  const tick = (await page.evaluate(() => window.__GAME__?.getState().tick)) ?? -1;
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().drawnTick)).toBe(tick);
  expect(await page.evaluate(() => window.__GAME__?.ui().threats)).toEqual([]);
  expect(errors).toEqual([]);
});

test("in the Bulwark's fight its lob shows an arrow only while it's off the camera's real view, clear of the boss bar and objective", async ({ page }) => {
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  await intoForum(page);
  const bulwark = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let i = 0; i < 1200; i++) {
      const b = g.getState().enemies.find((e) => e.enemyId === 'bulwark');
      if (b?.mode === 'lob') return b;
      g.step(1);
      g.setPlayerHealth(100);
    }
    return null;
  });
  if (!bulwark) throw new Error('the Bulwark never lobbed');
  const tick = (await page.evaluate(() => window.__GAME__?.getState().tick)) ?? -1;
  await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().drawnTick)).toBe(tick);
  const ui = await page.evaluate(() => window.__GAME__?.ui());
  if (!ui) throw new Error('no ui');
  // The scene hands the arrows the boss bar's box (its frame, along the top) and the objective band's when it shows.
  const B = HOLLOWS_LOOK.bossBar;
  expect(ui.threatClear.some((b) => b.y < B.top && b.y + b.h >= B.top + B.h && b.w >= B.w && Math.abs(b.x + b.w / 2 - VIEW_WIDTH / 2) < 8)).toBe(true);
  const band = ui.objective.box;
  if (band) expect(ui.threatClear).toContainEqual(band);
  // An arrow for it exactly when its feet are outside what the camera shows (the boss lift included).
  const off = Math.abs(bulwark.x - ui.camera.x) > VIEW_WIDTH / 2 || Math.abs(bulwark.y - ui.camera.y) > VIEW_HEIGHT / 2;
  expect(ui.threats.map((t) => t.ids)).toEqual(off ? [[bulwark.id]] : []);
  expect(errors).toEqual([]);
});
