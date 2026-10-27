import { expect, test, type Page } from '@playwright/test';
import { FORUM_ARENA } from '../../src/data/arenas';
import { FIXTURES } from '../../src/data/claims';
import { VIEW_WIDTH } from '../../src/data/config';
import { MAP_ICONS } from '../../src/data/landmarkAssets';
import { OVERWORLD_ROOM } from '../../src/data/overworld';
import { returnStoneDef } from '../../src/data/returnStones';
import { SHRINE_SITE } from '../../src/data/rooms';
import { menuRows } from '../../src/render/foundryLayout';
import { WORLD } from '../../src/sim/world';
import { clickRow, flowIs } from './flowPage';
import { screenPoint, state } from './foundryPage';
import { boot, cameraSettled, quietScreen } from './helpers';

// Review screenshots for 072 (REVIEW_SHOTS=1, into docs/review/072): the Sunken Forum's return stone dormant, then
// woken as the player reaches its door; after a KO, the foundry waystone's menu listing it; the shrine pylon's menu with
// its row; and the stone's own menu, "Travel to foundry". 072.9: the woken stone's minimap icon.

const SHOTS = 'docs/review/072';
const STONE = returnStoneDef('sunken-forum-waystone');
const WAY = FIXTURES.find((f) => f.kind === 'waystone') ?? { tx: 0, ty: 0 };
const SHRINE_PYLON = WORLD[OVERWORLD_ROOM]?.pylons?.find((p) => p.site === SHRINE_SITE) ?? { tx: 0, ty: 0 };

async function walk(page: Page, tx: number, ty: number): Promise<void> {
  await page.evaluate(([x, y]) => {
    const h = window.__helpers;
    const g = window.__GAME__;
    if (!h || !g) throw new Error('no helpers');
    h.walkTo((x + 0.5) * 32, (y + 0.5) * 32);
    g.setPlayerHealth(100);
  }, [tx, ty] as const);
}

/** 042: the Hollows start's goals are done, so the end card shows a little way in; Keep playing closes it. */
async function noEndCard(page: Page): Promise<void> {
  if ((await page.evaluate(() => window.__GAME__?.flow().state)) !== 'endCard') return;
  await clickRow(page, 'keepPlaying');
  await flowIs(page, 'play');
}

/** The camera at rest and nothing over the shot: the end card, or a banner (the walk finds several landmarks). */
async function settle(page: Page): Promise<void> {
  await noEndCard(page);
  await cameraSettled(page, 20_000);
  await quietScreen(page, 60_000);
  await cameraSettled(page, 20_000);
}

/** Opens a site menu with E (pressed again while none is open: under load a press can miss a frame) and returns its rows' words. */
async function openWith(page: Page, menu: 'waystone' | 'pylonMenu' | 'returnMenu'): Promise<string[] | undefined> {
  if (!(await page.evaluate(() => window.__GAME__?.ui().siteOpen))) await page.keyboard.press('e');
  await page.evaluate(() => window.__GAME__?.step(1));
  return (await page.evaluate((m) => window.__GAME__?.ui()[m], menu))?.map((r) => r.text);
}

/** Clicks row `row` of the open `rows`-row menu until `done` says it took. */
async function choose(page: Page, rows: number, row: number, done: () => Promise<boolean>): Promise<void> {
  const r = menuRows(rows)[row];
  if (!r) throw new Error('no row');
  const p = await screenPoint(page, r.x + r.w / 2, r.y + r.h / 2);
  for (let i = 0; i < 5 && !(await done()); i++) {
    if (!(await page.evaluate(() => window.__GAME__?.ui().siteOpen))) await page.keyboard.press('e');
    await expect.poll(async () => page.evaluate(() => window.__GAME__?.ui().siteOpen)).toBe(true);
    await page.mouse.click(p.x, p.y);
    await page.evaluate(() => window.__GAME__?.step(1));
  }
}

const stoneShown = (page: Page) => page.evaluate((id) => window.__GAME__?.ui().returnStones.find((r) => r.id === id), STONE.id);

