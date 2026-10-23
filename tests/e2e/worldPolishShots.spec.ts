import { expect, test, type Page } from '@playwright/test';
import { FORUM_ARENA, SHRINE_ARENA, type ArenaDef } from '../../src/data/arenas';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { HOME_SHIFT } from '../../src/data/home';
import { ROAD_DEFS } from '../../src/data/roads';
import { boot, cameraSettled, quietScreen } from './helpers';
import { enterArena } from './arenaHelpers';

// Review screenshots for 059 (REVIEW_SHOTS=1, into docs/review/059): two road joins (with SHOTS_BEFORE=1 the same two
// framed on the code before the change, as *-before), the forum's dark walls, the shrine's guards waiting inside its
// open door, the open door's E prompt with its plain hover, the sealed door's "Sealed", and the player behind the
// meadow's boulders.

const SHOTS = 'docs/review/059';
const BEFORE = !!process.env.SHOTS_BEFORE;

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

/** Kills every enemy but the bosses (and, with `keepShrine`, the shrine's guards) through the hook, so a walk is quiet. */
async function quiet(page: Page, keepShrine = false): Promise<void> {
  await page.evaluate((keep) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (const e of g.getState().enemies) {
      if (e.enemyId === 'bulwark' || e.enemyId === 'pylon-warden' || e.enemyId === 'forgewright' || (keep && e.group === 'shrine')) continue;
      g.setEnemyHealth(e.id, 0);
    }
    g.step(1);
  }, keepShrine);
}

async function settle(page: Page): Promise<void> {
  await cameraSettled(page, 20_000);
  await quietScreen(page);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(10));
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().talentFx))?.levelLine ?? null, { timeout: 20_000 }).toBeNull();
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  await cameraSettled(page, 20_000);
}

/** Moves the pointer onto a door's sprite and waits for its hover name. */
async function hoverDoor(page: Page, a: ArenaDef): Promise<void> {
  const t = a.door.tiles[Math.floor(a.door.tiles.length / 2)] ?? a.door.leaveTo;
  const cam = (await page.evaluate(() => window.__GAME__?.ui().camera)) ?? { x: 0, y: 0 };
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  const k = box.width / VIEW_WIDTH;
  const x = (t.tx + 0.5) * 32 - (cam.x - VIEW_WIDTH / 2);
  const y = (t.ty + 0.2) * 32 - (cam.y - VIEW_HEIGHT / 2);
  await page.mouse.move(box.x + x * k, box.y + y * k);
  await expect.poll(async () => page.evaluate(() => window.__GAME__?.ui().hoverName)).toBe(a.door.name);
}

const fork = (id: string) => ROAD_DEFS.find((r) => r.id === id)?.waypoints[0] ?? { tx: 0, ty: 0 };

test.describe('review screenshots (059)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/059');

  for (const [n, id, name] of [
    ['01', 'terrace', 'join-south-west'],
    ['02', 'ley-grotto', 'join-north-east'],
  ] as const) {
    test(`a road join: the ${id} road leaving its parent (${BEFORE ? 'before' : 'after'})`, async ({ page }) => {
      test.setTimeout(90_000);
      await boot(page);
      await quiet(page);
      const at = fork(id);
      // Just off the road beside the fork, so the player doesn't hide the join.
      await walk(page, [[at.tx + 3, at.ty + 4]]);
      await settle(page);
      await page.screenshot({ path: `${SHOTS}/${n}-${name}-${BEFORE ? 'before' : 'after'}.png` });
    });
  }

  test.describe('after only', () => {
    test.skip(BEFORE, 'only the road joins are taken before');

    test("the forum's walls, from its open door and just inside", async ({ page }) => {
      test.setTimeout(120_000);
      // ?start=hollows: the shrine claimed, so the barrier is down and the door open (as 055's shots).
      await boot(page, '?start=hollows');
      await quiet(page);
      await walk(page, [[FORUM_ARENA.door.leaveTo.tx, FORUM_ARENA.door.leaveTo.ty], [FORUM_ARENA.door.leaveTo.tx + 1, FORUM_ARENA.door.leaveTo.ty]]);
      await settle(page);
      await page.screenshot({ path: `${SHOTS}/03-forum-walls.png` });
      // And from inside, just through the door.
      await enterArena(page, FORUM_ARENA);
      await cameraSettled(page, 20_000);
      await page.screenshot({ path: `${SHOTS}/03b-forum-walls-inside.png` });
    });

    test("the shrine's guards waiting at their posts inside its open door, and the door's E prompt", async ({ page }) => {
      test.setTimeout(120_000);
      await boot(page, '?playtest');
      await quiet(page, true);
      const W = SHRINE_ARENA;
      await page.evaluate(() => {
        const h = window.__helpers;
        const g = window.__GAME__;
        if (!h || !g) throw new Error('no helpers');
        h.walkTo((41.5 + h.ox) * 32, g.getState().player.y);
      });
      await walk(page, [[W.door.leaveTo.tx, W.door.leaveTo.ty]]);
      await page.evaluate(() => {
        const g = window.__GAME__;
        if (!g) throw new Error('no game');
        for (let t = 0; t < 240; t++) {
          g.step(1);
          g.setPlayerHealth(100);
        }
      });
      await settle(page);
      const shrine = await page.evaluate(() => window.__GAME__?.getState().enemies.filter((e) => e.group === 'shrine').map((e) => e.mode));
      expect(shrine?.every((m) => m === 'idle')).toBe(true);
      await page.screenshot({ path: `${SHOTS}/04-shrine-guards-waiting.png` });
      // In E's reach (just outside the door): the prompt, and the door's hover is its name alone.
      await hoverDoor(page, W);
      await settle(page);
      await page.screenshot({ path: `${SHOTS}/05-door-open-prompt.png` });
    });

    test('a sealed door says "Sealed"', async ({ page }) => {
      test.setTimeout(90_000);
      await boot(page, '?start=tutorial');
      await quiet(page);
      const W = SHRINE_ARENA;
      await walk(page, [[W.door.leaveTo.tx + 1, W.door.leaveTo.ty + 2]]);
      await settle(page);
      await hoverDoor(page, W);
      await page.screenshot({ path: `${SHOTS}/06-door-sealed.png` });
    });

    test("the player behind the meadow's boulders, in the top of their tiles", async ({ page }) => {
      test.setTimeout(90_000);
      await boot(page);
      await quiet(page);
      const row = 33 + HOME_SHIFT.dy;
      const x = 70 + HOME_SHIFT.dx;
      await page.evaluate(
        ({ row, x }) => {
          const h = window.__helpers;
          const g = window.__GAME__;
          if (!h || !g) throw new Error('no helpers');
          h.walkTo((x + 0.5) * 32, (row - 0.5) * 32);
          g.step(40, { moveY: 1 });
        },
        { row, x },
      );
      await settle(page);
      await page.screenshot({ path: `${SHOTS}/07-behind-the-boulders.png` });
    });
  });
});
