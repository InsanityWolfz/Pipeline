import { expect, test, type Page } from '@playwright/test';
import { SPREAD_STEP } from '../../src/data/foundry';
import { boot, cameraSettled, quietScreen, watchErrors } from './helpers';
import { feedLines, restoreEntrance, toIntake, ui } from './intakePage';

// Spreads from the intake (024): a warden core restores one side entrance (033: E at
// its cap), arrow lines into two entrances, and each press out in the meadow
// fires a two-arrow spread at ±SPREAD_STEP/2. With REVIEW_SHOTS=1, the review
// screenshots in docs/review/024: the intake capped and opened, and a
// two-arrow-and-bomb volley in flight.

const SHOTS = 'docs/review/024';

/**
 * Out in the meadow (walking there unless `there`), aimed east, with ley bolts selected and carried: one press, which
 * fires the volley first (028). Returns that tick's state and the aim.
 */
function fireVolley(page: Page, settle = 0, there = false) {
  return page.evaluate(({ settle, there }) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    if (!there) h.toHall();
    window.__helpers?.hold('ley-bolt');
    const s = g.step(0);
    if ((s.inventory['ley-bolt'] ?? 0) === 0) throw new Error('no ley bolts carried');
    const aim = { x: s.player.x + 160, y: s.player.y };
    const next = s.tube.next;
    const before = new Set(s.arrows.map((a) => a.id));
    const shot = g.step(1, { fire: true, aimX: aim.x, aimY: aim.y });
    if (settle > 0) g.step(settle);
    const fresh = shot.arrows.filter((a) => !before.has(a.id));
    return { next, shot, aim, fresh };
  }, { settle, there });
}

test('a warden core restores one entrance (033); two fed arrow entrances fire a two-arrow spread', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  const before = await toIntake(page);
  expect(before.intake.entrances.map((e) => e.open)).toEqual([false, true, false]);
  // With a warden core carried, the prompt shows beside the pipe, and both side entrances wear their caps.
  await expect.poll(async () => (await ui(page))?.intakePrompt).toBe('E: restore an entrance');
  expect((await ui(page))?.intakeCaps).toBe(2);
  const after = await restoreEntrance(page, 11);
  // One core, one entrance: the west cap lifts, the east stays.
  expect(after.intake.entrances.map((e) => e.open)).toEqual([true, true, false]);
  expect(after.inventory['warden-core']).toBe((before.inventory['warden-core'] ?? 0) - 1);
  expect(after.events.intakeOpens).toEqual([{ entrance: 0 }]);
  await expect.poll(async () => (await ui(page))?.intakeCaps).toBe(1);
  // The east cap now wants a Bulwark core, which ?playtest carries too, so the prompt stays.
  expect((await ui(page))?.intakePrompt).toBe('E: restore an entrance');

  const fed = await feedLines(page, [
    { tx: 11, itemId: 'arrow', amount: 'half' },
    { tx: 12, itemId: 'arrow', amount: 'all' },
  ], 3);
  expect(fed.intake.volley).toEqual(['arrow', 'arrow']);
  expect(fed.inventory.arrow ?? 0).toBe(0);

  const { next, shot, aim, fresh } = await fireVolley(page);
  expect(next).toBe('volley');
  expect(shot.tube.fromReservoir).toBe(true);
  expect(shot.tube.shotCount).toBe(2);
  expect(fresh).toHaveLength(2);
  const aimAngle = Math.atan2(aim.y - shot.player.y, aim.x - shot.player.x);
  const angles = fresh.map((a) => Math.round(((Math.atan2(a.dy, a.dx) - aimAngle) * 180) / Math.PI * 10) / 10).sort((a, b) => a - b);
  expect(angles).toEqual([-SPREAD_STEP / 2, SPREAD_STEP / 2]);
  expect(errors).toEqual([]);
});

test.describe('review screenshots (024)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/024');

  test('the intake capped, then opened and fed, then a two-arrow-and-bomb volley in flight', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, '?playtest');
    // Capped: the centre entrance open, both sides under brass caps, and the prompt beside the pipe.
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      g.step(0);
      h.toFoundry();
      h.walkTo(16.5 * 32, 3.5 * 32);
      g.step(1, { aimX: 12.5 * 32, aimY: 0 });
    });
    await cameraSettled(page);
    await expect.poll(async () => (await ui(page))?.intakePrompt).toBe('E: restore an entrance');
    await page.screenshot({ path: `${SHOTS}/01-intake-capped.png` });

    // Mid-lift: slowed, then stopped a third of the way, so the cap hangs over its inlet in the ring of light (033: one per core).
    await toIntake(page);
    await cameraSettled(page);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0.2));
    await restoreEntrance(page, 13);
    await expect.poll(async () => (await ui(page))?.intakeLift ?? 0).toBeGreaterThan(0.3);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
    await page.screenshot({ path: `${SHOTS}/02-caps-lifting.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
    await expect.poll(async () => (await ui(page))?.intakeCaps).toBe(1);
    // The other cap takes a Bulwark core (?playtest carries two).
    await restoreEntrance(page, 11);
    await expect.poll(async () => (await ui(page))?.intakeCaps).toBe(0);

    // Opened and fed: arrows west and east, bombs in the centre, each gauge in its ammo's colour.
    await feedLines(page, [
      { tx: 11, itemId: 'arrow', amount: 'half' },
      { tx: 12, itemId: 'bomb', amount: 'all' },
      { tx: 13, itemId: 'arrow', amount: 'all' },
    ], 12);
    await page.evaluate(() => {
      window.__helpers?.walkTo(16.5 * 32, 3.5 * 32);
      window.__GAME__?.step(1);
    });
    await cameraSettled(page);
    await page.screenshot({ path: `${SHOTS}/03-intake-open-fed.png` });

    // The volley a few ticks out: one fan of three lanes (048), the arrows at ±15° and the bomb straight up the middle.
    // Out in the hall first, with the door's fade and the schematic banner played out (046's quietScreen).
    // A few steps south of the hall's door, so its dome doesn't stop the left lane's arrow.
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      h.toHall();
      const s = g.step(1);
      h.walkTo(s.player.x, s.player.y + 96);
      g.step(1);
    });
    await cameraSettled(page);
    await quietScreen(page);
    const { shot } = await fireVolley(page, 8, true);
    expect(shot.intake.volley).toEqual(['arrow', 'bomb', 'arrow']);
    expect(shot.intake.lanes).toEqual([-SPREAD_STEP, 0, SPREAD_STEP]);
    expect(shot.tube.shotCount).toBe(3);
    await cameraSettled(page);
    await page.screenshot({ path: `${SHOTS}/04-volley-in-flight.png` });
  });

  test('the new cap art on the contact sheet, at 4x', async ({ page }) => {
    await page.goto('/sheet.html');
    const fig = (name: string) => page.locator('figure').filter({ has: page.locator('figcaption', { hasText: new RegExp(`^${name}$`) }) });
    for (const [name, file] of [['intake-cap', '05-sheet-intake-cap'], ['emblem-intake-cap', '06-sheet-cap-emblem'], ['intake-attuned', '07-sheet-intake']] as const) {
      await expect(fig(name)).toBeVisible();
      await fig(name).screenshot({ path: `${SHOTS}/${file}.png` });
    }
  });
});
