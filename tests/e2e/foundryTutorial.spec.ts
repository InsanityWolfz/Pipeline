import { expect, test, type Page } from '@playwright/test';
import { boot, cameraSettled, watchErrors } from './helpers';
import { centre, state } from './foundryPage';
import { EXAMPLE_LINE } from '../../src/data/exampleLine';
import { OBJECTIVES } from '../../src/data/objectives';
import { AFTER_REFILL, REFILL_GOAL } from '../fixtures/foundrySteps';

// 046 (note 10, 027): the foundry tutorial from the example line. A new game takes the tube, the ruin field's pack
// falls (by the hook), and the first walk into the foundry finds a complete arrow line, which starts with the attune:
// its machines pop "+ shaft" and the rest, and arrows go up the tube. Out in the field the tube fires until the line
// runs dry; the objective line then asks for its hoppers to be refilled, with E over a hopper, and refilling them
// ticks it off. With REVIEW_SHOTS=1, the review screenshots go in docs/review/046.

const SHOTS = 'docs/review/046';
const SHOOT = !!process.env.REVIEW_SHOTS;
const REFILL = OBJECTIVES.findIndex((o) => o.text === REFILL_GOAL);
const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

test('a new game finds the example line in the foundry, sees arrows go up the tube, and refills it once it runs dry', async ({ page }) => {
  test.setTimeout(240_000);
  if (SHOOT) await page.setViewportSize({ width: 1280, height: 720 });
  const errors = watchErrors(page);
  await boot(page, '?start=tutorial');

  // The tube from its stone (012), and the ruin field's pack gone, so the stairs open.
  const before = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(0);
    h.walkTo((40.5 + h.ox) * 32, 34.5 * 32);
    g.step(1, { interact: true });
    for (const e of g.getState().enemies.filter((x) => x.group === 'field')) g.setEnemyHealth(e.id, 0);
    return g.step(2);
  });
  expect(before.hasTube).toBe(true);
  expect(before.gates.foundry).toBe(true);
  expect(before.foundry.pieces).toEqual([]);

  // In: the line stands, built from ordinary pieces, its hoppers stocked; the attune starts it.
  await page.evaluate(() => window.__GAME__?.tweenSpeed(0.05));
  await page.evaluate(() => window.__helpers?.toFoundry());
  let s = await state(page);
  expect(s.room).toBe('foundry');
  expect(s.foundry.pieces.map((p) => [p.pieceId, p.tx, p.ty])).toEqual(EXAMPLE_LINE.map((p) => [p.pieceId, p.tx, p.ty]));
  expect(s.foundry.pieces.flatMap((p) => (p.kind === 'hopper' ? [[p.item, p.count]] : []))).toEqual([
    ['wood', 2],
    ['stone', 2],
    ['fiber', 2],
  ]);
  // The parts pop over their machines as each is first made (slowed, so they can be seen), once the door's fade is
  // over and the foundry is on screen (no meadow nodes drawn).
  await expect.poll(async () => Object.keys((await ui(page))?.nodes ?? { x: 1 }).length).toBe(0);
  s = await page.evaluate(() => {
    const g = window.__GAME__;
    let x = g?.step(1);
    for (let t = 0; t < 600 && x && x.intake.entrances[1]?.ammo !== 'arrow'; t++) x = g?.step(1);
    return x;
  }) ?? s;
  expect(s.intake.entrances[1]?.ammo).toBe('arrow');
  await expect.poll(async () => (await ui(page))?.madePopups.map((p) => p.text).sort()).toEqual(['+ arrow', '+ arrowhead', '+ rope', '+ shaft']);
  if (SHOOT) {
    // Beside the line, so the camera shows it and the intake: arrows on their way up the tube.
    await page.evaluate(([x, y]) => window.__helpers?.walkTo(x, y), [centre(15, 3).x, centre(15, 3).y] as const);
    await cameraSettled(page, 20_000);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
    await page.screenshot({ path: `${SHOTS}/01-example-line-running.png` });
  }
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));

  // Every goal before the refill done (the hook), so the line shows what the foundry asks next: not the refill yet.
  s = await page.evaluate((n) => window.__GAME__?.completeObjectives(n), REFILL) ?? s;
  expect(s.objective.text).not.toBe(REFILL_GOAL);
  expect(s.lineRanDry).toBe(false);

  // Out in the field, the tube fires until the line has sent up its last arrow.
  s = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.toHall();
    let x = g.step(1);
    for (let t = 0; t < 20000 && !x.lineRanDry; t++) {
      if (t % 60 === 0) g.setPlayerHealth(100);
      x = g.step(1, { fire: true, aimX: x.player.x + 200, aimY: x.player.y });
    }
    return x;
  }) ?? s;
  expect(s.lineRanDry).toBe(true);
  expect(s.objective).toEqual({ index: REFILL, text: REFILL_GOAL });

  // Back in, with a wood, a stone and a fiber: E over the nearest hopper.
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.toFoundry();
    const p = g.getState().player;
    for (const id of ['wood', 'stone', 'fiber']) g.drop(id, p.x, p.y);
    h.collect();
    h.walkTo(12.5 * 32, 6.25 * 32);
  });
  await expect.poll(async () => (await ui(page))?.prompt).toEqual({ key: 'E', x: centre(12, 5).x, y: centre(12, 5).y, usable: true });
  if (SHOOT) {
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/02-refill-objective.png` });
  }

  // Refilled, each by hand: the goal ticks off and the line moves on.
  s = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    for (const [tx, item] of [[11, 'wood'], [12, 'stone'], [13, 'fiber']] as const) {
      h.walkTo((tx + 0.5) * 32, 6.25 * 32);
      const hopper = g.getState().foundry.pieces.find((p) => p.kind === 'hopper' && p.tx === tx && p.ty === 5);
      if (!hopper) throw new Error(`no hopper at ${tx},5`);
      g.step(1, { deposit: { id: hopper.id, itemId: item, amount: 'all' } });
    }
    return g.step(1);
  }) ?? s;
  expect(s.refilled).toEqual(['wood', 'stone', 'fiber']);
  expect(s.objective.text).not.toBe(REFILL_GOAL);
  expect(s.objective.index ?? OBJECTIVES.length).toBeGreaterThan(REFILL);
  expect(OBJECTIVES[REFILL + 1]?.text).toBe(AFTER_REFILL);

  // Nothing paused the game or opened a panel along the way.
  const after = await ui(page);
  expect([after?.paused, after?.craftOpen, after?.pickerOpen]).toEqual([false, false, false]);
  expect(errors).toEqual([]);
});
