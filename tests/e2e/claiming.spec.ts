import { expect, test, type Page } from '@playwright/test';
import { TILE_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { DESCRIPTIONS } from '../../src/data/descriptions';
import { ENEMIES } from '../../src/data/enemies';
import { OVERWORLD } from '../../src/data/overworld';
import { FEET_BOX } from '../../src/data/player';
import { menuRows } from '../../src/render/foundryLayout';
import { screenPoint, state } from './foundryPage';
import { boot, watchErrors } from './helpers';

/**
 * Presses E (the claimed pylon's menu) and clicks one of its two rows, until `done` says it took: under load the
 * menu can take a frame or two to open, so a click straight after E can land before it's there.
 */
async function pylonMenu(page: Page, row: 0 | 1, done: () => Promise<boolean>): Promise<void> {
  const r = menuRows(2)[row];
  if (!r) throw new Error('no row');
  const p = await screenPoint(page, r.x + r.w / 2, r.y + r.h / 2);
  for (let i = 0; i < 5 && !(await done()); i++) {
    await page.keyboard.press('e');
    await page.waitForTimeout(150 * (i + 1));
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(50);
    await page.evaluate(() => window.__GAME__?.step(1));
  }
}

// Claiming (009): walk up to the shrine, clear it with the playtest ammo, claim
// its pylon, send the haul home, travel to the foundry, take from the stash, see
// the fiber port push into a conduit (028: a port per raw), and ride the waystone back. Since 017 the
// shrine is a walled site in the overworld, reached by the dirt path east.

test('clear the shrine, claim the pylon, deposit, travel and use the stash and port', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  const result = await page.evaluate((wispLift) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(0);
    // Round the start stone, north up the path, then east along it to the shrine's gap (src/data/overworld.ts).
    const X = h.ox;
    h.walkTo((41.5 + X) * 32, g.getState().player.y);
    for (const [tx, ty] of [[41.5, 22.5], [52.5, 21.5], [60.5, 18.5], [66.5, 17.5], [66.5, 13.5]]) h.walkTo(((tx ?? 0) + X) * 32, (ty ?? 0) * 32);
    let s = g.getState();
    const inside = (e: { x: number; y: number }) => e.x > (58 + X) * 32 && e.x < (75 + X) * 32 && e.y > 3 * 32 && e.y < 16 * 32;
    const arrived = inside(s.player) ? 'shrine' : `${s.player.x},${s.player.y}`;
    const guards = () => s.enemies.filter((e) => e.group === 'shrine');
    // Fight with piercing ley bolts: back off from anything close, fire at the nearest (any wanderer that
    // follows in first, else the nearest guard).
    window.__helpers?.hold('ley-bolt');
    let stuck = 0;
    for (let t = 0; t < 12000 && guards().length > 0; t++) {
      const p = s.player;
      const dist = (e: { x: number; y: number }) => Math.hypot(e.x - p.x, e.y - p.y);
      const close = s.enemies.filter((e) => dist(e) < 200).sort((a, b) => dist(a) - dist(b));
      const near = close[0] ?? guards().sort((a, b) => dist(a) - dist(b))[0];
      if (!near) break;
      const d = Math.hypot(near.x - p.x, near.y - p.y);
      const away = (from: number, to: number): -1 | 0 | 1 => (Math.abs(to - from) < 2 ? 0 : to > from ? -1 : 1);
      const kite = d < 90;
      const far = d > 170;
      const windup = near.mode === 'windup' && d < 80;
      if ((s.inventory[(s.hotbar.slots[s.hotbar.selected] ?? '')] ?? 0) === 0) window.__helpers?.hold((s.hotbar.slots[s.hotbar.selected] ?? '') === 'ley-bolt' ? 'arrow' : 'bomb');
      s = g.step(1, {
        moveX: kite ? away(p.x, near.x) : far ? away(near.x, p.x) : 0,
        moveY: kite ? away(p.y, near.y) : far ? away(near.y, p.y) : 0,
        dodge: windup && t % 30 === 0,
        use: true,
        aimX: near.x,
        // At the body: a Wisp floats, its hurtbox well above its feet (an arrow at its feet passes under it).
        aimY: near.y + (near.enemyId === 'wisp' ? wispLift : 0),
      });
      if (s.events.ko) return { arrived, failed: `knocked out at tick ${s.tick}` };
      // The scripted fight is chaotic (any change to the seeded RNG's stream replays it differently, 049), and this
      // test is about the claim, not the fight: a low player is topped up.
      if (s.player.health < 30) s = g.setPlayerHealth(100);
      // Closing in but stuck on something (018: the shrine has a grove, a pond and rocks): go round it.
      stuck = far && Math.hypot(s.player.x - p.x, s.player.y - p.y) < 0.1 ? stuck + 1 : 0;
      if (stuck > 20) {
        stuck = 0;
        try {
          h.walkTo(near.x, near.y + 64);
        } catch {
          // Unreachable from here; the fight goes on.
        }
        s = g.getState();
      }
    }
    const cleared = guards().length === 0;
    // Claim: stand below the pylon, E, stand still.
    try {
      // Around the pylon's east side, so it never stands in the way.
      h.walkTo((68.5 + X) * 32, g.getState().player.y);
      h.walkTo((68.5 + X) * 32, 9.5 * 32);
      h.walkTo((66.5 + X) * 32, 9.5 * 32);
    } catch {
      const q = g.getState();
      return { arrived, failed: `stuck at ${q.player.x},${q.player.y} room ${q.room} cleared ${cleared} enemies ${JSON.stringify(guards().map((e) => [e.enemyId, e.x, e.y]))}` };
    }
    g.step(1, { interact: true });
    s = g.step(130);
    return { arrived, cleared, claimed: s.claims.includes('shrine'), failed: '' };
  }, ENEMIES.wisp?.hurtbox.offsetY ?? 0);
  expect(result.failed).toBe('');
  expect(result.arrived).toBe('shrine');
  expect(result.cleared).toBe(true);
  expect(result.claimed).toBe(true);

  // The pylon's harvest (018): the moment the ports produce their raws (028: one port per raw, all four starting
  // together at the claim), a mote of each sets off home along the ley line.
  const RAWS = ['wood', 'stone', 'fiber', 'ley-crystal'];
  const supplied = await page.evaluate(() => {
    const g = window.__GAME__;
    let s = g?.getState();
    for (let t = 0; t < 400 && s && s.events.supplies.length === 0; t++) s = g?.step(1);
    return { supplies: s?.events.supplies.map((e) => e.itemId) ?? [], ports: s?.ports.map((p) => [p.raw, p.waiting]) ?? [] };
  });
  // Each raw comes up at its own port, and waits there with nothing in front.
  expect(supplied).toEqual({ supplies: RAWS, ports: RAWS.map((raw) => [raw, true]) });
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().supply))?.inFlight.map((m) => m.itemId)).toEqual(RAWS);
  expect((await page.evaluate(() => window.__GAME__?.ui().supply))?.started).toBe(4);

  // Hovering the pylon says where the materials come from.
  const at = await state(page);
  const camX = Math.min(Math.max(at.player.x - VIEW_WIDTH / 2, 0), OVERWORLD.width * TILE_SIZE - VIEW_WIDTH);
  const camY = Math.min(Math.max(at.player.y + FEET_BOX.h / 2 - VIEW_HEIGHT / 2, 0), OVERWORLD.height * TILE_SIZE - VIEW_HEIGHT);
  const pylon = await screenPoint(page, (OVERWORLD.shrine.pylon.tx + 0.5) * TILE_SIZE - camX, (OVERWORLD.shrine.pylon.ty + 0.5) * TILE_SIZE - camY);
  await expect
    .poll(
      async () => {
        await page.mouse.move(pylon.x + 1, pylon.y);
        await page.mouse.move(pylon.x, pylon.y);
        await page.waitForTimeout(100);
        return page.evaluate(() => window.__GAME__?.ui().hoverDescription);
      },
      { timeout: 10_000 },
    )
    .toBe(DESCRIPTIONS.pylon);

  // E at the claimed pylon opens its menu (017: found by the pylon's site, the player being in the overworld room):
  // send the haul home, then travel to the foundry.
  await pylonMenu(page, 0, async () => Object.keys((await state(page)).stash).length > 0);
  const stashed = Object.values((await state(page)).stash).reduce((a, b) => a + b, 0);
  await pylonMenu(page, 1, async () => (await state(page)).room === 'foundry');
  const home = (await state(page)).room;

  const after = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    const inside = (e: { x: number; y: number }) => e.x > (58 + h.ox) * 32 && e.x < (75 + h.ox) * 32 && e.y > 3 * 32 && e.y < 16 * 32;
    // Take one stack from the stash (fixture at tile 22,11), standing beside it.
    h.walkTo(21.5 * 32, 11.5 * 32);
    let s = g.step(1, { takeStash: { itemId: 'wood' } });
    const wood = s.inventory.wood ?? 0;
    // A conduit in front of the fiber port (1,8 facing right) gets its raw.
    g.step(1, { place: { pieceId: 'conduit', tx: 2, ty: 8, facing: 'down' } });
    let raw: string | null = null;
    for (let t = 0; t < 300 && !raw; t++) {
      s = g.step(1);
      const c = s.foundry.pieces.find((p) => p.tx === 2 && p.ty === 8);
      raw = c?.kind === 'conduit' ? c.item : null;
    }
    // The waystone (22,4) carries the player back to the pylon.
    h.walkTo(22.5 * 32, 5.5 * 32);
    s = g.step(1, { interact: true });
    return { wood, raw, back: s.room === 'overworld' && inside(s.player) ? 'shrine' : s.room };
  });
  expect(stashed).toBeGreaterThan(0);
  expect(home).toBe('foundry');
  expect(after.wood).toBeGreaterThan(0);
  expect(after.raw).toBe('fiber');
  expect(after.back).toBe('shrine');
  expect(errors).toEqual([]);
});
