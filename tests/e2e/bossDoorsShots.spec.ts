import { expect, test, type Page } from '@playwright/test';
import { FORUM_ARENA, SHRINE_ARENA, type ArenaDef } from '../../src/data/arenas';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { GROTTO } from '../../src/data/grotto';
import { boot, cameraSettled, quietScreen } from './helpers';
import { enterArena } from './arenaHelpers';

// Review screenshots for 055 (REVIEW_SHOTS=1, into docs/review/055): the Warden's door sealed (hovered, its hint
// showing) and open, the forum's open, both sealed and open on the contact sheet, inside each arena locked (043's seal
// over the door while the boss fights), the Frozen Grotto's pylon claimed, and the rimestone port in the foundry.

const SHOTS = 'docs/review/055';

async function walk(page: Page, points: readonly (readonly [number, number])[]): Promise<void> {
  await page.evaluate((pts) => {
    const h = window.__helpers;
    const g = window.__GAME__;
    if (!h || !g) throw new Error('no helpers');
    for (const [tx, ty] of pts) {
      h.walkTo((tx + 0.5) * 32, (ty + 0.5) * 32);
      g.setPlayerHealth(100);
    }
  }, points);
}

/** Kills every enemy but the bosses through the hook, so a walk is quiet. */
async function quiet(page: Page): Promise<void> {
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (const e of g.getState().enemies) if (e.enemyId !== 'bulwark' && e.enemyId !== 'pylon-warden') g.setEnemyHealth(e.id, 0);
    g.step(1);
  });
}

/** The walks here find several landmarks (five on the way round to the forum), whose banners play in turn: a long wait. */
async function settle(page: Page): Promise<void> {
  await cameraSettled(page, 20_000);
  await quietScreen(page, 60_000);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(10));
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().talentFx))?.levelLine ?? null, { timeout: 20_000 }).toBeNull();
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  await cameraSettled(page, 20_000);
}

/** Moves the pointer onto a world point (the door's sprite, a tile over its row) and waits for its hover name. */
async function hoverDoor(page: Page, a: ArenaDef): Promise<void> {
  const t = a.door.tiles[Math.floor(a.door.tiles.length / 2)] ?? a.door.leaveTo;
  const cam = (await page.evaluate(() => window.__GAME__?.ui().camera)) ?? { x: 0, y: 0 };
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  const k = box.width / VIEW_WIDTH;
  const x = (t.tx + 0.5) * 32 - (cam.x - VIEW_WIDTH / 2);
  const y = (t.ty + 0.2) * 32 - (cam.y - VIEW_HEIGHT / 2);
  await page.mouse.move(box.x + x * k, box.y + y * k);
  await expect.poll(async () => page.evaluate(() => window.__GAME__?.ui().hoverName)).toBe(a.door.name);
}

const doorShown = (page: Page, id: string) => page.evaluate((i) => window.__GAME__?.ui().arenaDoors.find((d) => d.id === i), id);

test.describe('review screenshots (055)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/055');

  test("the Warden's door, sealed (a new game) and open (the gates open), and inside it locked", async ({ page }) => {
    test.setTimeout(180_000);
    await boot(page, '?start=tutorial');
    await quiet(page);
    const W = SHRINE_ARENA;
    await walk(page, [[W.door.leaveTo.tx + 1, W.door.leaveTo.ty + 2]]);
    await settle(page);
    expect((await doorShown(page, W.id))?.door).toBe('sealed');
    await hoverDoor(page, W);
    await page.screenshot({ path: `${SHOTS}/01-warden-door-sealed.png` });

    await boot(page, '?playtest');
    await quiet(page);
    await walk(page, [[W.door.leaveTo.tx + 1, W.door.leaveTo.ty + 2]]);
    await settle(page);
    expect((await doorShown(page, W.id))?.door).toBe('open');
    await hoverDoor(page, W);
    await page.screenshot({ path: `${SHOTS}/02-warden-door-open.png` });

    await page.mouse.move(0, 0);
    await enterArena(page, W);
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (let t = 0; t < 30; t++) {
        g.step(1);
        g.setPlayerHealth(100);
      }
    });
    await expect.poll(async () => (await doorShown(page, W.id))?.seal).toBe('shut');
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/03-inside-the-shrine-locked.png` });
  });

  test("the Bulwark's door, open, and inside it locked", async ({ page }) => {
    test.setTimeout(180_000);
    const F = FORUM_ARENA;
    // ?start=hollows (the shrine claimed, so the barrier is down and the door open), round to the forum's north side.
    await boot(page, '?start=hollows');
    await quiet(page);
    await walk(page, [[F.door.leaveTo.tx, F.door.leaveTo.ty], [F.door.leaveTo.tx + 1, F.door.leaveTo.ty]]);
    await settle(page);
    expect((await doorShown(page, F.id))?.door).toBe('open');
    await hoverDoor(page, F);
    await page.screenshot({ path: `${SHOTS}/05-forum-door-open.png` });

    await page.mouse.move(0, 0);
    await enterArena(page, F);
    await page.evaluate((start) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      h.walkTo((start.tx + 0.5) * 32, (start.ty - 4.5) * 32);
      for (let t = 0; t < 30; t++) {
        g.step(1);
        g.setPlayerHealth(100);
      }
    }, F.start);
    await expect.poll(async () => (await doorShown(page, F.id))?.seal).toBe('shut');
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/06-inside-the-forum-locked.png` });
  });

  test("the door sprites on the contact sheet: each width, sealed and open (the forum's sealed door is out of reach in the world: the barrier stands round the whole Hollows until it opens)", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/sheet.html');
    const row = (title: string) => page.locator('h2', { hasText: title }).locator('xpath=following-sibling::div[1]');
    await expect(row('Boss arena doors (055)')).toBeVisible();
    await row('Boss arena doors (055)').screenshot({ path: `${SHOTS}/04-sheet-doors.png` });
  });

  test("the Frozen Grotto's pylon, claimed, and the rimestone port", async ({ page }) => {
    test.setTimeout(150_000);
    await boot(page, '?playtest');
    await quiet(page);
    await page.evaluate(() => {
      window.__GAME__?.claim('shrine');
      window.__GAME__?.claim('frozen-grotto');
    });
    await walk(page, [[GROTTO.pylon.tx + 2, GROTTO.pylon.ty + 3]]);
    await settle(page);
    await page.screenshot({ path: `${SHOTS}/07-grotto-pylon-claimed.png` });
    // Home by the claimed pylon's travel (E's menu, its choice sent as the menu does).
    await walk(page, [[GROTTO.pylon.tx, GROTTO.pylon.ty + 1]]);
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.step(1, { pylon: 'travel' });
      g.step(60);
    });
    await expect.poll(async () => page.evaluate(() => window.__GAME__?.getState().room)).toBe('foundry');
    await walk(page, [[5, 9]]);
    await settle(page);
    await page.screenshot({ path: `${SHOTS}/08-rimestone-port.png` });
  });
});
