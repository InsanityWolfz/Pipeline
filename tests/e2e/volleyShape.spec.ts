import { expect, test, type Page } from '@playwright/test';
import { SPREAD_STEP } from '../../src/data/foundry';
import { cameraSettled, quietScreen, watchErrors } from './helpers';
import { bootSandbox } from './sandboxPage';

// The volley's shape (048), in the sandbox (044: open, bottomless entrances; 060: four): each
// fed entrance fires down its own lane of one fan, west to east, whatever its ammo; a bomb
// lands at the cursor's distance on its lane, so bombs land on an arc round the aim point.
// With REVIEW_SHOTS=1, the review shots in docs/review/048: a three-lane mixed volley and a bomb arc.

const SHOTS = 'docs/review/048';

/** Sets the entrances' rounds (west to east; 060: four, 064: five, so a three-lane volley leaves the last two empty), god mode on, and returns the state. */
function load(page: Page, rounds: (string | null)[]) {
  return page.evaluate((rounds) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.step(1, { sandbox: { kind: 'god', on: true } });
    rounds.forEach((round, entrance) => g.step(1, { sandbox: { kind: 'loadout', entrance, round } }));
    return g.step(1);
  }, rounds);
}

/** Fires one tick at `reach` px east of the player, then `settle` more ticks; the new arrows' angles off the aim by ammo, and the new bombs' landings as [angle, distance]. */
function fire(page: Page, reach: number, settle: number) {
  return page.evaluate(
    ({ reach, settle }) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const s = g.step(0);
      const p = s.player;
      const arrows = new Set(s.arrows.map((a) => a.id));
      const bombs = new Set(s.bombs.map((b) => b.id));
      const shot = g.step(1, { fire: true, aimX: p.x + reach, aimY: p.y });
      const deg = (dx: number, dy: number) => Math.round((Math.atan2(dy, dx) * 1800) / Math.PI) / 10;
      const fresh = shot.arrows.filter((a) => !arrows.has(a.id)).map((a) => [a.ammoId, deg(a.dx, a.dy)] as const);
      const landings = shot.bombs
        .filter((b) => !bombs.has(b.id))
        .map((b) => [deg(b.target.x - p.x, b.target.y - p.y), Math.round(Math.hypot(b.target.x - p.x, b.target.y - p.y))] as const);
      if (settle > 0) g.step(settle);
      return { lanes: shot.intake.lanes, volley: shot.intake.volley, shotCount: shot.tube.shotCount, fresh, landings };
    },
    { reach, settle },
  );
}

test('an arrow, a bomb and an arrow fire as one fan: arrows at ±15°, the bomb on the aim point', async ({ page }) => {
  const errors = watchErrors(page);
  await bootSandbox(page);
  const s = await load(page, ['arrow', 'bomb', 'arrow', null, null]);
  expect(s.intake.volley).toEqual(['arrow', 'bomb', 'arrow']);
  expect(s.intake.lanes).toEqual([-SPREAD_STEP, 0, SPREAD_STEP]);
  const out = await fire(page, 150, 0);
  expect(out.shotCount).toBe(3);
  expect(out.fresh).toEqual([
    ['arrow', -SPREAD_STEP],
    ['arrow', SPREAD_STEP],
  ]);
  expect(out.landings).toEqual([[0, 150]]);
  expect(errors).toEqual([]);
});

test('two bombs and an arrow: the bombs land on the arc at the cursor’s distance, either side of the arrow', async ({ page }) => {
  const errors = watchErrors(page);
  await bootSandbox(page);
  await load(page, ['bomb', 'arrow', 'bomb', null, null]);
  const out = await fire(page, 150, 0);
  expect(out.fresh).toEqual([['arrow', 0]]);
  expect(out.landings).toEqual([
    [-SPREAD_STEP, 150],
    [SPREAD_STEP, 150],
  ]);
  expect(errors).toEqual([]);
});

test.describe('review screenshots (048)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/048');

  test('a three-lane mixed volley, and a bomb arc', async ({ page }) => {
    test.setTimeout(120_000);
    await bootSandbox(page);
    await cameraSettled(page, 20_000);
    await quietScreen(page);

    // An arrow west, a ley bolt centre, a frost arrow east: three lanes a few ticks out, each its own colour.
    await load(page, ['arrow', 'ley-bolt', 'arrow+frost', null, null]);
    const mixed = await fire(page, 220, 10);
    expect(mixed.fresh.map(([, a]) => a)).toEqual([-SPREAD_STEP, 0, SPREAD_STEP]);
    await page.screenshot({ path: `${SHOTS}/01-three-lane-mixed-volley.png` });

    // Clear the air, then three bombs on the arc, caught just before they land.
    await page.evaluate(() => window.__GAME__?.step(90));
    await load(page, ['bomb', 'bomb', 'bomb', null, null]);
    const arc = await fire(page, 160, 44);
    expect(arc.landings).toEqual([
      [-SPREAD_STEP, 160],
      [0, 160],
      [SPREAD_STEP, 160],
    ]);
    await page.screenshot({ path: `${SHOTS}/02-bomb-arc.png` });
  });
});
