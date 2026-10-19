import { expect, test, type Page } from '@playwright/test';
import { boot, cameraSettled, watchErrors } from './helpers';
import { centre, state, step } from './foundryPage';
import { OBJECTIVES } from '../../src/data/objectives';
import { BUILD_PULSE } from '../../src/data/hudLayout';
import { AFTER_STEPS, FOUNDRY_STEPS } from '../fixtures/foundrySteps';

// 027: the foundry tutorial. From the field start (attuned), the opening's goals are
// done by hand (gather, craft the arrow and bomb chains, go down the stairs); then the
// arrow line goes up a step at a time under the hook: hopper, wood, cutter, knapper,
// spinner, assembler, conduit. Each step's text, prompt, pulsing build-bar cell and
// the intake marker are checked, and the line ends on the goal after them.
// With REVIEW_SHOTS=1, the review screenshots go in docs/review/027.

const SHOTS = 'docs/review/027';
const SHOOT = !!process.env.REVIEW_SHOTS;

const STEPS = FOUNDRY_STEPS;
const FIRST = OBJECTIVES.findIndex((o) => o.text === STEPS[0]);
/** Where the player stands while building: right of the line, clear of every piece. */
const BUILD_AT = centre(15, 6);

/** Places a piece facing up and steps one tick. */
async function place(page: Page, pieceId: string, tx: number, ty: number) {
  return step(page, 1, { place: { pieceId, tx, ty, facing: 'up' } });
}

/** Walks below a hopper, puts every one of `itemId` carried into it, and walks back to BUILD_AT. */
async function fill(page: Page, tx: number, ty: number, itemId: string) {
  await page.evaluate(
    ([x, y, hx, hy, item, bx, by]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      h?.walkTo(x, y);
      const hopper = g?.getState().foundry.pieces.find((p) => p.kind === 'hopper' && p.tx === hx && p.ty === hy);
      if (!g || !h || !hopper) throw new Error('no hopper');
      g.step(1, { deposit: { id: hopper.id, itemId: item, amount: 'all' } });
      h.walkTo(bx, by);
    },
    [(tx + 0.5) * 32, (ty + 1.25) * 32, tx, ty, itemId, BUILD_AT.x, BUILD_AT.y] as const,
  );
  return state(page);
}

/** Steps until the objective moves on from `index` (a machine's craft takes a while), failing after `limit` ticks. */
async function stepUntilPast(page: Page, index: number, limit: number) {
  const s = await page.evaluate(
    ([i, n]) => {
      const g = window.__GAME__;
      let s = g?.step(1);
      for (let t = 0; t < n && s?.objective?.index === i; t++) s = g?.step(1);
      return s;
    },
    [index, limit] as const,
  );
  if (!s) throw new Error('no game');
  return s;
}

const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

