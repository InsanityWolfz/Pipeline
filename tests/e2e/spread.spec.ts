import { expect, test } from '@playwright/test';
import { boot, watchErrors } from './helpers';

// Spreads (008): three ley bolt lines through gravity stagers into the tube
// socket fire three bolts per reservoir shot.

test('three stagers into the socket fire a three-bolt spread', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  const result = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.step(0);
    window.__helpers?.walkTo(48, 400);
    for (let i = 0; i < 60 && g.getState().room !== 'foundry'; i++) g.step(1, { moveX: -1 });
    const place = (pieceId: string, tx: number, ty: number, facing: string) =>
      g.step(1, { place: { pieceId, tx, ty, facing: facing as 'up' } });
    // Three rows of hopper → grinder → focuser → stager, each stager facing the socket.
    const rows: [number, number, string, number, number][] = [
      [6, 6, 'right', 1, 0],
      [10, 2, 'down', 0, 1],
      [10, 10, 'up', 0, -1],
    ];
    // Hoppers first, each filled with ley crystal from beside it while the floor is still open.
    for (const [tx, ty, f] of rows) {
      place('hopper', tx, ty, f);
      window.__helpers?.walkTo((tx + 1 + 0.5) * 32, (ty + 0.5) * 32);
      const hopper = g.getState().foundry.pieces.find((p) => p.kind === 'hopper' && p.tx === tx && p.ty === ty);
      if (hopper) g.step(1, { deposit: { id: hopper.id, itemId: 'ley-crystal' } });
    }
    window.__helpers?.walkTo(16 * 32, 8 * 32);
    place('tube-socket', 10, 6, 'right');
    for (const [tx, ty, f, dx, dy] of rows) {
      place('grinder', tx + dx, ty + dy, f);
      place('focuser', tx + 2 * dx, ty + 2 * dy, f);
      place('gravity-stager', tx + 3 * dx, ty + 3 * dy, f);
    }
    // Turn two streams off centre: one to +15°, the other on round to -15°.
    let s = g.getState();
    const stagers = s.foundry.pieces.filter((p) => p.kind === 'stager');
    const [first, second] = stagers;
    if (first) g.step(1, { setAngle: { id: first.id } });
    if (second) for (let i = 0; i < 4; i++) g.step(1, { setAngle: { id: second.id } });
    window.__helpers?.walkTo(16 * 32, 12 * 32);
    g.step(1, { selectAmmo: 'ley-bolt' });
    for (let t = 0; t < 2000 && g.getState().link.reservoir.count < 12; t++) g.step(1);
    // Fire off the carried bolts, then one reservoir shot, out in the hall: the tube is quiet in the foundry (015).
    window.__helpers?.toHall();
    s = g.getState();
    const aimX = s.player.x + 200;
    const aimY = s.player.y;
    for (let t = 0; t < 99 * 20 + 40 && (s.inventory['ley-bolt'] ?? 0) > 0; t++) s = g.step(1, { fire: true, aimX, aimY });
    let shot = 0;
    let bolts = 0;
    for (let t = 0; t < 40 && shot === 0; t++) {
      const before = new Set(s.arrows.map((a) => a.id));
      s = g.step(1, { fire: true, aimX, aimY });
      if (s.tube.fromReservoir) {
        shot = s.tube.shotCount;
        bolts = s.arrows.filter((a) => !before.has(a.id) && a.ammoId === 'ley-bolt').length;
      }
    }
    const streams = s.foundry.pieces.find((p) => p.kind === 'socket');
    return { shot, bolts, streams: streams?.kind === 'socket' ? streams.streams : [], angles: stagers.length };
  });
  expect(result.angles).toBe(3);
  expect(result.streams).toHaveLength(3);
  expect(result.shot).toBe(3);
  expect(result.bolts).toBe(3);
  expect(errors).toEqual([]);
});
