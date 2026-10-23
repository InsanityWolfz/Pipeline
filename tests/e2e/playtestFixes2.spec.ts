import { expect, test, type Page } from '@playwright/test';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { END_CARD } from '../../src/data/endCard';
import { RELIC_LOOK } from '../../src/data/gearAssets';
import { TUTORIAL_LAYOUT } from '../../src/data/foundryAssets';
import { HOVER_NAME } from '../../src/data/hudLayout';
import { INTERACT_PROMPTS } from '../../src/data/interact';
import { MENU_ROW_W } from '../../src/data/flowLayout';
import { bootTitle, clickRow, flowIs } from './flowPage';
import { centre, enterFoundry, pieceAt, screenPoint, standStill, state, step, toggleBuild } from './foundryPage';
import { boot, cameraSettled, watchErrors } from './helpers';

// 050: Shaun's live-playtest fixes (docs/specs/050-playtest-fixes-2.md), checked in the running game.

const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());
/** Waits until a frame has drawn the state's current tick, so what ui() reports is what was stepped. */
async function frameDrawn(page: Page): Promise<void> {
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const g = window.__GAME__;
        return !!g && g.ui().drawnTick === g.getState().tick;
      }),
    )
    .toBe(true);
}

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

test('E that closes the bag beside a boulder does not also harvest it (050 review)', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page, '?start=field&attuned');
  // Stand just below the nearest boulder, in E's reach.
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    const s = g.step(1);
    const p = s.player;
    const near = s.nodes.filter((n) => n.nodeId === 'rubble' && n.room === s.room).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    if (!near) throw new Error('no boulder');
    h.walkTo(near.x, near.y + 14);
  });
  // The in-reach E prompt, or the gathering goal's own E prompt standing in for it (as in the name-tag test).
  await expect.poll(async () => { const u = await ui(page); return (u?.interactPrompt ?? u?.prompt)?.key; }).toBe('E');
  await page.keyboard.press('i');
  await expect.poll(async () => (await ui(page))?.inventory.open).toBe(true);
  // Live ticks from here, so the key presses reach the sim as play sends them.
  await page.evaluate(() => window.__GAME__?.resume());
  const tickAfter = async (n: number) => {
    const t0 = (await state(page)).tick;
    await expect.poll(async () => (await state(page)).tick, { timeout: 20_000 }).toBeGreaterThan(t0 + n);
  };
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.inventory.open).toBe(false);
  await tickAfter(10);
  expect((await state(page)).harvest).toBeNull();
  // The next E, with nothing open, harvests as usual.
  await page.keyboard.press('e');
  await expect.poll(async () => (await state(page)).harvest, { timeout: 20_000 }).not.toBeNull();
  expect(errors).toEqual([]);
});

test("a champion's hover tag leaves its name to the nameplate; a plain enemy's tag names it (050 review)", async ({ page }) => {
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  const [champ, husk] = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const p = g.step(1).player;
    const a = g.spawnEnemy('husk', p.x + 90, p.y, true).enemies.at(-1);
    const b = g.spawnEnemy('husk', p.x - 90, p.y, false).enemies.at(-1);
    if (!a || !b) throw new Error('no enemies');
    for (const e of [a, b]) g.setEnemyHealth(e.id, 1000);
    return [a.id, b.id];
  });
  await cameraSettled(page);
  const hoverEnemy = async (id: number) => {
    const s = await state(page);
    const e = s.enemies.find((en) => en.id === id);
    const cam = (await ui(page))?.camera;
    if (!e || !cam) throw new Error('no enemy');
    const at = await screenPoint(page, e.x - (cam.x - VIEW_WIDTH / 2), e.y - 12 - (cam.y - VIEW_HEIGHT / 2));
    await page.mouse.move(at.x, at.y);
  };
  await hoverEnemy(champ);
  await expect.poll(async () => (await ui(page))?.hoverName).not.toBeNull();
  const named = (await state(page)).enemies.find((e) => e.id === champ)?.champion?.name;
  expect((await ui(page))?.hoverName).toBe(named);
  expect((await ui(page))?.hoverNameDrawn).toBe(false);
  await hoverEnemy(husk);
  await expect.poll(async () => (await ui(page))?.hoverName).toBe('Husk');
  expect((await ui(page))?.hoverNameDrawn).toBe(true);
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
      h.walkTo((x + 0.5) * 32, (25.5 + h.oy) * 32);
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
    // 060: the Forgewright's first kill ends the demo.
    const b = g.getState().enemies.find((e) => e.enemyId === 'forgewright');
    if (!b) throw new Error('no Forgewright');
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
    h.walkTo(21.7 * 32, 9.5 * 32); // 052: beside the bench, just inside the door at (22, 9)
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

  // Onto the tip itself (off the row): the row's tip goes at once (where the tip covers another row, that row's shows).
  const shown = (await ui(page))?.tip;
  if (!shown) throw new Error('no tip');
  const onTip = await screenPoint(page, shown.box.x + shown.box.w / 2, shown.box.y + shown.box.h / 2);
  await page.mouse.move(onTip.x, onTip.y);
  await expect.poll(async () => (await ui(page))?.tip?.source.id ?? null, { timeout: 2000 }).not.toBe(shown.source.id);
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