test('the foundry steps walk the player through an arrow line into the intake', async ({ page }) => {
  test.setTimeout(180_000);
  if (SHOOT) await page.setViewportSize({ width: 1280, height: 720 });
  const errors = watchErrors(page);
  await boot(page, '?start=field&attuned');

  // The opening, by hand: a tree, a rubble pile and reeds (each raw harvested), more raws, a husk's
  // resin and a ley crystal laid at the feet, the arrow and bomb chains crafted, then down the stairs.
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(0);
    for (const node of [0, 5, 6]) h.harvest(node, 1);
    const p = g.getState().player;
    for (const id of ['wood', 'wood', 'stone', 'stone', 'stone', 'fiber', 'fiber', 'husk-resin', 'ley-crystal']) g.drop(id, p.x, p.y);
    h.collect();
    for (const r of ['shaft', 'arrowhead', 'rope', 'arrow', 'casing', 'fuse', 'ley-dust', 'bomb', 'ley-bolt']) g.craft(r);
    h.toFoundry();
  });
  let s = await step(page, 1);
  expect(s.room).toBe('foundry');
  expect(s.inventory.wood ?? 0).toBeGreaterThan(0);
  expect(s.inventory.stone ?? 0).toBeGreaterThan(0);
  expect(s.inventory.fiber ?? 0).toBeGreaterThan(0);
  // The cutter, knapper, spinner and assembler are on the grouped bar (026): their parts were hand-crafted.
  expect(s.unlocked).toEqual(expect.arrayContaining(['hopper', 'conduit', 'cutter', 'knapper', 'spinner', 'assembler']));
  expect(s.objective).toEqual({ index: FIRST, text: STEPS[0] });
  await page.evaluate(([x, y]) => window.__helpers?.walkTo(x, y), [BUILD_AT.x, BUILD_AT.y] as const);

  // 1. B over the player; the build bar's hopper cell pulses once it's open.
  await expect.poll(async () => (await ui(page))?.prompt?.key).toBe('B');
  expect((await ui(page))?.buildBar?.pulsing).toBeNull();
  s = await step(page, 1, { toggleBuild: true });
  expect(s.building).toBe(true);
  await expect.poll(async () => (await ui(page))?.buildBar?.pulsing).toBe('hopper');
  await place(page, 'hopper', 11, 5);
  s = await step(page, 1);
  expect(s.objective).toEqual({ index: FIRST + 1, text: STEPS[1] });

  // 2. E over the newest hopper, at full strength once the player is in reach of it.
  const hopperAt = centre(11, 5);
  await page.evaluate(([x, y]) => window.__helpers?.walkTo(x, y), [hopperAt.x, hopperAt.y + 24] as const);
  await expect.poll(async () => (await ui(page))?.prompt).toEqual({ key: 'E', x: hopperAt.x, y: hopperAt.y, usable: true });
  await fill(page, 11, 5, 'wood');
  s = await step(page, 1);
  expect(s.objective).toEqual({ index: FIRST + 2, text: STEPS[2] });

  // 3. The cutter's cell pulses; B over the player again.
  await expect.poll(async () => (await ui(page))?.buildBar?.pulsing).toBe('cutter');
  expect((await ui(page))?.prompt?.key).toBe('B');
  if (SHOOT) {
    await cameraSettled(page, 20_000);
    // Held at full strength: tweens stop the moment the pulse peaks.
    await page.waitForFunction((max) => {
      const g = window.__GAME__;
      if ((g?.ui().buildBar?.pulseAlpha ?? 0) < max - 0.02) return false;
      g?.tweenSpeed(0);
      return true;
    }, BUILD_PULSE.max);
    expect((await ui(page))?.buildBar?.pulseAlpha).toBeGreaterThanOrEqual(BUILD_PULSE.max - 0.02);
    await page.screenshot({ path: `${SHOTS}/01-step3-cutter-pulsing.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  }
  // The popup is short: slow every tween so it can be seen (and shot) before it fades.
  await page.evaluate(() => window.__GAME__?.tweenSpeed(0.05));
  await place(page, 'cutter', 11, 4);
  s = await stepUntilPast(page, FIRST + 2, 300);
  expect(s.objective).toEqual({ index: FIRST + 3, text: STEPS[3] });
  expect(s.machineMade).toEqual({ shaft: 2 });
  await expect.poll(async () => (await ui(page))?.madePopups.map((p) => p.text)).toEqual(['+ shaft']);
  if (SHOOT) await page.screenshot({ path: `${SHOTS}/02-made-popup.png` });
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  await expect.poll(async () => (await ui(page))?.madePopups).toEqual([]);
  // The step 4 text with its arrow, once the line has faded in.
  if (SHOOT) await page.screenshot({ path: `${SHOTS}/03-step4-text.png` });

  // 4–5. A hopper of stone into a knapper, a hopper of fiber into a spinner.
  await expect.poll(async () => (await ui(page))?.buildBar?.pulsing).toBe('knapper');
  await place(page, 'hopper', 12, 5);
  await fill(page, 12, 5, 'stone');
  await place(page, 'knapper', 12, 4);
  s = await stepUntilPast(page, FIRST + 3, 300);
  expect(s.objective).toEqual({ index: FIRST + 4, text: STEPS[4] });
  await expect.poll(async () => (await ui(page))?.buildBar?.pulsing).toBe('spinner');
  await place(page, 'hopper', 13, 5);
  await fill(page, 13, 5, 'fiber');
  await place(page, 'spinner', 13, 4);
  s = await stepUntilPast(page, FIRST + 4, 300);
  expect(s.objective).toEqual({ index: FIRST + 5, text: STEPS[5] });

  // 6. All three into an assembler across their fronts.
  await expect.poll(async () => (await ui(page))?.buildBar?.pulsing).toBe('assembler');
  await place(page, 'assembler', 12, 3);
  s = await stepUntilPast(page, FIRST + 5, 400);
  expect(s.objective).toEqual({ index: FIRST + 6, text: STEPS[6] });

  // 7. A placing step: B over the player, and an arrow marker over the intake's open entrance; the conduit's cell pulses.
  const mouth = centre(12, 0);
  await expect.poll(async () => (await ui(page))?.marker?.x).toBe(mouth.x);
  expect((await ui(page))?.prompt?.key).toBe('B');
  await expect.poll(async () => (await ui(page))?.buildBar?.pulsing).toBe('conduit');
  if (SHOOT) {
    // Up beside the line, so the camera shows the intake.
    await page.evaluate(([x, y]) => window.__helpers?.walkTo(x, y), [centre(15, 2).x, centre(15, 2).y] as const);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/04-step7-intake-marker.png` });
  }
  await place(page, 'conduit', 12, 2);
  await place(page, 'conduit', 12, 1);
  s = await stepUntilPast(page, FIRST + 6, 300);
  expect(s.objective).toEqual({ index: FIRST + 7, text: AFTER_STEPS });
  expect(s.intake.entrances[1]?.ammo).toBe('arrow');
  await expect.poll(async () => (await ui(page))?.marker ?? null).toBeNull();

  // Nothing paused the game or opened a panel along the way.
  const after = await ui(page);
  expect([after?.paused, after?.craftOpen, after?.pickerOpen]).toEqual([false, false, false]);
  expect(errors).toEqual([]);
});
