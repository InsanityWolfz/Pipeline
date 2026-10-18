import { expect, test } from '@playwright/test';
import { boot, watchErrors } from './helpers';

// Claiming (009): walk up to the shrine, clear it with the playtest ammo, claim
// its pylon, send the haul home, travel to the foundry, take from the stash, see
// the supply port push into a conduit, and ride the waystone back.

test('clear the shrine, claim the pylon, deposit, travel and use the stash and port', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  const result = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(0);
    // Up through the hall's top door.
    h.walkTo(10.5 * 32, 1.5 * 32);
    for (let i = 0; i < 60 && g.getState().room !== 'shrine'; i++) g.step(1, { moveY: -1 });
    let s = g.getState();
    const arrived = s.room;
    // Fight with piercing ley bolts: back off from anything close, fire at the nearest.
    g.step(1, { selectAmmo: 'ley-bolt' });
    for (let t = 0; t < 12000 && s.enemies.some((e) => e.room === 'shrine'); t++) {
      const p = s.player;
      const foes = s.enemies.filter((e) => e.room === 'shrine').sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
      const near = foes[0];
      if (!near) break;
      const d = Math.hypot(near.x - p.x, near.y - p.y);
      const away = (from: number, to: number): -1 | 0 | 1 => (Math.abs(to - from) < 2 ? 0 : to > from ? -1 : 1);
      const kite = d < 90;
      const close = d > 170;
      const windup = near.mode === 'windup' && d < 80;
      if ((s.inventory[s.tube.ammo] ?? 0) === 0) g.step(1, { selectAmmo: s.tube.ammo === 'ley-bolt' ? 'arrow' : 'bomb' });
      s = g.step(1, {
        moveX: kite ? away(p.x, near.x) : close ? away(near.x, p.x) : 0,
        moveY: kite ? away(p.y, near.y) : close ? away(near.y, p.y) : 0,
        dodge: windup && t % 30 === 0,
        fire: true,
        aimX: near.x,
        aimY: near.y,
      });
      if (s.room !== 'shrine') return { arrived, failed: `left the shrine (ko ${s.events.ko}) at tick ${s.tick}` };
    }
    const cleared = !s.enemies.some((e) => e.room === 'shrine');
    // Claim: stand below the pylon, E, stand still.
    try {
      // Around the pylon's east side, so it never stands in the way.
      h.walkTo(18.5 * 32, g.getState().player.y);
      h.walkTo(18.5 * 32, 9.5 * 32);
      h.walkTo(15.5 * 32, 9.5 * 32);
    } catch {
      const q = g.getState();
      return { arrived, failed: `stuck at ${q.player.x},${q.player.y} room ${q.room} cleared ${cleared} enemies ${JSON.stringify(q.enemies.filter((e) => e.room === 'shrine').map((e) => [e.enemyId, e.x, e.y]))}` };
    }
    g.step(1, { interact: true });
    s = g.step(130);
    const claimed = s.claims.includes('shrine');
    // Deposit, then travel home.
    s = g.step(1, { pylon: 'deposit' });
    const stashed = Object.values(s.stash).reduce((a, b) => a + b, 0);
    s = g.step(1, { pylon: 'travel' });
    const home = s.room;
    // Take one stack from the stash (fixture at tile 22,11), standing beside it.
    h.walkTo(21.5 * 32, 11.5 * 32);
    s = g.step(1, { takeStash: { itemId: 'wood' } });
    const wood = s.inventory.wood ?? 0;
    // A conduit in front of the supply port (1,8 facing right) gets a raw.
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
    return { arrived, cleared, claimed, stashed, home, wood, raw, back: s.room, failed: '' };
  });
  expect(result.failed).toBe('');
  expect(result.arrived).toBe('shrine');
  expect(result.cleared).toBe(true);
  expect(result.claimed).toBe(true);
  expect(result.stashed).toBeGreaterThan(0);
  expect(result.home).toBe('foundry');
  expect(result.wood).toBeGreaterThan(0);
  expect(result.raw).toBe('wood');
  expect(result.back).toBe('shrine');
  expect(errors).toEqual([]);
});
