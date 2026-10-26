import { expect, test, type Page } from '@playwright/test';
import { centre, enterFoundry, pieceAt, standStill, state, step, toggleBuild } from './foundryPage';
import { sandbox } from './hollowsSandbox';
import { boot, cameraSettled, watchErrors } from './helpers';

// fix-build-inventory-respawn: two of Shaun's playtest bugs. "If in build mode and you go into your inventory you should
// exit build mode", and "I died in the stonefall region and when I respawn I respawned outside of the foundry and then
// even after entering it and leaving my camera was locked to the foundry and I could walk my character off the screen."

const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

/** Presses `key` and lets the next tick see what it queued (Esc's and B's build toggle reach the sim on a tick). */
async function pressAndStep(page: Page, key: string): Promise<boolean> {
  await page.keyboard.press(key);
  await page.waitForTimeout(50);
  return (await step(page, 1)).building;
}

test('opening the inventory, a hopper, crafting, research or talents leaves build mode', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await boot(page);
  await enterFoundry(page);
  await standStill(page);

  // I, then Tab: each opens the inventory and leaves build mode; closing it doesn't go back in.
  for (const key of ['i', 'Tab']) {
    expect((await toggleBuild(page)).building).toBe(true);
    expect(await pressAndStep(page, key)).toBe(false);
    expect((await ui(page))?.inventory.open).toBe(true);
    expect(await pressAndStep(page, 'Escape')).toBe(false);
    expect((await ui(page))?.inventory.open).toBe(false);
  }

  // The other big centred panels that take turns with the inventory: crafting (C), research (J) and talents (T).
  for (const key of ['c', 'j', 't']) {
    expect((await toggleBuild(page)).building).toBe(true);
    expect(await pressAndStep(page, key)).toBe(false);
    expect(await pressAndStep(page, 'Escape')).toBe(false);
  }

  // A hopper's screen (E at it) is the inventory's too.
  expect((await toggleBuild(page)).building).toBe(true);
  await step(page, 1, { place: { pieceId: 'hopper', tx: 12, ty: 8, facing: 'down' } });
  expect(pieceAt(await state(page), 12, 8)?.pieceId).toBe('hopper');
  const aim = centre(12, 8);
  await step(page, 1, { aimX: aim.x, aimY: aim.y });
  expect(await pressAndStep(page, 'e')).toBe(false);
  expect((await ui(page))?.pickerOpen).toBe(true);
  expect(await pressAndStep(page, 'Escape')).toBe(false);

  // Out of build mode, B still goes in, and Esc still leaves it.
  expect((await toggleBuild(page)).building).toBe(true);
  expect(await pressAndStep(page, 'Escape')).toBe(false);
  expect(errors).toEqual([]);
});

/** Puts the player down in the Hollows and steps through the death to the wake, without drawing a frame between. */
async function dieInHollows(page: Page, command: object = {}): Promise<void> {
  await page.evaluate((cmd) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.setPlayerHealth(0);
    for (let t = 0; t < 200 && !g.getState().events.ko; t++) g.step(1, cmd);
    if (!g.getState().events.ko) throw new Error('no KO');
  }, command);
  expect((await state(page)).room).toBe('foundry');
}

/** Walks the player down `ticks` ticks and checks the camera, once it settles, is centred on the player's sprite. */
async function cameraFollows(page: Page, ticks = 40): Promise<void> {
  await expect.poll(async () => (await ui(page))?.camera.fading, { timeout: 15_000 }).toBe(false);
  await step(page, ticks, { moveY: 1 });
  await cameraSettled(page, 15_000);
  const cam = (await ui(page))?.camera;
  if (!cam) throw new Error('no camera');
  expect(Math.abs(cam.x - cam.player.x)).toBeLessThan(4);
  expect(Math.abs(cam.y - cam.player.y)).toBeLessThan(4);
}

test('after a KO in the Hollows, leaving through the door during the wake fade keeps the camera on the player', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await sandbox(page);
  await dieInHollows(page);
  // The wake's fade has begun when the player goes out the foundry's door (its spawn is the tile beside it).
  await expect.poll(async () => (await ui(page))?.camera.fading).toBe(true);
  await page.evaluate(() => {
    const g = window.__GAME__;
    for (let t = 0; t < 60 && g?.getState().room === 'foundry'; t++) g.step(1, { moveX: 1 });
  });
  expect((await state(page)).room).toBe('overworld');
  await cameraFollows(page);

  // In through the stairs and out again: the camera still follows.
  await page.evaluate(() => window.__helpers?.toFoundry());
  expect((await state(page)).room).toBe('foundry');
  await expect.poll(async () => (await ui(page))?.camera.fading, { timeout: 15_000 }).toBe(false);
  await page.evaluate(() => window.__helpers?.toHall());
  expect((await state(page)).room).toBe('overworld');
  await cameraFollows(page);
  expect(errors).toEqual([]);
});

test('a move key held through a KO does not walk the player out of the foundry on waking', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await sandbox(page);
  // Holding D (move right, toward the foundry's door from its spawn) through the death, in real time.
  await page.keyboard.down('d');
  await page.evaluate(() => {
    window.__GAME__?.setPlayerHealth(0);
    window.__GAME__?.resume();
  });
  await expect.poll(async () => (await state(page)).room, { timeout: 20_000 }).toBe('foundry');
  const woke = (await state(page)).tick;
  await expect.poll(async () => (await state(page)).tick - woke, { timeout: 20_000 }).toBeGreaterThan(60);
  const s = await state(page);
  expect(s.room).toBe('foundry');
  expect(s.player.dying).toBe(0);
  // Let go and press it again: now it walks, out through the door.
  await page.keyboard.up('d');
  await page.waitForTimeout(100);
  await page.keyboard.down('d');
  await expect.poll(async () => (await state(page)).room, { timeout: 20_000 }).toBe('overworld');
  await page.keyboard.up('d');
  await cameraSettled(page, 15_000);
  expect(errors).toEqual([]);
});
