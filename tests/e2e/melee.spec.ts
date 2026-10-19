import { expect, test, type Page } from '@playwright/test';
import { MELEE } from '../../src/data/combat';
import { boot, watchErrors } from './helpers';

// Melee (023): before the tube is taken, fire punches. With REVIEW_SHOTS=1, the
// review screenshot of the swoosh mid-punch in docs/review/023.

const SHOTS = 'docs/review/023';

/**
 * From the real start (no tube), walks toward the nearest Husk and waits for it
 * to close in, then punches it once. Returns the Husk and player before the
 * punch, the punch tick's state, and the Husk once `settle` more ticks have run.
 */
function punchNearestHusk(page: Page, settle: number) {
  return page.evaluate((settle) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    let s = g.step(0);
    const p0 = s.player;
    const husks = () => s.enemies.filter((e) => e.room === s.room && e.enemyId === 'husk');
    const dist = (e: { x: number; y: number }) => Math.hypot(e.x - s.player.x, e.y - s.player.y);
    const first = husks().sort((a, b) => Math.hypot(a.x - p0.x, a.y - p0.y) - Math.hypot(b.x - p0.x, b.y - p0.y))[0];
    if (!first) throw new Error('no Husk');
    // Close enough that the pack sees the player, then stand still while the nearest closes in to swing range.
    h.walkTo(first.x, first.y + 150);
    s = g.step(0);
    let near = husks().sort((a, b) => dist(a) - dist(b))[0];
    for (let t = 0; t < 600 && near && dist(near) > 30; t++) {
      s = g.step(1, { aimX: near.x, aimY: near.y });
      near = husks().sort((a, b) => dist(a) - dist(b))[0];
    }
    if (!near || dist(near) > 30) throw new Error(`no Husk came within a punch: ${JSON.stringify(near)} ${JSON.stringify(s.player)}`);
    const before = near;
    const player = s.player;
    const punched = g.step(1, { fire: true, aimX: before.x, aimY: before.y });
    const after = g.step(settle).enemies.find((e) => e.id === before.id);
    return { before, player, punched, after };
  }, settle);
}

test('a punch before taking the tube hurts a Husk and knocks it away', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '');
  const { before, player, punched, after } = await punchNearestHusk(page, MELEE.knockTicks);
  expect(punched.hasTube).toBe(false);
  expect(punched.events.melees).toHaveLength(1);
  expect(punched.events.melees[0]?.hits).toContain(before.id);
  const hit = punched.enemies.find((e) => e.id === before.id);
  expect(hit?.health).toBe(before.health - MELEE.damage);
  expect(punched.tube.meleeCooldown).toBe(MELEE.cooldownTicks);
  // It moved away from where the player stood.
  if (!after) throw new Error('the Husk is gone');
  const [ux, uy] = [before.x - player.x, before.y - player.y];
  const away = ((after.x - before.x) * ux + (after.y - before.y) * uy) / Math.hypot(ux, uy);
  expect(away).toBeGreaterThan(MELEE.knockback / 2);
  expect(errors).toEqual([]);
});

test.describe('review screenshots (023)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/023');

  test('the swoosh mid-punch, with a fist', async ({ page }) => {
    await boot(page, '');
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
    // Held on the punch's own tick: the jab is full and the swoosh holds (tweens stopped).
    const { punched } = await punchNearestHusk(page, 0);
    expect(punched.events.melees[0]?.hits.length).toBeGreaterThan(0);
    // The camera eases after the player in real time (for the picture only).
    await page.waitForTimeout(1500);
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui()))?.swooshes ?? 0).toBeGreaterThan(0);
    await page.screenshot({ path: `${SHOTS}/01-swoosh-fist.png` });
  });

  test('the swoosh mid-punch, with the tube empty', async ({ page }) => {
    await boot(page, '?start=field');
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.tweenSpeed(0);
      const p = g.step(0).player;
      // Spend the 30 carried arrows, then punch toward the open meadow to the east.
      g.step(15 * 29 + 1, { fire: true, aimX: p.x + 100, aimY: p.y - 20 });
      g.step(15, { fire: true, aimX: p.x + 100, aimY: p.y - 20 });
    });
    // The camera eases after the player in real time (for the picture only).
    await page.waitForTimeout(1500);
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui()))?.swooshes ?? 0).toBeGreaterThan(0);
    await page.screenshot({ path: `${SHOTS}/02-swoosh-tube.png` });
  });
});
