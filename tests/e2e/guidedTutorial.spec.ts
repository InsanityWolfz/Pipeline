import { expect, test, type Page } from '@playwright/test';
import { GUIDED_BUILDS, GUIDED_TEXT } from '../../src/data/guidedBuilds';
import { boot, cameraSettled, watchErrors } from './helpers';
import { goalTo, newGameInFoundry } from './guidedPage';
import { clickBar, screenPoint, state, step, STAND, centre, clickTile, toggleBuild } from './foundryPage';

// 058: the guided tutorial's screens, from a New game staged through the hook: the bench screen's arrows on what to
// click to wear the identified piece, the build bar's arrow on the guided step's next piece (the rest greyed, with
// their locked line), a refused placement's hint, and the "Unlocked" banner when recipes join the crafting menu.
// tutorial.spec.ts plays the whole chain.

const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

test('the bench screen points at the identified piece, then at what wears it (058.7)', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await newGameInFoundry(page);
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.walkTo(21.7 * 32, 9.5 * 32);
    const p = g.getState().player;
    g.drop('unidentified-armor', p.x, p.y);
    g.step(20);
    g.step(1, { identify: true });
  });
  await goalTo(page, 'Equip a piece of armor at the bench (E)');
  const piece = (await state(page)).gear[0];
  if (!piece) throw new Error('nothing identified');
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.gearPanel?.open, { timeout: 15_000 }).toBe(true);
  // The panel opens on the body tab: on another slot, the arrow points at the piece's tab first.
  let guide = (await ui(page))?.gearPanel?.guide;
  if (piece.slot !== 'body') {
    expect(guide?.target).toBe('tab');
    const box = guide?.box;
    if (!box) throw new Error('no tab arrow');
    const p = await screenPoint(page, box.x + box.w / 2, box.y + box.h / 2);
    await page.mouse.click(p.x, p.y);
    await expect.poll(async () => (await ui(page))?.gearPanel?.guide?.target).toBe('row');
    guide = (await ui(page))?.gearPanel?.guide;
  }
  expect(guide).toMatchObject({ target: 'row', id: piece.id });
  const box = guide?.box;
  if (!box) throw new Error('no row arrow');
  const p = await screenPoint(page, box.x + box.w / 2, box.y + box.h / 2);
  await page.mouse.click(p.x, p.y);
  await expect.poll(async () => Object.values((await step(page, 1)).equipped).includes(piece.id)).toBe(true);
  // Worn: the goal moves on, and the arrow goes.
  // 067: the bench comes after the shrine and the first arrow line; the Warden core's entrance is next.
  expect((await step(page, 1)).objective.text).toBe('Restore the right intake entrance (E with the warden core)');
  await expect.poll(async () => (await ui(page))?.gearPanel?.guide ?? null).toBeNull();
  expect(errors).toEqual([]);
});

test('in build mode the bar points at the next ghost piece; the rest is greyed and a wrong placement is refused with a hint', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await newGameInFoundry(page);
  await goalTo(page, 'Put ley bolts into the second entrance (B)');
  await page.evaluate(([x, y]) => window.__helpers?.walkTo(x, y), [centre(STAND.tx, STAND.ty).x, centre(STAND.tx, STAND.ty).y] as const);
  await cameraSettled(page);
  // The ghosts show in the world, the next first; its tile is the waypoint's target.
  await expect.poll(async () => (await ui(page))?.guided.ghosts.length).toBe(GUIDED_BUILDS['ley-line'].length);
  expect((await ui(page))?.guided.ghosts[0]).toMatchObject({ pieceId: 'conduit', tx: 2, ty: 10, next: true });
  expect((await ui(page))?.objective.subSteps.map((s) => s.text)).toEqual(['Place conduits 0/2']);
  await toggleBuild(page);
  await expect.poll(async () => (await ui(page))?.buildBar?.guide.arrow?.pieceId).toBe('conduit');
  const bar = (await ui(page))?.buildBar;
  expect(bar?.guide.locked).toContain('splitter');
  expect(bar?.guide.locked).not.toContain('conduit');
  // Hovering a greyed cell says it unlocks later.
  const cell = bar?.cells.find((c) => c.pieceId === 'splitter');
  if (!cell) throw new Error('no splitter cell');
  const over = await screenPoint(page, cell.x + cell.w / 2, cell.y + cell.h / 2);
  await page.mouse.move(over.x, over.y);
  await expect.poll(async () => (await ui(page))?.buildBar?.guide.lockTip).toBe(GUIDED_TEXT.lockedCell);
  // Off the ghost: refused, with the hint.
  await clickBar(page, 'conduit');
  await clickTile(page, 9, 8);
  await expect.poll(async () => (await ui(page))?.guided.hint).toBe(GUIDED_TEXT.ghost);
  expect((await state(page)).foundry.pieces.some((p) => p.tx === 9 && p.ty === 8)).toBe(false);
  expect(errors).toEqual([]);
});

test("067: on the first visit the arrow line's ghosts show from the wood port, and the bar points at a conduit", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await newGameInFoundry(page);
  await goalTo(page, 'Build an arrow line into the middle entrance (B)');
  await expect.poll(async () => (await ui(page))?.guided.ghosts.length).toBe(GUIDED_BUILDS['arrow-line'].length);
  expect((await ui(page))?.guided.ghosts[0]).toMatchObject({ pieceId: 'conduit', tx: 2, ty: 4, next: true });
  expect((await ui(page))?.objective.subSteps.map((s) => s.text)).toEqual(['Place conduits 0/9']);
  await toggleBuild(page);
  await expect.poll(async () => (await ui(page))?.buildBar?.guide.arrow?.pieceId).toBe('conduit');
  expect((await ui(page))?.buildBar?.guide.locked).toContain('splitter');
  expect(errors).toEqual([]);
});

test('new recipes in the crafting menu show an "Unlocked" banner, several in one', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?start=tutorial');
  await page.evaluate(() => window.__GAME__?.step(1));
  // A frame drawn on that tick: the unlock banner has taken the start's recipes as seen.
  await page.waitForFunction(() => {
    const g = window.__GAME__;
    return !!g && g.ui().drawnTick === g.getState().tick;
  });
  // 067: stone, Husk resin and ley crystal carried at once: the bomb and ley bolt chains' rows show together.
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const p = g.getState().player;
    for (const raw of ['stone', 'husk-resin', 'ley-crystal']) g.drop(raw, p.x, p.y);
    g.step(30);
  });
  await expect.poll(async () => (await ui(page))?.banners.find((b) => b.kind === 'unlock')).toMatchObject({ kicker: 'Unlocked' });
  const unlock = (await ui(page))?.banners.filter((b) => b.kind === 'unlock') ?? [];
  expect(unlock).toHaveLength(1);
  expect(unlock[0]?.name.split(', ').length).toBeGreaterThan(1);
  expect(unlock[0]?.name).toContain('Ley bolt');
  expect(errors).toEqual([]);
});
