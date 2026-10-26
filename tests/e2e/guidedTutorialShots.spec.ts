import { expect, test, type Page } from '@playwright/test';
import { GROTTO_GROUP } from '../../src/data/grotto';
import { OBJECTIVES } from '../../src/data/objectives';
import { boot, cameraSettled, quietScreen } from './helpers';
import { centre, screenPoint, step, toggleBuild } from './foundryPage';
import { buildArrowLine, craftLeyByHand, goalTo, newGameInFoundry } from './guidedPage';

// Review screenshots for 058 (REVIEW_SHOTS=1, into docs/review/058): the bench screen's arrows, the ley line's ghosts
// with the build bar's arrow, the frost step's remove arrow, frost rune ghost and underground ghosts, the goal panel
// under the foundry's minimap, the waypoint arrow clear of an E prompt, an unlock banner, and the goal area empty
// after the tutorial's end.

const SHOTS = 'docs/review/058';
const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

/** Walks to a tile and waits for the camera to come to rest there. */
async function standAt(page: Page, tx: number, ty: number): Promise<void> {
  await page.evaluate(([x, y]) => window.__helpers?.walkTo(x, y), [centre(tx, ty).x, centre(tx, ty).y] as const);
  await quietScreen(page);
  await cameraSettled(page, 20_000);
}

/** Builds the current guided step's ghosts by command until `left` remain. */
async function buildUntil(page: Page, left: number): Promise<void> {
  await page.evaluate((n) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let i = 0; i < 60 && g.getState().guided.ghosts.length > n; i++) {
      const next = g.getState().guided.ghosts[0];
      if (!next) break;
      if (next.kind === 'remove') g.step(1, { pickUp: { tx: next.tx, ty: next.ty } });
      else g.step(1, { place: { pieceId: next.piece, tx: next.tx, ty: next.ty, facing: next.facing } });
    }
  }, left);
}

