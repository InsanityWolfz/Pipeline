import { expect, test, type Page } from '@playwright/test';
import { SEALED_DOOR_TEXT } from '../../src/data/hints';
import { OVERWORLD } from '../../src/data/overworld';
import { boot, cameraSettled, quietScreen } from './helpers';
import { craftRow, openCraftTab } from './craftPage';
import { centre, toggleBuild } from './foundryPage';
import { GROTTO_GROUP } from '../../src/data/grotto';
import { OBJECTIVES } from '../../src/data/objectives';
import { buildArrowLine, craftLeyByHand, goalTo, newGameInFoundry } from './guidedPage';

// Review screenshots for 067 (REVIEW_SHOTS=1, into docs/review/067): the sealed foundry door with its message; the
// bomb and ley bolt craft rows before the foundry; the first ghost arrow line, part built and finished; the tube
// filling from the ports; and (067's raised item) the frost step's rimestone line moved round the arrow line.

const SHOTS = 'docs/review/067';
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
    for (let i = 0; i < 80 && g.getState().guided.ghosts.length > n; i++) {
      const next = g.getState().guided.ghosts[0];
      if (!next) break;
      if (next.kind === 'remove') g.step(1, { pickUp: { tx: next.tx, ty: next.ty } });
      else g.step(1, { place: { pieceId: next.piece, tx: next.tx, ty: next.ty, facing: next.facing } });
    }
  }, left);
}

test.describe('review screenshots (067)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/067');
  test.use({ viewport: { width: 1280, height: 720 } });

  test('01 the sealed foundry door, its shimmer and its message', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, '?start=tutorial');
    await page.evaluate(({ tx, ty }) => {
      const h = window.__helpers;
      const g = window.__GAME__;
      if (!h || !g) throw new Error('no game');
      g.step(0);
      h.walkTo((tx + 1.5) * 32, g.getState().player.y);
      h.walkTo((tx + 1.5) * 32, (ty + 1.5) * 32);
      h.walkTo((tx + 0.5) * 32, (ty + 1.5) * 32);
    }, OVERWORLD.entrance.door);
    await quietScreen(page);
    await cameraSettled(page, 20_000);
    await page.evaluate(() => window.__GAME__?.step(1, { interact: true }));
    await expect.poll(async () => (await ui(page))?.sealedDoor).toBe(SEALED_DOOR_TEXT.foundry);
    // The message and the shimmer's pulse held still for the shot.
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
    await page.screenshot({ path: `${SHOTS}/01-sealed-door.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  });

  test('02 the bomb and ley bolt rows in the crafting menu before the foundry', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, '?start=tutorial');
    const s = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.step(0).player;
      for (const raw of ['stone', 'husk-resin', 'ley-crystal', 'ley-crystal']) g.drop(raw, p.x, p.y);
      return g.step(30);
    });
    expect(s?.gates.foundry).toBe(false);
    expect(s?.link.attuned).toBe(false);
    await quietScreen(page);
    await openCraftTab(page, 'bomb');
    await craftRow(page, 'bomb');
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${SHOTS}/02a-bomb-rows.png` });
    await openCraftTab(page, 'ley-bolt');
    await craftRow(page, 'ley-bolt');
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${SHOTS}/02b-ley-bolt-rows.png` });
  });

  test('03 the first arrow line on its ghosts, part built, then finished, then the tube filling from the ports', async ({ page }) => {
    test.setTimeout(180_000);
    await newGameInFoundry(page);
    await goalTo(page, 'Build an arrow line into the middle entrance (B)');
    // Part built: the wood port's conduits and the cutter, the stone port's on their way.
    await buildUntil(page, 28);
    await standAt(page, 8, 7);
    await toggleBuild(page);
    await expect.poll(async () => (await ui(page))?.buildBar?.guide.arrow?.pieceId).toBe('conduit');
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${SHOTS}/03-arrow-ghosts-part-built.png` });
    await toggleBuild(page);

    await buildUntil(page, 0);
    await expect.poll(async () => (await ui(page))?.guided.ghosts.length).toBe(0);
    // Just after the first wood comes in, before the tube has filled.
    await page.evaluate(() => window.__GAME__?.step(2));
    await standAt(page, 8, 7);
    await page.screenshot({ path: `${SHOTS}/04-arrow-line-finished.png` });

    await page.evaluate(() => {
      const g = window.__GAME__;
      let s = g?.step(1);
      for (let t = 0; t < 4000 && s && (s.intake.entrances[1]?.count ?? 0) < 12; t++) s = g?.step(1);
    });
    await standAt(page, 16, 4);
    expect((await page.evaluate(() => window.__GAME__?.getState()))?.intake.entrances[1]).toMatchObject({ ammo: 'arrow' });
    await page.screenshot({ path: `${SHOTS}/05-tube-filling-from-ports.png` });
  });

  test('06 the frost step moved round the arrow line: the rimestone line along row 12 and up column 14, into the rune', async ({ page }) => {
    test.setTimeout(180_000);
    await newGameInFoundry(page);
    await page.evaluate((grotto) => window.__GAME__?.claim(grotto), GROTTO_GROUP);
    await buildArrowLine(page);
    await craftLeyByHand(page);
    await goalTo(page, 'Put ley bolts into the second entrance (B)');
    await buildUntil(page, 0);
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
    await page.evaluate((n) => window.__GAME__?.completeObjectives(n), OBJECTIVES.findIndex((o) => o.guided === 'frost-line'));
    // The conduit out, the rune in, the row 12 run and its corner: the underground pair is next.
    await buildUntil(page, 10);
    await standAt(page, 17, 8);
    await expect.poll(async () => (await ui(page))?.guided.ghosts[0]?.pieceId).toBe('underground-entrance');
    await page.screenshot({ path: `${SHOTS}/06-frost-line-moved.png` });
  });
});
