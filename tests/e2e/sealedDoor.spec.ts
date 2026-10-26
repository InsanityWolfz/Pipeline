import { expect, test } from '@playwright/test';
import { SEALED_DOOR_TEXT } from '../../src/data/hints';
import { OVERWORLD } from '../../src/data/overworld';
import { boot, watchErrors } from './helpers';

// 067: on a New game the foundry's stairs stay sealed, drawn as a ley shimmer, until the shrine's pylon is claimed.
// Walking into them, or E at them, shows "Claim the shrine first" over the door; nothing goes down them.

const ui = (page: import('@playwright/test').Page) => page.evaluate(() => window.__GAME__?.ui());
/** The line as drawn once it has had time to fade: the tween clock (which the line counts down on) sped up meanwhile, as quietScreen does. */
async function faded(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => window.__GAME__?.tweenSpeed(10));
  await expect.poll(async () => (await ui(page))?.sealedDoor, { timeout: 20_000 }).toBeNull();
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
}

test('the sealed foundry stairs say "Claim the shrine first" to a push and to E, until the claim', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=tutorial');
  const door = OVERWORLD.entrance.door;
  // To the tile in front of the stairs, then up into them.
  await page.evaluate(({ tx, ty }) => {
    const h = window.__helpers;
    const y = window.__GAME__?.getState().player.y ?? 0;
    h?.walkTo((tx + 1.5) * 32, y);
    h?.walkTo((tx + 1.5) * 32, (ty + 1.5) * 32);
    h?.walkTo((tx + 0.5) * 32, (ty + 1.5) * 32);
  }, door);
  // The walk up may have brushed the door already: its line fades before the push.
  await faded(page);
  const pushed = await page.evaluate(() => {
    const g = window.__GAME__;
    let s = g?.getState();
    let seen = 0;
    for (let i = 0; i < 30; i++) {
      s = g?.step(1, { moveY: -1 });
      seen += s?.events.sealedDoors.length ?? 0;
    }
    return { seen, room: s?.room, gate: s?.gates.foundry };
  });
  expect(pushed.seen).toBeGreaterThan(0);
  expect(pushed).toMatchObject({ room: 'overworld', gate: false });
  await expect.poll(async () => (await ui(page))?.sealedDoor).toBe(SEALED_DOOR_TEXT.foundry);
  // The line fades once the pushing stops; E brings it back.
  await faded(page);
  const e = await page.evaluate(() => window.__GAME__?.step(1, { interact: true }).events.sealedDoors);
  expect(e).toEqual([{ gate: 'foundry' }]);
  await expect.poll(async () => (await ui(page))?.sealedDoor).toBe(SEALED_DOOR_TEXT.foundry);
  // Claimed (through the hook): the stairs open, and E there says nothing.
  const after = await page.evaluate(() => {
    const g = window.__GAME__;
    g?.claim('shrine');
    g?.step(1);
    return { gate: g?.getState().gates.foundry, said: g?.step(1, { interact: true }).events.sealedDoors };
  });
  expect(after).toEqual({ gate: true, said: [] });
  expect(errors).toEqual([]);
});