test('Mending-style field regen heals with no sparkle; the ward ring keeps still under the walking player, a shield on it (050 A.15, A.16)', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  // A regen piece and the Wardstone Circlet, worn at the bench; then hurt, out in the field.
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(1);
    h.toFoundry();
    h.walkTo(21.7 * 32, 9.5 * 32); // 052: beside the bench, just inside the door at (22, 9)
    let s = g.addGear({ slot: 'body', rarity: 'rare', weight: 'light', baseArmor: 2, affixes: [{ kind: 'regen', value: 2 }], relic: null, name: 'Mending Robe' });
    g.step(1, { equip: { id: s.gear.at(-1)?.id ?? -1 } });
    s = g.addGear({ slot: 'helm', rarity: 'relic', weight: null, baseArmor: 2, affixes: [], relic: 'wardstone-circlet', name: 'Wardstone Circlet' });
    g.step(1, { equip: { id: s.gear.at(-1)?.id ?? -1 } });
    h.toHall();
    g.setPlayerHealth(40);
    // The ward charges for 360 ticks from its equip (052: the bench is by the door now, no long walk to cover that).
    g.step(400);
  });
  expect((await state(page)).player.healing).toBe('regen');
  await expect.poll(async () => (await ui(page))?.relics.shield).toBe(true);
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.__GAME__?.step(4));
    await frameDrawn(page);
    expect((await ui(page))?.healing.motes).toBe(0);
  }
  // Walking: the ring sits on the player's own point every frame (rounded against it, it was up to half a px off and shook).
  const offsets: { dx: number; dy: number }[] = [];
  for (let i = 0; i < 20; i++) {
    await page.evaluate((k) => window.__GAME__?.step(3, { moveX: 1, moveY: k % 2 === 0 ? 1 : 0 }), i);
    await frameDrawn(page);
    const u = await ui(page);
    const ring = u?.relics.ring;
    const p = (await state(page)).player;
    if (!ring) throw new Error('no ring');
    offsets.push({ dx: ring.x - p.x, dy: ring.y - p.y });
  }
  for (const o of offsets) {
    expect(Math.abs(o.dx)).toBeLessThan(0.05);
    expect(Math.abs(o.dy + RELIC_LOOK.shimmer.lift)).toBeLessThan(0.05);
  }
  expect(errors).toEqual([]);
});

test('the title: the wanderer breathes, sways and glows; the logo and buttons are bigger, centred where they were (050 F)', async ({ page }) => {
  const errors = watchErrors(page);
  await bootTitle(page);
  const motion = () => page.evaluate(() => window.__GAME__?.ui().flow.title?.motion);
  const first = await motion();
  if (!first) throw new Error('no title');
  // Each part of the motion moves on its own while the title shows.
  for (const key of ['crouch', 'flap', 'hose', 'muzzle'] as const) await expect.poll(async () => (await motion())?.[key], { timeout: 5000 }).not.toBe(first[key]);
  const title = await page.evaluate(() => window.__GAME__?.ui().flow.title);
  expect(title?.logoScale).toBeGreaterThan(5);
  const rows = title?.rows ?? [];
  expect(rows[0]?.w).toBeGreaterThan(MENU_ROW_W);
  const top = rows[0]?.y ?? 0;
  const last = rows.at(-1);
  if (!last || !rows[0]) throw new Error('no rows');
  expect(rows[0].x + rows[0].w / 2).toBeCloseTo(500, 0);
  expect(Math.abs((top + last.y + last.h) / 2 - 182)).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
});

test('at a fullscreen size the page never overflows, so no scroll bar comes and goes (050 A.4)', async ({ page }) => {
  // F11 on a 1080p screen: the view fits at zoom 3 exactly (1920×1080).
  await page.setViewportSize({ width: 1920, height: 1080 });
  await bootTitle(page);
  const sizes = () =>
    page.evaluate(() => {
      const d = document.documentElement;
      return { scrollW: d.scrollWidth, scrollH: d.scrollHeight, w: d.clientWidth, h: d.clientHeight, overflow: getComputedStyle(document.body).overflow };
    });
  const s = await sizes();
  expect(s.scrollH, JSON.stringify(s)).toBeLessThanOrEqual(s.h);
  expect(s.scrollW, JSON.stringify(s)).toBeLessThanOrEqual(s.w);
  expect(s.overflow).toBe('hidden');
});
