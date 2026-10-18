import { expect, test, type Page } from '@playwright/test';
import { TILE_SIZE } from '../../src/data/config';
import type { SimSummary } from '../../src/sim/summary';
import { boot, watchErrors } from './helpers';

// The tube link (007): attuning in the foundry, a line into the tube socket,
// firing reservoir rounds once the carried ones run out, and the ?playtest start.

const centre = (tx: number, ty: number) => ({ x: (tx + 0.5) * TILE_SIZE, y: (ty + 0.5) * TILE_SIZE });

async function step(page: Page, frames: number, command: object = {}): Promise<SimSummary> {
  const s = await page.evaluate(([f, c]) => window.__GAME__?.step(f, c), [frames, command] as const);
  if (!s) throw new Error('no game');
  return s;
}

/** Walks from the spawn through the ruin hall's door into the foundry, counting attune events on the way. */
async function enterFoundry(page: Page): Promise<number> {
  return page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.step(0);
    window.__helpers?.walkTo(48, 400);
    let attunes = 0;
    for (let i = 0; i < 60 && g.getState().room !== 'foundry'; i++) attunes += g.step(1, { moveX: -1 }).events.attunes.length;
    return attunes;
  });
}

test('entering the foundry attunes the tube once', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  expect((await step(page, 0)).link.attuned).toBe(false);
  expect(await enterFoundry(page)).toBe(1);
  const s = await step(page, 1);
  expect(s.link.attuned).toBe(true);
  expect(s.link.attunePulse).toBeGreaterThan(0);
  expect(s.unlocked).toContain('tube-socket');
  expect(errors).toEqual([]);
});

test('a line fills the reservoir, which fires once the carried rounds run out', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await enterFoundry(page);
  // A ley crystal hopper feeding a grinder, a focuser and the socket, all handing off directly.
  const hopper = { tx: 4, ty: 4 };
  for (const [pieceId, tx] of [['hopper', 4], ['grinder', 5], ['focuser', 6], ['tube-socket', 7]] as const) {
    await step(page, 1, { place: { pieceId, tx, ty: hopper.ty, facing: 'right' } });
  }
  const beside = centre(hopper.tx, hopper.ty + 1);
  await page.evaluate(([x, y]) => window.__helpers?.walkTo(x, y), [beside.x, beside.y] as const);
  const placed = await step(page, 1);
  const hopperId = placed.foundry.pieces.find((p) => p.pieceId === 'hopper')?.id;
  if (hopperId === undefined) throw new Error('no hopper');
  await step(page, 1, { deposit: { id: hopperId, itemId: 'ley-crystal' } });
  await step(page, 1, { selectAmmo: 'ley-bolt' });
  const filled = await page.evaluate(() => {
    const g = window.__GAME__;
    let s = g?.getState();
    for (let t = 0; t < 1200 && s && s.link.reservoir.count < 10; t++) s = g?.step(1);
    return s;
  });
  expect(filled?.link.reservoir).toMatchObject({ item: 'ley-bolt' });
  expect(filled?.link.reservoir.count).toBeGreaterThanOrEqual(10);

  // Fire away the 99 carried bolts, then one more shot comes from the reservoir.
  const fired = await page.evaluate(() => {
    const g = window.__GAME__;
    // The tube only fires outside the foundry (015).
    window.__helpers?.toHall();
    let s = g?.getState();
    const x = (s?.player.x ?? 0) + 300;
    const y = s?.player.y ?? 0;
    for (let t = 0; t < 99 * 20 + 40 && s && (s.inventory['ley-bolt'] ?? 0) > 0; t++) {
      s = g?.step(1, { fire: true, aimX: x, aimY: y });
    }
    const before = s?.link.reservoir.count ?? 0;
    let fromReservoir = false;
    for (let t = 0; t < 40 && !fromReservoir; t++) {
      s = g?.step(1, { fire: true, aimX: x, aimY: y });
      fromReservoir = s?.tube.fromReservoir ?? false;
    }
    return { fromReservoir, carried: s?.inventory['ley-bolt'] ?? 0, before, after: s?.link.reservoir.count ?? 0 };
  });
  expect(fired.carried).toBe(0);
  expect(fired.fromReservoir).toBe(true);
  expect(fired.after).toBeLessThan(fired.before + 3);
  expect(errors).toEqual([]);
});

test('?playtest starts with plenty of everything and every machine unlocked', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  const s = await step(page, 0);
  expect(s.inventory).toMatchObject({ arrow: 99, bomb: 99, 'ley-bolt': 99, wood: 99, stone: 99, fiber: 99, 'ley-crystal': 99, 'husk-resin': 99, shaft: 20, 'ley-shard': 20 });
  expect(s.unlocked).toEqual(['conduit', 'sorter', 'hopper', 'crate', 'tube-socket', 'gravity-stager', 'cutter', 'knapper', 'spinner', 'assembler', 'shaper', 'fuse-maker', 'grinder', 'packer', 'focuser']);
  expect(errors).toEqual([]);
});
