import { expect, test, type Page } from '@playwright/test';
import { boot, cameraSettled } from './helpers';
import { ui } from './intakePage';

// Review screenshots for 033 (REVIEW_SHOTS=1, into docs/review/033): the intake with a
// diagram on each cap, one cap restored and one capped, a wall panel's diagram before,
// while and after restoring, the restore panel with a missing input, the research list,
// a schematic's light pillar in the field with its minimap ping, the sealed wing's door,
// and the new art on the contact sheet. Restores go through the panel's command, as
// research.spec.ts drives the keys.

const SHOTS = 'docs/review/033';

/** Into the foundry from ?playtest (unless there), to a tile's centre, the camera settled, and every banner played out. */
async function standAt(page: Page, tx: number, ty: number): Promise<void> {
  await page.evaluate(([x, y]) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    if (g.step(0).room !== 'foundry') h.toFoundry();
    h.walkTo(x, y);
    g.step(1, { aimX: x, aimY: y - 64 });
  }, [(tx + 0.5) * 32, (ty + 0.5) * 32] as const);
  await bannersGone(page);
  await cameraSettled(page);
}

/** Plays out the schematic reveal banners banking queued (fast, on the tween clock), so none covers the shot. */
async function bannersGone(page: Page): Promise<void> {
  await page.evaluate(() => window.__GAME__?.tweenSpeed(10));
  await expect.poll(async () => (await ui(page))?.schematics.bannerIdle, { timeout: 20_000 }).toBe(true);
  await expect.poll(async () => (await ui(page))?.research.effects).toBe(0);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
}

/** Restores a node from where the player stands, as the panel's Restore does. */
async function restore(page: Page, node: string): Promise<void> {
  const s = await page.evaluate((n) => window.__GAME__?.step(1, { restore: n }), node);
  expect(s?.research.nodes.find((n) => n.id === node)?.state).toBe('restored');
}

test.describe('review screenshots (033)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/033');

  test('the intake with diagrams on both caps, then one restored and one capped', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, '?playtest');
    await standAt(page, 12, 4);
    await expect.poll(async () => (await ui(page))?.research.diagrams.filter((d) => d.entrance !== null).length).toBe(2);
    await page.screenshot({ path: `${SHOTS}/01-intake-diagrams-on-both-caps.png` });
    await standAt(page, 11, 1);
    await restore(page, 'entrance-2');
    await standAt(page, 12, 4);
    await expect.poll(async () => (await ui(page))?.intakeCaps).toBe(1);
    await expect.poll(async () => (await ui(page))?.intakeLift ?? null).toBeNull();
    await page.screenshot({ path: `${SHOTS}/02-one-cap-restored-one-capped.png` });
  });

  test('a wall panel diagram before, while and after restoring; the restore panel with a missing input', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, '?playtest');
    // Banked on the way in: the machine-speed, splitter and merger schematics reveal their panels.
    await standAt(page, 7, 3);
    await expect.poll(async () => (await ui(page))?.research.diagrams.some((d) => d.node === 'machine-speed')).toBe(true);
    await page.screenshot({ path: `${SHOTS}/03-wall-panel-diagram.png` });
    // Beside the panel (still in reach), so the player doesn't hide it. Mid-restore: the linework filling solid cyan, held.
    await standAt(page, 7, 1);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0.2));
    await restore(page, 'machine-speed');
    await expect.poll(async () => (await ui(page))?.research.effects).toBe(1);
    // About 300 ms of the fill's tween time: a capture timing, not proof (the poll above is).
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
    await page.screenshot({ path: `${SHOTS}/04-wall-panel-restoring.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
    await standAt(page, 7, 3);
    await expect.poll(async () => (await ui(page))?.research.restored).toContain('machine-speed');
    await page.screenshot({ path: `${SHOTS}/05-wall-panel-restored.png` });

    // Gears spent on Reservoir I (4), machine speed (3) and the splitter (2) leave one: the merger's panel shows 1/2 in rust-light.
    await standAt(page, 12, 1);
    await restore(page, 'reservoir-1');
    await standAt(page, 17, 1);
    await restore(page, 'splitter');
    await standAt(page, 19, 1);
    await page.keyboard.press('e');
    await expect.poll(async () => (await ui(page))?.restorePanel?.node).toBe('merger');
    expect((await ui(page))?.restorePanel?.cost).toContainEqual({ itemId: 'ancient-gear', text: '1/2', missing: true });
    expect((await ui(page))?.restorePanel?.enabled).toBe(false);
    await page.screenshot({ path: `${SHOTS}/06-restore-panel-missing-input.png` });
  });

  test('the research list', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, '?playtest');
    await standAt(page, 12, 4);
    await standAt(page, 11, 1);
    await restore(page, 'entrance-2');
    await standAt(page, 12, 6);
    await page.keyboard.press('j');
    await expect.poll(async () => (await ui(page))?.researchList.open).toBe(true);
    await page.screenshot({ path: `${SHOTS}/07-research-list.png` });
  });

  test("a schematic's light pillar in the field, with its minimap ping", async ({ page }) => {
    test.setTimeout(60_000);
    await boot(page);
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const s = g.step(1);
      g.drop('schematic-splitter', s.player.x + 96, s.player.y - 10);
      g.step(1, { aimX: s.player.x + 96, aimY: s.player.y - 10 });
    });
    await cameraSettled(page);
    await expect.poll(async () => (await ui(page))?.schematics.pillars.length).toBe(1);
    await page.screenshot({ path: `${SHOTS}/08-schematic-pillar.png` });
  });

  test("the sealed wing's door", async ({ page }) => {
    test.setTimeout(60_000);
    await boot(page, '?playtest');
    await standAt(page, 10, 5);
    expect((await ui(page))?.research.wingDoor).toBe(true);
    await page.screenshot({ path: `${SHOTS}/09-sealed-wing-door.png` });
  });

  test('the new art on the contact sheet, at 4x', async ({ page }) => {
    await page.goto('/sheet.html');
    const row = (title: string) => page.locator('h2', { hasText: title }).locator('xpath=following-sibling::div[1]');
    await expect(row('Restoration (033)')).toBeVisible();
    await row('Restoration (033)').screenshot({ path: `${SHOTS}/10-sheet-restoration.png` });
  });
});

