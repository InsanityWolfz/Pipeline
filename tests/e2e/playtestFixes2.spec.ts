import { expect, test, type Page } from '@playwright/test';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { END_CARD } from '../../src/data/endCard';
import { TUTORIAL_LAYOUT } from '../../src/data/foundryAssets';
import { HOVER_NAME } from '../../src/data/hudLayout';
import { INTERACT_PROMPTS } from '../../src/data/interact';
import { clickRow, flowIs } from './flowPage';
import { centre, enterFoundry, pieceAt, screenPoint, standStill, state, step, toggleBuild } from './foundryPage';
import { boot, cameraSettled, watchErrors } from './helpers';

// 050: Shaun's live-playtest fixes (docs/specs/050-playtest-fixes-2.md), checked in the running game.

const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

test('E opens the hopper under the cursor within 3 tiles, not the nearest; E closes its screen and the inventory (050 A.8, A.9)', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page);
  await enterFoundry(page);
  await standStill(page);
  // Beside the player (STAND is 11,8), and two tiles off to the right.
  await toggleBuild(page);
  await step(page, 1, { place: { pieceId: 'hopper', tx: 12, ty: 8, facing: 'down' } });
  await step(page, 1, { place: { pieceId: 'hopper', tx: 13, ty: 10, facing: 'down' } });
  const s = await toggleBuild(page);
  const near = pieceAt(s, 12, 8);
  const far = pieceAt(s, 13, 10);
  if (near?.kind !== 'hopper' || far?.kind !== 'hopper') throw new Error('no hoppers');
  await step(page, 1, { deposit: { id: far.id, itemId: 'arrow', amount: 'one' } });
  expect(pieceAt(await state(page), 13, 10)).toMatchObject({ item: 'arrow', count: 1 });

  // The cursor on the far hopper: E opens its screen (its one arrow), not the near one's (empty).
  const aim = centre(13, 10);
  await step(page, 1, { aimX: aim.x, aimY: aim.y });
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.pickerCounts).toEqual([1]);
  // E again closes it, as Esc does.
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.pickerOpen).toBe(false);

  // The cursor on nothing: E falls back to the nearest (the empty one).
  const off = centre(8, 12);
  await step(page, 1, { aimX: off.x, aimY: off.y });
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.pickerOpen).toBe(true);
  expect((await ui(page))?.pickerCounts).toEqual([]);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await ui(page))?.pickerOpen).toBe(false);

  // The plain inventory: E closes it too.
  await page.keyboard.press('i');
  await expect.poll(async () => (await ui(page))?.inventory.open).toBe(true);
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.inventory.open).toBe(false);
  expect(errors).toEqual([]);
});

/** Boxes meet. */
const meets = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

test("a boulder's name tag never covers its E prompt or the player (050 A.2)", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page, '?start=field&attuned');
  // The nearest boulder, the player standing just below it, so its E prompt shows.
  const rock = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    const s = g.step(1);
    const p = s.player;
    const near = s.nodes.filter((n) => n.nodeId === 'rubble' && n.room === s.room).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    if (!near) throw new Error('no boulder');
    h.walkTo(near.x, near.y + 14);
    return near;
  });
  await cameraSettled(page, 20_000);
  const cam = (await ui(page))?.camera;
  if (!cam) throw new Error('no camera');
  const at = await screenPoint(page, rock.x - (cam.x - VIEW_WIDTH / 2), rock.y - 6 - (cam.y - VIEW_HEIGHT / 2));
  await page.mouse.move(at.x, at.y);
  await expect.poll(async () => (await ui(page))?.hoverName).toBe('Boulder');
  const u = await ui(page);
  const box = u?.hoverBox;
  // The in-reach E prompt (045), or the gathering goal's own E prompt standing in for it: the same cap at the same height.
  const prompt = u?.interactPrompt ?? u?.prompt;
  if (!box || !prompt || !u) throw new Error(`no tag or prompt: ${JSON.stringify({ box, prompt })}`);
  expect(prompt.key).toBe('E');
  // The prompt's key cap: 11 px, its bottom a tile and the prompt lift over the boulder's feet.
  const capBottom = prompt.y - INTERACT_PROMPTS.node.rise - TUTORIAL_LAYOUT.promptLift;
  expect(meets(box, { x: prompt.x - 6, y: capBottom - 11, w: 12, h: 11 })).toBe(false);
  // The player's sprite, up from the feet.
  const feet = u.camera.player;
  expect(meets(box, { x: feet.x - HOVER_NAME.playerBox.w / 2, y: feet.y - HOVER_NAME.playerBox.h, w: HOVER_NAME.playerBox.w, h: HOVER_NAME.playerBox.h })).toBe(false);
  expect(errors).toEqual([]);
});

test('the discovery banner shows at the top of the screen, clear of the player (050 A.3)', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page);
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    let s = g.step(1);
    for (let x = 36 + h.ox; x >= 24 + h.ox && !s.discovered.includes('quarry'); x -= 2) {
      h.walkTo((x + 0.5) * 32, 25.5 * 32);
      s = g.getState();
    }
  });
  await expect.poll(async () => (await ui(page))?.landmarks.banner).toBe('quarry');
  const u = await ui(page);
  const box = u?.landmarks.bannerBox;
  if (!box || !u) throw new Error('no banner box');
  const playerTop = u.camera.player.y - HOVER_NAME.playerBox.h - (u.camera.y - VIEW_HEIGHT / 2);
  expect(box.y).toBeLessThan(VIEW_HEIGHT / 6);
  expect(box.y + box.h).toBeLessThan(playerTop);
  expect(errors).toEqual([]);
});

