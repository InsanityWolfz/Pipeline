import { expect, test, type Page } from '@playwright/test';
import { boot, watchErrors } from './helpers';
import { state } from './foundryPage';
import { GUIDED_BUILDS } from '../../src/data/guidedBuilds';
import { OBJECTIVES } from '../../src/data/objectives';
import { FILL_GOAL, TRAVEL_GOAL } from '../fixtures/foundrySteps';
import { buildGhosts, installRunHelpers } from './tutorialPage';

// 046 (note 10, 027), 067: the foundry tutorial's first line. A new game takes the tube; the foundry's stairs stay
// sealed until the shrine's pylon is claimed (the hook here), and the first walk in attunes the tube on a bare floor.
// The player builds the arrow line on its ghosts, fed by conduits from the wood, stone and fiber ports the shrine's
// pylon fills: its machines pop "+ shaft" and the rest, and arrows go up the tube until it's full, with no hopper and
// no refill. (046's example line and refill goal are gone; 067's review shots are foundryAfterShrineShots.spec.ts.)

const ARROW = OBJECTIVES.findIndex((o) => o.guided === 'arrow-line');
const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

test('after the claim, a new game builds the arrow line on its ghosts from the ports and sees arrows go up the tube', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  await boot(page, '?start=tutorial');
  await installRunHelpers(page);

  // The tube from its stone (012), arrows crafted by hand (the third goal: the line's machines unlock), and the ruin
  // field's pack gone: the stairs stay sealed (067).
  const before = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(0);
    h.walkTo((40.5 + h.ox) * 32, (34.5 + h.oy) * 32);
    g.step(1, { interact: true });
    const p = g.getState().player;
    for (const raw of ['wood', 'stone', 'fiber']) g.drop(raw, p.x, p.y);
    g.step(30);
    for (const r of ['shaft', 'arrowhead', 'rope', 'arrow']) g.craft(r);
    for (const e of g.getState().enemies.filter((x) => x.group === 'field')) g.setEnemyHealth(e.id, 0);
    return g.step(2);
  });
  expect(before).toMatchObject({ hasTube: true, gates: { foundry: false, shrine: true }, foundry: { pieces: [] } });
  expect(before.crafted).toEqual(expect.arrayContaining(['shaft', 'arrowhead', 'rope', 'arrow']));

  // The shrine's pylon claimed (the hook): the stairs open, and every goal before the travel done, it's current.
  const claimed = await page.evaluate((n) => {
    const g = window.__GAME__;
    g?.claim('shrine');
    g?.step(1);
    return g?.completeObjectives(n);
  }, OBJECTIVES.findIndex((o) => o.text === TRAVEL_GOAL));
  expect(claimed?.gates.foundry).toBe(true);
  expect(claimed?.objective.text).toBe(TRAVEL_GOAL);
  expect(claimed?.ports.map((p) => p.raw)).toEqual(expect.arrayContaining(['wood', 'stone', 'fiber']));

  // Down the stairs: the tube attunes, the floor is bare, and the arrow line's ghosts show.
  await page.evaluate(() => window.__helpers?.toFoundry());
  const inside = await page.evaluate(() => {
    const g = window.__GAME__;
    let s = g?.step(1);
    for (let t = 0; t < 600 && s && s.link.attunePulse > 0; t++) s = g?.step(1);
    return s;
  });
  expect(inside).toMatchObject({ room: 'foundry', link: { attuned: true }, foundry: { pieces: [] }, objective: { index: ARROW } });
  await expect.poll(async () => (await ui(page))?.guided.ghosts.length).toBe(GUIDED_BUILDS['arrow-line'].length);

  // Built ghost by ghost; the parts pop over their machines as each is first made (slowed, so they can be seen).
  await page.evaluate(() => window.__GAME__?.tweenSpeed(0.05));
  expect(await buildGhosts(page)).toEqual({ placed: 42, refused: 1 });
  const s = await page.evaluate(() => {
    const g = window.__GAME__;
    let x = g?.step(1);
    for (let t = 0; t < 3000 && x && x.intake.entrances[1]?.ammo !== 'arrow'; t++) x = g?.step(1);
    return x;
  });
  expect(s?.intake.entrances[1]?.ammo).toBe('arrow');
  expect(s?.foundry.pieces.some((p) => p.kind === 'hopper')).toBe(false);
  await expect.poll(async () => (await ui(page))?.madePopups.map((p) => p.text).sort()).toEqual(['+ arrow', '+ arrowhead', '+ rope', '+ shaft']);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  expect(s?.objective.text).toBe(FILL_GOAL);

  // The ports keep it running: the tube fills, and the line moves on to the bench.
  const full = await page.evaluate(() => {
    const g = window.__GAME__;
    let x = g?.step(1);
    for (let t = 0; t < 6000 && x && !x.firstLineFull; t++) x = g?.step(1);
    return x;
  });
  expect(full?.firstLineFull).toBe(true);
  expect(full?.objective.text).toBe('Identify your armor at the bench (E)');
  expect((await state(page)).intake.entrances[1]).toMatchObject({ ammo: 'arrow', count: 30 });

  // Nothing paused the game or opened a panel along the way.
  const after = await ui(page);
  expect([after?.paused, after?.craftOpen, after?.pickerOpen]).toEqual([false, false, false]);
  expect(errors).toEqual([]);
});
