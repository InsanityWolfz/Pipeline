import { expect, test } from '@playwright/test';
import { TILE_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { FEET_BOX } from '../../src/data/player';
import { OVERWORLD } from '../../src/data/overworld';
import { screenPoint, state, step } from './foundryPage';
import { boot, cameraSettled, watchErrors } from './helpers';

// The overworld (017) the camera is clamped to.
const HALL_W = OVERWORLD.width * TILE_SIZE;
const HALL_H = OVERWORLD.height * TILE_SIZE;

// 015: names on mouse-over, and clicks on the HUD never firing (from sorter.spec.ts, which went with the sorter in 052).

test('hovering a Husk names it, and a press that starts on the hotbar never fires', async ({ page }) => {
  // About 22 s alone: room for parallel workers.
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page);
  const s = await step(page, 0);
  const husk = s.enemies.find((e) => e.room === s.room);
  if (!husk) throw new Error('no husk');
  // Walk close so the Husk is on screen, without waking it.
  await page.evaluate(([x, y]) => window.__helpers?.walkTo(x, y), [husk.x - 220, husk.y + 60] as const);
  await cameraSettled(page);
  const now = await step(page, 0);
  const target = now.enemies.find((e) => e.id === husk.id);
  if (!target) throw new Error('husk gone');
  // The camera follows the player's sprite (feet box bottom), clamped to the room.
  const clamp = (v: number, hi: number) => Math.min(Math.max(v, 0), hi);
  const camX = clamp(now.player.x - VIEW_WIDTH / 2, HALL_W - VIEW_WIDTH);
  const camY = clamp(now.player.y + FEET_BOX.h / 2 - VIEW_HEIGHT / 2, HALL_H - VIEW_HEIGHT);
  const p = await screenPoint(page, target.x - camX, target.y - 12 - camY);
  // Under load the camera can take a while to settle on the player: keep nudging the mouse until it does.
  await expect
    .poll(
      async () => {
        await page.mouse.move(p.x + 1, p.y);
        await page.mouse.move(p.x, p.y);
        return page.evaluate(() => window.__GAME__?.ui().hoverName);
      },
      { timeout: 30_000 },
    )
    .toBe('Husk');

  // Back on the real-time clock: a press that starts on the hotbar never fires, even dragged out into the world.
  await page.reload();
  await page.waitForFunction(() => window.__GAME__?.ui().ready === true);
  // The hotbar drawn where the press starts.
  await expect.poll(async () => page.evaluate(() => window.__GAME__?.ui().hud?.hotbar.shown ?? false)).toBe(true);
  const slot = await screenPoint(page, VIEW_WIDTH / 2, VIEW_HEIGHT - 18);
  const world = await screenPoint(page, VIEW_WIDTH / 2 + 120, VIEW_HEIGHT / 2);
  const start = await state(page);
  const before = start.inventory.arrow;
  // 047: carried arrows go out on right click.
  await page.mouse.move(slot.x, slot.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(world.x, world.y, { steps: 4 });
  // Held, dragged into the world, while the world runs on: half a second of ticks (waits on the sim, not the clock).
  await expect.poll(async () => (await state(page)).tick, { timeout: 15_000 }).toBeGreaterThan(start.tick + 30);
  await page.mouse.up({ button: 'right' });
  const after = await state(page);
  expect(after.inventory.arrow).toBe(before);
  expect(after.arrows).toEqual([]);
  // A press that starts in the world does fire, so the check above means something: held until a round leaves.
  await page.mouse.down({ button: 'right' });
  await expect.poll(async () => (await state(page)).inventory.arrow ?? 0, { timeout: 15_000 }).toBeLessThan(before ?? 0);
  await page.mouse.up({ button: 'right' });
  expect(errors).toEqual([]);
});