test('the end-of-playtest card shows the cursor over it (050 A.5)', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=hollows');
  await page.evaluate((delay) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.step(0);
    const b = g.getState().enemies.find((e) => e.enemyId === 'bulwark');
    if (!b) throw new Error('no Bulwark');
    g.setEnemyHealth(b.id, 0);
    g.step(delay + 1);
  }, END_CARD.delayTicks);
  await flowIs(page, 'endCard');
  const p = await screenPoint(page, VIEW_WIDTH / 2, VIEW_HEIGHT / 2);
  await page.mouse.move(p.x, p.y);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().flow.cursor))?.kind).toBe('pointer');
  const cursor = await page.evaluate(() => window.__GAME__?.ui().flow.cursor);
  if (!cursor) throw new Error('no cursor');
  expect(cursor.depth).toBeGreaterThan(cursor.topOtherDepth);
  expect(await page.evaluate(() => document.querySelector('canvas')?.style.cursor)).toBe('none');
  // Gone once the card closes and play resumes (the game's own cursor shows again).
  await clickRow(page, 'keepPlaying');
  await flowIs(page, 'play');
  await expect.poll(async () => page.evaluate(() => window.__GAME__?.ui().flow.cursor)).toBeNull();
  expect(errors).toEqual([]);
});

/** Into the foundry from the playtest start with eight body pieces, over to the bench, its panel open (036). */
async function benchWithGear(page: Page): Promise<void> {
  await boot(page, '?playtest');
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(1);
    for (let i = 0; i < 8; i++) g.addGear({ slot: 'body', rarity: 'rare', weight: 'heavy', baseArmor: 10 + i, affixes: [{ kind: 'armor', value: 3 }], relic: null, name: `Plate ${i + 1}` });
    h.toFoundry();
    h.walkTo(2.3 * 32, 12.5 * 32);
  });
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.gearPanel?.open, { timeout: 15_000 }).toBe(true);
}

test('gear: the list scrolls on the wheel, a row’s tip goes as the cursor leaves it (even onto the tip), and Shift shows its breakdown (050 A.6, A.7, A.13)', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await benchWithGear(page);
  const panel = (await ui(page))?.gearPanel;
  if (!panel) throw new Error('no panel');
  expect(panel.scroll.first).toBe(0);
  expect(panel.scroll.last).toBeGreaterThan(0);
  const row = panel.rows[0];
  if (!row) throw new Error('no row');
  // The wheel over the panel scrolls the list a row a step.
  const over = await screenPoint(page, row.box.x + row.box.w / 2, row.box.y + row.box.h / 2);
  await page.mouse.move(over.x, over.y);
  await page.mouse.wheel(0, 100);
  await expect.poll(async () => (await ui(page))?.gearPanel?.scroll.first).toBe(1);
  await page.mouse.wheel(0, -100);
  await expect.poll(async () => (await ui(page))?.gearPanel?.scroll.first).toBe(0);

  // Hovering a row: its summary; Shift: its breakdown; released, the summary again.
  await page.mouse.move(over.x + 1, over.y);
  await expect.poll(async () => (await ui(page))?.tip?.mode).toBe('summary');
  expect((await ui(page))?.tip?.source.kind).toBe('gear');
  await page.keyboard.down('Shift');
  await expect.poll(async () => (await ui(page))?.tip?.mode).toBe('breakdown');
  await page.keyboard.up('Shift');
  await expect.poll(async () => (await ui(page))?.tip?.mode).toBe('summary');

  // Onto the tip itself (off the row): it goes at once.
  const tip = (await ui(page))?.tip?.box;
  if (!tip) throw new Error('no tip');
  const onTip = await screenPoint(page, tip.x + tip.w / 2, tip.y + tip.h / 2);
  await page.mouse.move(onTip.x, onTip.y);
  await expect.poll(async () => (await ui(page))?.tip ?? null, { timeout: 2000 }).toBeNull();
  expect(errors).toEqual([]);
});

test('hovering an inventory item shows its name in a tip (050 A.14)', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await page.evaluate(() => window.__GAME__?.step(1));
  await page.keyboard.press('i');
  await expect.poll(async () => (await ui(page))?.inventory.open).toBe(true);
  const slot = (await ui(page))?.inventory.slots.find((s) => s.itemId === 'warden-core');
  if (!slot) throw new Error(`no warden core slot: ${JSON.stringify((await ui(page))?.inventory.slots.map((s) => s.itemId))}`);
  const at = await screenPoint(page, slot.x + slot.w / 2, slot.y + slot.h / 2);
  await page.mouse.move(at.x, at.y);
  await expect.poll(async () => (await ui(page))?.tip?.name).toBe('Warden core');
  expect((await ui(page))?.tip?.source.kind).toBe('item');
  expect(errors).toEqual([]);
});
