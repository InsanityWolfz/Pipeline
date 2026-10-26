import { expect, test, type Page } from '@playwright/test';
import { SUPPLY_TICKS } from '../../src/data/claims';
import { HOLLOWS } from '../../src/data/hollows';
import { OVERWORLD } from '../../src/data/overworld';
import { ROAD_DEFS } from '../../src/data/roads';
import { polar } from '../../src/data/worldShape';
import { boot, cameraSettled, quietScreen } from './helpers';

// Review screenshots for 053 (REVIEW_SHOTS=1, into docs/review/053): the whole round world on the minimap, the
// foundry's gatehouse, a road junction, a claimed ley line carrying its raws' icons home, the barrier's curtain on its
// circle, and the cliff edge past the Hollows.

const SHOTS = 'docs/review/053';

async function walk(page: Page, points: readonly (readonly [number, number])[]): Promise<void> {
  await page.evaluate((pts) => {
    const h = window.__helpers;
    const g = window.__GAME__;
    if (!h || !g) throw new Error('no helpers');
    for (const [tx, ty] of pts) {
      h.walkTo((tx + 0.5) * 32, (ty + 0.5) * 32);
      g.setPlayerHealth(100);
    }
  }, points);
}

/** Kills every enemy but the bosses through the hook (a boss's kill would end the playtest), so a walk is quiet. */
async function quiet(page: Page): Promise<void> {
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (const e of g.getState().enemies) if (e.enemyId !== 'bulwark' && e.enemyId !== 'pylon-warden' && e.enemyId !== 'forgewright' && e.enemyId !== 'conductor') g.setEnemyHealth(e.id, 0);
    g.step(1);
  });
}

async function settle(page: Page): Promise<void> {
  await cameraSettled(page, 20_000);
  await quietScreen(page);
  // The quiet walk's kills level the player up: wait out that line too.
  await page.evaluate(() => window.__GAME__?.tweenSpeed(10));
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().talentFx))?.levelLine ?? null, { timeout: 20_000 }).toBeNull();
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
}

test.describe('review screenshots (053)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/053');

  test('the whole round world on the minimap, revealed', async ({ page }) => {
    test.setTimeout(90_000);
    await boot(page);
    await page.evaluate(() => {
      window.__GAME__?.revealMap();
      window.__GAME__?.step(1);
    });
    await settle(page);
    await page.screenshot({ path: `${SHOTS}/01-minimap-revealed.png` });
    const canvas = await page.locator('canvas').boundingBox();
    if (!canvas) throw new Error('no canvas');
    await page.screenshot({ path: `${SHOTS}/01b-minimap-revealed-close.png`, clip: { x: canvas.x + canvas.width * 0.8, y: canvas.y, width: canvas.width * 0.2, height: canvas.height * 0.34 } });
  });

  test("the foundry's gatehouse", async ({ page }) => {
    test.setTimeout(90_000);
    await boot(page);
    await quiet(page);
    const door = OVERWORLD.entrance.door;
    await walk(page, [[door.tx + 5, door.ty - 3]]);
    await settle(page);
    await page.screenshot({ path: `${SHOTS}/02-foundry-entrance.png` });
  });

  test('a road junction: the west road leaving the south road', async ({ page }) => {
    test.setTimeout(90_000);
    await boot(page);
    await quiet(page);
    const at = ROAD_DEFS.find((r) => r.id === 'terrace')?.waypoints[0] ?? { tx: 0, ty: 0 };
    // On the road at the fork.
    await walk(page, [[at.tx, at.ty + 1]]);
    await settle(page);
    await page.screenshot({ path: `${SHOTS}/03-road-junction.png` });
  });

  test("a claimed shrine's ley line carrying its raws home as their icons", async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page);
    await quiet(page);
    const line = OVERWORLD.leyLines.shrine;
    const mid = line[Math.floor(line.length / 2)] ?? OVERWORLD.shrine.pylon;
    await walk(page, [[Math.round(mid.tx) + 1, Math.round(mid.ty) + 1]]);
    await settle(page);
    // Claimed, then stepped to just short of the pylon's first push (as 049's resin shot), so the poll below steps a
    // tick a frame only through the hauls' run, not the whole wait for them.
    await page.evaluate((t) => {
      window.__GAME__?.claim('shrine');
      window.__GAME__?.step(t);
    }, SUPPLY_TICKS - 10);
    // Wait for the hauls to be on the stretch in view, near the line's middle.
    await expect
      .poll(
        async () => {
          await page.evaluate(() => window.__GAME__?.step(1));
          const flying = (await page.evaluate(() => window.__GAME__?.ui().supply))?.inFlight ?? [];
          return flying.filter((m) => m.site === 'shrine' && m.iconShown && m.progress > 0.35 && m.progress < 0.65).length;
        },
        { timeout: 60_000, intervals: [16] },
      )
      .toBeGreaterThan(1);
    await page.screenshot({ path: `${SHOTS}/04-ley-line-icons.png` });
  });

  test("the barrier's curtain on its circle, from Region 1", async ({ page }) => {
    test.setTimeout(90_000);
    await boot(page);
    await quiet(page);
    // On the south road a few tiles inside the circle.
    const road = OVERWORLD.paths[ROAD_DEFS.findIndex((r) => r.id === 'south')] ?? [];
    const at = road.find((t) => Math.hypot(t.tx + 1 - OVERWORLD.entrance.door.tx, t.ty + 1 - OVERWORLD.entrance.door.ty) > 44) ?? { tx: 0, ty: 0 };
    await walk(page, [[Math.round(at.tx), Math.round(at.ty)]]);
    await settle(page);
    expect((await page.evaluate(() => window.__GAME__?.ui().hollows))?.barrier).toBe('shut');
    await page.screenshot({ path: `${SHOTS}/05-barrier-curtain.png` });
  });

  test('the cliff edge past the Hollows', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, '?start=hollows');
    await quiet(page);
    const at = polar(240, HOLLOWS.radii.outer - 6);
    await walk(page, [[at.tx, at.ty]]);
    await settle(page);
    await page.screenshot({ path: `${SHOTS}/06-world-edge.png` });
  });
});
