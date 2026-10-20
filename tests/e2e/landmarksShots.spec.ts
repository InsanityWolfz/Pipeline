import { expect, test, type Page } from '@playwright/test';
import { CLAIM_TICKS, FIXTURES } from '../../src/data/claims';
import { LANDMARKS } from '../../src/data/landmarks';
import { boot, cameraSettled } from './helpers';

// Review screenshots for 032 (REVIEW_SHOTS=1, into docs/review/032): each landmark, the
// minimap before and after finding the Quarry, the discovery banner, a claimed Quarry
// pylon with a mote running home, the stone port at "×2 pylons", the cache sealed and
// opened, champions beside normal enemies, and the new art on the contact sheet. Under
// the hook the sim holds still between steps, so a woken guard stays where it stood.

const SHOTS = 'docs/review/032';

/** Kills every landmark guard but `keep`'s through the hook, so the walk there is quiet. */
async function quiet(page: Page, keep: string | null): Promise<void> {
  await page.evaluate((k) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const ids = g.getState().landmarks.map((l) => l.id);
    for (const e of g.getState().enemies) if (ids.includes(e.group) && e.group !== k) g.setEnemyHealth(e.id, 0);
    g.step(1);
  }, keep);
}

/** Plays out every discovery banner the walk queued (fast, on the tween clock), so none covers the shot. */
async function bannersGone(page: Page): Promise<void> {
  await page.evaluate(() => window.__GAME__?.tweenSpeed(10));
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().landmarks))?.banner, { timeout: 20_000 }).toBeNull();
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
}

async function walk(page: Page, points: readonly (readonly [number, number])[]): Promise<void> {
  await page.evaluate((pts) => {
    const h = window.__helpers;
    if (!h) throw new Error('no helpers');
    // 032's tiles, moved +40 with Region 1 (034).
    for (const [tx, ty] of pts) h.walkTo((tx + h.ox + 0.5) * 32, (ty + 0.5) * 32);
  }, points);
}

