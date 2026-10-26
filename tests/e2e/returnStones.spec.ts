import { expect, test, type Page } from '@playwright/test';
import { FORUM_ARENA } from '../../src/data/arenas';
import { FIXTURES } from '../../src/data/claims';
import { returnStoneDef } from '../../src/data/returnStones';
import { menuRows } from '../../src/render/foundryLayout';
import { screenPoint, state } from './foundryPage';
import { boot, watchErrors } from './helpers';
import { clickRow, flowIs } from './flowPage';

// 072: boss return points. In the Hollows, walk to the Sunken Forum's door: its return stone wakes. A KO wakes the
// player in the foundry; the waystone's menu now lists the Forum's door, and its row stands the player by the stone
// outside the Forum. E there offers "Travel to foundry", which goes home.

const T = 32;
const STONE = returnStoneDef('sunken-forum-waystone');
const WAY = FIXTURES.find((f) => f.kind === 'waystone') ?? { tx: 0, ty: 0 };

/** Clicks row `row` of an `rows`-row menu, pressing E first to open it, until `done` says it took (a menu can take a frame to open). */
async function menuChoice(page: Page, rows: number, row: number, done: () => Promise<boolean>): Promise<void> {
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

/** A site menu's rows' words, pressing E first while no menu is open (under load a press can miss a frame). */
async function openWith(page: Page, menu: 'waystone' | 'returnMenu'): Promise<string[] | undefined> {
  if (!(await page.evaluate(() => window.__GAME__?.ui().siteOpen))) await page.keyboard.press('e');
  await page.evaluate(() => window.__GAME__?.step(1));
  return (await page.evaluate((m) => window.__GAME__?.ui()[m], menu))?.map((r) => r.text);
}

test("the Forum's return stone wakes at its door; after a KO the waystone travels back to it, and it travels home", async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await boot(page, '?start=hollows');
  const before = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    // Declared setup, not play: everything but the Bulwark is cleared, so the walk is the test.
    for (const e of g.getState().enemies) if (e.enemyId !== 'bulwark') g.setEnemyHealth(e.id, 0);
    return g.step(1);
  });
  expect(before.returnStones.map((r) => r.woken)).toEqual([false, false, false]);

  // To the Forum's door: walking up to its outside passes the stone, which wakes.
  const woke = await page.evaluate(([tx, ty]) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.walkTo((tx + 0.5) * 32, (ty + 0.5) * 32);
    return g.step(1).returnStones;
  }, [FORUM_ARENA.door.leaveTo.tx, FORUM_ARENA.door.leaveTo.ty] as const);
  expect(woke.find((r) => r.id === STONE.id)).toMatchObject({ woken: true, name: 'Sunken Forum door' });
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().returnStones))?.find((r) => r.id === STONE.id)?.look).toBe('woken');

  // A KO: the player wakes in the foundry, the stone still woken.
  const ko = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.setPlayerHealth(0);
    let s = g.step(1);
    for (let t = 0; t < 600 && !s.events.ko; t++) s = g.step(1);
    return g.step(1);
  });
  expect(ko.room).toBe('foundry');
  expect(ko.returnStones.find((r) => r.id === STONE.id)?.woken).toBe(true);

  // The waystone: its menu lists the Shrine and the Forum's door; the second row goes there.
  await page.evaluate(([tx, ty]) => window.__helpers?.walkTo((tx + 0.5) * 32, (ty + 1.5) * 32), [WAY.tx, WAY.ty] as const);
  // 042: arriving home may show the end card (the Hollows start's goals are done); Keep playing closes it.
  if ((await page.evaluate(() => window.__GAME__?.flow().state)) === 'endCard') {
    await clickRow(page, 'keepPlaying');
    await flowIs(page, 'play');
  }
  await expect.poll(async () => openWith(page, 'waystone')).toEqual(['Travel to Shrine', 'Travel to Sunken Forum door']);
  await menuChoice(page, 2, 1, async () => (await state(page)).room === 'overworld');
  const there = await state(page);
  expect({ room: there.room, x: there.player.x, y: there.player.y }).toEqual({ room: 'overworld', x: (STONE.arrive.tx + 0.5) * T, y: (STONE.arrive.ty + 0.5) * T });

  // E at the stone: its one row goes home.
  await expect.poll(async () => openWith(page, 'returnMenu')).toEqual(['Travel to foundry']);
  await menuChoice(page, 1, 0, async () => (await state(page)).room === 'foundry');
  expect((await state(page)).room).toBe('foundry');
  expect(errors).toEqual([]);
});
