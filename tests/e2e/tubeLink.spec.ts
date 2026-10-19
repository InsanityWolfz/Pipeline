import { expect, test, type Page } from '@playwright/test';
import { TILE_SIZE } from '../../src/data/config';
import { OVERWORLD } from '../../src/data/overworld';
import type { SimSummary } from '../../src/sim/summary';
import { boot, watchErrors } from './helpers';

// The tube link (007): attuning in the foundry, a line into the foundry intake (019),
// firing reservoir rounds ahead of the carried ones (028), and the ?playtest start.

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
    // In front of the foundry's stairs (017), round the tube's stone, then down them.
    const X = window.__helpers?.ox ?? 0;
    window.__helpers?.walkTo((41.5 + X) * 32, g.getState().player.y);
    window.__helpers?.walkTo((41.5 + X) * 32, 21.5 * 32);
    window.__helpers?.walkTo((40.5 + X) * 32, 21.5 * 32);
    let attunes = 0;
    for (let i = 0; i < 60 && g.getState().room !== 'foundry'; i++) attunes += g.step(1, { moveY: -1 }).events.attunes.length;
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
  // The intake is the foundry's own, in the north wall: nothing to unlock or place (019). Only its centre entrance is open (024).
  expect(s.intake.entrances.map((e) => e.open)).toEqual([false, true, false]);
  expect(s.unlocked).not.toContain('tube-socket');
  expect(errors).toEqual([]);
});

test('a line fills the middle entrance, which fires ahead of the carried rounds (028)', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await enterFoundry(page);
  // A ley crystal hopper feeding a grinder, a focuser and a conduit up into the intake's middle mouth tile (019).
  const hopper = { tx: 12, ty: 4 };
  for (const [pieceId, ty] of [['hopper', 4], ['grinder', 3], ['focuser', 2], ['conduit', 1]] as const) {
    await step(page, 1, { place: { pieceId, tx: hopper.tx, ty, facing: 'up' } });
  }
  // Just below the hopper, well in reach.
  const beside = { x: centre(hopper.tx, hopper.ty + 1).x, y: centre(hopper.tx, hopper.ty + 1).y - 8 };
  await page.evaluate(([x, y]) => window.__helpers?.walkTo(x, y), [beside.x, beside.y] as const);
  const placed = await step(page, 1);
  const hopperId = placed.foundry.pieces.find((p) => p.pieceId === 'hopper')?.id;
  if (hopperId === undefined) throw new Error('no hopper');
  await step(page, 1, { deposit: { id: hopperId, itemId: 'ley-crystal', amount: 'all' } });
  await step(page, 1, { selectAmmo: 'ley-bolt' });
  const filled = await page.evaluate(() => {
    const g = window.__GAME__;
    let s = g?.getState();
    for (let t = 0; t < 1200 && s && (s.intake.entrances[1]?.count ?? 0) < 10; t++) s = g?.step(1);
    return s;
  });
  expect(filled?.intake.entrances[1]).toMatchObject({ ammo: 'ley-bolt' });
  expect(filled?.intake.entrances[1]?.count).toBeGreaterThanOrEqual(10);

  // With 99 bolts still carried, the first press out in the meadow fires from the reservoir.
  const fired = await page.evaluate(() => {
    const g = window.__GAME__;
    // The tube only fires outside the foundry (015).
    window.__helpers?.toHall();
    let s = g?.getState();
    const x = (s?.player.x ?? 0) + 300;
    const y = s?.player.y ?? 0;
    const before = s?.intake.entrances[1]?.count ?? 0;
    const next = s?.tube.next;
    s = g?.step(1, { fire: true, aimX: x, aimY: y });
    return { next, fromReservoir: s?.tube.fromReservoir ?? false, carried: s?.inventory['ley-bolt'] ?? 0, before, after: s?.intake.entrances[1]?.count ?? 0 };
  });
  expect(fired.next).toBe('volley');
  expect(fired.fromReservoir).toBe(true);
  expect(fired.carried).toBe(99);
  expect(fired.after).toBeLessThan(fired.before + 3);
  expect(errors).toEqual([]);
});

test('a full entrance backs the line into the intake up', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await enterFoundry(page);
  for (const [pieceId, ty] of [['hopper', 4], ['grinder', 3], ['focuser', 2], ['conduit', 1]] as const) {
    await step(page, 1, { place: { pieceId, tx: 12, ty, facing: 'up' } });
  }
  const below = centre(12, 5);
  await page.evaluate(([x, y]) => window.__helpers?.walkTo(x, y), [below.x, below.y - 8] as const);
  const hopperId = (await step(page, 1)).foundry.pieces.find((p) => p.pieceId === 'hopper')?.id;
  if (hopperId === undefined) throw new Error('no hopper');
  await step(page, 1, { deposit: { id: hopperId, itemId: 'ley-crystal', amount: 'all' } });
  const full = await page.evaluate(() => {
    const g = window.__GAME__;
    let s = g?.getState();
    const middle = () => s?.intake.entrances[1];
    for (let t = 0; t < 4000 && s && (middle()?.count ?? 0) < (middle()?.cap ?? 0); t++) s = g?.step(1);
    // Well past full: nothing more goes in, and the conduit under the mouth holds its bolt.
    s = g?.step(300);
    const conduit = s?.foundry.pieces.find((p) => p.tx === 12 && p.ty === 1);
    return { entrance: middle(), held: conduit?.kind === 'conduit' ? conduit.item : null };
  });
  expect(full.entrance).toMatchObject({ ammo: 'ley-bolt', count: 30, cap: 30 });
  expect(full.held).toBe('ley-bolt');
  expect(errors).toEqual([]);
});

test('?playtest starts with plenty of everything and every machine unlocked', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  const s = await step(page, 0);
  // At the start stone, with the land already full of packs (017).
  expect({ x: s.player.x, y: s.player.y }).toEqual(centre(OVERWORLD.wake.tx, OVERWORLD.wake.ty));
  expect(s.populated).toBe(true);
  expect(s.area.ring).toBe(0);
  expect(s.inventory).toMatchObject({ arrow: 99, bomb: 99, 'ley-bolt': 99, wood: 99, stone: 99, fiber: 99, 'ley-crystal': 99, 'husk-resin': 99, shaft: 20, 'ley-shard': 20 });
  // 029: every stage machine too, and rime shards for the frost rune; 038: the Shard die and the landmine chain.
  expect(s.unlocked).toEqual([
    'conduit', 'sorter', 'hopper', 'crate', 'cutter', 'knapper', 'spinner', 'assembler', 'frost-rune', 'shaper', 'fuse-maker', 'packer', 'shard-die', 'grinder', 'focuser', 'ley-guide', 'shatter-lens', 'plate-press', 'mine-packer',
  ]);
  expect(s.inventory['rime-shard']).toBe(99);
  expect(errors).toEqual([]);
});