test.describe('review screenshots (032)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/032');

  // Each from a fresh start with its own guards in place (the others are cleared so the walk is quiet), once the
  // banner has gone.
  const views: [string, string, (readonly [number, number])[]][] = [
    ['quarry', '01-quarry', [[30, 25], [23, 22], [22, 19]]],
    ['old-grove', '02-old-grove', [[12, 26], [11, 20]]],
    ['ley-grotto', '03-ley-grotto', [[66, 18], [72, 26]]],
    ['reed-marsh', '04-reed-marsh', [[66, 30], [69, 34]]],
    ['ruined-cache', '05-ruined-cache-sealed', [[12, 30], [11, 35], [11, 36]]],
    ['frozen-grotto', '06-frozen-grotto', [[14, 15], [15, 11]]],
    ['west-spring', '07-west-spring', [[10, 34]]],
    ['south-east-spring', '08-south-east-spring', [[66, 41]]],
    ['north-spring', '09-north-spring', [[26, 11]]],
  ];
  for (const [id, file, points] of views) {
    test(`the landmark ${id}`, async ({ page }) => {
      test.setTimeout(120_000);
      await boot(page);
      await quiet(page, id);
      await walk(page, points);
      await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.getState()))?.discovered.includes(id)).toBe(true);
      await page.evaluate(() => window.__GAME__?.setPlayerHealth(100));
      await bannersGone(page);
      await cameraSettled(page, 20_000);
      await page.screenshot({ path: `${SHOTS}/${file}.png` });
    });
  }

  test('the minimap before and after finding the Quarry, and the discovery banner', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page);
    await page.evaluate(() => window.__GAME__?.step(1));
    await cameraSettled(page);
    await page.screenshot({ path: `${SHOTS}/10-minimap-before-quarry.png`, clip: { x: 0, y: 0, width: 1280, height: 240 } });
    await walk(page, [[30, 25], [23, 22]]);
    // The banner held still on the tween clock once it has faded in.
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().landmarks))?.banner).toBe('quarry');
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().landmarks))?.bannerAlpha, { intervals: [10] }).toBe(1);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0.001));
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/11-minimap-after-quarry-and-banner.png` });
    await page.screenshot({ path: `${SHOTS}/12-discovery-banner.png`, clip: { x: 320, y: 160, width: 640, height: 160 } });
    expect((await page.evaluate(() => window.__GAME__?.ui().minimap))?.markers.some((m) => m.kind === 'site')).toBe(true);
  });

  test('a claimed Quarry pylon with a mote running home, and the stone port at ×2 pylons', async ({ page }) => {
    test.setTimeout(150_000);
    await boot(page);
    await quiet(page, null);
    await walk(page, [[30, 25], [23, 22], [21, 21]]);
    await bannersGone(page);
    // The shrine claimed just now, so the Quarry's claim lands before the ports' first push.
    await page.evaluate((ticks) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.claim('shrine');
      g.step(1, { interact: true });
      g.step(ticks + 2);
    }, CLAIM_TICKS);
    // Step a little to the east so the line home shows, then wait for a stone mote leaving the Quarry.
    await walk(page, [[23, 22]]);
    await expect
      .poll(
        async () => {
          await page.evaluate(() => window.__GAME__?.step(1));
          const m = (await page.evaluate(() => window.__GAME__?.ui().supply))?.inFlight.find((x) => x.site === 'quarry');
          return m !== undefined && m.progress > 0.03 && m.progress < 0.2;
        },
        { timeout: 60_000, intervals: [16] },
      )
      .toBe(true);
    await page.screenshot({ path: `${SHOTS}/13-quarry-pylon-mote.png` });

    const port = FIXTURES.find((f) => f.raw === 'stone');
    if (!port) throw new Error('no stone port');
    await page.evaluate(([tx, ty]) => {
      const h = window.__helpers;
      if (!h) throw new Error('no helpers');
      h.toFoundry();
      h.walkTo((tx + 3.5) * 32, (ty + 0.5) * 32);
    }, [port.tx, port.ty] as const);
    expect((await page.evaluate(() => window.__GAME__?.getState()))?.ports.find((p) => p.raw === 'stone')?.pylons).toBe(2);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/14-stone-port-two-pylons.png` });
  });

  test('the cache sealed with its guards, then opened with its drops', async ({ page }) => {
    test.setTimeout(150_000);
    await boot(page);
    await quiet(page, null);
    // Beside it, to its west, so the player never hides it.
    await walk(page, [[12, 30], [10, 39], [10, 38]]);
    await bannersGone(page);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/15-cache-sealed-close.png` });
    // Opened: the drops fly to the player at once, so the slides are slowed to catch them, and the seal's light with them.
    await page.evaluate((ticks) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.step(1, { interact: true });
      g.step(ticks - 2);
      g.tweenSpeed(0.03);
      g.step(1);
    }, LANDMARKS.cacheOpenTicks);
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().landmarks))?.caches['ruined-cache']).toBe('open');
    await page.screenshot({ path: `${SHOTS}/16-cache-opened-drops.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().landmarks))?.caches['ruined-cache'], { timeout: 20_000 }).toBe('empty');
    await page.screenshot({ path: `${SHOTS}/17-cache-empty.png` });
  });

  test('a champion Husk and a champion Wisp beside normal ones', async ({ page }) => {
    test.setTimeout(90_000);
    await boot(page);
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      const s = g.getState();
      h.walkTo(s.player.x - 4 * 32, s.player.y - 2 * 32);
      g.spawnChampionPack(['husk', 'husk'], 0);
      h.walkTo(g.getState().player.x, g.getState().player.y + 3 * 32);
      g.spawnChampionPack(['wisp', 'wisp'], 0);
      h.walkTo(g.getState().player.x, g.getState().player.y - 1.5 * 32);
      // Damaged, so the champions' gold health bars show beside the normal red ones.
      for (const e of g.getState().enemies.filter((x) => x.group === 'dev')) g.setEnemyHealth(e.id, Math.round(e.maxHealth * 0.6));
      g.step(1);
    });
    // The two spawned here (a landmark's or a pack's elsewhere in the room may be drawn too).
    await expect
      .poll(async () => {
        const ids = (await page.evaluate(() => window.__GAME__?.getState()))?.enemies.filter((e) => e.group === 'dev').map((e) => e.id) ?? [];
        return (await page.evaluate(() => window.__GAME__?.ui().champions))?.filter((c) => ids.includes(c.id)).map((c) => c.kind);
      })
      .toEqual(['Husk champion', 'Wisp champion']);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/18-champions.png` });
  });

  test('the new art on the contact sheet, at 4x', async ({ page }) => {
    await page.goto('/sheet.html');
    const row = (title: string) => page.locator('h2', { hasText: title }).locator('xpath=following-sibling::div[1]');
    await expect(row('Landmarks (032)')).toBeVisible();
    await row('Landmarks (032)').screenshot({ path: `${SHOTS}/19-sheet-landmarks.png` });
  });
});
