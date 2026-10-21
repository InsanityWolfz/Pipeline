import { expect, test, type Page } from '@playwright/test';
import { SUPPLY_TICKS } from '../../src/data/claims';
import { landmarkDef } from '../../src/data/landmarks';
import { boot, cameraSettled, quietScreen, watchErrors } from './helpers';

// 049: the Husk Hive. Find it (its minimap marker), claim it through the hook and see Husk resin arrive at the resin
// port in getState(); and, with REVIEW_SHOTS=1, review shots into docs/review/049: the Hive unclaimed with its guards,
// the seep in its stages (the contact sheet), the claimed pylon with a resin mote running home, and the resin port.

const SHOTS = 'docs/review/049';
const HIVE = landmarkDef('husk-hive');
const PYLON = HIVE.pylon ?? { tx: 0, ty: 0 };

/** Walks the player through tile points (absolute tiles). */
async function walk(page: Page, points: readonly (readonly [number, number])[]): Promise<void> {
  await page.evaluate((pts) => {
    const h = window.__helpers;
    if (!h) throw new Error('no helpers');
    for (const [tx, ty] of pts) h.walkTo((tx + 0.5) * 32, (ty + 0.5) * 32);
  }, points);
}

/** Kills every landmark guard but `keep`'s through the hook, so the walk there is quiet. */
async function quiet(page: Page, keep: string | null): Promise<void> {
  await page.evaluate((k) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const ids = g.getState().landmarks.map((l) => l.id);
    for (const e of g.getState().enemies) if ((ids.includes(e.group) || e.group.startsWith('pop-')) && e.group !== k) g.setEnemyHealth(e.id, 0);
    g.step(1);
  }, keep);
}

/** South-east from the meadow along the path to the Hive's west side. */
const TO_HIVE: readonly (readonly [number, number])[] = [
  [88, 37],
  [94, 40],
  [97, 40],
];

test('walking to the Husk Hive finds it: its minimap marker shows; claimed, it sends resin up the resin port', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page);
  await quiet(page, null);
  await walk(page, TO_HIVE);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.getState()))?.discovered.includes('husk-hive')).toBe(true);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().minimap))?.markers.find((m) => 'landmark' in m && m.landmark === 'husk-hive')?.kind).toBe('site');
  // Claimed (the shrine first: a site's pylon wakes once it's claimed), the resin port stands at ×1.
  const claimed = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.claim('shrine');
    return g.claim('husk-hive');
  });
  expect(claimed.claims).toEqual(['shrine', 'husk-hive']);
  expect(claimed.landmarks.find((l) => l.id === 'husk-hive')).toMatchObject({ discovered: true, claimed: true });
  expect(claimed.ports.find((p) => p.raw === 'husk-resin')).toMatchObject({ id: 'husk-resin-port', pylons: 1, perMinute: 15 });
  // With nothing in front of it, the first resin waits in the port.
  await expect
    .poll(
      async () => {
        await page.evaluate((t) => window.__GAME__?.step(t), SUPPLY_TICKS / 4);
        return (await page.evaluate(() => window.__GAME__?.getState()))?.fixtures.find((f) => f.id === 'husk-resin-port')?.item;
      },
      { timeout: 30_000 },
    )
    .toBe('husk-resin');
  expect(errors).toEqual([]);
});

test.describe('review screenshots (049)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/049');

  test('the Hive unclaimed, with its guards and their champion', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page);
    await quiet(page, 'husk-hive');
    await walk(page, TO_HIVE);
    await page.evaluate(() => window.__GAME__?.setPlayerHealth(100));
    await quietScreen(page);
    await cameraSettled(page, 20_000);
    const champs = await page.evaluate(() => window.__GAME__?.ui().champions);
    expect(champs?.some((c) => c.kind === 'Husk champion')).toBe(true);
    await page.screenshot({ path: `${SHOTS}/01-hive-unclaimed-guards.png` });
  });

  test('the resin seep in its stages, and the nest stones, on the contact sheet at 4x', async ({ page }) => {
    await page.goto('/sheet.html');
    const row = page.locator('h2', { hasText: 'The Husk Hive (049)' }).locator('xpath=following-sibling::div[1]');
    await expect(row).toBeVisible();
    await row.screenshot({ path: `${SHOTS}/02-sheet-seep-stages-and-stones.png` });
  });

  test('a seep worked down in the world, beside full ones', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page);
    await quiet(page, null);
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (const e of g.getState().enemies.filter((x) => x.group === 'husk-hive')) g.setEnemyHealth(e.id, 0);
      g.step(1);
    });
    await walk(page, TO_HIVE);
    // Two harvests off the west seep (99, 37), standing just below it.
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      const n = g.getState().nodes.find((x) => x.nodeId === 'resin-seep' && x.x < 100 * 32 && x.y < 38 * 32);
      if (!n) throw new Error('no seep');
      h.walkTo(n.x, n.y + 16);
      for (let k = 0; k < 2; k++) {
        g.step(1, { interact: true });
        g.step(40);
      }
    });
    await walk(page, [[97, 39]]);
    await quietScreen(page);
    await cameraSettled(page, 20_000);
    const seep = (await page.evaluate(() => window.__GAME__?.getState()))?.nodes.find((n) => n.nodeId === 'resin-seep' && n.uses < 3);
    expect(seep?.uses).toBe(1);
    await page.screenshot({ path: `${SHOTS}/03-seep-worked-in-world.png` });
  });

  test('the claimed pylon with a resin mote running home, and the resin port at ×1', async ({ page }) => {
    test.setTimeout(150_000);
    await boot(page);
    await quiet(page, null);
    await walk(page, [...TO_HIVE, [PYLON.tx - 1, PYLON.ty + 2]]);
    // Claimed just now, then stepped to just short of the ports' first push, so the first resin mote is caught leaving.
    await page.evaluate((t) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.claim('shrine');
      g.claim('husk-hive');
      g.step(t);
    }, SUPPLY_TICKS - 10);
    await quietScreen(page);
    await expect
      .poll(
        async () => {
          await page.evaluate(() => window.__GAME__?.step(1));
          const m = (await page.evaluate(() => window.__GAME__?.ui().supply))?.inFlight.find((x) => x.site === 'husk-hive' && x.itemId === 'husk-resin');
          return m !== undefined && m.progress > 0.02 && m.progress < 0.12;
        },
        { timeout: 60_000, intervals: [16] },
      )
      .toBe(true);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/04-hive-claimed-resin-mote.png` });

    // Back along the path to the meadow, then in.
    await walk(page, [...TO_HIVE].reverse());
    await page.evaluate(() => {
      const h = window.__helpers;
      if (!h) throw new Error('no helpers');
      h.toFoundry();
      h.walkTo(4.5 * 32, 10.5 * 32);
    });
    expect((await page.evaluate(() => window.__GAME__?.getState()))?.ports.find((p) => p.raw === 'husk-resin')?.pylons).toBe(1);
    await quietScreen(page);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/05-resin-port.png` });
  });
});