test.describe('review screenshots (058)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/058');
  test.use({ viewport: { width: 1280, height: 720 } });

  test('01 the bench screen points at the identified piece, then at what wears it', async ({ page }) => {
    test.setTimeout(120_000);
    await newGameInFoundry(page);
    await page.evaluate(() => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      h.walkTo(21.7 * 32, 9.5 * 32);
      const p = g.getState().player;
      // The first Husk's drop, identified (on the body tab the panel opens on, or another, whose tab gets the arrow first).
      g.drop('unidentified-armor', p.x, p.y);
      g.step(20);
      g.step(1, { identify: true });
    });
    await goalTo(page, 'Equip a piece of armor at the bench (E)');
    await quietScreen(page);
    await page.keyboard.press('e');
    await expect.poll(async () => (await ui(page))?.gearPanel?.guide).not.toBeNull();
    await page.screenshot({ path: `${SHOTS}/01-bench-arrow.png` });
    const guide = (await ui(page))?.gearPanel?.guide;
    if (guide?.target === 'tab') {
      const p = await screenPoint(page, guide.box.x + guide.box.w / 2, guide.box.y + guide.box.h / 2);
      await page.mouse.click(p.x, p.y);
      await expect.poll(async () => (await ui(page))?.gearPanel?.guide?.target).toBe('row');
      await page.mouse.move(0, 0);
      await page.screenshot({ path: `${SHOTS}/02-bench-arrow-row.png` });
    }
  });

  test('03 the ley line on its ghosts, with the build bar pointing at the next piece', async ({ page }) => {
    test.setTimeout(120_000);
    await newGameInFoundry(page);
    // 067: the first arrow line stands before the ley line.
    await buildArrowLine(page);
    await craftLeyByHand(page);
    await goalTo(page, 'Put ley bolts into the second entrance (B)');
    await buildUntil(page, 23);
    await standAt(page, 8, 7);
    await toggleBuild(page);
    await expect.poll(async () => (await ui(page))?.buildBar?.guide.arrow?.pieceId).toBe('grinder');
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${SHOTS}/03-ley-ghosts-bar-arrow.png` });
  });

  test('04 the frost step: the remove arrow, the frost rune ghost, and the underground ghosts', async ({ page }) => {
    test.setTimeout(150_000);
    await newGameInFoundry(page);
    await page.evaluate((grotto) => window.__GAME__?.claim(grotto), GROTTO_GROUP);
    // 067: the first arrow line stands before the ley line; the frost step takes its conduit out of the assembler.
    await buildArrowLine(page);
    await craftLeyByHand(page);
    await goalTo(page, 'Put ley bolts into the second entrance (B)');
    await buildUntil(page, 0);
    // Frost arrows by hand (the frost rune joins the bar), then every goal before the frost step done.
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.getState().player;
      g.drop('rimestone', p.x, p.y);
      for (let i = 0; i < 4; i++) g.drop('arrow', p.x, p.y);
      g.step(30);
      g.craft('frost-rune-arrow');
      g.step(1);
    });
    expect((await step(page, 1)).crafted).toContain('arrow+frost');
    await page.evaluate((n) => window.__GAME__?.completeObjectives(n), OBJECTIVES.findIndex((o) => o.guided === 'frost-line'));
    await standAt(page, 15, 5);
    await expect.poll(async () => (await ui(page))?.guided.remove?.text).toBe('Right click to remove');
    await page.screenshot({ path: `${SHOTS}/04-remove-arrow.png` });

    await buildUntil(page, 24);
    await toggleBuild(page);
    await expect.poll(async () => (await ui(page))?.buildBar?.guide.arrow?.pieceId).toBe('frost-rune');
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${SHOTS}/05-frost-rune-ghost.png` });

    // 067: the rimestone line runs east along row 12 and up column 14, under the ley line at (14,10).
    await buildUntil(page, 10);
    await toggleBuild(page);
    await standAt(page, 17, 9);
    await toggleBuild(page);
    await expect.poll(async () => (await ui(page))?.buildBar?.guide.arrow?.pieceId).toBe('underground-entrance');
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${SHOTS}/06-underground-ghosts.png` });
  });

  test('07 the goal panel under the foundry minimap, and the waypoint arrow clear of an E prompt', async ({ page }) => {
    test.setTimeout(120_000);
    await newGameInFoundry(page);
    await page.evaluate(() => {
      const g = window.__GAME__;
      const p = g?.getState().player;
      if (p) g?.drop('unidentified-armor', p.x, p.y);
      g?.step(20);
    });
    await goalTo(page, 'Identify your armor at the bench (E)');
    await standAt(page, 20, 9);
    await expect.poll(async () => (await ui(page))?.prompt?.key).toBe('E');
    await expect.poll(async () => (await ui(page))?.waypoint?.mode).toBe('over');
    await page.screenshot({ path: `${SHOTS}/07-goal-under-minimap-arrow-over-prompt.png` });
  });

  test('08 an unlock banner', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, '?start=tutorial');
    await page.evaluate(() => window.__GAME__?.step(1));
    await page.waitForTimeout(300);
    // 067: the bomb and ley bolt rows show once stone, resin and ley crystal are carried.
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.getState().player;
      for (const raw of ['stone', 'husk-resin', 'ley-crystal']) g.drop(raw, p.x, p.y);
      g.step(30);
    });
    await expect.poll(async () => (await ui(page))?.banners.some((b) => b.kind === 'unlock')).toBe(true);
    // Held at full strength.
    await expect.poll(async () => (await ui(page))?.bannerAlpha).toBe(1);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
    await page.screenshot({ path: `${SHOTS}/08-unlock-banner.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  });

  test('09 the goal area empty after the tutorial ends', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, '?start=tutorial');
    await step(page, 1);
    const s = await page.evaluate((n) => window.__GAME__?.completeObjectives(n), OBJECTIVES.length);
    expect(s?.objective).toEqual({ index: null, text: '' });
    await quietScreen(page);
    await expect.poll(async () => (await ui(page))?.objective.text).toBe('');
    await page.screenshot({ path: `${SHOTS}/09-goal-area-empty.png` });
  });
});