test.describe('review screenshots (072)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/072');

  test("the Forum's return stone dormant and woken, then the travel menus", async ({ page }) => {
    test.setTimeout(300_000);
    await boot(page, '?start=hollows');
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (const e of g.getState().enemies) if (e.enemyId !== 'bulwark') g.setEnemyHealth(e.id, 0);
      g.step(1);
    });
    // Dormant: five tiles west of it, come from the west (the start is south-west), out of its wake reach.
    await walk(page, STONE.tx - 5, STONE.ty - 1);
    await settle(page);
    expect((await stoneShown(page))?.look).toBe('dormant');
    await page.screenshot({ path: `${SHOTS}/01-return-stone-dormant.png` });

    // Woken: to the door's outside, past it; the swell plays out before the shot.
    await walk(page, FORUM_ARENA.door.leaveTo.tx, FORUM_ARENA.door.leaveTo.ty);
    await expect.poll(async () => (await stoneShown(page))?.look).toBe('woken');
    // The swell plays on the tween clock, sped up so a slow, loaded page doesn't hold the poll.
    await page.evaluate(() => window.__GAME__?.tweenSpeed(10));
    await expect.poll(async () => (await stoneShown(page))?.scale, { timeout: 20_000 }).toBe(1);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
    await settle(page);
    await page.screenshot({ path: `${SHOTS}/02-return-stone-woken.png` });

    // A KO, then the foundry's waystone: its menu lists the Shrine and the Forum's door.
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.setPlayerHealth(0);
      let s = g.step(1);
      for (let t = 0; t < 600 && !s.events.ko; t++) s = g.step(1);
      g.step(1);
    });
    expect((await state(page)).room).toBe('foundry');
    await walk(page, WAY.tx, WAY.ty + 1);
    await noEndCard(page);
    await quietScreen(page, 60_000);
    // The wake's "You wake in the foundry" holds 3 s, then fades (it has no ui() state): not proof of anything, only so
    // it doesn't cover the shot.
    await page.waitForTimeout(4500);
    await expect.poll(async () => openWith(page, 'waystone')).toEqual(['Travel to Shrine', 'Travel to Sunken Forum door']);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/03-waystone-menu.png` });

    // To the Shrine; its pylon's menu has a row for the Forum's door.
    await choose(page, 2, 0, async () => (await state(page)).room === 'overworld');
    await walk(page, SHRINE_PYLON.tx, SHRINE_PYLON.ty + 1);
    await settle(page);
    await expect.poll(async () => (await openWith(page, 'pylonMenu'))?.slice(1)).toEqual(['Travel to foundry', 'Travel to Sunken Forum door']);
    await page.screenshot({ path: `${SHOTS}/04-pylon-menu.png` });

    // Its row to the Forum's door; E at the stone offers the way home.
    await choose(page, 3, 2, async () => {
      const s = await state(page);
      return s.player.x === (STONE.arrive.tx + 0.5) * 32 && s.player.y === (STONE.arrive.ty + 0.5) * 32;
    });
    await settle(page);
    await expect.poll(async () => openWith(page, 'returnMenu')).toEqual(['Travel to foundry']);
    await page.screenshot({ path: `${SHOTS}/05-return-stone-menu.png` });
  });

});

// 072.9 (Shaun, 2026-10-27): the woken stone's minimap icon. Its own test, so taking it (`-g "minimap icon"`) leaves
// shots 01-05 as they were; a larger window draws the small map larger. Unhovered: within the hover's 5 px the
// crosshair covers the icon (returnStones.spec.ts checks hovering names it).
test.describe('review screenshots (072.9)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/072');
  test.use({ viewport: { width: 1920, height: 1080 } });

  test("the woken Forum stone's minimap icon", async ({ page }) => {
    test.setTimeout(240_000);
    await boot(page, '?start=hollows');
    const start = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (const e of g.getState().enemies) if (e.enemyId !== 'bulwark') g.setEnemyHealth(e.id, 0);
      return g.step(1).player;
    });
    await walk(page, FORUM_ARENA.door.leaveTo.tx, FORUM_ARENA.door.leaveTo.ty);
    await expect.poll(async () => (await stoneShown(page))?.look).toBe('woken');
    // Then back to the start, so the player's dot (drawn over icons) sits clear of the stone's.
    await walk(page, Math.floor(start.x / 32), Math.floor(start.y / 32));
    await settle(page);
    const marker = () => page.evaluate((id) => window.__GAME__?.ui().minimap.markers.find((m) => m.stone === id), STONE.id);
    await expect.poll(async () => (await marker())?.icon).toBe(MAP_ICONS.returnStone);
    const m = (await marker()) ?? { x: 0, y: 0 };
    // The pointer off the map, so its crosshair isn't over the shot.
    const away = await screenPoint(page, VIEW_WIDTH / 4, 200);
    await page.mouse.move(away.x, away.y);
    await expect.poll(async () => page.evaluate(() => window.__GAME__?.ui().minimap.hover)).toBe(null);
    // Close on the icon and the map round the Forum (its arena's icon just south of the stone's).
    const from = await screenPoint(page, m.x - 40, m.y - 18);
    const to = await screenPoint(page, Math.min(VIEW_WIDTH, m.x + 40), m.y + 32);
    await page.screenshot({ path: `${SHOTS}/06-minimap-icon.png`, clip: { x: from.x, y: from.y, width: to.x - from.x, height: to.y - from.y } });
  });
});
